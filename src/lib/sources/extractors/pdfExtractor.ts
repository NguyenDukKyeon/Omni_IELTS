import { PDFParse } from 'pdf-parse';
import { failExtraction, paragraphsToBlocks, succeedExtraction, toUint8Array, type ExtractionInput, type ExtractionResult } from './types';
import type { SourceBlock } from '../../../types/sources';

export async function extractPdf(input: ExtractionInput): Promise<ExtractionResult> {
  if (typeof input.content === 'string' && input.content.trim().length < 20) {
    return failExtraction(
      'UNSUPPORTED_FORMAT',
      'PDF không có lớp văn bản hợp lệ. Hãy dán nội dung hoặc dùng PDF có text-layer.',
    );
  }

  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: toUint8Array(input.content) });
    const extracted = await parser.getText();
    const pages = extracted.pages ?? [];
    const blocks: SourceBlock[] = [];
    for (const page of pages) {
      const paragraphs = String(page.text || '')
        .split(/\n\s*\n/)
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const pageBlocks = paragraphsToBlocks(paragraphs, page.num);
      for (const block of pageBlocks) {
        blocks.push({ ...block, id: `b_${String(blocks.length + 1).padStart(3, '0')}`, order: blocks.length + 1 });
      }
    }

    if (blocks.length === 0) {
      return failExtraction(
        'PDF_SCANNED_NO_TEXT',
        'PDF này không có lớp chữ để trích. Hãy dán văn bản hoặc xử lý OCR trước khi nhập.',
        { suggestedActionVi: 'Dán nội dung PDF hoặc tải bản text-layer.' },
      );
    }

    const result = succeedExtraction(blocks.map((block) => block.text).join('\n\n'), blocks, 'pdf-parse');
    if (result.success) {
      result.version.pageCount = pages.length;
      result.version.extractionReport = {
        extractor: 'pdf-parse',
        extractedAt: new Date().toISOString(),
        sanitizationApplied: ['text-layer'],
        warnings: [],
      };
    }
    return result;
  } catch {
    return failExtraction(
      'EXTRACTION_FAILED',
      'Không đọc được PDF. Tệp có thể hỏng hoặc bị mã hóa. Hãy dán văn bản thủ công.',
    );
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}
