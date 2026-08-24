import {
  MediaSession,
  MediaShadowingEvaluation,
  MediaExtractedVocab,
  AudioTranscribeInput,
  AudioTranscribeResult,
  MediaTranscriptSegment,
  MediaCapabilities,
  MediaImportJob,
} from '../types';
import { getGeminiRequestHeaders } from './aiTutor';
import { classifyMediaImportFailure } from '../lib/mediaImport';
import { MediaShadowingEvaluationSchema } from '../lib/mediaShadowingEvaluation';

export interface ProcessYouTubeResponse {
  session?: MediaSession;
  error?: string;
}

export interface EvaluateShadowingResponse extends MediaShadowingEvaluation {
  error?: string;
}

export interface ExtractVocabResponse {
  vocabItems?: MediaExtractedVocab[];
  error?: string;
}

/**
 * Process a YouTube URL via server backend with yt-dlp/transcript and Gemini
 */
export async function processYouTubeUrl(
  url: string,
  onProgress?: (job: MediaImportJob) => void,
): Promise<MediaSession> {
  const response = await fetch('/api/media/youtube/import', {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `Lỗi xử lý YouTube (${response.status})`);
  }

  const data: ProcessYouTubeResponse | MediaImportJob = await response.json();
  if ('session' in data && data.session) return data.session;
  if (!('id' in data)) throw new Error('Không nhận được mã tác vụ nhập media từ server.');

  let job = data;
  onProgress?.(job);
  const deadline = Date.now() + 4 * 60 * 1000;
  while (job.phase !== 'ready' && job.phase !== 'failed') {
    if (Date.now() >= deadline) throw new Error('Tác vụ nhập media quá thời gian chờ. Hãy thử lại hoặc dùng file audio/phụ đề.');
    await new Promise((resolve) => setTimeout(resolve, 500));
    const statusResponse = await fetch(`/api/media/imports/${encodeURIComponent(job.id)}`);
    if (!statusResponse.ok) {
      const body = await statusResponse.json().catch(() => ({}));
      throw new Error(body.message || 'Không thể đọc trạng thái nhập media.');
    }
    job = await statusResponse.json();
    onProgress?.(job);
  }

  if (job.phase === 'failed') throw new Error(job.failure?.message || 'Không thể nhập video YouTube.');
  if (!job.session) throw new Error('Tác vụ hoàn tất nhưng không có phiên học hợp lệ.');
  return job.session;
}

export async function getMediaCapabilities(): Promise<MediaCapabilities> {
  const response = await fetch('/api/media/capabilities');
  if (!response.ok) throw new Error('Không thể kiểm tra khả năng nhập media của máy chủ.');
  return response.json();
}

export async function saveMediaTranscript(
  sessionId: string,
  segments: MediaTranscriptSegment[]
): Promise<{ version: string; updatedAt: string }> {
  const response = await fetch(`/api/media/transcripts/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: `user_${Date.now()}`,
      normalizerVersion: 'user-edited-v1',
      segments,
    }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Không thể lưu transcript (${response.status})`);
  }
  return await response.json();
}

/**
 * Evaluate user's shadowing recording against target sentence
 */
export async function evaluateShadowingAttempt(params: {
  targetSentence: string;
  userTranscript?: string;
  userAudioBase64?: string;
  topicTitle?: string;
  durationSeconds?: number;
  speechSegments?: Array<{ start: number; end: number }> | null;
}): Promise<MediaShadowingEvaluation> {
  const response = await fetch('/api/media/evaluate-shadowing', {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi chấm bài Shadowing (${response.status})`);
  }

  const data: EvaluateShadowingResponse = await response.json();
  const parsed = MediaShadowingEvaluationSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Kết quả chấm Shadowing không đúng định dạng; chưa thể hiển thị điểm đáng tin cậy.');
  }
  return parsed.data as MediaShadowingEvaluation;
}

/**
 * Extract high-yield IELTS vocabulary from media transcript text
 */
export async function extractMediaVocab(
  transcriptText: string,
  topic?: string
): Promise<MediaExtractedVocab[]> {
  const response = await fetch('/api/media/extract-vocab', {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify({ transcriptText, topic }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi trích xuất từ vựng (${response.status})`);
  }

  const data: ExtractVocabResponse = await response.json();
  return data.vocabItems || [];
}

/**
 * Transcribe & Segment Audio into sentence-level timestamps for Shadowing/Dictation (media-transcribe-v1)
 */
export async function transcribeAudioAndSegmentApi(
  params: AudioTranscribeInput
): Promise<AudioTranscribeResult> {
  const response = await fetch('/api/media/transcribe-and-segment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const failure = classifyMediaImportFailure(new Error(
      errData.message || errData.error || `Lỗi phiên âm audio (${response.status})`,
    ));
    throw new Error(failure.message);
  }

  return await response.json();
}
