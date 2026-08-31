import { z } from 'zod';
import { AI_TASK_PROFILES, type AiTaskProfile } from '../aiTaskProfiles';
import {
  estimatePromptTokens,
  GROUNDED_CHAT_PROMPT_TOKEN_BUDGET,
} from './groundedChat';
import type {
  DestinationType,
  SourceArtifactJob,
  SourceProvenance,
  SourceSpan,
  SourceVersion,
  ValidatedArtifactDraft,
  ValidatedArtifactDraftPayload,
} from '../../types/sources';

const DestinationSchema = z.enum(['practice', 'mock_section', 'vocabulary_deck', 'note', 'idea_bank']);

const ProvenanceSchema = z.object({
  originType: z.enum(['user_upload', 'pasted_text', 'web_fetch', 'youtube_import', 'live_hub', 'curated_benchmark']),
  originalUrl: z.string().optional(),
  originalFilename: z.string().optional(),
  authorOrSpeaker: z.string().optional(),
  publicationDate: z.string().optional(),
  retrievalDate: z.string().min(1),
  license: z.string().optional(),
  rightsState: z.enum([
    'owned_by_learner',
    'licensed_public',
    'fair_use_academic',
    'restricted_citation_only',
    'rejected_unsupported',
  ]),
  rightsNotesVi: z.string().optional(),
  rawContentHash: z.string().min(1),
  canonicalCitation: z.string().min(1),
  owningModule: z.enum(['sources', 'media', 'mock']).optional(),
  handoffReasonVi: z.string().optional(),
});

const SourceSpanSchema = z.object({
  sourceId: z.string().min(1),
  sourceVersionId: z.string().min(1),
  blockIds: z.array(z.string().min(1)).optional(),
  pageIndex: z.number().optional(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
  exactTextSnippet: z.string().optional(),
});

const PracticeQuestionSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  question: z.string().min(1).optional(),
  correctAnswer: z.string().min(1),
}).refine((question) => Boolean(
  question.statement?.trim() || question.prompt?.trim() || question.question?.trim(),
), { message: 'question_text_required' });

const PracticeQuestionPayloadSchema = z.object({
  type: z.string().min(1),
  questions: z.array(PracticeQuestionSchema).min(1),
}).strict();

const PracticeDraftSchema = z.object({
  skill: z.enum(['reading', 'listening', 'writing', 'speaking']),
  targetBand: z.number(),
  activityTitle: z.string().min(1),
  sourceSpanRef: SourceSpanSchema,
  questionPayload: PracticeQuestionPayloadSchema,
  provenance: ProvenanceSchema,
}).strict();

const MockDraftSchema = z.object({
  sectionType: z.enum(['reading_passage', 'listening_section', 'writing_task1', 'writing_task2', 'speaking_part']),
  blueprintId: z.string().optional(),
  targetBand: z.number(),
  packagePayload: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message: 'package_payload_required',
  }),
  sourceSpanRef: SourceSpanSchema,
  provenance: ProvenanceSchema,
}).strict();

const VocabularyDraftSchema = z.object({
  deckTitle: z.string().min(1),
  targetBand: z.number(),
  cards: z.array(z.object({
    word: z.string().min(1),
    pos: z.string().min(1),
    contextSentence: z.string().min(1),
    definitionVi: z.string().min(1),
    definitionEn: z.string().min(1),
    phonetic: z.string(),
    collocations: z.array(z.string()),
    cefrLevel: z.enum(['B1', 'B2', 'C1', 'C2']),
    sourceSpan: SourceSpanSchema,
  }).strict()).min(1),
  provenance: ProvenanceSchema,
}).strict();

const NoteDraftSchema = z.object({
  title: z.string().min(1),
  summaryVi: z.string().min(1),
  keyTakeaways: z.array(z.string()).min(1),
  annotatedCitations: z.array(z.object({
    claim: z.string().min(1),
    blockId: z.string().min(1),
  }).strict()).min(1),
  sourceSpanRef: SourceSpanSchema,
  provenance: ProvenanceSchema,
}).strict();

const IdeaBankDraftSchema = z.object({
  topic: z.string().min(1),
  ideas: z.array(z.object({
    perspective: z.string().min(1),
    argumentEn: z.string().min(1),
    explanationVi: z.string().min(1),
    exampleOrData: z.string().min(1),
    sourceSpan: SourceSpanSchema,
  }).strict()).min(1),
  provenance: ProvenanceSchema,
}).strict();

const DESTINATION_SCHEMAS = {
  practice: PracticeDraftSchema,
  mock_section: MockDraftSchema,
  vocabulary_deck: VocabularyDraftSchema,
  note: NoteDraftSchema,
  idea_bank: IdeaBankDraftSchema,
} as const;

const CreateArtifactJobInputSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  sourceVersionId: z.string().min(1),
  destination: DestinationSchema,
  targetBand: z.number(),
  selection: SourceSpanSchema.optional(),
  customInstruction: z.string().optional(),
}).strict();

export type DraftValidationResult = {
  isValid: boolean;
  errors: string[];
  payload?: ValidatedArtifactDraftPayload;
};

export type ArtifactRouterExecute = (input: {
  profile: AiTaskProfile;
  tools: [];
  destination: DestinationType;
  sourceVersionId: string;
  sourceSpan: SourceSpan;
  sourceContext: string;
}) => Promise<{ value: unknown }>;

function nowIso(): string {
  return new Date().toISOString();
}

function collectSpan(payload: unknown): SourceSpan[] {
  if (!payload || typeof payload !== 'object') return [];
  const value = payload as Record<string, unknown>;
  const spans: SourceSpan[] = [];
  if (value.sourceSpanRef && typeof value.sourceSpanRef === 'object') {
    spans.push(value.sourceSpanRef as SourceSpan);
  }
  if (Array.isArray(value.cards)) {
    for (const card of value.cards) {
      if (card && typeof card === 'object' && 'sourceSpan' in card) {
        spans.push((card as { sourceSpan: SourceSpan }).sourceSpan);
      }
    }
  }
  if (Array.isArray(value.ideas)) {
    for (const idea of value.ideas) {
      if (idea && typeof idea === 'object' && 'sourceSpan' in idea) {
        spans.push((idea as { sourceSpan: SourceSpan }).sourceSpan);
      }
    }
  }
  return spans;
}

function spanSupportedByVersion(span: SourceSpan, version: SourceVersion): boolean {
  if (span.sourceId !== version.sourceId) return false;
  if (span.sourceVersionId !== version.id) return false;
  if (!span.blockIds?.length) return true;
  const blockIds = new Set(version.blocks.map((block) => block.id));
  return span.blockIds.every((blockId) => blockIds.has(blockId));
}

function forbiddenGenerationErrors(payload: unknown, destination: DestinationType, version?: SourceVersion): string[] {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') return ['invalid_payload'];
  const value = payload as Record<string, unknown>;
  if ('score' in value || 'xp' in value || 'mastery' in value || 'xpDelta' in value || 'masteryUpdate' in value) {
    errors.push('forbidden_score_or_mastery');
  }
  if (destination === 'practice' && value.skill === 'listening') {
    errors.push('listening_audio_unsupported');
  }
  if (destination === 'mock_section' && value.sectionType === 'listening_section') {
    errors.push('listening_audio_unsupported');
  }
  const questionPayload = value.questionPayload && typeof value.questionPayload === 'object'
    ? value.questionPayload as Record<string, unknown>
    : undefined;
  const packagePayload = value.packagePayload && typeof value.packagePayload === 'object'
    ? value.packagePayload as Record<string, unknown>
    : undefined;
  const bags = [value, questionPayload, packagePayload].filter(Boolean) as Record<string, unknown>[];
  for (const bag of bags) {
    if (bag.audioUrl || bag.audioBase64 || bag.audioArtifact || bag.mediaUrl) {
      const claimed = typeof bag.audioUrl === 'string' ? bag.audioUrl
        : typeof bag.mediaUrl === 'string' ? bag.mediaUrl
          : undefined;
      if (!version?.mediaUrl || claimed !== version.mediaUrl) {
        errors.push('fabricated_audio');
      }
    }
    if (typeof bag.audioTranscript === 'string' && bag.audioTranscript.trim()) {
      errors.push('fabricated_transcript');
    }
    if ('answerKey' in bag || 'answerKeys' in bag) {
      errors.push('fabricated_answer_key');
    }
  }
  return [...new Set(errors)];
}

function controlledSpan(version: SourceVersion, selection?: SourceSpan): SourceSpan {
  if (selection && spanSupportedByVersion(selection, version)) return selection;
  return {
    sourceId: version.sourceId,
    sourceVersionId: version.id,
    blockIds: version.blocks.filter((block) => block.text.trim().length > 0).map((block) => block.id),
  };
}

export function buildArtifactSourceContext(version: SourceVersion, span: SourceSpan): string {
  const allowed = span.blockIds?.length ? new Set(span.blockIds) : null;
  const lines: string[] = [];
  for (const block of version.blocks) {
    if (allowed && !allowed.has(block.id)) continue;
    if (!block.text.trim()) continue;
    lines.push(`Block ${block.id}: ${block.text}`);
  }
  return lines.join('\n');
}

function applyControlledProvenance(
  destination: DestinationType,
  payload: unknown,
  provenance: SourceProvenance,
  span: SourceSpan,
): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const value = { ...(payload as Record<string, unknown>), provenance };
  if (destination === 'vocabulary_deck' && Array.isArray(value.cards)) {
    return {
      ...value,
      cards: value.cards.map((card) => (
        card && typeof card === 'object' ? { ...card, sourceSpan: span } : card
      )),
    };
  }
  if (destination === 'idea_bank' && Array.isArray(value.ideas)) {
    return {
      ...value,
      ideas: value.ideas.map((idea) => (
        idea && typeof idea === 'object' ? { ...idea, sourceSpan: span } : idea
      )),
    };
  }
  return { ...value, sourceSpanRef: span };
}

export class ArtifactJobInputError extends Error {
  constructor() {
    super('invalid_artifact_job_input');
    this.name = 'ArtifactJobInputError';
  }
}

export function createArtifactJob(input: {
  id: string;
  userId: string;
  sourceVersionId: string;
  destination: DestinationType;
  targetBand: number;
  selection?: SourceSpan;
  customInstruction?: string;
}): SourceArtifactJob {
  const parsed = CreateArtifactJobInputSchema.safeParse(input);
  if (!parsed.success) throw new ArtifactJobInputError();
  const timestamp = nowIso();
  return {
    id: parsed.data.id,
    userId: parsed.data.userId,
    sourceVersionId: parsed.data.sourceVersionId,
    selection: parsed.data.selection,
    destination: parsed.data.destination,
    targetBand: parsed.data.targetBand,
    customInstruction: parsed.data.customInstruction,
    state: 'queued',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function validateDraftPayload(
  destination: DestinationType,
  payload: unknown,
  version?: SourceVersion,
): DraftValidationResult {
  const schema = DESTINATION_SCHEMAS[destination];
  if (!schema) {
    return { isValid: false, errors: ['unknown_destination'] };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      isValid: false,
      errors: parsed.error.issues.map((issue) => issue.path.join('.') || issue.message),
    };
  }
  const forbidden = forbiddenGenerationErrors(parsed.data, destination, version);
  if (forbidden.length) {
    return { isValid: false, errors: forbidden };
  }
  if (version) {
    for (const span of collectSpan(parsed.data)) {
      if (!spanSupportedByVersion(span, version)) {
        return { isValid: false, errors: ['source_span_unsupported'] };
      }
    }
    if (destination === 'note') {
      const note = parsed.data as z.infer<typeof NoteDraftSchema>;
      const blockIds = new Set(version.blocks.map((block) => block.id));
      if (note.annotatedCitations.some((citation) => !blockIds.has(citation.blockId))) {
        return { isValid: false, errors: ['source_span_unsupported'] };
      }
    }
  }
  return { isValid: true, errors: [], payload: parsed.data as ValidatedArtifactDraftPayload };
}

function failedJob(job: SourceArtifactJob, code: string, messageVi: string): SourceArtifactJob {
  return {
    ...job,
    state: 'failed',
    updatedAt: nowIso(),
    error: {
      code,
      messageVi,
      retryable: false,
      diagnosticId: globalThis.crypto.randomUUID(),
    },
  };
}

export async function executeArtifactJob(
  job: SourceArtifactJob,
  input: {
    version: SourceVersion;
    provenance: SourceProvenance;
    routerExecute: ArtifactRouterExecute;
    webSearch?: (...args: unknown[]) => unknown;
    persistDestination?: (...args: unknown[]) => unknown;
  },
): Promise<SourceArtifactJob> {
  if (job.sourceVersionId !== input.version.id) {
    return failedJob(job, 'VALIDATION_FAILED', 'Phiên bản nguồn không khớp với yêu cầu tạo bản nháp.');
  }
  if (job.selection && !spanSupportedByVersion(job.selection, input.version)) {
    return failedJob(job, 'VALIDATION_FAILED', 'Đoạn nguồn đã chọn không thuộc phiên bản này.');
  }

  const span = controlledSpan(input.version, job.selection);
  const sourceContext = buildArtifactSourceContext(input.version, span);
  if (!sourceContext) {
    return failedJob(job, 'VALIDATION_FAILED', 'Phiên bản nguồn không có khối văn bản dùng được để tạo bản nháp.');
  }
  if (estimatePromptTokens(sourceContext) > GROUNDED_CHAT_PROMPT_TOKEN_BUDGET) {
    return {
      ...job,
      state: 'needs_review',
      artifactDraft: {
        id: `draft_${job.id}`,
        destination: job.destination,
        payload: {} as ValidatedArtifactDraftPayload,
        validationErrors: ['select_smaller_source'],
      },
      updatedAt: nowIso(),
    };
  }

  const processing: SourceArtifactJob = {
    ...job,
    state: 'processing',
    updatedAt: nowIso(),
  };

  try {
    const routed = await input.routerExecute({
      profile: AI_TASK_PROFILES.balanced,
      tools: [],
      destination: job.destination,
      sourceVersionId: job.sourceVersionId,
      sourceSpan: span,
      sourceContext,
    });
    const stamped = applyControlledProvenance(
      job.destination,
      routed.value,
      input.provenance,
      span,
    );
    const validation = validateDraftPayload(job.destination, stamped, input.version);
    if (!validation.isValid || !validation.payload) {
      return {
        ...processing,
        state: 'needs_review',
        artifactDraft: {
          id: `draft_${job.id}`,
          destination: job.destination,
          payload: (stamped && typeof stamped === 'object' ? stamped : {}) as ValidatedArtifactDraftPayload,
          validationErrors: validation.errors,
        },
        updatedAt: nowIso(),
      };
    }

    const draft: ValidatedArtifactDraft = {
      id: `draft_${job.id}`,
      destination: job.destination,
      payload: validation.payload,
    };
    return {
      ...processing,
      state: 'ready',
      artifactDraft: draft,
      updatedAt: nowIso(),
    };
  } catch {
    return {
      ...processing,
      state: 'failed',
      updatedAt: nowIso(),
      error: {
        code: 'EXTRACTION_FAILED',
        messageVi: 'Không tạo được bản nháp từ nguồn đã chọn.',
        retryable: true,
        diagnosticId: globalThis.crypto.randomUUID(),
      },
    };
  }
}
