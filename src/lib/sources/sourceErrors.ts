import { randomUUID } from 'node:crypto';

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
  | 'SUBTITLE_PARSE_ERROR';

export interface NormalizedSourceError {
  code: NormalizedSourceErrorCode | string;
  userMessageVi: string;
  suggestedActionVi: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  diagnosticId: string;
  owningModule?: 'sources' | 'media' | 'mock';
}

const FIXED_MESSAGES: Record<string, { userMessageVi: string; suggestedActionVi: string; retryable: boolean; retryAfterSeconds?: number }> = {
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
};

function rawText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message ?? '');
  if (error && typeof error === 'object' && 'code' in error) return String((error as { code: unknown }).code ?? '');
  return '';
}

function inferCode(text: string, explicit?: string): string {
  if (explicit && FIXED_MESSAGES[explicit]) return explicit;
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
  return explicit && explicit.length > 0 ? explicit : 'EXTRACTION_FAILED';
}

export function normalizeSourceError(error: unknown): NormalizedSourceError {
  const already = error && typeof error === 'object' ? error as Partial<NormalizedSourceError> : {};
  const text = rawText(error);
  const code = inferCode(text, typeof already.code === 'string' ? already.code : undefined);
  const fixed = FIXED_MESSAGES[code] ?? FIXED_MESSAGES.EXTRACTION_FAILED;
  return {
    code,
    userMessageVi: fixed.userMessageVi,
    suggestedActionVi: already.suggestedActionVi && !containsSensitive(already.suggestedActionVi)
      ? already.suggestedActionVi
      : fixed.suggestedActionVi,
    retryable: code === 'QUOTA_EXCEEDED' ? true : fixed.retryable,
    retryAfterSeconds: fixed.retryAfterSeconds,
    diagnosticId: typeof already.diagnosticId === 'string' ? already.diagnosticId : randomUUID(),
    owningModule: already.owningModule,
  };
}

function containsSensitive(value: string): boolean {
  return /HTTP\s*\d{3}|internal\/|\.ts:\d+|\/tmp\/|api[_-]?key|sk-|command failed/i.test(value);
}
