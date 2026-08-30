import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

export const URL_FETCH_TIMEOUT_MS = 10_000;
export const URL_MAX_RESPONSE_BYTES = 1_048_576;
export const URL_MAX_REDIRECTS = 3;

const ALLOWED_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml']);

const reserved = new BlockList();
reserved.addSubnet('0.0.0.0', 8, 'ipv4');
reserved.addSubnet('10.0.0.0', 8, 'ipv4');
reserved.addSubnet('100.64.0.0', 10, 'ipv4');
reserved.addSubnet('127.0.0.0', 8, 'ipv4');
reserved.addSubnet('169.254.0.0', 16, 'ipv4');
reserved.addSubnet('172.16.0.0', 12, 'ipv4');
reserved.addSubnet('192.0.0.0', 24, 'ipv4');
reserved.addSubnet('192.0.2.0', 24, 'ipv4');
reserved.addSubnet('192.168.0.0', 16, 'ipv4');
reserved.addSubnet('198.18.0.0', 15, 'ipv4');
reserved.addSubnet('198.51.100.0', 24, 'ipv4');
reserved.addSubnet('203.0.113.0', 24, 'ipv4');
reserved.addSubnet('224.0.0.0', 4, 'ipv4');
reserved.addSubnet('240.0.0.0', 4, 'ipv4');
reserved.addAddress('::', 'ipv6');
reserved.addAddress('::1', 'ipv6');
reserved.addSubnet('fc00::', 7, 'ipv6');
reserved.addSubnet('fe80::', 10, 'ipv6');
reserved.addSubnet('ff00::', 8, 'ipv6');
reserved.addSubnet('2001:db8::', 32, 'ipv6');

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'metadata.google.com',
  'metadata.internal',
  'instance-data',
]);

export type UrlSafetyCode = 'RIGHTS_REJECTED' | 'URL_UNREACHABLE' | 'INVALID_INPUT';

export type UrlFetchDeps = {
  fetch?: typeof fetch;
  lookup?: (hostname: string) => Promise<string[]>;
  timeoutMs?: number;
  maxBytes?: number;
};

export type PublicHtmlResult =
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; code: UrlSafetyCode };

function fail(code: UrlSafetyCode): PublicHtmlResult {
  return { ok: false, code };
}

export async function defaultDnsLookup(hostname: string): Promise<string[]> {
  const results = await dnsLookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => entry.address);
}

function coerceIpv4(hostname: string): string | null {
  if (isIP(hostname) === 4) return hostname;
  if (/^\d+$/.test(hostname)) {
    const value = Number(hostname);
    if (!Number.isInteger(value) || value < 0 || value > 4294967295) return null;
    return [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ].join('.');
  }
  return null;
}

function mappedIpv4(ipv6: string): string | null {
  const lower = ipv6.toLowerCase();
  const dotted = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) return null;
  const hi = Number.parseInt(hex[1], 16);
  const lo = Number.parseInt(hex[2], 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

export function isNonPublicIp(address: string): boolean {
  const host = address.replace(/^\[|\]$/g, '');
  const ipv4 = coerceIpv4(host);
  if (ipv4) return reserved.check(ipv4, 'ipv4');
  if (isIP(host) === 6) {
    const mapped = mappedIpv4(host);
    if (mapped) return reserved.check(mapped, 'ipv4');
    return reserved.check(host, 'ipv6');
  }
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localdomain')) {
    return true;
  }
  return isNonPublicIp(host);
}

function parseHttpUrl(raw: string): { ok: true; url: URL } | { ok: false; code: UrlSafetyCode } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, code: 'INVALID_INPUT' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, code: 'RIGHTS_REJECTED' };
  }
  if (url.username || url.password) {
    return { ok: false, code: 'RIGHTS_REJECTED' };
  }
  if (isBlockedHostname(url.hostname)) {
    return { ok: false, code: 'RIGHTS_REJECTED' };
  }
  return { ok: true, url };
}

export async function assertPublicHttpUrl(
  raw: string,
  lookup: (hostname: string) => Promise<string[]> = defaultDnsLookup,
): Promise<{ ok: true; url: URL } | { ok: false; code: UrlSafetyCode }> {
  const parsed = parseHttpUrl(raw);
  if (!parsed.ok) return parsed;
  const host = parsed.url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) || coerceIpv4(host)) {
    return isNonPublicIp(host) ? fail('RIGHTS_REJECTED') : { ok: true, url: parsed.url };
  }
  let addresses: string[];
  try {
    addresses = await lookup(host);
  } catch {
    return fail('URL_UNREACHABLE');
  }
  if (!addresses.length || addresses.some((address) => isNonPublicIp(address) || isBlockedHostname(address))) {
    return fail('RIGHTS_REJECTED');
  }
  return { ok: true, url: parsed.url };
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

export async function fetchPublicHtml(rawUrl: string, deps: UrlFetchDeps = {}): Promise<PublicHtmlResult> {
  const fetchImpl = deps.fetch ?? fetch;
  const lookup = deps.lookup ?? defaultDnsLookup;
  const timeoutMs = deps.timeoutMs ?? URL_FETCH_TIMEOUT_MS;
  const maxBytes = deps.maxBytes ?? URL_MAX_RESPONSE_BYTES;
  const visited = new Set<string>();
  let current = rawUrl;

  for (let hops = 0; hops <= URL_MAX_REDIRECTS; hops += 1) {
    const safety = await assertPublicHttpUrl(current, lookup);
    if (!safety.ok) return safety;
    if (visited.has(safety.url.href)) return fail('URL_UNREACHABLE');
    visited.add(safety.url.href);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(safety.url.href, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });
    } catch {
      return fail('URL_UNREACHABLE');
    } finally {
      clearTimeout(timer);
    }

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get('location');
      if (!location || hops === URL_MAX_REDIRECTS) return fail('URL_UNREACHABLE');
      try {
        current = new URL(location, safety.url).href;
      } catch {
        return fail('URL_UNREACHABLE');
      }
      continue;
    }

    if (!response.ok) return fail('URL_UNREACHABLE');

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) return fail('URL_UNREACHABLE');

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return fail('URL_UNREACHABLE');

    let body: Uint8Array;
    try {
      body = new Uint8Array(await response.arrayBuffer());
    } catch {
      return fail('URL_UNREACHABLE');
    }
    if (body.byteLength > maxBytes) return fail('URL_UNREACHABLE');
    return { ok: true, html: new TextDecoder().decode(body), finalUrl: safety.url.href };
  }

  return fail('URL_UNREACHABLE');
}
