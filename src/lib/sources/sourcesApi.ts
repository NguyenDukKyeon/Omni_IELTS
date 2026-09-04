import { getSession } from '../../services/supabase';
import type { SourceImportRequest } from './importTransport.server';
import type { CreateArtifactJobRequest } from './artifactTransport.server';
import type {
  SourceArtifactJob,
  SourceCollection,
  SourceRecord,
  SourceSpan,
  SourceVersion,
} from '../../types/sources';

export type SourcesApiStatus =
  | 'auth_required'
  | 'feature_disabled'
  | 'invalid_request'
  | 'selection_unavailable'
  | 'source_unavailable'
  | 'unavailable'
  | 'quota_exceeded'
  | 'retry_wait'
  | 'failed'
  | 'version_conflict'
  | 'ready'
  | 'handoff_required'
  | 'queued'
  | 'processing'
  | 'validating'
  | 'needs_review';

export class SourcesApiError extends Error {
  readonly statusCode: number;
  readonly statusLabel: SourcesApiStatus | string;
  readonly code?: string;
  readonly userMessageVi?: string;
  readonly suggestedActionVi?: string;
  readonly retryAfterSeconds?: number;

  constructor(input: {
    statusCode: number;
    statusLabel: SourcesApiStatus | string;
    code?: string;
    userMessageVi?: string;
    suggestedActionVi?: string;
    retryAfterSeconds?: number;
  }) {
    super(input.userMessageVi || 'Sources request failed.');
    this.name = 'SourcesApiError';
    this.statusCode = input.statusCode;
    this.statusLabel = input.statusLabel;
    this.code = input.code;
    this.userMessageVi = input.userMessageVi;
    this.suggestedActionVi = input.suggestedActionVi;
    this.retryAfterSeconds = input.retryAfterSeconds;
  }
}

export type SourcesLibraryResponse = {
  status: 'ready';
  records: SourceRecord[];
  collections: SourceCollection[];
};

export type SourceVersionResponse = {
  status: 'ready';
  sourceVersion: SourceVersion;
};

export type SourceVersionsResponse = {
  status: 'ready';
  sourceVersions: SourceVersion[];
};

export type SourceVersionEditRequest = {
  sourceId: string;
  baseVersionId: string;
  editedText: string;
};

export type SourceVersionEditResponse = {
  status: 'ready';
  sourceRecord: SourceRecord;
  sourceVersion: SourceVersion;
};

export type SourceImportResponse = {
  status: 'ready' | 'handoff_required' | 'retry_wait' | 'failed';
  sourceRecord?: SourceRecord;
  sourceVersion?: SourceVersion;
  owningModule?: 'sources' | 'media' | 'mock';
};

export type ArtifactJobResponse = {
  status: SourceArtifactJob['state'] | 'source_unavailable' | 'selection_unavailable';
  job?: SourceArtifactJob;
};

export type GroundedChatRequestPayload = {
  selectedVersionIds: string[];
  question: string;
  sourceSpan?: SourceSpan;
  conversationId?: string;
};

export type GroundedChatResponsePayload = {
  groundingStatus: 'fully_grounded' | 'partially_grounded' | 'unsupported_by_sources';
  answer: string;
  citations: Array<{
    sourceVersionId: string;
    sourceTitle: string;
    blockId: string;
    exactSnippet?: string;
  }>;
  webCitations: Array<{ title: string; url: string; snippet?: string }>;
};

export type WebResearchResponsePayload = {
  status: 'ok';
  webCitations: Array<{ title: string; url: string; snippet?: string }>;
};

type SafeErrorPayload = {
  status?: unknown;
  code?: unknown;
  userMessageVi?: unknown;
  suggestedActionVi?: unknown;
  retryAfterSeconds?: unknown;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

async function authenticatedHeaders(): Promise<HeadersInit> {
  const session = await getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new SourcesApiError({
      statusCode: 401,
      statusLabel: 'auth_required',
      code: 'AUTH_REQUIRED',
      userMessageVi: 'Bạn cần đăng nhập để dùng Sources trên đám mây.',
      suggestedActionVi: 'Đăng nhập rồi thử lại.',
    });
  }
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let headers: HeadersInit;
  try {
    headers = await authenticatedHeaders();
  } catch (error) {
    if (error instanceof SourcesApiError) throw error;
    throw new SourcesApiError({ statusCode: 503, statusLabel: 'unavailable' });
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { ...headers, ...(init.headers || {}) },
    });
  } catch {
    throw new SourcesApiError({
      statusCode: 503,
      statusLabel: 'unavailable',
      code: 'NETWORK_DISCONNECTED',
      userMessageVi: 'Mất kết nối mạng. Dữ liệu nguồn chưa được đồng bộ.',
      suggestedActionVi: 'Kiểm tra mạng rồi thử lại.',
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const safe = payload && typeof payload === 'object' ? payload as SafeErrorPayload : {};
    throw new SourcesApiError({
      statusCode: response.status,
      statusLabel: stringValue(safe.status) || 'unavailable',
      code: stringValue(safe.code),
      userMessageVi: stringValue(safe.userMessageVi),
      suggestedActionVi: stringValue(safe.suggestedActionVi),
      retryAfterSeconds: numberValue(safe.retryAfterSeconds)
        ?? (Number(response.headers.get('Retry-After') || '') || undefined),
    });
  }

  return payload as T;
}

export function listSourcesLibrary(): Promise<SourcesLibraryResponse> {
  return requestJson<SourcesLibraryResponse>('/api/sources/library');
}

export function getSourceVersion(versionId: string): Promise<SourceVersionResponse> {
  return requestJson<SourceVersionResponse>(`/api/sources/versions/${encodeURIComponent(versionId)}`);
}

export function listSourceVersions(sourceId: string): Promise<SourceVersionsResponse> {
  return requestJson<SourceVersionsResponse>(`/api/sources/sources/${encodeURIComponent(sourceId)}/versions`);
}

export function createEditedSourceVersion(request: SourceVersionEditRequest): Promise<SourceVersionEditResponse> {
  return requestJson<SourceVersionEditResponse>('/api/sources/versions', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function importSource(request: SourceImportRequest): Promise<SourceImportResponse> {
  return requestJson<SourceImportResponse>('/api/sources/import', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function createArtifactJob(request: CreateArtifactJobRequest): Promise<ArtifactJobResponse> {
  return requestJson<ArtifactJobResponse>('/api/sources/artifact-jobs', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function getArtifactJob(jobId: string): Promise<ArtifactJobResponse> {
  return requestJson<ArtifactJobResponse>(`/api/sources/artifact-jobs/${encodeURIComponent(jobId)}`);
}

export function executeGroundedChat(
  request: GroundedChatRequestPayload,
): Promise<GroundedChatResponsePayload> {
  return requestJson<GroundedChatResponsePayload>('/api/sources/grounded-chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function requestWebResearch(
  question: string,
  conversationId?: string,
): Promise<WebResearchResponsePayload> {
  return requestJson<WebResearchResponsePayload>('/api/sources/web-research', {
    method: 'POST',
    body: JSON.stringify({ question, ...(conversationId ? { conversationId } : {}) }),
  });
}
