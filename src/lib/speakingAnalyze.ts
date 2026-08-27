import { calculateSpeakingTelemetry, type SpeakingTelemetry } from './speakingTelemetry';
import { SpeakingAnalyzeRequestSchema, type SpeakingAnalyzeRequest } from './speakingRealtimeTypes';
import { decideSpeakingArtifactWrite } from './speakingConsent';

export interface SpeakingAnalyzeInterpretation {
  ok: boolean;
  status: number;
  code: string;
  request: SpeakingAnalyzeRequest | null;
  telemetry: SpeakingTelemetry;
  persist: boolean;
  error?: string;
}

const UNAVAILABLE_TELEMETRY = calculateSpeakingTelemetry({
  transcript: '',
  durationSeconds: 0,
  speechSegments: null,
});

export function interpretSpeakingAnalyzeRequest(body: unknown): SpeakingAnalyzeInterpretation {
  const parsed = SpeakingAnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'SPEAKING_ANALYZE_INVALID',
      request: null,
      telemetry: UNAVAILABLE_TELEMETRY,
      persist: false,
      error: 'Yêu cầu chấm Speaking không hợp lệ.',
    };
  }

  const request = parsed.data;
  const transcript = (request.conversationHistory || [])
    .map((turn) => turn.userTranscript || '')
    .join(' ')
    .trim();
  const duration = request.totalDurationSeconds ?? 0;
  const hasAudio = typeof request.fullAudioBase64 === 'string' && request.fullAudioBase64.trim().length >= 50;
  const telemetry = calculateSpeakingTelemetry({
    transcript,
    durationSeconds: duration,
    speechSegments: hasAudio ? request.speechSegments ?? null : null,
    vadVersion: hasAudio && request.speechSegments?.length ? 'silero-vad-web-0.0.30' : undefined,
  });

  const persist = decideSpeakingArtifactWrite(request.consentStorage).allowed;

  if (!hasAudio) {
    return {
      ok: false,
      status: 400,
      code: 'AUDIO_REQUIRED',
      request,
      telemetry: {
        ...telemetry,
        articulationRate: null,
        silentPauses: null,
        averagePauseDuration: null,
        longPauses: null,
        speechRatio: null,
        acousticStatus: 'unavailable',
        vadVersion: null,
      },
      persist: false,
      error: 'Không có audio thật. Pronunciation và pause analytics đang unavailable.',
    };
  }

  return {
    ok: true,
    status: 200,
    code: 'READY',
    request,
    telemetry,
    persist,
  };
}

export function unavailableAnalyzeBody(interpretation: SpeakingAnalyzeInterpretation) {
  return {
    error: interpretation.error,
    code: interpretation.code,
    telemetry: interpretation.telemetry,
    pronunciation: null,
    overallSpeakingBand: null,
    fluencyAndCoherence: null,
    lexicalResource: null,
    grammaticalRange: null,
  };
}
