import { z } from 'zod';
import type { LearnerAuthResult } from './groundedChat';
import type { SourcesPersistenceRepository } from './sourcesRepository.server';
import { SourceVersionConflictError, SourceVersionEditError, SOURCE_VERSION_MAX_TEXT_CODE_POINTS } from './versioning';
import {
  authRequiredResult,
  extractBearerToken,
  featureDisabledResult,
  invalidRequestResult,
  selectionUnavailableResult,
  typedFailureResult,
  type SourcesTransportResult,
  unavailableResult,
  verifyOrReject,
  type VerifiedLearner,
} from './transportShared.server';

type LibraryHandlerInput = {
  featureEnabled?: boolean;
  authorizationHeader?: string | null;
  cloudConfigured: boolean;
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>;
  repositoryForToken: (accessToken: string) => SourcesPersistenceRepository;
  verifiedLearner?: VerifiedLearner;
};

const SOURCE_ID_SCHEMA = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const SOURCE_VERSION_EDIT_ID_SCHEMA = z.string().uuid();

function hasAtMostCodePoints(value: string, maximum: number): boolean {
  let count = 0;
  for (const _codePoint of value) {
    count += 1;
    if (count > maximum) return false;
  }
  return true;
}

export const SourceVersionEditRequestSchema = z.object({
  sourceId: SOURCE_VERSION_EDIT_ID_SCHEMA,
  baseVersionId: SOURCE_VERSION_EDIT_ID_SCHEMA,
  editedText: z.string().min(1).refine((value) => hasAtMostCodePoints(value, SOURCE_VERSION_MAX_TEXT_CODE_POINTS), { message: 'edited_text_limit' }),
}).strict();

export type SourceVersionEditRequest = z.infer<typeof SourceVersionEditRequestSchema>;

function versionConflictResult(): SourcesTransportResult {
  return {
    status: 409,
    body: {
      status: 'version_conflict',
      code: 'VERSION_CONFLICT',
      userMessageVi: 'Phiên bản nguồn đã thay đổi trong lúc bạn chỉnh sửa.',
      suggestedActionVi: 'Tải lại lịch sử phiên bản rồi chỉnh sửa từ phiên bản hiện tại.',
      retryable: false,
    },
  };
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export async function handleSourcesLibraryRequest(
  input: LibraryHandlerInput,
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();
  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  try {
    const snapshot = await input.repositoryForToken(auth.learner.accessToken).listLibrary();
    return {
      status: 200,
      body: {
        status: 'ready',
        records: snapshot.records,
        collections: snapshot.collections,
      },
    };
  } catch {
    return unavailableResult();
  }
}

export async function handleSourceVersionRequest(
  input: LibraryHandlerInput & { versionId: string },
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.versionId)) return selectionUnavailableResult();
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();
  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  try {
    const version = await input.repositoryForToken(auth.learner.accessToken).getVersionById(input.versionId);
    if (!version) return selectionUnavailableResult();
    return { status: 200, body: { status: 'ready', sourceVersion: version } };
  } catch {
    return unavailableResult();
  }
}

export async function handleSourceVersionsRequest(
  input: LibraryHandlerInput & { sourceId: string },
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();
  if (!SOURCE_ID_SCHEMA.safeParse(input.sourceId).success) return selectionUnavailableResult();
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();
  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  try {
    const versions = await input.repositoryForToken(auth.learner.accessToken).listVersionsBySource(input.sourceId);
    return { status: 200, body: { status: 'ready', sourceVersions: versions } };
  } catch {
    return unavailableResult();
  }
}

export async function handleSourceVersionEditRequest(
  input: LibraryHandlerInput & { body: unknown },
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();
  const parsed = SourceVersionEditRequestSchema.safeParse(input.body);
  if (!parsed.success) return invalidRequestResult();
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();
  const auth = input.verifiedLearner
    ? { ok: true as const, learner: input.verifiedLearner }
    : await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  try {
    const result = await input.repositoryForToken(auth.learner.accessToken).createEditedVersion({
      sourceId: parsed.data.sourceId,
      baseVersionId: parsed.data.baseVersionId,
      editedText: parsed.data.editedText,
      userId: auth.learner.userId,
    });
    return {
      status: 200,
      body: {
        status: 'ready',
        sourceRecord: result.sourceRecord,
        sourceVersion: result.sourceVersion,
      },
    };
  } catch (error) {
    const code = errorCode(error);
    if (error instanceof SourceVersionConflictError || code === 'VERSION_CONFLICT' || code === 'P0001') {
      return versionConflictResult();
    }
    if (error instanceof SourceVersionEditError && (code === 'INVALID_INPUT' || code === 'RESOURCE_LIMIT_EXCEEDED')) {
      return typedFailureResult(422, 'failed', code);
    }
    if (code === 'INVALID_INPUT' || code === 'RESOURCE_LIMIT_EXCEEDED') {
      return typedFailureResult(422, 'failed', code);
    }
    return unavailableResult();
  }
}
