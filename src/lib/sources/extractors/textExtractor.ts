import { failExtraction, paragraphsToBlocks, succeedExtraction, type ExtractionInput, type ExtractionResult } from './types';

export function extractTextBlocks(input: ExtractionInput): ExtractionResult {
  const raw = typeof input.content === 'string' ? input.content : new TextDecoder().decode(input.content);
  const trimmed = raw.replace(/\u0000/g, '').trim();
  if (trimmed.length < 15) {
    return failExtraction(
      'INVALID_INPUT',
      'Nội dung nguồn không hợp lệ. Hãy dán văn bản có nghĩa thay vì để trống.',
      { suggestedActionVi: 'Dán đoạn văn bản học thuật hoặc tệp văn bản.', owningModule: 'sources' },
    );
  }

  const paragraphs = trimmed.split(/\n\s*\n/);
  const blocks = paragraphsToBlocks(paragraphs);
  if (blocks.length === 0) {
    return failExtraction(
      'INVALID_INPUT',
      'Nội dung nguồn không hợp lệ. Hãy dán văn bản có nghĩa thay vì để trống.',
    );
  }

  const plainText = blocks.map((block) => block.text).join('\n\n');
  return succeedExtraction(plainText, blocks, 'text');
}
