import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createSourceRecord } from './sourceFactories';
import { extractDocument, type ExtractionInput, type ExtractionResult } from './extractors';
import { normalizeSourceError, type NormalizedSourceError } from './sourceErrors';
import type {
  SourceMediaType,
  SourceProvenance,
  SourceRecord,
  SourceVersion,
} from '../../types/sources';
import type { LearnerAuthResult } from './groundedChat';
import type { ConsumeSourcesQuota } from './quota.server';
import { SOURCE_IMPORT_MAX_BINARY_BYTES } from './importLimits';
import {
  applyVerifiedQuota,
  authRequiredResult,
  extractBearerToken,
  featureDisabledResult,
  invalidRequestResult,
  type SourcesTransportResult,
  unavailableResult,
  verifyOrReject,
} from './transportShared.server';

export const SOURCE_IMPORT_MAX_TEXT_CHARS = 1_000_000;
export { SOURCE_IMPORT_MAX_BINARY_BYTES } from './importLimits';
export const SOURCE_IMPORT_MAX_BASE64_CHARS = Math.ceil(SOURCE_IMPORT_MAX_BINARY_BYTES / 3) * 4;
export const SOURCE_IMPORT_MAX_TITLE_CHARS = 240;

const BINARY_MIME_TYPES = {
  pdf: new Set(['application/pdf']),
  docx: new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
} as const;

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const TITLE_SCHEMA = z.string().trim().min(1).max(SOURCE_IMPORT_MAX_TITLE_CHARS);
const TEXT_SCHEMA = z.string().min(1).max(SOURCE_IMPORT_MAX_TEXT_CHARS);
const URL_SCHEMA = z.string().trim().url().max(2_048);
const FILENAME_SCHEMA = z.string().trim().min(1).max(255).optional();
const MIME_SCHEMA = z.string().trim().min(1).max(128);
const BASE64_SCHEMA = z.string()
  .min(1)
  .max(SOURCE_IMPORT_MAX_BASE64_CHARS)
  .regex(BASE64_PATTERN);

const textImportSchema = z.object({
  title: TITLE_SCHEMA,
  type: z.literal('text'),
  content: TEXT_SCHEMA,
}).strict();

const urlImportSchema = z.object({
  title: TITLE_SCHEMA,
  type: z.literal('url'),
  content: URL_SCHEMA,
}).strict();

const captionImportSchema = z.object({
  title: TITLE_SCHEMA,
  type: z.literal('vtt_srt'),
  content: TEXT_SCHEMA,
  originalFilename: FILENAME_SCHEMA,
}).strict();

const pdfImportSchema = z.object({
  title: TITLE_SCHEMA,
  type: z.literal('pdf'),
  declaredMimeType: MIME_SCHEMA,
  originalFilename: FILENAME_SCHEMA,
  contentBase64: BASE64_SCHEMA,
}).strict();

const docxImportSchema = z.object({
  title: TITLE_SCHEMA,
  type: z.literal('docx'),
  declaredMimeType: MIME_SCHEMA,
  originalFilename: FILENAME_SCHEMA,
  contentBase64: BASE64_SCHEMA,
}).strict();

const youtubeImportSchema = z.object({
  title: TITLE_SCHEMA,
  type: z.literal('youtube'),
  content: URL_SCHEMA.refine((value) => {
    try {
      const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
      return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
    } catch {
      return false;
    }
  }, { message: 'youtube_url_required' }),
}).strict();

const audioHandoffSchema = z.object({
  title: TITLE_SCHEMA,
  type: z.literal('audio'),
  sourceRef: z.string().trim().min(1).max(2_048),
  declaredMimeType: MIME_SCHEMA.optional(),
  originalFilename: FILENAME_SCHEMA,
}).strict();

const chartHandoffSchema = z.object({
  title: TITLE_SCHEMA,
  type: z.literal('chart_image'),
  sourceRef: z.string().trim().min(1).max(2_048),
  declaredMimeType: MIME_SCHEMA.optional(),
  originalFilename: FILENAME_SCHEMA,
}).strict();

export const SourceImportRequestSchema = z.discriminatedUnion('type', [
  textImportSchema,
  urlImportSchema,
  captionImportSchema,
  pdfImportSchema,
  docxImportSchema,
  youtubeImportSchema,
  audioHandoffSchema,
  chartHandoffSchema,
]);

export type SourceImportRequest = z.infer<typeof SourceImportRequestSchema>;

export interface SourceImportRepository {
  saveRecord(record: SourceRecord): Promise<SourceRecord>;
  saveVersion(version: SourceVersion, userId: string): Promise<SourceVersion>;
  updateRecord(record: SourceRecord): Promise<SourceRecord>;
}

export type SourceImportExtractor = (input: ExtractionInput) => Promise<ExtractionResult>;

export type SourceImportRequestHandlerInput = {
  featureEnabled?: boolean;
  authorizationHeader?: string | null;
  body: unknown;
  cloudConfigured: boolean;
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>;
  repositoryForToken: (accessToken: string) => SourceImportRepository;
  consumeQuota?: ConsumeSourcesQuota;
  extractDocument?: SourceImportExtractor;
};

type PreparedImport = {
  request: SourceImportRequest;
  extractionContent: string | Uint8Array;
  contentHash: string;
};

function isTransportResult(value: PreparedImport | SourcesTransportResult): value is SourcesTransportResult {
  return 'body' in value && typeof value.status === 'number';
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function invalidPreparedImport(): SourcesTransportResult {
  return invalidRequestResult();
}

function hasSignature(type: 'pdf' | 'docx', bytes: Uint8Array): boolean {
  if (type === 'pdf') {
    return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  }
  return bytes.length >= 4
    && bytes[0] === 0x50
    && bytes[1] === 0x4b
    && bytes[2] === 0x03
    && bytes[3] === 0x04;
}

function decodeBinaryImport(
  request: Extract<SourceImportRequest, { type: 'pdf' | 'docx' }>,
): PreparedImport | SourcesTransportResult {
  if (!BINARY_MIME_TYPES[request.type].has(request.declaredMimeType.toLowerCase())) {
    return invalidPreparedImport();
  }
  if (request.contentBase64.length % 4 !== 0) return invalidPreparedImport();

  let bytes: Buffer;
  try {
    bytes = Buffer.from(request.contentBase64, 'base64');
  } catch {
    return invalidPreparedImport();
  }
  if (bytes.byteLength === 0 || bytes.byteLength > SOURCE_IMPORT_MAX_BINARY_BYTES) {
    return invalidPreparedImport();
  }
  const payload = new Uint8Array(bytes);
  if (!hasSignature(request.type, payload)) return invalidPreparedImport();

  return {
    request,
    extractionContent: payload,
    contentHash: sha256(payload),
  };
}

function prepareImport(request: SourceImportRequest): PreparedImport | SourcesTransportResult {
  if (request.type === 'pdf' || request.type === 'docx') return decodeBinaryImport(request);

  if (request.type === 'audio' || request.type === 'chart_image') {
    return {
      request,
      extractionContent: request.sourceRef,
      contentHash: sha256(request.sourceRef),
    };
  }

  return {
    request,
    extractionContent: request.content,
    contentHash: sha256(request.content),
  };
}

function originTypeFor(type: SourceMediaType): SourceProvenance['originType'] {
  if (type === 'text') return 'pasted_text';
  if (type === 'url') return 'web_fetch';
  if (type === 'youtube') return 'youtube_import';
  return 'user_upload';
}

function owningModuleFor(type: SourceMediaType): SourceProvenance['owningModule'] {
  if (type === 'youtube' || type === 'audio') return 'media';
  if (type === 'chart_image') return 'mock';
  return 'sources';
}

function provenanceFor(prepared: PreparedImport): SourceProvenance {
  const { request } = prepared;
  const handoff = request.type === 'youtube' || request.type === 'audio' || request.type === 'chart_image';
  const originalUrl = request.type === 'url' || request.type === 'youtube' ? request.content : undefined;
  const originalFilename = 'originalFilename' in request ? request.originalFilename : undefined;
  return {
    originType: originTypeFor(request.type),
    ...(originalUrl ? { originalUrl } : {}),
    ...(originalFilename ? { originalFilename } : {}),
    retrievalDate: new Date().toISOString(),
    rightsState: request.type === 'url'
      ? 'fair_use_academic'
      : handoff
        ? 'restricted_citation_only'
        : 'owned_by_learner',
    rawContentHash: prepared.contentHash,
    canonicalCitation: request.title,
    owningModule: owningModuleFor(request.type),
  };
}

function errorBody(error: NormalizedSourceError, status: string): Record<string, unknown> {
  return {
    status,
    code: error.code,
    userMessageVi: error.userMessageVi,
    suggestedActionVi: error.suggestedActionVi,
    retryable: error.retryable,
    ...(error.retryAfterSeconds !== undefined ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    diagnosticId: error.diagnosticId,
  };
}

function sourceFailureResult(error: NormalizedSourceError): SourcesTransportResult {
  return {
    status: error.retryable ? 503 : 422,
    body: errorBody(error, error.retryable ? 'retry_wait' : 'failed'),
  };
}

function sourceSummary(version: SourceVersion | undefined): string {
  return version?.blocks.find((block) => block.text.trim())?.text.slice(0, 280) ?? '';
}

function withRecordState(
  record: SourceRecord,
  state: SourceRecord['processingState'],
  version?: SourceVersion,
  provenance?: SourceProvenance,
): SourceRecord {
  return {
    ...record,
    ...(provenance ? { provenance } : {}),
    ...(version ? { currentVersionId: version.id, summary: sourceSummary(version) } : {}),
    processingState: state,
    updatedAt: new Date().toISOString(),
  };
}

export async function handleSourceImportRequest(
  input: SourceImportRequestHandlerInput,
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();

  const parsed = SourceImportRequestSchema.safeParse(input.body);
  if (!parsed.success) return invalidRequestResult();

  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();

  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  // Decode, hash, and extract only after the learner identity is verified.
  // Semantic validation also stays ahead of quota so rejected binary envelopes do not spend a request.
  const prepared = prepareImport(parsed.data);
  if (isTransportResult(prepared)) return prepared;

  const quotaRejection = applyVerifiedQuota(input.consumeQuota, 'source-import', auth.learner.userId);
  if (quotaRejection) return quotaRejection;

  const repository = input.repositoryForToken(auth.learner.accessToken);
  const provenance = provenanceFor(prepared);
  let record = createSourceRecord({
    userId: auth.learner.userId,
    title: prepared.request.title,
    type: prepared.request.type,
    provenance,
    processingState: 'processing',
  });

  try {
    record = await repository.saveRecord(record);
  } catch {
    return unavailableResult();
  }

  let extracted: ExtractionResult;
  try {
    extracted = await (input.extractDocument ?? extractDocument)({
      type: prepared.request.type,
      content: prepared.extractionContent,
      title: prepared.request.title,
    });
  } catch (error) {
    const normalized = normalizeSourceError(error);
    const failedRecord = withRecordState(record, 'failed');
    await repository.updateRecord(failedRecord).catch(() => undefined);
    return sourceFailureResult(normalized);
  }

  if (!extracted.success) {
    const normalized = normalizeSourceError(extracted.error ?? { code: 'EXTRACTION_FAILED' });
    if (normalized.code === 'HANDOFF_REQUIRED' || extracted.error?.code === 'HANDOFF_REQUIRED') {
      const handoffProvenance: SourceProvenance = {
        ...provenance,
        owningModule: extracted.error?.owningModule ?? owningModuleFor(prepared.request.type),
        handoffReasonVi: normalized.userMessageVi,
      };
      const handoffRecord = withRecordState(record, 'handoff_required', undefined, handoffProvenance);
      try {
        const saved = await repository.updateRecord(handoffRecord);
        return {
          status: 200,
          body: {
            status: 'handoff_required',
            sourceRecord: saved,
            owningModule: handoffRecord.provenance.owningModule,
          },
        };
      } catch {
        return unavailableResult();
      }
    }

    const failedRecord = withRecordState(record, 'failed');
    await repository.updateRecord(failedRecord).catch(() => undefined);
    return sourceFailureResult(normalized);
  }

  if (!extracted.version) {
    const normalized = normalizeSourceError({ code: 'EXTRACTION_FAILED' });
    await repository.updateRecord(withRecordState(record, 'failed')).catch(() => undefined);
    return sourceFailureResult(normalized);
  }

  const version: SourceVersion = { ...extracted.version, sourceId: record.id };
  try {
    await repository.saveVersion(version, auth.learner.userId);
    const readyRecord = withRecordState(record, 'ready', version);
    const saved = await repository.updateRecord(readyRecord);
    return {
      status: 200,
      body: {
        status: 'ready',
        sourceRecord: saved,
        sourceVersion: version,
      },
    };
  } catch (error) {
    const normalized = normalizeSourceError(error && typeof error === 'object' && 'code' in error
      ? error
      : { code: 'NETWORK_DISCONNECTED' });
    await repository.updateRecord(withRecordState(record, 'failed')).catch(() => undefined);
    return sourceFailureResult(normalized);
  }
}
