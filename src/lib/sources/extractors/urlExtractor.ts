import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import createDOMPurify from 'dompurify';
import { failExtraction, paragraphsToBlocks, succeedExtraction, type ExtractionInput, type ExtractionResult } from './types';
import { fetchPublicHtml, type UrlFetchDeps } from '../urlSafety';

function htmlToParagraphs(html: string, url: string): string[] {
  const dom = new JSDOM(html, { url });
  const nodes = [...dom.window.document.body.querySelectorAll('p, h1, h2, h3, h4, li')];
  const texts = nodes.map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (texts.length > 0) return texts;
  const fallback = (dom.window.document.body.textContent || '').trim();
  return fallback ? [fallback] : [];
}

function unreachable(): ExtractionResult {
  return failExtraction(
    'URL_UNREACHABLE',
    'Không lấy được bài viết từ URL. Hãy dán nội dung bài thay vì phụ thuộc máy chủ gốc.',
  );
}

function rejected(): ExtractionResult {
  return failExtraction(
    'RIGHTS_REJECTED',
    'URL này không được phép truy cập từ OMNI. Hãy dán nội dung bài viết.',
  );
}

export async function extractUrl(input: ExtractionInput, deps: UrlFetchDeps = {}): Promise<ExtractionResult> {
  const fetched = await fetchPublicHtml(String(input.content).trim(), deps);
  if (!fetched.ok) {
    if (fetched.code === 'RIGHTS_REJECTED') return rejected();
    if (fetched.code === 'INVALID_INPUT') {
      return failExtraction(
        'INVALID_INPUT',
        'Đường dẫn bài viết không hợp lệ. Hãy dán URL http(s) hoặc dán nội dung bài.',
      );
    }
    return unreachable();
  }

  try {
    const html = fetched.html || '';
    const finalUrl = fetched.finalUrl || 'https://example.invalid/';
    const dom = new JSDOM(html, { url: finalUrl });
    const article = new Readability(dom.window.document).parse();
    if (!article?.content && !article?.textContent) return unreachable();
    const purify = createDOMPurify(dom.window);
    const cleanHtml = purify.sanitize(String(article.content || ''));
    const paragraphs = htmlToParagraphs(`<div>${cleanHtml}</div>`, finalUrl);
    const blocks = paragraphsToBlocks(paragraphs.length > 0 ? paragraphs : [String(article.textContent || '').trim()]);
    if (blocks.length === 0) return unreachable();
    const result = succeedExtraction(blocks.map((block) => block.text).join('\n\n'), blocks, 'url-readability');
    if (result.success && result.version) {
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

export type { UrlFetchDeps };
