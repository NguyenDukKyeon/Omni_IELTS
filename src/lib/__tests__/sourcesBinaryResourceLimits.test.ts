import { describe, expect, it, vi } from 'vitest';
import { extractDocx } from '../sources/extractors/docxExtractor';
import { extractPdf } from '../sources/extractors/pdfExtractor';
import {
  inspectDocxArchive,
  SOURCE_IMPORT_MAX_BINARY_RESULT_JSON_BYTES,
  SOURCE_IMPORT_MAX_DOCX_ENTRIES,
} from '../sources/binaryResourceLimits.server';
import {
  parseBoundedBinaryExtractionOutput,
  runBoundedBinaryExtraction,
  type BinaryExtractionResult,
} from '../sources/binaryExtractionWorker.server';
import { buildValidDocx } from './fixtures/sources/buildDocuments';

const REAL_BINARY_PROCESS_TEST_TIMEOUT_MS = 20_000;

type ZipEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  method?: number;
  flags?: number;
  diskStart?: number;
  data?: Uint8Array;
};

function u16(value: number) {
  return Buffer.from([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number) {
  return Buffer.from([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.data ?? Buffer.alloc(entry.compressedSize));
    const method = entry.method ?? 8;
    const flags = entry.flags ?? 0;
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(flags), u16(method), u16(0), u16(0), u32(0),
      u32(entry.compressedSize), u32(entry.uncompressedSize), u16(name.length), u16(0), name, data,
    ]);
    localParts.push(local);
    centralParts.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(method), u16(0), u16(0), u32(0),
      u32(entry.compressedSize), u32(entry.uncompressedSize), u16(name.length), u16(0), u16(0),
      u16(entry.diskStart ?? 0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }
  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralData.length), u32(localData.length), u16(0),
  ]);
  return new Uint8Array(Buffer.concat([localData, centralData, eocd]));
}

function runnerResult(result: BinaryExtractionResult) {
  return vi.fn(async () => result);
}

describe('P03 binary import resource limits', () => {
  it('returns only bounded structured DOCX data from the isolated child', async () => {
    const result = await runBoundedBinaryExtraction('docx', buildValidDocx([
      'Ordinary DOCX content stays extractable.',
      'A second bounded paragraph remains available.',
    ]));

    expect(result.ok).toBe(true);
    if (result.ok && result.kind === 'docx') {
      expect(result.kind).toBe('docx');
      expect(result).not.toHaveProperty('html');
      expect(result.plainText).toMatch(/Ordinary DOCX content/);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0]).toEqual({ text: 'Ordinary DOCX content stays extractable.' });
    }
  }, REAL_BINARY_PROCESS_TEST_TIMEOUT_MS);

  it('rejects too many DOCX output blocks inside the isolated child', async () => {
    const result = await runBoundedBinaryExtraction('docx', buildValidDocx(
      Array.from({ length: 2_001 }, (_, index) => `bounded paragraph ${index}`),
    ));

    expect(result).toEqual({
      ok: false,
      kind: 'docx',
      code: 'RESOURCE_LIMIT_EXCEEDED',
    });
  }, REAL_BINARY_PROCESS_TEST_TIMEOUT_MS);

  it('lets the parent consume structured blocks without reading converted HTML', async () => {
    const structuredResult = Object.assign(Object.create({
      get html(): never {
        throw new Error('raw HTML must not cross the child boundary');
      },
    }), {
      ok: true as const,
      kind: 'docx' as const,
      plainText: 'Safe structured paragraph.',
      blocks: [{ text: 'Safe structured paragraph.' }],
    }) as unknown as BinaryExtractionResult;
    const worker = runnerResult(structuredResult);
    const result = await extractDocx({
      type: 'docx',
      content: buildValidDocx(['archive content']),
      title: 'Structured result',
    }, { runBoundedBinaryExtraction: worker });

    expect(result.success).toBe(true);
    expect(result.version?.plainText).toBe('Safe structured paragraph.');
    expect(worker).toHaveBeenCalledTimes(1);
  });

  it('rejects an oversized structured child result without creating a version', async () => {
    const oversizedText = 'x'.repeat(200_001);
    const worker = runnerResult({
      ok: true,
      kind: 'docx',
      plainText: oversizedText,
      blocks: [{ text: oversizedText }],
    } as unknown as BinaryExtractionResult);
    const result = await extractDocx({
      type: 'docx',
      content: buildValidDocx(['archive content']),
      title: 'Oversized structured result',
    }, { runBoundedBinaryExtraction: worker });

    expect(result.success).toBe(false);
    expect(result.version).toBeUndefined();
    expect(result.error?.code).toBe('RESOURCE_LIMIT_EXCEEDED');
  });

  it('fails closed for malformed or oversized child stdout', () => {
    expect(parseBoundedBinaryExtractionOutput('docx', '{not-json')).toEqual({
      ok: false,
      kind: 'docx',
      code: 'BINARY_PARSE_FAILED',
    });
    expect(parseBoundedBinaryExtractionOutput(
      'docx',
      'x'.repeat(SOURCE_IMPORT_MAX_BINARY_RESULT_JSON_BYTES + 1),
    )).toEqual({
      ok: false,
      kind: 'docx',
      code: 'RESOURCE_LIMIT_EXCEEDED',
    });
  });

  it('maps an isolated child timeout to a typed resource failure', async () => {
    const result = await runBoundedBinaryExtraction(
      'docx',
      buildValidDocx(['timeout fixture']),
      { timeoutMs: 1 },
    );

    expect(result).toEqual({
      ok: false,
      kind: 'docx',
      code: 'RESOURCE_LIMIT_EXCEEDED',
    });
  }, REAL_BINARY_PROCESS_TEST_TIMEOUT_MS);

  it('keeps child failure typed and safe for learner-facing DOCX extraction', async () => {
    const worker = runnerResult({ ok: false, kind: 'docx', code: 'BINARY_PARSE_FAILED' });
    const result = await extractDocx({
      type: 'docx',
      content: buildValidDocx(['archive content']),
      title: 'Child failure',
    }, { runBoundedBinaryExtraction: worker });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('MALFORMED_DOCUMENT');
    expect(result.error?.userMessageVi).not.toMatch(/html|stack|internal|child|raw|boundary/i);
  });

  it('rejects a compressed DOCX expansion ratio before Mammoth receives bytes', async () => {
    const archive = buildZip([{
      name: 'word/document.xml',
      compressedSize: 1_224,
      uncompressedSize: 200_000,
      data: Buffer.alloc(1_224),
    }]);
    const worker = runnerResult({
      ok: true,
      kind: 'docx',
      plainText: 'should not run',
      blocks: [{ text: 'should not run' }],
    });
    const inspected = inspectDocxArchive(archive);
    const result = await extractDocx({ type: 'docx', content: archive, title: 'Expansion fixture' }, {
      runBoundedBinaryExtraction: worker,
    });

    expect(inspected.ok).toBe(false);
    if (inspected.ok === false) expect(inspected.code).toBe('DOCX_COMPRESSION_RATIO_EXCEEDED');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('RESOURCE_LIMIT_EXCEEDED');
    expect(worker).not.toHaveBeenCalled();
  });

  it('rejects too many DOCX central-directory entries without materialising entry data', async () => {
    const archive = buildZip(Array.from({ length: SOURCE_IMPORT_MAX_DOCX_ENTRIES + 1 }, (_, index) => ({
      name: `word/entry-${index}.xml`,
      compressedSize: 0,
      uncompressedSize: 0,
      method: 0,
      data: new Uint8Array(),
    })));
    const result = inspectDocxArchive(archive);

    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe('DOCX_ENTRY_COUNT_EXCEEDED');
  });

  it('fails closed for malformed, encrypted, multi-disk, and unsupported archives', () => {
    expect(inspectDocxArchive(new Uint8Array(Buffer.from('PK\x03\x04broken')))).toEqual(expect.objectContaining({
      ok: false,
      code: 'DOCX_ARCHIVE_MALFORMED',
    }));
    expect(inspectDocxArchive(buildZip([{
      name: 'word/document.xml', compressedSize: 1, uncompressedSize: 1, method: 0, flags: 1, data: Buffer.from('x'),
    }]))).toEqual(expect.objectContaining({ ok: false, code: 'DOCX_ARCHIVE_ENCRYPTED' }));
    expect(inspectDocxArchive(buildZip([{
      name: 'word/document.xml', compressedSize: 1, uncompressedSize: 1, method: 0, diskStart: 1, data: Buffer.from('x'),
    }]))).toEqual(expect.objectContaining({ ok: false, code: 'DOCX_ARCHIVE_MULTI_DISK' }));
    expect(inspectDocxArchive(buildZip([{
      name: 'word/document.xml', compressedSize: 1, uncompressedSize: 1, method: 99, data: Buffer.from('x'),
    }]))).toEqual(expect.objectContaining({ ok: false, code: 'DOCX_COMPRESSION_UNSUPPORTED' }));
  });

  it('returns a typed PDF resource-limit failure without creating a version', async () => {
    const worker = runnerResult({ ok: false, kind: 'pdf', code: 'RESOURCE_LIMIT_EXCEEDED' });
    const result = await extractPdf({ type: 'pdf', content: Buffer.from('%PDF-1.7\nfixture'), title: 'PDF fixture' }, {
      runBoundedBinaryExtraction: worker,
    });

    expect(result.success).toBe(false);
    expect(result.version).toBeUndefined();
    expect(result.error?.code).toBe('RESOURCE_LIMIT_EXCEEDED');
    expect(result.error?.userMessageVi).not.toMatch(/pdfjs|worker|internal|stack/i);
    expect(result.error?.userMessageVi).not.toContain('/tmp/');
    expect(worker).toHaveBeenCalledTimes(1);
  });

  it('bounds extracted binary text and blocks without silently truncating a ready version', async () => {
    const worker = runnerResult({
      ok: true,
      kind: 'pdf',
      total: 1,
      pages: [{ num: 1, text: 'x'.repeat(200_001) }],
    });
    const result = await extractPdf({ type: 'pdf', content: Buffer.from('%PDF-1.7\nfixture'), title: 'Oversized text' }, {
      runBoundedBinaryExtraction: worker,
    });

    expect(result.success).toBe(false);
    expect(result.version).toBeUndefined();
    expect(result.error?.code).toBe('RESOURCE_LIMIT_EXCEEDED');
  });
});
