import { spawn } from 'node:child_process';
import {
  SOURCE_IMPORT_BINARY_WORKER_MAX_OLD_GENERATION_MB,
  SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS,
  SOURCE_IMPORT_MAX_PDF_PAGES,
  SOURCE_IMPORT_MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES,
  SOURCE_IMPORT_PDF_TIMEOUT_MS,
} from './binaryResourceLimits.server';

export type BinaryExtractionKind = 'docx' | 'pdf';

export type BinaryExtractionResult =
  | { ok: true; kind: 'docx'; html: string }
  | { ok: true; kind: 'pdf'; total: number; pages: Array<{ num: number; text: string }> }
  | { ok: false; kind: BinaryExtractionKind; code: 'RESOURCE_LIMIT_EXCEEDED' | 'BINARY_PARSE_FAILED' };

const MAX_DOCX_HTML_CHARS = SOURCE_IMPORT_MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES;
const MAX_CHILD_OUTPUT_BYTES = MAX_DOCX_HTML_CHARS * 4 + 64 * 1024;

/**
 * Binary parsers run in a short-lived child process. The process boundary is
 * intentional: parser memory and fatal V8 resource-limit exits cannot take
 * down the Express/Vitest host process.
 */
const WORKER_SOURCE = String.raw`
  let kind = 'pdf';

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
        return { ok: true, kind: 'docx', html };
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
): Promise<BinaryExtractionResult> {
  const message = JSON.stringify({
    kind,
    data: Buffer.from(content).toString('base64'),
    maxPages: SOURCE_IMPORT_MAX_PDF_PAGES,
    maxTextChars: SOURCE_IMPORT_MAX_BINARY_EXTRACTED_TEXT_CHARS,
    maxHtmlChars: MAX_DOCX_HTML_CHARS,
  });
  return new Promise((resolve) => {
    let settled = false;
    let stdout = '';
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
    }, SOURCE_IMPORT_PDF_TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
      if (Buffer.byteLength(stdout, 'utf8') > MAX_CHILD_OUTPUT_BYTES) {
        finish({ ok: false, kind, code: 'RESOURCE_LIMIT_EXCEEDED' });
      }
    });
    child.once('error', () => finish({ ok: false, kind, code: 'BINARY_PARSE_FAILED' }));
    child.once('close', (exitCode) => {
      if (settled) return;
      if (exitCode !== 0) {
        finish({ ok: false, kind, code: 'RESOURCE_LIMIT_EXCEEDED' });
        return;
      }
      try {
        finish(JSON.parse(stdout) as BinaryExtractionResult);
      } catch {
        finish({ ok: false, kind, code: 'BINARY_PARSE_FAILED' });
      }
    });
    child.stdin.once('error', () => finish({ ok: false, kind, code: 'BINARY_PARSE_FAILED' }));
    child.stdin.end(message);
  });
}
