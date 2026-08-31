import { z } from 'zod';
import { AI_TASK_PROFILES, type AiTaskProfile } from '../aiTaskProfiles';
import type {
  DestinationType,
  SourceArtifactJob,
  SourceProvenance,
  SourceSpan,
  SourceVersion,
  ValidatedArtifactDraft,
  ValidatedArtifactDraftPayload,
} from '../../types/sources';

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

const PracticeDraftSchema = z.object({
  skill: z.enum(['reading', 'listening', 'writing', 'speaking']),
  targetBand: z.number(),
  activityTitle: z.string().min(1),
  sourceSpanRef: SourceSpanSchema,
  questionPayload: z.record(z.string(), z.unknown()),
  provenance: ProvenanceSchema,
});

const MockDraftSchema = z.object({
  sectionType: z.enum(['reading_passage', 'listening_section', 'writing_task1', 'writing_task2', 'speaking_part']),
  blueprintId: z.string().optional(),
  targetBand: z.number(),
  packagePayload: z.record(z.string(), z.unknown()),
  provenance: ProvenanceSchema,
});

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
  })).min(1),
  provenance: ProvenanceSchema,
});

const NoteDraftSchema = z.object({
  title: z.string().min(1),
  summaryVi: z.string().min(1),
  keyTakeaways: z.array(z.string()).min(1),
  annotatedCitations: z.array(z.object({
    claim: z.string().min(1),
    blockId: z.string().min(1),
  })).min(1),
  provenance: ProvenanceSchema,
});

const IdeaBankDraftSchema = z.object({
  topic: z.string().min(1),
  ideas: z.array(z.object({
    perspective: z.string().min(1),
    argumentEn: z.string().min(1),
    explanationVi: z.string().min(1),
    exampleOrData: z.string().min(1),
    sourceSpan: SourceSpanSchema,
  })).min(1),
  provenance: ProvenanceSchema,
});

const DESTINATION_SCHEMAS = {
  practice: PracticeDraftSchema,
  mock_section: MockDraftSchema,
  vocabulary_deck: VocabularyDraftSchema,
  note: NoteDraftSchema,
  idea_bank: IdeaBankDraftSchema,
} as const;

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
  if (span.sourceVersionId !== version.id) return false;
  if (!span.blockIds?.length) return true;
  const blockIds = new Set(version.blocks.map((block) => block.id));
  return span.blockIds.every((blockId) => blockIds.has(blockId));
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
  const timestamp = nowIso();
  return {
    id: input.id,
    userId: input.userId,
    sourceVersionId: input.sourceVersionId,
    selection: input.selection,
    destination: input.destination,
    targetBand: input.targetBand,
    customInstruction: input.customInstruction,
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
    });
    const validation = validateDraftPayload(job.destination, routed.value, input.version);
    if (!validation.isValid || !validation.payload) {
      return {
        ...processing,
        state: 'needs_review',
        artifactDraft: {
          id: `draft_${job.id}`,
          destination: job.destination,
          payload: (routed.value || {}) as ValidatedArtifactDraftPayload,
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
