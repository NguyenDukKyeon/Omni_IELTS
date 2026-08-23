import type { MediaImportFailure, MediaImportPhase } from '../types';

export interface TimedTranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptValidation {
  valid: boolean;
  coverage: number;
  issue?: 'empty' | 'timestamps_invalid' | 'coverage_insufficient';
}

export interface FixedWindowUsage {
  startedAt: number;
  count: number;
}

export interface QuotaDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

const phaseProgress: Record<MediaImportPhase, number> = {
  probing: 8,
  captions: 28,
  normalizing: 55,
  transcribing: 48,
  validating: 82,
  ready: 100,
  failed: 100,
};

export function progressForMediaImportPhase(phase: MediaImportPhase) {
  return phaseProgress[phase];
}

export function consumeFixedWindowQuota(
  windows: Map<string, FixedWindowUsage>,
  key: string,
  now: number,
  limit: number,
  windowMs: number,
): QuotaDecision {
  for (const [storedKey, usage] of windows) {
    if (now - usage.startedAt >= windowMs) windows.delete(storedKey);
  }

  const current = windows.get(key);
  if (!current) {
    windows.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.startedAt + windowMs - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function buildYtDlpRuntimeArgs(input: {
  nodePath: string;
  pluginDir?: string;
  potProviderUrl?: string;
}) {
  const args = [
    '--js-runtimes', `node:${input.nodePath}`,
    '--remote-components', 'ejs:github',
    '--no-warnings',
  ];
  if (input.pluginDir) args.push('--plugin-dirs', input.pluginDir);
  if (input.potProviderUrl) {
    args.push('--extractor-args', `youtubepot-bgutilhttp:base_url=${input.potProviderUrl}`);
  }
  return args;
}

export function parseYtDlpMetadata(stdout: string) {
  const lines = stdout.trim().split(/\r?\n/);
  const parseJsonLine = (index: number) => {
    const value = lines[index];
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  };
  return {
    title: typeof parseJsonLine(0) === 'string' ? parseJsonLine(0) as string : undefined,
    channel: typeof parseJsonLine(1) === 'string' ? parseJsonLine(1) as string : undefined,
    duration: Number(parseJsonLine(2)) || 0,
  };
}

export function validateTranscriptCoverage(
  segments: TimedTranscriptSegment[],
  durationSeconds: number,
): TranscriptValidation {
  if (!segments.length) return { valid: false, coverage: 0, issue: 'empty' };

  let previousEnd = -1;
  for (const segment of segments) {
    if (!Number.isFinite(segment.start)
      || !Number.isFinite(segment.end)
      || segment.start < 0
      || segment.end <= segment.start
      || segment.start + 0.05 < previousEnd
      || !segment.text.trim()) {
      return { valid: false, coverage: 0, issue: 'timestamps_invalid' };
    }
    previousEnd = segment.end;
  }

  const transcriptEnd = segments.at(-1)?.end || 0;
  const coverage = durationSeconds > 0
    ? Math.min(1, transcriptEnd / durationSeconds)
    : 1;
  if (durationSeconds > 0 && coverage < 0.65) {
    return { valid: false, coverage, issue: 'coverage_insufficient' };
  }
  return { valid: true, coverage };
}

export function segmentUntimedTranscript(text: string, secondsPerSentence = 4): TimedTranscriptSegment[] {
  const sentences = text
    .replace(/\r?\n+/g, ' ')
    .match(/[^.!?]+[.!?]+(?:[\]"')]*)|[^.!?]+$/g)
    ?.map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter(Boolean) || [];
  return sentences.map((sentence, index) => ({
    start: index * secondsPerSentence,
    end: (index + 1) * secondsPerSentence,
    text: sentence,
  }));
}

function requestId() {
  return `media_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function classifyMediaImportFailure(error: unknown): MediaImportFailure {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();
  const id = requestId();

  if (normalized.includes('sign in to confirm')
    || normalized.includes('not a bot')
    || normalized.includes('http error 403')
    || normalized.includes('forbidden')) {
    return {
      category: 'provider_blocked',
      code: 'YOUTUBE_PROVIDER_BLOCKED',
      message: 'YouTube đang chặn kết nối tự động cho video này. Bạn có thể tải lên audio, VTT/SRT hoặc dán transcript để tiếp tục.',
      retryable: false,
      recoveryAction: 'upload_source',
      requestId: id,
    };
  }

  if (normalized.includes('javascript runtime') || normalized.includes('js runtime')) {
    return {
      category: 'runtime_missing',
      code: 'MEDIA_RUNTIME_MISSING',
      message: 'Máy chủ Media chưa có JavaScript runtime tương thích để đọc YouTube.',
      retryable: false,
      recoveryAction: 'open_media_help',
      requestId: id,
    };
  }

  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return {
      category: 'provider_timeout',
      code: 'YOUTUBE_TIMEOUT',
      message: 'YouTube phản hồi quá chậm. Hãy thử lại sau hoặc dùng file audio/phụ đề.',
      retryable: true,
      recoveryAction: 'retry',
      requestId: id,
    };
  }

  if (normalized.includes('14 mb') || normalized.includes('max-filesize')) {
    return {
      category: 'audio_too_large',
      code: 'MEDIA_AUDIO_TOO_LARGE',
      message: 'Audio vượt giới hạn 14 MB. Hãy chọn đoạn ngắn hơn hoặc tải lên file nhỏ hơn.',
      retryable: false,
      recoveryAction: 'upload_source',
      requestId: id,
    };
  }

  if (normalized.includes('quota') || normalized.includes('resource_exhausted')) {
    return {
      category: 'ai_quota_exhausted',
      code: 'MEDIA_AI_QUOTA_EXHAUSTED',
      message: 'Quota AI chép lời đã hết. Hãy dùng caption có sẵn, tải VTT/SRT lên hoặc thử lại sau khi quota được cấp lại.',
      retryable: false,
      recoveryAction: 'upload_source',
      requestId: id,
    };
  }

  if (normalized.includes('coverage_insufficient') || normalized.includes('timestamps_invalid')) {
    return {
      category: 'transcript_invalid',
      code: 'TRANSCRIPT_VALIDATION_FAILED',
      message: 'Transcript lấy được không đủ độ phủ hoặc có timestamp không hợp lệ nên chưa thể tạo bài học.',
      retryable: false,
      recoveryAction: 'upload_source',
      requestId: id,
    };
  }

  return {
    category: 'provider_failed',
    code: 'MEDIA_IMPORT_FAILED',
    message: 'Không thể nhập video lúc này. Hãy thử lại hoặc dùng audio, VTT/SRT hay transcript của bạn.',
    retryable: true,
    recoveryAction: 'retry_or_upload',
    requestId: id,
  };
}
