import { failExtraction, succeedExtraction, toBlockId, toUint8Array, type ExtractionInput, type ExtractionResult } from './types';
import type { SourceBlock } from '../../../types/sources';
import { binaryOutputWithinLimits, inspectDocxArchive, isDocxResourceLimitCode } from '../binaryResourceLimits.server';
import {
  runBoundedBinaryExtraction,
  validateBoundedBinaryExtractionResult,
  type BinaryExtractionResult,
} from '../binaryExtractionWorker.server';

export type DocxExtractionOptions = {
  runBoundedBinaryExtraction?: (kind: 'docx', content: Uint8Array) => Promise<BinaryExtractionResult>;
};

export async function extractDocx(input: ExtractionInput, options?: DocxExtractionOptions): Promise<ExtractionResult> {
  if (typeof input.content === 'string' && input.content.trim().length < 20) {
    return failExtraction(
      'UNSUPPORTED_FORMAT',
      'Tệp DOCX không hợp lệ. Hãy chọn tệp Word hoặc dán văn bản.',
    );
  }

  const bytes = toUint8Array(input.content);
  const archive = inspectDocxArchive(bytes);
  if (archive.ok === false) {
    const code = isDocxResourceLimitCode(archive.code) ? 'RESOURCE_LIMIT_EXCEEDED' : 'MALFORMED_DOCUMENT';
    return failExtraction(
      code,
      code === 'RESOURCE_LIMIT_EXCEEDED'
        ? 'Tệp DOCX vượt quá giới hạn an toàn để xử lý. Chưa tạo phiên bản nguồn.'
        : 'Tệp DOCX bị hỏng hoặc có cấu trúc không được hỗ trợ. Chưa tạo phiên bản nguồn.',
      { suggestedActionVi: 'Chọn tệp DOCX khác hoặc dán văn bản thủ công rồi thử lại.' },
    );
  }

  try {
    const run = options?.runBoundedBinaryExtraction ?? runBoundedBinaryExtraction;
    const converted = await run('docx', bytes);
    if (converted.ok === false) {
      const code = converted.code === 'RESOURCE_LIMIT_EXCEEDED' ? 'RESOURCE_LIMIT_EXCEEDED' : 'MALFORMED_DOCUMENT';
      return failExtraction(
        code,
        code === 'RESOURCE_LIMIT_EXCEEDED'
          ? 'Tệp DOCX vượt quá giới hạn an toàn để xử lý. Chưa tạo phiên bản nguồn.'
          : 'Không đọc được tệp DOCX. Chưa tạo phiên bản nguồn.',
        { suggestedActionVi: 'Chọn tệp DOCX khác hoặc dán văn bản thủ công rồi thử lại.' },
      );
    }
    const bounded = validateBoundedBinaryExtractionResult('docx', converted);
    if (bounded.ok === false) {
      const code = bounded.code === 'RESOURCE_LIMIT_EXCEEDED' ? 'RESOURCE_LIMIT_EXCEEDED' : 'MALFORMED_DOCUMENT';
      return failExtraction(
        code,
        code === 'RESOURCE_LIMIT_EXCEEDED'
          ? 'Tệp DOCX vượt quá giới hạn an toàn để xử lý. Chưa tạo phiên bản nguồn.'
          : 'Không đọc được tệp DOCX. Chưa tạo phiên bản nguồn.',
        { suggestedActionVi: 'Chọn tệp DOCX khác hoặc dán văn bản thủ công rồi thử lại.' },
      );
    }
    if (bounded.kind !== 'docx') {
      return failExtraction(
        'MALFORMED_DOCUMENT',
        'Không đọc được tệp DOCX. Chưa tạo phiên bản nguồn.',
        { suggestedActionVi: 'Chọn tệp DOCX khác hoặc dán văn bản thủ công rồi thử lại.' },
      );
    }
    const blocks: SourceBlock[] = bounded.blocks.map((block, index) => ({
      id: toBlockId(index + 1),
      order: index + 1,
      type: 'paragraph',
      text: block.text,
    }));
    if (blocks.length === 0) {
      return failExtraction(
        'MALFORMED_DOCUMENT',
        'Không đọc được nội dung DOCX. Hãy dán văn bản thủ công.',
      );
    }
    const plainText = bounded.plainText;
    if (blocks.map((block) => block.text).join('\n\n') !== plainText) {
      return failExtraction(
        'MALFORMED_DOCUMENT',
        'Không đọc được nội dung DOCX. Hãy dán văn bản thủ công.',
      );
    }
    if (!binaryOutputWithinLimits(plainText, blocks.length)) {
      return failExtraction(
        'RESOURCE_LIMIT_EXCEEDED',
        'Nội dung DOCX vượt quá giới hạn văn bản an toàn. Chưa tạo phiên bản nguồn.',
        { suggestedActionVi: 'Chọn tài liệu ngắn hơn hoặc chia tài liệu thành các phần nhỏ hơn.' },
      );
    }
    const result = succeedExtraction(plainText, blocks, 'mammoth');
    if (result.success) {
      result.version.extractionReport = {
        extractor: 'mammoth',
        extractedAt: new Date().toISOString(),
        sanitizationApplied: ['dompurify', 'mammoth-html'],
        warnings: [],
      };
    }
    return result;
  } catch {
    return failExtraction(
      'MALFORMED_DOCUMENT',
      'Tệp DOCX bị hỏng hoặc không đọc được. Hãy dán văn bản thủ công.',
    );
  }
}
