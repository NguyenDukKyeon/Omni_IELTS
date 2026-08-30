import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import mammoth from 'mammoth';
import { failExtraction, paragraphsToBlocks, succeedExtraction, toBuffer, type ExtractionInput, type ExtractionResult } from './types';

export async function extractDocx(input: ExtractionInput): Promise<ExtractionResult> {
  if (typeof input.content === 'string' && input.content.trim().length < 20) {
    return failExtraction(
      'UNSUPPORTED_FORMAT',
      'Tệp DOCX không hợp lệ. Hãy chọn tệp Word hoặc dán văn bản.',
    );
  }

  try {
    const converted = await mammoth.convertToHtml({ buffer: toBuffer(input.content) });
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const purify = createDOMPurify(dom.window);
    const cleanHtml = purify.sanitize(converted.value || '');
    const parsed = new JSDOM(`<div>${cleanHtml}</div>`);
    const nodes = [...parsed.window.document.querySelectorAll('p, h1, h2, h3, h4, li, td, th')];
    const paragraphs = nodes
      .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const blocks = paragraphsToBlocks(paragraphs);
    if (blocks.length === 0) {
      return failExtraction(
        'MALFORMED_DOCUMENT',
        'Không đọc được nội dung DOCX. Hãy dán văn bản thủ công.',
      );
    }
    const result = succeedExtraction(blocks.map((block) => block.text).join('\n\n'), blocks, 'mammoth');
    if (result.success) {
      result.version.extractionReport = {
        extractor: 'mammoth',
        extractedAt: new Date().toISOString(),
        sanitizationApplied: ['dompurify', 'mammoth-html'],
        warnings: converted.messages.map((message) => message.message),
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
