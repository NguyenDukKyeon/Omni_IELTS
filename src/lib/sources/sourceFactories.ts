import { computeContentHash } from './contentHash';
import type {
  SourceBlock,
  SourceMediaType,
  SourceProcessingState,
  SourceProvenance,
  SourceRecord,
  SourceVersion,
  VersionStage,
} from '../../types/sources';

const HANDOFF_MEDIA_TYPES: ReadonlySet<SourceMediaType> = new Set(['youtube', 'audio', 'chart_image']);
const HANDOFF_STATES: ReadonlySet<SourceProcessingState> = new Set(['unavailable', 'handoff_required']);

function newId(): string {
  return globalThis.crypto.randomUUID();
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export function createSourceRecord(input: {
  userId: string;
  title: string;
  type: SourceMediaType;
  provenance: SourceProvenance;
  processingState?: SourceProcessingState;
  summary?: string;
  collectionIds?: string[];
  tags?: string[];
}): SourceRecord {
  const now = new Date().toISOString();
  const processingState = input.processingState ?? 'queued';
  const isHandoff = HANDOFF_STATES.has(processingState) || HANDOFF_MEDIA_TYPES.has(input.type);

  return {
    id: newId(),
    userId: input.userId,
    title: input.title,
    summary: input.summary ?? '',
    type: input.type,
    collectionIds: input.collectionIds ?? [],
    tags: input.tags ?? [],
    provenance: input.provenance,
    currentVersionId: isHandoff ? '' : '',
    processingState,
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSourceVersion(input: {
  sourceId: string;
  versionNumber: number;
  stage: VersionStage;
  plainText: string;
  blocks?: SourceBlock[];
}): SourceVersion {
  return {
    id: newId(),
    sourceId: input.sourceId,
    versionNumber: input.versionNumber,
    stage: input.stage,
    contentHash: computeContentHash(input.plainText),
    plainText: input.plainText,
    blocks: input.blocks ?? [],
    wordCount: input.blocks?.length
      ? input.blocks.reduce((sum, block) => sum + countWords(block.text), 0)
      : countWords(input.plainText),
    createdAt: new Date().toISOString(),
  };
}
