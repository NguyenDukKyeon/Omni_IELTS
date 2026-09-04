import { spawn } from 'node:child_process';
import {
  SOURCE_IMPORT_BINARY_WORKER_MAX_OLD_GENERATION_MB,
  SOURCE_IMPORT_MAX_BINARY_RESULT_JSON_BYTES,
  SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS,
  SOURCE_IMPORT_MAX_BINARY_EXTRACTED_BLOCKS,
  SOURCE_IMPORT_MAX_PDF_PAGES,
  SOURCE_IMPORT_MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES,
  SOURCE_IMPORT_PDF_TIMEOUT_MS,
} from './binaryResourceLimits.server';

export type BinaryExtractionKind = 'docx' | 'pdf';

export type BinaryTextBlock = { text: string };

export type BinaryExtractionResult =
  | { ok: true; kind: 'docx'; plainText: string; blocks: BinaryTextBlock[] }
  | { ok: true; kind: 'pdf'; total: number; pages: Array<{ num: number; text: string }> }
  | { ok: false; kind: BinaryExtractionKind; code: 'RESOURCE_LIMIT_EXCEEDED' | 'BINARY_PARSE_FAILED' };

type BinaryFailureCode = 'RESOURCE_LIMIT_EXCEEDED' | 'BINARY_PARSE_FAILED';

export type BinaryExtractionOptions = { timeoutMs?: number };

const MAX_DOCX_INTERNAL_HTML_CHARS = SOURCE_IMPORT_MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isSafeText(value: unknown): value is string {
  return typeof value === 'string' && !CONTROL_CHARACTERS.test(value);
}

function exceedsCodePointLimit(text: string, limit: number): boolean {
  if (text.length > limit * 2) return true;
  let codePoints = 0;
  for (const _codePoint of text) {
    codePoints += 1;
    if (codePoints > limit) return true;
  }
  return false;
}

function binaryFailure(kind: BinaryExtractionKind, code: BinaryFailureCode): BinaryExtractionResult {
  return { ok: false, kind, code };
}

function validateDocxResult(value: Record<string, unknown>): BinaryExtractionResult {
  if (!hasExactKeys(value, ['blocks', 'kind', 'ok', 'plainText'])) return binaryFailure('docx', 'BINARY_PARSE_FAILED');
  if (value.kind !== 'docx' || value.ok !== true || !isSafeText(value.plainText) || !Array.isArray(value.blocks)) {
    return binaryFailure('docx', 'BINARY_PARSE_FAILED');
  }
  if (value.blocks.length > SOURCE_IMPORT_MAX_BINARY_EXTRACTED_BLOCKS
    || exceedsCodePointLimit(value.plainText, SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS)) {
    return binaryFailure('docx', 'RESOURCE_LIMIT_EXCEEDED');
  }

  const blocks: BinaryTextBlock[] = [];
  let blockCodePoints = 0;
  for (const candidate of value.blocks) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ['text']) || !isSafeText(candidate.text) || !candidate.text.trim()) {
      return binaryFailure('docx', 'BINARY_PARSE_FAILED');
    }
    if (exceedsCodePointLimit(candidate.text, SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS)) {
      return binaryFailure('docx', 'RESOURCE_LIMIT_EXCEEDED');
    }
    if (candidate.text !== candidate.text.replace(/\s+/g, ' ').trim()) {
      return binaryFailure('docx', 'BINARY_PARSE_FAILED');
    }
    let textCodePoints = 0;
    for (const _codePoint of candidate.text) textCodePoints += 1;
    blockCodePoints += textCodePoints + (blocks.length ? 2 : 0);
    if (blockCodePoints > SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS) {
      return binaryFailure('docx', 'RESOURCE_LIMIT_EXCEEDED');
    }
    blocks.push({ text: candidate.text });
  }

  if (blocks.map((block) => block.text).join('\n\n') !== value.plainText) {
    return binaryFailure('docx', 'BINARY_PARSE_FAILED');
  }
  return { ok: true, kind: 'docx', plainText: value.plainText, blocks };
}

function validatePdfResult(value: Record<string, unknown>): BinaryExtractionResult {
  if (!hasExactKeys(value, ['kind', 'ok', 'pages', 'total'])) return binaryFailure('pdf', 'BINARY_PARSE_FAILED');
  if (value.kind !== 'pdf' || value.ok !== true || typeof value.total !== 'number' || !Number.isInteger(value.total) || value.total < 0 || !Array.isArray(value.pages)) {
    return binaryFailure('pdf', 'BINARY_PARSE_FAILED');
  }
  if (value.total > SOURCE_IMPORT_MAX_PDF_PAGES || value.pages.length > SOURCE_IMPORT_MAX_PDF_PAGES) {
    return binaryFailure('pdf', 'RESOURCE_LIMIT_EXCEEDED');
  }
  const pages: Array<{ num: number; text: string }> = [];
  let textCodePoints = 0;
  for (const candidate of value.pages) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ['num', 'text']) || typeof candidate.num !== 'number'
      || !Number.isInteger(candidate.num) || candidate.num < 1 || candidate.num > SOURCE_IMPORT_MAX_PDF_PAGES
      || !isSafeText(candidate.text)) {
      return binaryFailure('pdf', 'BINARY_PARSE_FAILED');
    }
    if (exceedsCodePointLimit(candidate.text, SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS)) {
      return binaryFailure('pdf', 'RESOURCE_LIMIT_EXCEEDED');
    }
    for (const _codePoint of candidate.text) textCodePoints += 1;
    if (textCodePoints > SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS) {
      return binaryFailure('pdf', 'RESOURCE_LIMIT_EXCEEDED');
    }
    pages.push({ num: candidate.num, text: candidate.text });
  }
  return { ok: true, kind: 'pdf', total: value.total, pages };
}

/** Validate the only structured payload allowed to cross the child boundary. */
export function validateBoundedBinaryExtractionResult(
  kind: BinaryExtractionKind,
  value: unknown,
): BinaryExtractionResult {
  if (!isRecord(value)) return binaryFailure(kind, 'BINARY_PARSE_FAILED');
  if (value.ok === false) {
    if (!hasExactKeys(value, ['code', 'kind', 'ok']) || value.kind !== kind
      || (value.code !== 'RESOURCE_LIMIT_EXCEEDED' && value.code !== 'BINARY_PARSE_FAILED')) {
      return binaryFailure(kind, 'BINARY_PARSE_FAILED');
    }
    return { ok: false, kind, code: value.code };
  }
  if (kind === 'docx') return validateDocxResult(value);
  return validatePdfResult(value);
}

export function parseBoundedBinaryExtractionOutput(
  kind: BinaryExtractionKind,
  output: string | Uint8Array,
): BinaryExtractionResult {
  const byteLength = typeof output === 'string' ? Buffer.byteLength(output, 'utf8') : output.byteLength;
  if (byteLength > SOURCE_IMPORT_MAX_BINARY_RESULT_JSON_BYTES) {
    return binaryFailure(kind, 'RESOURCE_LIMIT_EXCEEDED');
  }
  let json: string;
  try {
    json = typeof output === 'string'
      ? output
      : new TextDecoder('utf-8', { fatal: true }).decode(output);
  } catch {
    return binaryFailure(kind, 'BINARY_PARSE_FAILED');
  }
  try {
    return validateBoundedBinaryExtractionResult(kind, JSON.parse(json) as unknown);
  } catch {
    return binaryFailure(kind, 'BINARY_PARSE_FAILED');
  }
}

/**
 * Binary parsers run in a short-lived child process. The process boundary is
 * intentional: parser memory and fatal V8 resource-limit exits cannot take
 * down the Express/Vitest host process.
 */
const WORKER_SOURCE = String.raw`
  let kind = 'pdf';

  const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

  function normalizeBlockText(text) {
    return text
      .replace(CONTROL_CHARACTERS, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function countCodePoints(text) {
    let count = 0;
    for (const _codePoint of text) count += 1;
    return count;
  }

  async function extract(message) {
    let parser;
    try {
      kind = message.kind;
      if (message.kind === 'docx') {
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default || mammothModule;
        const converted = await mammoth.convertToHtml({ buffer: Buffer.from(message.data, 'base64') });
        const html = String(converted.value || '');
        if (html.length > message.maxHtmlChars) {
          return { ok: false, kind: 'docx', code: 'RESOURCE_LIMIT_EXCEEDED' };
        }
        const { JSDOM } = await import('jsdom');
        const domPurifyModule = await import('dompurify');
        const createDOMPurify = domPurifyModule.default || domPurifyModule;
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        const purify = createDOMPurify(dom.window);
        const cleanHtml = purify.sanitize(html);
        const parsed = new JSDOM('<div>' + cleanHtml + '</div>');
        const nodes = [...parsed.window.document.querySelectorAll('p, h1, h2, h3, h4, li, td, th')];
        const blocks = [];
        let textCodePoints = 0;
        for (const node of nodes) {
          const text = normalizeBlockText(node.textContent || '');
          if (!text) continue;
          if (blocks.length >= message.maxBlocks) {
            return { ok: false, kind: 'docx', code: 'RESOURCE_LIMIT_EXCEEDED' };
          }
          textCodePoints += countCodePoints(text) + (blocks.length ? 2 : 0);
          if (textCodePoints > message.maxTextChars) {
            return { ok: false, kind: 'docx', code: 'RESOURCE_LIMIT_EXCEEDED' };
          }
          blocks.push({ text });
        }
        return {
          ok: true,
          kind: 'docx',
          plainText: blocks.map((block) => block.text).join('\n\n'),
          blocks,
        };
      }

      const { PDFParse } = await import('pdf-parse');
      parser = new PDFParse({
        data: new Uint8Array(Buffer.from(message.data, 'base64')),
        stopAtErrors: true,
        maxImageSize: 12000000,
      });
      const extracted = await parser.getText({ first: message.maxPages });
      const pages = (extracted.pages || []).map((page) => ({ num: Number(page.num), text: String(page.text || '') }));
      const total = Number(extracted.total || pages.length);
      const textLength = pages.reduce((sum, page) => sum + Array.from(page.text).length, 0);
      if (!Number.isFinite(total) || total > message.maxPages || pages.length > message.maxPages || textLength > message.maxTextChars) {
        return { ok: false, kind: 'pdf', code: 'RESOURCE_LIMIT_EXCEEDED' };
      }
      return { ok: true, kind: 'pdf', total, pages };
    } catch {
      return { ok: false, kind, code: 'BINARY_PARSE_FAILED' };
    } finally {
      try { await parser?.destroy(); } catch {}
    }
  }

  const chunks = [];
  process.stdin.on('data', (chunk) => chunks.push(chunk));
  process.stdin.on('end', async () => {
    let message;
    try {
      message = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      process.stdout.write(JSON.stringify({ ok: false, kind, code: 'BINARY_PARSE_FAILED' }));
      return;
    }
    const result = await extract(message);
    process.stdout.write(JSON.stringify(result));
  });
`;

export async function runBoundedBinaryExtraction(
  kind: BinaryExtractionKind,
  content: Uint8Array,
  options?: BinaryExtractionOptions,
): Promise<BinaryExtractionResult> {
  const message = JSON.stringify({
    kind,
    data: Buffer.from(content).toString('base64'),
    maxPages: SOURCE_IMPORT_MAX_PDF_PAGES,
    maxTextChars: SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS,
    maxBlocks: SOURCE_IMPORT_MAX_BINARY_EXTRACTED_BLOCKS,
    maxHtmlChars: MAX_DOCX_INTERNAL_HTML_CHARS,
  });
  return new Promise((resolve) => {
    let settled = false;
    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let timeout: NodeJS.Timeout;
    const child = spawn(process.execPath, [
      `--max-old-space-size=${SOURCE_IMPORT_BINARY_WORKER_MAX_OLD_GENERATION_MB}`,
      '--max-semi-space-size=32',
      '-e',
      WORKER_SOURCE,
    ], {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });
    const finish = (result: BinaryExtractionResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (!child.killed) child.kill();
      resolve(result);
    };
    timeout = setTimeout(() => {
      finish({ ok: false, kind, code: 'RESOURCE_LIMIT_EXCEEDED' });
    }, options?.timeoutMs ?? SOURCE_IMPORT_PDF_TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (stdoutBytes + bytes.byteLength > SOURCE_IMPORT_MAX_BINARY_RESULT_JSON_BYTES) {
        finish({ ok: false, kind, code: 'RESOURCE_LIMIT_EXCEEDED' });
        return;
      }
      stdoutChunks.push(bytes);
      stdoutBytes += bytes.byteLength;
    });
    child.once('error', () => finish({ ok: false, kind, code: 'BINARY_PARSE_FAILED' }));
    child.once('close', (exitCode) => {
      if (settled) return;
      if (exitCode !== 0) {
        finish({ ok: false, kind, code: 'RESOURCE_LIMIT_EXCEEDED' });
        return;
      }
      finish(parseBoundedBinaryExtractionOutput(kind, Buffer.concat(stdoutChunks, stdoutBytes)));
    });
    child.stdin.once('error', () => finish({ ok: false, kind, code: 'BINARY_PARSE_FAILED' }));
    child.stdin.end(message);
  });
}
