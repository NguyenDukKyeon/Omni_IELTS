import { createSourceVersion } from '../sourceFactories';
import type {
  SourceBlock,
  SourceMediaType,
  SourceVersion,
} from '../../../types/sources';

export type ExtractionInput = {
  type: SourceMediaType;
  content: string | ArrayBuffer | Uint8Array;
  title: string;
};

export type ExtractionError = {
  code: string;
  userMessageVi: string;
  suggestedActionVi: string;
  retryable: boolean;
  diagnosticId: string;
  owningModule?: 'sources' | 'media' | 'mock';
};

export type ExtractionResult = {
  success: boolean;
  version?: SourceVersion;
  error?: ExtractionError;
};

export function failExtraction(
  code: string,
  userMessageVi: string,
  extras: Partial<ExtractionError> = {},
): ExtractionResult {
  return {
    success: false,
    error: {
      code,
      userMessageVi,
      suggestedActionVi: extras.suggestedActionVi ?? 'Hãy dán văn bản hoặc chọn định dạng P03 hỗ trợ.',
      retryable: extras.retryable ?? false,
      diagnosticId: extras.diagnosticId ?? globalThis.crypto.randomUUID(),
      owningModule: extras.owningModule,
    },
  };
}

export function succeedExtraction(
  plainText: string,
  blocks: SourceBlock[],
  extractor: string,
): ExtractionResult {
  const version = createSourceVersion({
    sourceId: globalThis.crypto.randomUUID(),
    versionNumber: 1,
    stage: 'normalised',
    plainText,
    blocks,
  });
  version.extractionReport = {
    extractor,
    extractedAt: new Date().toISOString(),
    sanitizationApplied: [],
    warnings: [],
  };
  return { success: true, version };
}

export function toBlockId(order: number): string {
  return `b_${String(order).padStart(3, '0')}`;
}

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export function toUint8Array(content: string | ArrayBuffer | Uint8Array): Uint8Array {
  if (typeof content === 'string') return new TextEncoder().encode(content);
  if (content instanceof Uint8Array) return content;
  return new Uint8Array(content);
}

export function toBuffer(content: string | ArrayBuffer | Uint8Array): Buffer {
  return Buffer.from(toUint8Array(content));
}

export function paragraphsToBlocks(paragraphs: string[], pageIndex?: number): SourceBlock[] {
  return paragraphs
    .map((text) => text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: toBlockId(index + 1),
      order: index + 1,
      type: 'paragraph' as const,
      text,
      ...(pageIndex !== undefined ? { pageIndex } : {}),
    }));
}
