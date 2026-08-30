import { createHash, randomUUID } from 'node:crypto';

export type SourceMediaType =
  | 'text'
  | 'pdf'
  | 'docx'
  | 'url'
  | 'youtube'
  | 'audio'
  | 'vtt_srt'
  | 'chart_image';

export type ContentRightsState =
  | 'owned_by_learner'
  | 'licensed_public'
  | 'fair_use_academic'
  | 'restricted_citation_only'
  | 'rejected_unsupported';

export type SourceProcessingState =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'degraded'
  | 'failed'
  | 'rejected'
  | 'unavailable'
  | 'handoff_required';

export type VersionStage = 'raw' | 'normalised' | 'edited';

export type DestinationType =
  | 'practice'
  | 'mock_section'
  | 'vocabulary_deck'
  | 'note'
  | 'idea_bank';

export interface SourceProvenance {
  originType: 'user_upload' | 'pasted_text' | 'web_fetch' | 'youtube_import' | 'live_hub' | 'curated_benchmark';
  originalUrl?: string;
  originalFilename?: string;
  authorOrSpeaker?: string;
  publicationDate?: string;
  retrievalDate: string;
  license?: string;
  rightsState: ContentRightsState;
  rightsNotesVi?: string;
  rawContentHash: string;
  canonicalCitation: string;
  owningModule?: 'sources' | 'media' | 'mock';
  handoffReasonVi?: string;
}

export interface SourceBlock {
  id: string;
  order: number;
  type: 'paragraph' | 'heading' | 'transcript_turn' | 'table_row' | 'chart_caption' | 'list_item';
  text: string;
  speaker?: string;
  pageIndex?: number;
  startMs?: number;
  endMs?: number;
}

export interface SourceVersion {
  id: string;
  sourceId: string;
  versionNumber: number;
  stage: VersionStage;
  contentHash: string;
  plainText: string;
  blocks: SourceBlock[];
  wordCount: number;
  pageCount?: number;
  durationMs?: number;
  mediaUrl?: string;
  extractionReport?: {
    extractor: string;
    extractedAt: string;
    sanitizationApplied: string[];
    warnings: string[];
  };
  createdAt: string;
}

export interface SourceSpan {
  sourceId: string;
  sourceVersionId: string;
  blockIds?: string[];
  pageIndex?: number;
  startMs?: number;
  endMs?: number;
  exactTextSnippet?: string;
}

export interface SourceRecord {
  id: string;
  userId: string;
  title: string;
  summary: string;
  type: SourceMediaType;
  collectionIds: string[];
  tags: string[];
  provenance: SourceProvenance;
  currentVersionId: string;
  targetBandEstimate?: number;
  processingState: SourceProcessingState;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCollection {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}

export interface ValidatedPracticeDraft {
  skill: 'reading' | 'listening' | 'writing' | 'speaking';
  targetBand: number;
  activityTitle: string;
  sourceSpanRef: SourceSpan;
  questionPayload: Record<string, unknown>;
  provenance: SourceProvenance;
}

export interface ValidatedMockDraft {
  sectionType: 'reading_passage' | 'listening_section' | 'writing_task1' | 'writing_task2' | 'speaking_part';
  blueprintId?: string;
  targetBand: number;
  packagePayload: Record<string, unknown>;
  provenance: SourceProvenance;
}

export interface ValidatedVocabularyDraft {
  deckTitle: string;
  targetBand: number;
  cards: Array<{
    word: string;
    pos: string;
    contextSentence: string;
    definitionVi: string;
    definitionEn: string;
    phonetic: string;
    collocations: string[];
    cefrLevel: 'B1' | 'B2' | 'C1' | 'C2';
    sourceSpan: SourceSpan;
  }>;
  provenance: SourceProvenance;
}

export interface ValidatedNoteDraft {
  title: string;
  summaryVi: string;
  keyTakeaways: string[];
  annotatedCitations: Array<{ claim: string; blockId: string }>;
  provenance: SourceProvenance;
}

export interface ValidatedIdeaBankDraft {
  topic: string;
  ideas: Array<{
    perspective: string;
    argumentEn: string;
    explanationVi: string;
    exampleOrData: string;
    sourceSpan: SourceSpan;
  }>;
  provenance: SourceProvenance;
}

export type ValidatedArtifactDraftPayload =
  | ValidatedPracticeDraft
  | ValidatedMockDraft
  | ValidatedVocabularyDraft
  | ValidatedNoteDraft
  | ValidatedIdeaBankDraft;

export interface ValidatedArtifactDraft {
  id: string;
  destination: DestinationType;
  payload: ValidatedArtifactDraftPayload;
  validationErrors?: string[];
}

export interface SourceArtifactJob {
  id: string;
  userId: string;
  sourceVersionId: string;
  selection?: SourceSpan;
  destination: DestinationType;
  targetBand: number;
  customInstruction?: string;
  state:
    | 'queued'
    | 'processing'
    | 'validating'
    | 'ready'
    | 'needs_review'
    | 'retry_wait'
    | 'rejected'
    | 'failed'
    | 'cancelled';
  artifactDraft?: ValidatedArtifactDraft;
  destinationHandoff?: {
    status: 'pending' | 'accepted' | 'rejected';
    destinationEntityId?: string;
    acceptedAt?: string;
  };
  error?: {
    code: string;
    messageVi: string;
    retryable: boolean;
    diagnosticId: string;
  };
  createdAt: string;
  updatedAt: string;
}

const HANDOFF_MEDIA_TYPES: ReadonlySet<SourceMediaType> = new Set(['youtube', 'audio', 'chart_image']);
const HANDOFF_STATES: ReadonlySet<SourceProcessingState> = new Set(['unavailable', 'handoff_required']);

export function computeContentHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
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
    id: randomUUID(),
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
    id: randomUUID(),
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
