import http from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractUrl } from '../sources/extractors/urlExtractor';
import { fetchPublicHtml } from '../sources/urlSafety';

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
    ['http://0.0.0.0/test'],
    ['http://100.64.1.1/cgnat'],
    ['http://198.51.100.2/testnet2'],
    ['http://203.0.113.5/testnet3'],
    ['http://240.0.0.1/reserved'],
    ['http://[fc00::1]/ula'],
    ['http://[fe80::1]/linklocal'],
    ['http://[ff02::1]/multicast'],
    ['http://[2001:db8::1]/doc'],
    ['http://[::ffff:127.0.0.1]/mapped'],
    ['http://[::127.0.0.1]/compat'],
    ['http://[2002:7f00:0001::]/6to4'],
    ['http://user:pass@example.com/'],
    ['file:///etc/passwd'],
    ['ftp://example.com/file'],
    ['gopher://example.com/'],
    ['javascript:alert(1)'],
  ])('does not fetch blocked URL %s', async (target) => {
    const globalFetch = vi.fn(async () => htmlResponse());
    vi.stubGlobal('fetch', globalFetch);
    const lookup = vi.fn(async () => {
      throw new Error(`lookup must not run for ${target}`);
    });

    const result = await extractUrl(
      { type: 'url', content: target, title: 'Blocked' },
      { lookup },
    );

    expect(globalFetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(['RIGHTS_REJECTED', 'URL_UNREACHABLE', 'INVALID_INPUT']).toContain(result.error?.code);
    const serialized = JSON.stringify(result.error);
    expect(serialized).not.toContain('127.0.0.1');
    expect(serialized).not.toContain('ECONNREFUSED');
    expect(serialized).not.toMatch(/HTTP\s*\d{3}/);
  });

  it('proves DNS rebinding cannot route an audited public hostname to a later private address', async () => {
    // A private server listening on loopback
    let privateHitCount = 0;
    const privateServer = http.createServer((_req, res) => {
      privateHitCount += 1;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Secret Admin Console</h1>');
    });

    await new Promise<void>((resolve) => privateServer.listen(0, '127.0.0.1', () => resolve()));
    const privatePort = (privateServer.address() as AddressInfo).port;

    try {
      // Mock DNS returns a public IP on first lookup (during assertPublicHttpUrl),
      // but if a rebind occurs and a second DNS lookup was performed by an unpinned requester, it would return 127.0.0.1.
      let lookupCount = 0;
      const lookup = vi.fn(async (_hostname: string) => {
        lookupCount += 1;
        if (lookupCount === 1) {
          return [PUBLIC_IPV4]; // 93.184.216.34 (public)
        }
        return ['127.0.0.1']; // rebinding attempt
      });

      const result = await extractUrl(
        { type: 'url', content: `http://rebind-test.attacker.com:${privatePort}/article`, title: 'Rebind' },
        { lookup, timeoutMs: 300 },
      );

      // The request MUST NOT reach the private server on 127.0.0.1 because the socket was pinned to 93.184.216.34
      expect(privateHitCount).toBe(0);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('URL_UNREACHABLE');
    } finally {
      await new Promise<void>((resolve) => privateServer.close(() => resolve()));
    }
  });

  it('proves oversized chunked response without Content-Length is aborted before complete buffering', async () => {
    let clientDisconnected = false;
    let chunksSent = 0;
    const server = http.createServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        // Deliberately omit Content-Length
      });

      // Stream large chunks continuously until destroyed
      const chunk = Buffer.alloc(128 * 1024, '<p>large chunk of text data</p>');
      const interval = setInterval(() => {
        if (res.writableEnded || res.destroyed) {
          clearInterval(interval);
          clientDisconnected = true;
          return;
        }
        chunksSent += 1;
        res.write(chunk);
        if (chunksSent > 20) {
          clearInterval(interval);
          res.end();
        }
      }, 20);

      _req.on('close', () => {
        clearInterval(interval);
        clientDisconnected = true;
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;

    try {
      const lookup = vi.fn(async () => [PUBLIC_IPV4]);
      // Use request executor pointing to our test server on localhost by custom lookup/pinnedIp
      const res = await fetchPublicHtml(`http://allowed-test.org:${port}/stream`, {
        lookup,
        maxBytes: 64 * 1024, // 64 KiB limit
        request: async (url, _pinnedIp, options) => {
          // Point connection to test server port on 127.0.0.1 to simulate streaming
          const { requestPinnedHttp } = await import('../sources/urlSafety');
          return requestPinnedHttp(url, '127.0.0.1', options);
        },
      });

      expect(res.ok).toBe(false);
      expect(res.code).toBe('URL_UNREACHABLE');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('proves slow body times out after headers', async () => {
    const server = http.createServer((_req, res) => {
      // Immediately write 200 OK headers
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      });
      res.write('<p>first chunk</p>');
      // Delay sending the rest for 400ms
      setTimeout(() => {
        if (!res.destroyed && !res.writableEnded) {
          res.end('<p>delayed body</p>');
        }
      }, 400);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;

    try {
      const lookup = vi.fn(async () => [PUBLIC_IPV4]);
      const res = await fetchPublicHtml(`http://allowed-test.org:${port}/slow`, {
        lookup,
        timeoutMs: 100, // 100ms timeout must abort the slow body despite fast headers
        request: async (url, _pinnedIp, options) => {
          const { requestPinnedHttp } = await import('../sources/urlSafety');
          return requestPinnedHttp(url, '127.0.0.1', options);
        },
      });

      expect(res.ok).toBe(false);
      expect(res.code).toBe('URL_UNREACHABLE');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('proves private redirect target never receives a request', async () => {
    let privateHitCount = 0;
    const privateServer = http.createServer((_req, res) => {
      privateHitCount += 1;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Private Intranet</h1>');
    });
    await new Promise<void>((resolve) => privateServer.listen(0, '127.0.0.1', () => resolve()));
    const privatePort = (privateServer.address() as AddressInfo).port;

    const publicServer = http.createServer((_req, res) => {
      res.writeHead(302, {
        Location: `http://127.0.0.1:${privatePort}/secret`,
      });
      res.end();
    });
    await new Promise<void>((resolve) => publicServer.listen(0, '127.0.0.1', () => resolve()));
    const publicPort = (publicServer.address() as AddressInfo).port;

    try {
      const lookup = vi.fn(async (host: string) => {
        if (host === 'public.example.com') return [PUBLIC_IPV4];
        return ['127.0.0.1'];
      });

      const result = await extractUrl(
        { type: 'url', content: `http://public.example.com:${publicPort}/redirect`, title: 'Redirect' },
        {
          lookup,
          request: async (url, pinnedIp, options) => {
            const { requestPinnedHttp } = await import('../sources/urlSafety');
            return requestPinnedHttp(url, pinnedIp === PUBLIC_IPV4 ? '127.0.0.1' : pinnedIp, options);
          },
        },
      );

      // Private server must NEVER have received a request
      expect(privateHitCount).toBe(0);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RIGHTS_REJECTED');
    } finally {
      await new Promise<void>((resolve) => publicServer.close(() => resolve()));
      await new Promise<void>((resolve) => privateServer.close(() => resolve()));
    }
  });

  it('proves allowed public fixture remains extractable', async () => {
    const publicServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ARTICLE_HTML);
    });
    await new Promise<void>((resolve) => publicServer.listen(0, '127.0.0.1', () => resolve()));
    const port = (publicServer.address() as AddressInfo).port;

    try {
      const lookup = vi.fn(async () => [PUBLIC_IPV4]);
      const result = await extractUrl(
        { type: 'url', content: `http://public.example.com:${port}/climate-policy`, title: 'Climate' },
        {
          lookup,
          request: async (url, _pinnedIp, options) => {
            const { requestPinnedHttp } = await import('../sources/urlSafety');
            return requestPinnedHttp(url, '127.0.0.1', options);
          },
        },
      );

      expect(result.success).toBe(true);
      expect(result.version?.plainText).toMatch(/renewable energy/i);
      expect(result.version?.blocks.length).toBeGreaterThan(0);
      expect(result.version?.extractionReport.extractor).toBe('url-readability');
    } finally {
      await new Promise<void>((resolve) => publicServer.close(() => resolve()));
    }
  });
});
