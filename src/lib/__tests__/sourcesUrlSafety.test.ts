import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractUrl } from '../sources/extractors/urlExtractor';

const PUBLIC_IPV4 = '93.184.216.34';
const ARTICLE_HTML = `<!DOCTYPE html><html><head><title>Climate Policy</title></head>
<body><article><h1>Climate Policy</h1>
<p>The transition toward renewable energy represents a monumental macroeconomic shift in fiscal planning.</p>
<p>Governments now treat capital expenditure in clean technology as a core stability claim for the decade.</p>
</article></body></html>`;

function htmlResponse(body = ARTICLE_HTML, extras: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(body, {
    status: extras.status ?? 200,
    headers: { 'content-type': 'text/html; charset=utf-8', ...(extras.headers ?? {}) },
  });
}

describe('P03 URL extraction SSRF controls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ['http://127.0.0.1/secret'],
    ['http://localhost/admin'],
    ['http://[::1]/'],
    ['http://169.254.169.254/latest/meta-data'],
    ['http://192.168.10.12/intranet'],
    ['http://10.0.0.8/private'],
    ['http://172.16.4.4/private'],
    ['file:///etc/passwd'],
    ['ftp://example.com/file'],
  ])('does not fetch blocked URL %s', async (target) => {
    const globalFetch = vi.fn(async () => htmlResponse());
    vi.stubGlobal('fetch', globalFetch);
    const fetchImpl = vi.fn(async () => htmlResponse());
    const lookup = vi.fn(async () => {
      throw new Error(`lookup must not run for ${target}`);
    });

    const result = await extractUrl(
      { type: 'url', content: target, title: 'Blocked' },
      { fetch: fetchImpl, lookup },
    );

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(globalFetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(['RIGHTS_REJECTED', 'URL_UNREACHABLE']).toContain(result.error?.code);
    const serialized = JSON.stringify(result.error);
    expect(serialized).not.toContain('127.0.0.1');
    expect(serialized).not.toContain('ECONNREFUSED');
    expect(serialized).not.toMatch(/HTTP\s*\d{3}/);
  });

  it('allows a valid public HTTPS path after DNS proves a public address', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://example.com/climate-policy');
      return htmlResponse();
    });
    const lookup = vi.fn(async (hostname: string) => {
      expect(hostname).toBe('example.com');
      return [PUBLIC_IPV4];
    });

    const result = await extractUrl(
      { type: 'url', content: 'https://example.com/climate-policy', title: 'Climate' },
      { fetch: fetchImpl, lookup },
    );

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.version?.plainText).toMatch(/renewable energy/i);
  });

  it('rejects a redirect to a private address before a second fetch', async () => {
    const fetched: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      fetched.push(String(input));
      return new Response(null, {
        status: 302,
        headers: { Location: 'http://127.0.0.1/secret' },
      });
    });
    const lookup = vi.fn(async () => [PUBLIC_IPV4]);

    const result = await extractUrl(
      { type: 'url', content: 'https://example.com/climate-policy', title: 'Climate' },
      { fetch: fetchImpl, lookup },
    );

    expect(fetched).toEqual(['https://example.com/climate-policy']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('RIGHTS_REJECTED');
    expect(JSON.stringify(result.error)).not.toContain('127.0.0.1');
  });

  it('returns a typed recovery state for oversized and non-HTML responses', async () => {
    const lookup = vi.fn(async () => [PUBLIC_IPV4]);

    const nonHtmlFetch = vi.fn(async () => new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    const nonHtml = await extractUrl(
      { type: 'url', content: 'https://example.com/climate-policy', title: 'Climate' },
      { fetch: nonHtmlFetch, lookup },
    );
    expect(nonHtml.success).toBe(false);
    expect(nonHtml.error?.code).toBe('URL_UNREACHABLE');
    expect(nonHtml.error?.userMessageVi).not.toContain('application/json');

    const oversizedFetch = vi.fn(async () => htmlResponse('<html><body><p>too big</p></body></html>', {
      headers: { 'content-length': String(2_000_000) },
    }));
    const oversized = await extractUrl(
      { type: 'url', content: 'https://example.com/climate-policy', title: 'Climate' },
      { fetch: oversizedFetch, lookup, maxBytes: 64_000 },
    );
    expect(oversized.success).toBe(false);
    expect(oversized.error?.code).toBe('URL_UNREACHABLE');
    expect(oversized.error?.userMessageVi).not.toContain('2000000');
  });
});
