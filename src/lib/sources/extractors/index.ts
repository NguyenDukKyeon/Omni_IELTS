import { extractCaptions } from './captionExtractor';
import { extractDocx } from './docxExtractor';
import { createHandoffRecord } from './handoffReference';
import { extractPdf } from './pdfExtractor';
import { extractTextBlocks } from './textExtractor';
import { extractUrl } from './urlExtractor';
import { failExtraction, type ExtractionInput, type ExtractionResult } from './types';

export type { ExtractionInput, ExtractionResult, ExtractionError } from './types';
export { createHandoffRecord } from './handoffReference';

export async function extractDocument(input: ExtractionInput): Promise<ExtractionResult> {
  switch (input.type) {
    case 'text':
      return extractTextBlocks(input);
    case 'vtt_srt':
      return extractCaptions(input);
    case 'url':
      return extractUrl(input);
    case 'pdf':
      return extractPdf(input);
    case 'docx':
      return extractDocx(input);
    case 'youtube':
    case 'audio':
      return createHandoffRecord('media');
    case 'chart_image':
      return createHandoffRecord('mock');
    default:
      return failExtraction(
        'UNSUPPORTED_FORMAT',
        'Định dạng nguồn này chưa được P03 hỗ trợ. Hãy dán văn bản hoặc chọn PDF/DOCX/URL.',
      );
  }
}
