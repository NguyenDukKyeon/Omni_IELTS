import { computeContentHash } from './contentHash';
import { createSourceVersion } from './sourceFactories';
import { paragraphsToBlocks } from './extractors/types';
import type { SourceBlock, SourceVersion } from '../../types/sources';

export const SOURCE_VERSION_MAX_TEXT_CODE_POINTS = 200_000;
export const SOURCE_VERSION_MAX_BLOCKS = 2_000;

export class SourceVersionConflictError extends Error {
  readonly code = 'VERSION_CONFLICT';

  constructor(message = 'The source version is stale and cannot be overwritten.') {
    super(message);
    this.name = 'SourceVersionConflictError';
  }
}

export class SourceVersionEditError extends Error {
  readonly code: 'INVALID_INPUT' | 'RESOURCE_LIMIT_EXCEEDED';

  constructor(code: 'INVALID_INPUT' | 'RESOURCE_LIMIT_EXCEEDED', message: string) {
    super(message);
    this.name = 'SourceVersionEditError';
    this.code = code;
  }
}

export type PreparedEditedSource = {
  plainText: string;
  blocks: SourceBlock[];
  contentHash: string;
};

/**
 * Normalizes learner text on the trusted application side before it is persisted.
 * The client only submits editedText; blocks, hash, stage, number, id, and timestamps
 * are derived here or by the database RPC.
 */
export function prepareEditedSourceText(editedText: string): PreparedEditedSource {
  if (typeof editedText !== 'string') {
    throw new SourceVersionEditError('INVALID_INPUT', 'Edited source text must be a string.');
  }

  const lineNormalized = editedText
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .trim();
  if (Array.from(lineNormalized).length > SOURCE_VERSION_MAX_TEXT_CODE_POINTS) {
    throw new SourceVersionEditError('RESOURCE_LIMIT_EXCEEDED', 'Edited source text exceeds the safe limit.');
  }

  const blocks = paragraphsToBlocks(lineNormalized.split(/\n\s*\n/));
  if (blocks.length === 0 || blocks.reduce((sum, block) => sum + Array.from(block.text).length, 0) < 15) {
    throw new SourceVersionEditError('INVALID_INPUT', 'Edited source text is empty or too short.');
  }
  if (blocks.length > SOURCE_VERSION_MAX_BLOCKS) {
    throw new SourceVersionEditError('RESOURCE_LIMIT_EXCEEDED', 'Edited source has too many blocks.');
  }

  const plainText = blocks.map((block) => block.text).join('\n\n');
  return {
    plainText,
    blocks,
    contentHash: computeContentHash(plainText),
  };
}

export function createEditedSourceVersion(input: {
  sourceId: string;
  versionNumber: number;
  editedText: string;
  id?: string;
  createdAt?: string;
}): SourceVersion {
  if (!Number.isSafeInteger(input.versionNumber) || input.versionNumber < 2) {
    throw new SourceVersionConflictError();
  }
  const prepared = prepareEditedSourceText(input.editedText);
  const version = createSourceVersion({
    sourceId: input.sourceId,
    versionNumber: input.versionNumber,
    stage: 'edited',
    plainText: prepared.plainText,
    blocks: prepared.blocks,
  });
  if (input.id) version.id = input.id;
  if (input.createdAt) version.createdAt = input.createdAt;
  version.contentHash = prepared.contentHash;
  version.extractionReport = {
    extractor: 'source-editor',
    extractedAt: version.createdAt,
    sanitizationApplied: ['line_endings', 'control_characters', 'whitespace'],
    warnings: [],
  };
  return version;
}
