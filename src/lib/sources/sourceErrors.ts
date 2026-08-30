export type NormalizedSourceErrorCode =
  | 'AUTH_REQUIRED'
  | 'QUOTA_EXCEEDED'
  | 'PROVIDER_BUSY'
  | 'UNSUPPORTED_FORMAT'
  | 'EXTRACTION_FAILED'
  | 'RIGHTS_REJECTED'
  | 'VALIDATION_FAILED'
  | 'NETWORK_DISCONNECTED'
  | 'HANDOFF_REQUIRED'
  | 'INVALID_INPUT'
  | 'URL_UNREACHABLE'
  | 'PDF_SCANNED_NO_TEXT'
  | 'MALFORMED_DOCUMENT'
  | 'SUBTITLE_PARSE_ERROR'
  | 'VERSION_CONFLICT';

export interface NormalizedSourceError {
  code: NormalizedSourceErrorCode;
  userMessageVi: string;
  suggestedActionVi: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  diagnosticId: string;
  owningModule?: 'sources' | 'media' | 'mock';
}

const FIXED_MESSAGES: Record<NormalizedSourceErrorCode, { userMessageVi: string; suggestedActionVi: string; retryable: boolean; retryAfterSeconds?: number }> = {
  AUTH_REQUIRED: {
    userMessageVi: 'Bạn cần đăng nhập để nhập nguồn học.',
    suggestedActionVi: 'Đăng nhập rồi thử lại.',
    retryable: false,
  },
  QUOTA_EXCEEDED: {
    userMessageVi: 'Hạn ngạch sử dụng AI đã tạm hết. Hãy thử lại sau ít phút.',
    suggestedActionVi: 'Đợi rồi bấm thử lại. Không cần gửi lại tệp.',
    retryable: true,
    retryAfterSeconds: 15,
  },
  PROVIDER_BUSY: {
    userMessageVi: 'Dịch vụ đang bận. Dữ liệu nguồn vẫn được giữ nguyên.',
    suggestedActionVi: 'Thử lại sau ít phút.',
    retryable: true,
    retryAfterSeconds: 15,
  },
  UNSUPPORTED_FORMAT: {
    userMessageVi: 'Định dạng nguồn này chưa được hỗ trợ trong P03.',
    suggestedActionVi: 'Hãy dán văn bản, PDF có lớp chữ, DOCX hoặc URL bài viết.',
    retryable: false,
  },
  EXTRACTION_FAILED: {
    userMessageVi: 'Không trích được nội dung nguồn. Hãy dán văn bản thủ công.',
    suggestedActionVi: 'Dán nội dung hoặc chọn tệp khác.',
    retryable: false,
  },
  RIGHTS_REJECTED: {
    userMessageVi: 'Nguồn này không thể lưu vì ràng buộc bản quyền.',
    suggestedActionVi: 'Chọn nguồn bạn sở hữu hoặc được phép trích dẫn.',
    retryable: false,
  },
  VALIDATION_FAILED: {
    userMessageVi: 'Dữ liệu nguồn không đạt kiểm tra hợp lệ.',
    suggestedActionVi: 'Kiểm tra nội dung rồi gửi lại.',
    retryable: false,
  },
  NETWORK_DISCONNECTED: {
    userMessageVi: 'Mất kết nối mạng. Việc nhập nguồn tạm dừng.',
    suggestedActionVi: 'Kiểm tra mạng rồi thử lại.',
    retryable: true,
  },
  HANDOFF_REQUIRED: {
    userMessageVi: 'Nguồn này thuộc module khác và chưa được trích xuất tại đây.',
    suggestedActionVi: 'Mở module sở hữu để tiếp tục.',
    retryable: false,
  },
  INVALID_INPUT: {
    userMessageVi: 'Nội dung nguồn không hợp lệ. Hãy dán văn bản có nghĩa thay vì để trống.',
    suggestedActionVi: 'Dán đoạn văn bản học thuật hoặc tệp văn bản.',
    retryable: false,
  },
  URL_UNREACHABLE: {
    userMessageVi: 'Không lấy được bài viết từ URL. Hãy dán nội dung bài.',
    suggestedActionVi: 'Dán văn bản bài viết vào khung nhập.',
    retryable: false,
  },
  PDF_SCANNED_NO_TEXT: {
    userMessageVi: 'PDF này không có lớp chữ để trích. Hãy dán văn bản hoặc xử lý OCR trước.',
    suggestedActionVi: 'Dán nội dung PDF hoặc tải bản text-layer.',
    retryable: false,
  },
  MALFORMED_DOCUMENT: {
    userMessageVi: 'Tệp tài liệu bị hỏng hoặc không đọc được. Hãy dán văn bản thủ công.',
    suggestedActionVi: 'Dán nội dung hoặc chọn tệp khác.',
    retryable: false,
  },
  SUBTITLE_PARSE_ERROR: {
    userMessageVi: 'Không đọc được phụ đề VTT/SRT. Hãy kiểm tra cú pháp thời gian.',
    suggestedActionVi: 'Tải lại tệp phụ đề hợp lệ hoặc dán văn bản.',
    retryable: false,
  },
  VERSION_CONFLICT: {
    userMessageVi: 'Phiên bản nguồn này đã tồn tại và không thể ghi đè.',
    suggestedActionVi: 'Tạo phiên bản mới thay vì sửa phiên bản cũ.',
    retryable: false,
  },
};

function rawText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message ?? '');
  return '';
}

export function containsSensitive(value: string): boolean {
  return /AIza[\w-]{10,}|gsk_[A-Za-z0-9]+|bearer\s+\S+|authorization:\s*bearer|x-api-key|api[_-]?key|sk-[A-Za-z0-9_-]+|ya29\.[A-Za-z0-9._-]+|HTTP\s*\d{3}|internal\/|\.ts:\d+|\/tmp\/|\/var\/|command failed|--print-json|sk-proj/i.test(value);
}

function isKnownCode(value: unknown): value is NormalizedSourceErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FIXED_MESSAGES, value);
}

function inferCode(text: string, explicit?: unknown): NormalizedSourceErrorCode {
  if (isKnownCode(explicit)) return explicit;
  const lower = text.toLowerCase();
  if (/\b429\b/.test(text) || lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource_exhausted')) {
    return 'QUOTA_EXCEEDED';
  }
  if (lower.includes('enotfound') || lower.includes('network') || lower.includes('failed to fetch') || lower.includes('econnreset')) {
    return 'NETWORK_DISCONNECTED';
  }
  if (/\b503\b/.test(text) || lower.includes('overloaded') || lower.includes('timeout') || lower.includes('high demand')) {
    return 'PROVIDER_BUSY';
  }
  if (lower.includes('unauthorized') || lower.includes('unauthenticated') || /\b401\b/.test(text) || /\b403\b/.test(text)) {
    return 'AUTH_REQUIRED';
  }
  return 'EXTRACTION_FAILED';
}

function owningModuleOf(value: unknown): 'sources' | 'media' | 'mock' | undefined {
  return value === 'sources' || value === 'media' || value === 'mock' ? value : undefined;
}

export function normalizeSourceError(error: unknown): NormalizedSourceError {
  const already = error && typeof error === 'object' ? error as Partial<NormalizedSourceError> & { message?: string } : {};
  const text = rawText(error);
  const code = inferCode(text, already.code);
  const fixed = FIXED_MESSAGES[code];
  const diagnosticId = typeof already.diagnosticId === 'string'
    && /^[0-9a-f-]{16,}$/i.test(already.diagnosticId)
    && !containsSensitive(already.diagnosticId)
    ? already.diagnosticId
    : globalThis.crypto.randomUUID();

  return {
    code,
    userMessageVi: fixed.userMessageVi,
    suggestedActionVi: fixed.suggestedActionVi,
    retryable: code === 'QUOTA_EXCEEDED' ? true : fixed.retryable,
    retryAfterSeconds: fixed.retryAfterSeconds,
    diagnosticId,
    owningModule: owningModuleOf(already.owningModule),
  };
}
