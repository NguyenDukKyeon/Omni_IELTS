import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import createDOMPurify from 'dompurify';
import { failExtraction, paragraphsToBlocks, succeedExtraction, type ExtractionInput, type ExtractionResult } from './types';

function htmlToParagraphs(html: string, url: string): string[] {
  const dom = new JSDOM(html, { url });
  const nodes = [...dom.window.document.body.querySelectorAll('p, h1, h2, h3, h4, li')];
  const texts = nodes.map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (texts.length > 0) return texts;
  const fallback = (dom.window.document.body.textContent || '').trim();
  return fallback ? [fallback] : [];
}

export async function extractUrl(input: ExtractionInput): Promise<ExtractionResult> {
  const url = String(input.content).trim();
  if (!/^https?:\/\//i.test(url)) {
    return failExtraction(
      'INVALID_INPUT',
      'Đường dẫn bài viết không hợp lệ. Hãy dán URL http(s) hoặc dán nội dung bài.',
    );
  }

  let html: string;
  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      return failExtraction(
        'URL_UNREACHABLE',
        'Không lấy được bài viết từ URL. Hãy dán nội dung bài thay vì phụ thuộc máy chủ gốc.',
        { suggestedActionVi: 'Dán văn bản bài viết vào khung nhập.' },
      );
    }
    html = await response.text();
  } catch {
    return failExtraction(
      'URL_UNREACHABLE',
      'Không lấy được bài viết từ URL. Hãy dán nội dung bài thay vì phụ thuộc máy chủ gốc.',
      { suggestedActionVi: 'Dán văn bản bài viết vào khung nhập.' },
    );
  }

  try {
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    if (!article?.content && !article?.textContent) {
      return failExtraction(
        'URL_UNREACHABLE',
        'Không tách được nội dung bài viết. Hãy dán văn bản thủ công.',
      );
    }
    const purify = createDOMPurify(dom.window);
    const cleanHtml = purify.sanitize(String(article.content || ''));
    const paragraphs = htmlToParagraphs(`<div>${cleanHtml}</div>`, url);
    const blocks = paragraphsToBlocks(paragraphs.length > 0 ? paragraphs : [String(article.textContent || '').trim()]);
    if (blocks.length === 0) {
      return failExtraction(
        'URL_UNREACHABLE',
        'Không tách được nội dung bài viết. Hãy dán văn bản thủ công.',
      );
    }
    const result = succeedExtraction(blocks.map((block) => block.text).join('\n\n'), blocks, 'url-readability');
    if (result.success) {
      result.version.extractionReport = {
        extractor: 'url-readability',
        extractedAt: new Date().toISOString(),
        sanitizationApplied: ['dompurify', 'readability'],
        warnings: [],
      };
    }
    return result;
  } catch {
    return failExtraction(
      'EXTRACTION_FAILED',
      'Không xử lý được HTML của bài viết. Hãy dán văn bản thủ công.',
    );
  }
}
