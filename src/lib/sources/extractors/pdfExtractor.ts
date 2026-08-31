import { failExtraction, paragraphsToBlocks, succeedExtraction, toUint8Array, type ExtractionInput, type ExtractionResult } from './types';
import type { SourceBlock } from '../../../types/sources';
import { binaryOutputWithinLimits } from '../binaryResourceLimits.server';
import { runBoundedBinaryExtraction, type BinaryExtractionResult } from '../binaryExtractionWorker.server';

export type PdfExtractionOptions = {
  runBoundedBinaryExtraction?: (kind: 'pdf', content: Uint8Array) => Promise<BinaryExtractionResult>;
};

export async function extractPdf(input: ExtractionInput, options?: PdfExtractionOptions): Promise<ExtractionResult> {
  if (typeof input.content === 'string' && input.content.trim().length < 20) {
    return failExtraction(
      'UNSUPPORTED_FORMAT',
      'PDF không có lớp văn bản hợp lệ. Hãy dán nội dung hoặc dùng PDF có text-layer.',
    );
  }

  try {
    const run = options?.runBoundedBinaryExtraction ?? runBoundedBinaryExtraction;
    const extracted = await run('pdf', toUint8Array(input.content));
    if (extracted.ok === false) {
      const code = extracted.code === 'RESOURCE_LIMIT_EXCEEDED' ? 'RESOURCE_LIMIT_EXCEEDED' : 'EXTRACTION_FAILED';
      return failExtraction(
        code,
        code === 'RESOURCE_LIMIT_EXCEEDED'
          ? 'PDF vượt quá giới hạn an toàn để xử lý. Chưa tạo phiên bản nguồn.'
          : 'Không đọc được PDF. Chưa tạo phiên bản nguồn.',
        { suggestedActionVi: 'Chọn PDF text-layer khác hoặc dán văn bản thủ công rồi thử lại.' },
      );
    }
    if (extracted.kind !== 'pdf') {
      return failExtraction(
        'EXTRACTION_FAILED',
        'Không đọc được PDF. Chưa tạo phiên bản nguồn.',
        { suggestedActionVi: 'Chọn PDF text-layer khác hoặc dán văn bản thủ công rồi thử lại.' },
      );
    }
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

    const plainText = blocks.map((block) => block.text).join('\n\n');
    if (!binaryOutputWithinLimits(plainText, blocks.length)) {
      return failExtraction(
        'RESOURCE_LIMIT_EXCEEDED',
        'Nội dung PDF vượt quá giới hạn văn bản an toàn. Chưa tạo phiên bản nguồn.',
        { suggestedActionVi: 'Chọn tài liệu ngắn hơn hoặc chia tài liệu thành các phần nhỏ hơn.' },
      );
    }
    const result = succeedExtraction(plainText, blocks, 'pdf-parse');
    if (result.success) {
      result.version.pageCount = extracted.total;
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
  }
}
