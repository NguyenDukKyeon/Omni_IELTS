import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractDocument } from '../sources/extractors';
import { extractUrl } from '../sources/extractors/urlExtractor';
import {
  PUBLIC_ARTICLE_HTML,
  buildScannedPdf,
  buildTextLayerPdf,
  buildValidDocx,
} from './fixtures/sources/buildDocuments';

describe('P03 extractor fixtures', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('extracts a valid text-layer PDF', async () => {
    const result = await extractDocument({
      type: 'pdf',
      content: buildTextLayerPdf('Urban heat islands change climate policy.'),
      title: 'Urban Heat',
    });
    expect(result.success).toBe(true);
    expect(result.version?.plainText).toMatch(/Urban heat islands/i);
    expect(result.version?.blocks.length).toBeGreaterThan(0);
  });

  it('rejects a scanned image-only PDF without fabricating text', async () => {
    const result = await extractDocument({
      type: 'pdf',
      content: buildScannedPdf(),
      title: 'Scan',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PDF_SCANNED_NO_TEXT');
    expect(result.error?.userMessageVi).not.toMatch(/\/tmp\/|HTTP 429/i);
  });

  it('extracts a valid DOCX', async () => {
    const result = await extractDocument({
      type: 'docx',
      content: buildValidDocx([
        'Urban heat islands change city climate policy.',
        'Second paragraph of the academic report.',
      ]),
      title: 'Report',
    });
    expect(result.success).toBe(true);
    expect(result.version?.blocks).toHaveLength(2);
    expect(result.version?.blocks[0].text).toMatch(/Urban heat islands/);
  });

  it('rejects a malformed DOCX', async () => {
    const result = await extractDocument({
      type: 'docx',
      content: new TextEncoder().encode('PK\x03\x04not-a-docx'),
      title: 'Broken',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('MALFORMED_DOCUMENT');
  });

  it('extracts an allowed public HTML fixture without live internet', async () => {
    const fetchImpl = vi.fn(async () => new Response(PUBLIC_ARTICLE_HTML, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }));
    const result = await extractUrl(
      { type: 'url', content: 'https://example.com/climate-policy', title: 'Climate' },
      { fetch: fetchImpl, lookup: async () => ['93.184.216.34'] },
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.version?.plainText).toMatch(/renewable energy/i);
  });

  it('does not fetch blocked URLs and types oversized or non-HTML recoveries', async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal('fetch', globalFetch);
    const blocked = await extractDocument({
      type: 'url',
      content: 'http://127.0.0.1/secret',
      title: 'Blocked',
    });
    expect(globalFetch).not.toHaveBeenCalled();
    expect(blocked.success).toBe(false);
    expect(['RIGHTS_REJECTED', 'URL_UNREACHABLE']).toContain(blocked.error?.code);

    const nonHtml = await extractUrl(
      { type: 'url', content: 'https://example.com/file.json', title: 'JSON' },
      {
        fetch: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
        lookup: async () => ['93.184.216.34'],
      },
    );
    expect(nonHtml.error?.code).toBe('URL_UNREACHABLE');

    const oversized = await extractUrl(
      { type: 'url', content: 'https://example.com/huge', title: 'Huge' },
      {
        fetch: async () => new Response('<html></html>', {
          status: 200,
          headers: { 'content-type': 'text/html', 'content-length': '5000000' },
        }),
        lookup: async () => ['93.184.216.34'],
      },
    );
    expect(oversized.error?.code).toBe('URL_UNREACHABLE');
  });
});
