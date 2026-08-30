import {
  computeContentHash,
  createSourceRecord,
  type SourceMediaType,
  type SourceProvenance,
  type SourceRecord,
  type SourceVersion,
} from '../../types/sources';
import { extractDocument } from './extractors';
import { normalizeSourceError, type NormalizedSourceError } from './sourceErrors';

export type ImportJobState =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'needs_review'
  | 'handoff_required'
  | 'retry_wait'
  | 'failed';

export interface ImportJob {
  id: string;
  userId: string;
  title: string;
  type: SourceMediaType;
  rawContent: string;
  state: ImportJobState;
  sourceRecord?: SourceRecord;
  sourceVersion?: SourceVersion;
  error?: NormalizedSourceError;
}

export interface CreateImportJobInput {
  id: string;
  userId: string;
  title: string;
  type: SourceMediaType;
  rawContent: string;
}

function provenanceFor(job: ImportJob): SourceProvenance {
  const originType = job.type === 'text'
    ? 'pasted_text'
    : job.type === 'url'
      ? 'web_fetch'
      : job.type === 'youtube'
        ? 'youtube_import'
        : 'user_upload';

  return {
    originType,
    originalUrl: job.type === 'url' || job.type === 'youtube' ? job.rawContent : undefined,
    retrievalDate: new Date().toISOString(),
    rightsState: job.type === 'youtube' || job.type === 'audio' || job.type === 'chart_image'
      ? 'restricted_citation_only'
      : 'owned_by_learner',
    rawContentHash: computeContentHash(String(job.rawContent)),
    canonicalCitation: job.title,
    owningModule: job.type === 'youtube' || job.type === 'audio' ? 'media' : job.type === 'chart_image' ? 'mock' : 'sources',
  };
}

export function createImportJob(input: CreateImportJobInput): ImportJob {
  return {
    id: input.id,
    userId: input.userId,
    title: input.title,
    type: input.type,
    rawContent: input.rawContent,
    state: 'queued',
  };
}

export async function processImportJob(job: ImportJob): Promise<ImportJob> {
  const next: ImportJob = {
    id: job.id,
    userId: job.userId,
    title: job.title,
    type: job.type,
    rawContent: job.rawContent,
    state: 'processing',
  };

  try {
    const extracted = await extractDocument({
      type: job.type,
      content: job.rawContent,
      title: job.title,
    });

    if (!extracted.success) {
      const normalized = normalizeSourceError(extracted.error ?? { code: 'EXTRACTION_FAILED' });
      if (normalized.code === 'HANDOFF_REQUIRED' || extracted.error?.code === 'HANDOFF_REQUIRED') {
        const record = createSourceRecord({
          userId: job.userId,
          title: job.title,
          type: job.type,
          provenance: {
            ...provenanceFor(job),
            owningModule: extracted.error?.owningModule,
            handoffReasonVi: normalized.userMessageVi,
          },
          processingState: 'handoff_required',
        });
        return {
          ...next,
          state: 'handoff_required',
          sourceRecord: record,
          error: {
            ...normalized,
            code: 'HANDOFF_REQUIRED',
            owningModule: extracted.error?.owningModule,
          },
        };
      }

      return {
        ...next,
        state: normalized.retryable ? 'retry_wait' : 'failed',
        error: normalized,
      };
    }

    const version = extracted.version;
    if (!version) {
      return {
        ...next,
        state: 'failed',
        error: normalizeSourceError({ code: 'EXTRACTION_FAILED' }),
      };
    }

    const record = createSourceRecord({
      userId: job.userId,
      title: job.title,
      type: job.type,
      provenance: provenanceFor(job),
      processingState: 'ready',
    });
    const boundVersion: SourceVersion = { ...version, sourceId: record.id };
    record.currentVersionId = boundVersion.id;
    record.processingState = 'ready';
    record.updatedAt = new Date().toISOString();

    return {
      ...next,
      state: 'ready',
      sourceRecord: record,
      sourceVersion: boundVersion,
    };
  } catch (error) {
    const normalized = normalizeSourceError(error);
    return {
      ...next,
      state: normalized.retryable ? 'retry_wait' : 'failed',
      error: normalized,
    };
  }
}
