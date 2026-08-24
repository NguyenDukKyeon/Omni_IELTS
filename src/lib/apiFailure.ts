import type { ApiFailure, ApiFailureCategory } from '../types';

type FailureContext = 'forecast' | 'tutor' | 'tts' | 'media' | 'mock' | 'speaking' | 'ai';
export type AiProvider = 'gemini' | 'gemini_web' | 'groq' | 'brave' | 'nvidia_nim' | 'openrouter' | 'bifrost';

type ProviderErrorShape = {
  status?: number | string;
  code?: number | string;
  message?: string;
  retryAfterMs?: number;
  category?: string;
  error?: { code?: number | string; message?: string; status?: string };
};

export class ApiResponseError extends Error {
  readonly failure?: ApiFailure;
  readonly status: number;

  constructor(payload: { error?: string; failure?: ApiFailure }, status: number) {
    super(payload.error || payload.failure?.messageVi || 'Tác vụ chưa thể hoàn tất.');
    this.name = 'ApiResponseError';
    this.failure = payload.failure;
    this.status = status;
  }
}

const PUBLIC_FAILURES: Record<ApiFailureCategory, Omit<ApiFailure, 'requestId'>> = {
  auth_missing: {
    category: 'auth_missing',
    httpStatus: 503,
    retryable: false,
    messageVi: 'Gemini chưa được cấu hình. Hãy thêm API key trong Hồ sơ & Cài đặt.',
    action: 'open_api_settings',
  },
  auth_invalid: {
    category: 'auth_invalid',
    httpStatus: 401,
    retryable: false,
    messageVi: 'API key Gemini không hợp lệ hoặc không có quyền dùng tính năng này.',
    action: 'open_api_settings',
  },
  rate_limited: {
    category: 'rate_limited',
    httpStatus: 429,
    retryable: true,
    retryAfterMs: 2_000,
    messageVi: 'Gemini đang giới hạn số lượt gọi trong thời gian ngắn. Hãy thử lại sau ít phút.',
    action: 'retry',
  },
  quota_exhausted: {
    category: 'quota_exhausted',
    httpStatus: 429,
    retryable: false,
    messageVi: 'Quota Gemini của API key đã hết. Hãy kiểm tra hạn mức hoặc dùng API key khác.',
    action: 'open_quota',
  },
  provider_overloaded: {
    category: 'provider_overloaded',
    httpStatus: 503,
    retryable: true,
    retryAfterMs: 1_500,
    messageVi: 'Gemini đang quá tải tạm thời. Dữ liệu hiện có vẫn được giữ nguyên; bạn có thể thử lại.',
    action: 'retry',
  },
  network_failed: {
    category: 'network_failed',
    httpStatus: 503,
    retryable: true,
    retryAfterMs: 1_500,
    messageVi: 'Không thể kết nối tới Gemini. Hãy kiểm tra mạng rồi thử lại.',
    action: 'retry',
  },
  schema_invalid: {
    category: 'schema_invalid',
    httpStatus: 502,
    retryable: true,
    retryAfterMs: 500,
    messageVi: 'Gemini đã phản hồi nhưng dữ liệu không đạt chuẩn kiểm tra. Hãy thử lại.',
    action: 'retry',
  },
  no_results: {
    category: 'no_results',
    httpStatus: 404,
    retryable: false,
    messageVi: 'Chưa tìm thấy nguồn phù hợp với truy vấn này. Hãy đổi từ khóa hoặc bộ lọc.',
    action: 'refine_query',
  },
  gateway_unavailable: {
    category: 'gateway_unavailable',
    httpStatus: 503,
    retryable: true,
    retryAfterMs: 1_500,
    messageVi: 'AI Gateway nội bộ chưa sẵn sàng. Hãy thử lại sau ít phút.',
    action: 'retry',
  },
  all_providers_exhausted: {
    category: 'all_providers_exhausted',
    httpStatus: 503,
    retryable: false,
    messageVi: 'Tất cả nguồn AI miễn phí phù hợp hiện đã hết quota hoặc không khả dụng.',
    action: 'open_quota',
  },
  unknown: {
    category: 'unknown',
    httpStatus: 500,
    retryable: false,
    messageVi: 'Tác vụ AI chưa thể hoàn tất. Hãy thử lại hoặc gửi mã yêu cầu cho bộ phận hỗ trợ.',
    action: 'contact_support',
  },
};

function normalizedError(error: unknown) {
  const value = (error && typeof error === 'object' ? error : {}) as ProviderErrorShape;
  const nested = value.error || {};
  const statusValue = value.status ?? value.code ?? nested.code ?? nested.status;
  const numericStatus = typeof statusValue === 'number'
    ? statusValue
    : Number.parseInt(String(statusValue || ''), 10);
  const message = [value.message, nested.message, String(statusValue || '')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return { status: Number.isFinite(numericStatus) ? numericStatus : undefined, message };
}

function requestId(context: FailureContext) {
  return `${context}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function classifyApiFailure(
  error: unknown,
  context: FailureContext = 'ai',
  provider: AiProvider = 'gemini',
): ApiFailure {
  if (error && typeof error === 'object' && 'category' in error && 'httpStatus' in error) {
    return { ...(error as ApiFailure), provider: (error as ApiFailure).provider || provider };
  }
  const { status, message } = normalizedError(error);
  const explicitCategory = error && typeof error === 'object' && 'category' in error
    ? String((error as ProviderErrorShape).category || '') as ApiFailureCategory
    : undefined;
  const explicitPublicCategory = explicitCategory
    && Object.prototype.hasOwnProperty.call(PUBLIC_FAILURES, explicitCategory)
    ? explicitCategory
    : undefined;
  const providerRetryAfterMs = error && typeof error === 'object'
    && Number.isFinite(Number((error as ProviderErrorShape).retryAfterMs))
    ? Math.max(0, Number((error as ProviderErrorShape).retryAfterMs))
    : undefined;
  let category: ApiFailureCategory = 'unknown';

  if (explicitPublicCategory) {
    category = explicitPublicCategory;
  } else if (message.includes('no_ai_client') || message.includes('not configured') || message.includes('chưa được cấu hình')) {
    category = 'auth_missing';
  } else if (
    status === 401 ||
    status === 403 ||
    message.includes('api_key_invalid') ||
    message.includes('api key not valid') ||
    message.includes('permission_denied')
  ) {
    category = 'auth_invalid';
  } else if (
    message.includes('daily quota') ||
    message.includes('quota exhausted') ||
    message.includes('quota_exceeded') ||
    message.includes('billing')
  ) {
    category = 'quota_exhausted';
  } else if (
    status === 429 ||
    message.includes('rate_limit_exceeded') ||
    message.includes('too many requests') ||
    message.includes('resource_exhausted')
  ) {
    category = 'rate_limited';
  } else if (
    status === 503 ||
    message.includes('ai_timeout_') ||
    message.includes('timeout') ||
    message.includes('unavailable') ||
    message.includes('high demand') ||
    message.includes('overloaded')
  ) {
    category = 'provider_overloaded';
  } else if (
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('enotfound') ||
    message.includes('econnreset') ||
    message.includes('network')
  ) {
    category = 'network_failed';
  } else if (
    message.includes('schema_invalid') ||
    message.includes('failed validation') ||
    message.includes('invalid json') ||
    error instanceof SyntaxError
  ) {
    category = 'schema_invalid';
  } else if (message.includes('no_results') || message.includes('no results')) {
    category = 'no_results';
  }

  const publicFailure = PUBLIC_FAILURES[category];
  const providerLabel = {
    gemini: 'Gemini',
    gemini_web: 'Gemini Web',
    groq: 'Groq',
    brave: 'Brave Search',
    nvidia_nim: 'NVIDIA NIM',
    openrouter: 'OpenRouter',
    bifrost: 'AI Gateway',
  }[provider];
  const providerMessage = provider === 'groq'
    ? {
        auth_missing: 'Groq chưa được cấu hình. Hãy thêm API key trong Hồ sơ & Cài đặt.',
        auth_invalid: 'API key Groq không hợp lệ hoặc không có quyền dùng Web Search.',
        rate_limited: 'Groq đang giới hạn số lượt gọi trong thời gian ngắn. Hãy thử lại sau ít phút.',
        quota_exhausted: 'Quota Groq đã hết. Hãy kiểm tra hạn mức hoặc dùng API key khác.',
        provider_overloaded: 'Groq đang quá tải tạm thời. Snapshot đã lưu vẫn được giữ nguyên.',
        network_failed: 'Không thể kết nối tới Groq. Hãy kiểm tra mạng rồi thử lại.',
        schema_invalid: 'Groq đã phản hồi nhưng dữ liệu không đạt chuẩn kiểm tra. Hãy thử lại.',
        no_results: 'Groq Web Search chưa tìm thấy nguồn phù hợp. Hãy đổi từ khóa hoặc bộ lọc.',
        gateway_unavailable: PUBLIC_FAILURES.gateway_unavailable.messageVi,
        all_providers_exhausted: PUBLIC_FAILURES.all_providers_exhausted.messageVi,
        unknown: 'Fallback Groq chưa thể hoàn tất. Hãy thử lại hoặc gửi mã yêu cầu cho bộ phận hỗ trợ.',
      }[category]
    : provider === 'brave'
      ? {
          auth_missing: 'Brave Search chưa được cấu hình. Hãy thêm API key ở máy chủ.',
          auth_invalid: 'API key Brave Search không hợp lệ hoặc chưa có quyền dùng Web Search.',
          rate_limited: 'Brave Search đang giới hạn số lượt gọi. Hãy thử lại sau.',
          quota_exhausted: 'Tín dụng Brave Search đã hết. Snapshot đã lưu vẫn được giữ nguyên.',
          provider_overloaded: 'Brave Search đang quá tải tạm thời. Hãy thử lại sau.',
          network_failed: 'Không thể kết nối tới Brave Search. Hãy kiểm tra mạng rồi thử lại.',
          schema_invalid: 'Brave Search đã phản hồi nhưng dữ liệu không đạt chuẩn kiểm tra.',
          no_results: 'Brave Search chưa tìm thấy nguồn phù hợp. Hãy đổi từ khóa hoặc bộ lọc.',
          gateway_unavailable: PUBLIC_FAILURES.gateway_unavailable.messageVi,
          all_providers_exhausted: PUBLIC_FAILURES.all_providers_exhausted.messageVi,
          unknown: 'Brave Search chưa thể hoàn tất tác vụ.',
        }[category]
      : provider === 'gemini_web'
      ? {
          auth_missing: 'Gemini Web Bridge chưa được cấu hình cho môi trường private.',
          auth_invalid: 'Khóa nội bộ của Gemini Web Bridge không hợp lệ.',
          rate_limited: 'Gemini Web đang giới hạn lượt dùng. Hãy đợi hạn mức web được làm mới.',
          quota_exhausted: 'Hạn mức Gemini Web đã hết. Đây là hạn mức web, tách biệt với quota API key.',
          provider_overloaded: 'Gemini Web Bridge đang quá tải tạm thời. Hãy thử lại sau.',
          network_failed: 'Không thể kết nối tới Gemini Web Bridge nội bộ.',
          schema_invalid: 'Gemini Web đã phản hồi nhưng dữ liệu không đạt chuẩn kiểm tra.',
          no_results: 'Gemini Web chưa trả kết quả phù hợp.',
          gateway_unavailable: PUBLIC_FAILURES.gateway_unavailable.messageVi,
          all_providers_exhausted: PUBLIC_FAILURES.all_providers_exhausted.messageVi,
          unknown: 'Gemini Web Bridge chưa thể hoàn tất tác vụ.',
        }[category]
      : publicFailure.messageVi;

  return {
    ...publicFailure,
    ...(providerRetryAfterMs !== undefined ? { retryAfterMs: providerRetryAfterMs } : {}),
    provider,
    messageVi: providerMessage || `${providerLabel} chưa thể hoàn tất tác vụ.`,
    requestId: requestId(context),
  };
}

export async function retryProviderCall<T>(
  operation: () => Promise<T>,
  options: { context?: FailureContext; provider?: AiProvider; maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 750);
  let lastFailure: ApiFailure | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastFailure = classifyApiFailure(error, options.context || 'ai', options.provider || 'gemini');
      if (!lastFailure.retryable || attempt === maxAttempts) throw lastFailure;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastFailure || classifyApiFailure(
    new Error('Unknown provider failure'),
    options.context || 'ai',
    options.provider || 'gemini',
  );
}
