import { normalizeSourceError, type NormalizedSourceErrorCode } from './sourceErrors';
import type { ConsumeSourcesQuota } from './quota.server';
import type { LearnerAuthResult } from './groundedChat';

export type SourcesTransportResult = {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
};

export type VerifiedLearner = {
  userId: string;
  accessToken: string;
};

export function extractBearerToken(authorizationHeader?: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  const token = match?.[1]?.trim() ?? '';
  return token.length > 0 ? token : null;
}

export function featureDisabledResult(): SourcesTransportResult {
  const error = normalizeSourceError({ code: 'FEATURE_DISABLED' });
  return {
    status: 403,
    body: {
      status: 'feature_disabled',
      code: error.code,
      userMessageVi: error.userMessageVi,
      suggestedActionVi: error.suggestedActionVi,
    },
  };
}

export function authRequiredResult(): SourcesTransportResult {
  const error = normalizeSourceError({ code: 'AUTH_REQUIRED' });
  return {
    status: 401,
    body: {
      status: 'auth_required',
      code: error.code,
      userMessageVi: error.userMessageVi,
      suggestedActionVi: error.suggestedActionVi,
    },
  };
}

export function unavailableResult(): SourcesTransportResult {
  const error = normalizeSourceError({ code: 'NETWORK_DISCONNECTED' });
  return {
    status: 503,
    body: {
      status: 'unavailable',
      code: error.code,
      userMessageVi: error.userMessageVi,
      suggestedActionVi: error.suggestedActionVi,
    },
  };
}

export function invalidRequestResult(): SourcesTransportResult {
  const error = normalizeSourceError({ code: 'INVALID_INPUT' });
  return {
    status: 400,
    body: {
      status: 'invalid_request',
      code: error.code,
      userMessageVi: error.userMessageVi,
      suggestedActionVi: error.suggestedActionVi,
    },
  };
}

export function selectionUnavailableResult(): SourcesTransportResult {
  const error = normalizeSourceError({ code: 'VALIDATION_FAILED' });
  return {
    status: 400,
    body: {
      status: 'selection_unavailable',
      code: error.code,
      userMessageVi: 'Không dùng được nguồn đã chọn.',
      suggestedActionVi: 'Chọn lại nguồn thuộc thư viện của bạn rồi thử lại.',
    },
  };
}

export function typedFailureResult(
  status: number,
  statusLabel: string,
  code: NormalizedSourceErrorCode,
  extra: Record<string, unknown> = {},
): SourcesTransportResult {
  const error = normalizeSourceError({ code });
  return {
    status,
    body: {
      status: statusLabel,
      code: error.code,
      userMessageVi: error.userMessageVi,
      suggestedActionVi: error.suggestedActionVi,
      ...extra,
    },
  };
}

export function quotaExceededResult(retryAfterSeconds: number): SourcesTransportResult {
  return {
    status: 429,
    headers: { 'Retry-After': String(retryAfterSeconds) },
    body: {
      status: 'quota_exceeded',
      code: 'QUOTA_EXCEEDED',
      userMessageVi: 'Bạn đã dùng hết lượt xử lý tạm thời. Hãy thử lại sau ít phút.',
      suggestedActionVi: 'Đợi rồi thử lại. Không cần gửi lại nội dung.',
      retryAfterSeconds,
      retryable: true,
    },
  };
}

export async function verifyOrReject(
  accessToken: string,
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>,
): Promise<SourcesTransportResult | { ok: true; learner: VerifiedLearner }> {
  if (!verifyAccessToken) return authRequiredResult();
  try {
    const auth = await verifyAccessToken(accessToken);
    if (auth.status === 'auth_required') return authRequiredResult();
    if (auth.status !== 'ok') return unavailableResult();
    return {
      ok: true,
      learner: { userId: auth.userId, accessToken: auth.accessToken },
    };
  } catch {
    return unavailableResult();
  }
}

export function applyVerifiedQuota(
  consumeQuota: ConsumeSourcesQuota | undefined,
  bucket: Parameters<ConsumeSourcesQuota>[0]['bucket'],
  userId: string,
): SourcesTransportResult | null {
  if (!consumeQuota) return null;
  const quota = consumeQuota({ bucket, userId });
  if (quota.allowed) return null;
  return quotaExceededResult(quota.retryAfterSeconds);
}
