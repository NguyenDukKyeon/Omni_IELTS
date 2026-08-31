import http from 'node:http';
import https from 'node:https';
import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

export const URL_FETCH_TIMEOUT_MS = 10_000;
export const URL_MAX_RESPONSE_BYTES = 1_048_576; // 1 MiB
export const URL_MAX_REDIRECTS = 3;

const ALLOWED_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml']);

const reserved = new BlockList();
// IPv4
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
reserved.addAddress('255.255.255.255', 'ipv4');

// IPv6
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

export type HttpResponseData = {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: Uint8Array;
  finalUrl: string;
};

export type HttpPinnedRequester = (
  url: URL,
  pinnedIp: string,
  options: {
    timeoutMs: number;
    maxBytes: number;
    signal?: AbortSignal;
  }
) => Promise<HttpResponseData>;

export type UrlFetchDeps = {
  lookup?: (hostname: string) => Promise<string[]>;
  timeoutMs?: number;
  maxBytes?: number;
  request?: HttpPinnedRequester;
};

export type PublicHtmlResult = {
  ok: boolean;
  html?: string;
  finalUrl?: string;
  code?: UrlSafetyCode;
};

export type UrlAssertion = {
  ok: boolean;
  url?: URL;
  pinnedIp?: string;
  code?: UrlSafetyCode;
};

function fail(code: UrlSafetyCode): PublicHtmlResult {
  return { ok: false, code };
}

export async function defaultDnsLookup(hostname: string): Promise<string[]> {
  const results = await dnsLookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => entry.address);
}

function coerceIpv4(hostname: string): string | null {
  if (isIP(hostname) === 4) return hostname;
  // dword decimal (e.g. 2130706433 = 127.0.0.1)
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
  // hex integer (e.g. 0x7f000001 = 127.0.0.1)
  if (/^0x[0-9a-fA-F]+$/i.test(hostname)) {
    const value = Number.parseInt(hostname, 16);
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

function extractEmbeddedIpv4(ipv6: string): string | null {
  const lower = ipv6.toLowerCase().replace(/^\[|\]$/g, '');

  // ::ffff:127.0.0.1 or ::ffff:7f00:1 (IPv4-mapped)
  const mappedDotted = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedDotted) return mappedDotted[1];
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = Number.parseInt(mappedHex[1], 16);
    const lo = Number.parseInt(mappedHex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }

  // ::127.0.0.1 or ::7f00:1 (IPv4-compatible)
  const compatDotted = lower.match(/^::(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (compatDotted && compatDotted[1] !== '0.0.0.0') return compatDotted[1];
  const compatHex = lower.match(/^::([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (compatHex && compatHex[1] !== '0' && compatHex[2] !== '1') {
    const hi = Number.parseInt(compatHex[1], 16);
    const lo = Number.parseInt(compatHex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }

  // 6to4 prefix (2002::/16)
  const sixToFour = lower.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})/);
  if (sixToFour) {
    const hi = Number.parseInt(sixToFour[1], 16);
    const lo = Number.parseInt(sixToFour[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }

  // NAT64 well-known prefix (64:ff9b::/96)
  const nat64Dotted = lower.match(/^64:ff9b::(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (nat64Dotted) return nat64Dotted[1];

  return null;
}

export function isNonPublicIp(address: string): boolean {
  const host = address.replace(/^\[|\]$/g, '');
  const directIpv4 = coerceIpv4(host);
  if (directIpv4) return reserved.check(directIpv4, 'ipv4');

  const embedded = extractEmbeddedIpv4(host);
  if (embedded) {
    if (reserved.check(embedded, 'ipv4')) return true;
  }

  if (isIP(host) === 6) {
    return reserved.check(host, 'ipv6');
  }

  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localdomain') ||
    host.endsWith('.lan') ||
    host.endsWith('.home') ||
    host.endsWith('.corp')
  ) {
    return true;
  }
  return isNonPublicIp(host);
}

function parseHttpUrl(raw: string): UrlAssertion {
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
  if (url.protocol === 'http:' && url.port && url.port !== '80') {
    return { ok: false, code: 'RIGHTS_REJECTED' };
  }
  if (url.protocol === 'https:' && url.port && url.port !== '443') {
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
): Promise<UrlAssertion> {
  const parsed = parseHttpUrl(raw);
  if (!parsed.ok || !parsed.url) return { ok: false, code: parsed.code ?? 'INVALID_INPUT' };

  const host = parsed.url.hostname.replace(/^\[|\]$/g, '');
  const directIpv4 = coerceIpv4(host);
  if (directIpv4) {
    return isNonPublicIp(directIpv4)
      ? { ok: false, code: 'RIGHTS_REJECTED' }
      : { ok: true, url: parsed.url, pinnedIp: directIpv4 };
  }

  const embeddedIpv4 = extractEmbeddedIpv4(host);
  if (embeddedIpv4 && isNonPublicIp(embeddedIpv4)) {
    return { ok: false, code: 'RIGHTS_REJECTED' };
  }

  if (isIP(host) === 6) {
    return isNonPublicIp(host)
      ? { ok: false, code: 'RIGHTS_REJECTED' }
      : { ok: true, url: parsed.url, pinnedIp: host };
  }

  let addresses: string[];
  try {
    addresses = await lookup(host);
  } catch {
    return { ok: false, code: 'URL_UNREACHABLE' };
  }

  if (!addresses.length || addresses.some((address) => isNonPublicIp(address) || isBlockedHostname(address))) {
    return { ok: false, code: 'RIGHTS_REJECTED' };
  }

  const pinnedIp = addresses[0];
  return { ok: true, url: parsed.url, pinnedIp };
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

export async function requestPinnedHttp(
  targetUrl: URL,
  pinnedIp: string,
  options: {
    timeoutMs: number;
    maxBytes: number;
    signal?: AbortSignal;
  }
): Promise<HttpResponseData> {
  return new Promise((resolve, reject) => {
    const isHttps = targetUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    const defaultPort = isHttps ? 443 : 80;
    const port = targetUrl.port ? Number(targetUrl.port) : defaultPort;
    const isFamily6 = isIP(pinnedIp) === 6;

    let aborted = false;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const abortRequest = (reason?: Error) => {
      if (aborted) return;
      aborted = true;
      cleanup();
      req.destroy(reason);
      reject(reason || new Error('Request aborted'));
    };

    const req = client.request({
      protocol: targetUrl.protocol,
      hostname: pinnedIp,
      port,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: 'GET',
      family: isFamily6 ? 6 : 4,
      agent: false,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Omni-Sources/1.0',
        Host: targetUrl.host,
      },
      lookup: (_hostname, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const opts = typeof options === 'object' && options ? options : {};
        const family = isFamily6 ? 6 : 4;
        if (opts && opts.all) {
          cb(null, [{ address: pinnedIp, family }]);
        } else {
          cb(null, pinnedIp, family);
        }
      },
      servername: isHttps ? targetUrl.hostname : undefined,
    });

    // Whole-lifecycle timeout: active through header read AND body consumption
    if (options.timeoutMs > 0) {
      timer = setTimeout(() => {
        abortRequest(new Error('Request timeout'));
      }, options.timeoutMs);
    }

    if (options.signal) {
      if (options.signal.aborted) {
        abortRequest(new Error('Signal aborted'));
        return;
      }
      options.signal.addEventListener('abort', () => {
        abortRequest(new Error('Signal aborted'));
      });
    }

    req.on('error', (err) => {
      cleanup();
      if (!aborted) {
        aborted = true;
        reject(err);
      }
    });

    req.on('response', (res) => {
      const statusCode = res.statusCode || 0;
      const headers: Record<string, string | string[] | undefined> = { ...res.headers };

      if (isRedirectStatus(statusCode)) {
        res.resume();
        cleanup();
        resolve({
          statusCode,
          headers,
          body: new Uint8Array(0),
          finalUrl: targetUrl.href,
        });
        return;
      }

      // Check Content-Length header upfront
      const contentLengthHeader = res.headers['content-length'];
      if (contentLengthHeader) {
        const declared = Number(contentLengthHeader);
        if (Number.isFinite(declared) && declared > options.maxBytes) {
          res.destroy();
          abortRequest(new Error('Response Content-Length exceeds maxBytes limit'));
          return;
        }
      }

      // Check Content-Type for 200 OK
      const rawContentType = res.headers['content-type'] || '';
      const contentType = rawContentType.split(';')[0].trim().toLowerCase();
      if (statusCode >= 200 && statusCode < 300 && !ALLOWED_CONTENT_TYPES.has(contentType)) {
        res.destroy();
        abortRequest(new Error(`Disallowed content-type: ${contentType}`));
        return;
      }

      // Stream body with bounded buffer size
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      res.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > options.maxBytes) {
          res.destroy();
          abortRequest(new Error('Response body exceeded maxBytes limit'));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        cleanup();
        if (aborted) return;
        const totalBuffer = Buffer.concat(chunks);
        resolve({
          statusCode,
          headers,
          body: new Uint8Array(totalBuffer),
          finalUrl: targetUrl.href,
        });
      });

      res.on('error', (err) => {
        cleanup();
        if (!aborted) {
          aborted = true;
          reject(err);
        }
      });
    });

    req.end();
  });
}

export async function fetchPublicHtml(
  rawUrl: string,
  deps: UrlFetchDeps = {}
): Promise<PublicHtmlResult> {
  const lookup = deps.lookup ?? defaultDnsLookup;
  const timeoutMs = deps.timeoutMs ?? URL_FETCH_TIMEOUT_MS;
  const maxBytes = deps.maxBytes ?? URL_MAX_RESPONSE_BYTES;
  const requester = deps.request ?? requestPinnedHttp;
  const visited = new Set<string>();
  let current = rawUrl;

  for (let hops = 0; hops <= URL_MAX_REDIRECTS; hops += 1) {
    const safety = await assertPublicHttpUrl(current, lookup);
    if (!safety.ok || !safety.url || !safety.pinnedIp) {
      return fail(safety.code ?? 'URL_UNREACHABLE');
    }
    if (visited.has(safety.url.href)) return fail('URL_UNREACHABLE');
    visited.add(safety.url.href);

    let res: HttpResponseData;
    try {
      res = await requester(safety.url, safety.pinnedIp, { timeoutMs, maxBytes });
    } catch {
      return fail('URL_UNREACHABLE');
    }

    if (isRedirectStatus(res.statusCode)) {
      const rawLocation = res.headers['location'];
      const location = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
      if (!location || hops === URL_MAX_REDIRECTS) return fail('URL_UNREACHABLE');
      try {
        current = new URL(location, safety.url).href;
      } catch {
        return fail('URL_UNREACHABLE');
      }
      continue;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) return fail('URL_UNREACHABLE');

    const rawContentType = res.headers['content-type'] || '';
    const contentType = (Array.isArray(rawContentType) ? rawContentType[0] : rawContentType).split(';')[0].trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) return fail('URL_UNREACHABLE');

    if (res.body.byteLength > maxBytes) return fail('URL_UNREACHABLE');

    return {
      ok: true,
      html: new TextDecoder().decode(res.body),
      finalUrl: safety.url.href,
    };
  }

  return fail('URL_UNREACHABLE');
}
