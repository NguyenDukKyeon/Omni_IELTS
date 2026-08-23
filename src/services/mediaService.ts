import {
  MediaSession,
  MediaShadowingEvaluation,
  MediaExtractedVocab,
  AudioTranscribeInput,
  AudioTranscribeResult,
  MediaTranscriptSegment,
} from '../types';

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
  url: string
): Promise<MediaSession> {
  const response = await fetch('/api/media/youtube/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi xử lý YouTube (${response.status})`);
  }

  const data: ProcessYouTubeResponse = await response.json();
  if (!data.session) {
    throw new Error('Không nhận được dữ liệu phiên học từ server');
  }

  return data.session;
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
}): Promise<MediaShadowingEvaluation> {
  const response = await fetch('/api/media/evaluate-shadowing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi chấm bài Shadowing (${response.status})`);
  }

  const data: EvaluateShadowingResponse = await response.json();
  return data;
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
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(errData.error || `Lỗi phiên âm audio (${response.status})`);
  }

  return await response.json();
}
