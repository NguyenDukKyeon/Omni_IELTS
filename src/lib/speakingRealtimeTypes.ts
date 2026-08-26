import { z } from 'zod';

export const SPEAKING_SESSION_STATES = [
  'idle',
  'requesting_permission',
  'connecting',
  'part_1',
  'part_2_preparation',
  'part_2_speaking',
  'part_3',
  'finalizing',
  'completed',
  'permission_denied',
  'connection_lost',
  'provider_unavailable',
  'quota_exhausted',
  'fallback_turn_based',
  'failed',
] as const;

export type SpeakingSessionState = (typeof SPEAKING_SESSION_STATES)[number];

export const SPEAKING_EXAM_PARTS = ['part_1', 'part_2_preparation', 'part_2_speaking', 'part_3'] as const;
export type SpeakingExamPart = (typeof SPEAKING_EXAM_PARTS)[number];

export const SPEAKING_FALLBACK_REASONS = [
  'unauthenticated',
  'permission_denied',
  'livekit_unavailable',
  'agent_unavailable',
  'provider_unavailable',
  'quota_exhausted',
  'network_failed',
  'connection_lost',
  'learner_requested',
] as const;

export type SpeakingFallbackReason = (typeof SPEAKING_FALLBACK_REASONS)[number];

export const SpeakingSessionStateSchema = z.enum(SPEAKING_SESSION_STATES);
export const SpeakingFallbackReasonSchema = z.enum(SPEAKING_FALLBACK_REASONS);

export const SpeechSegmentSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

export const SpeakingTelemetrySchema = z.object({
  rawWpm: z.number(),
  articulationRate: z.number().nullable(),
  fillerCount: z.number(),
  fillerRatePer100Words: z.number(),
  silentPauses: z.array(z.object({
    start: z.number(),
    end: z.number(),
    duration: z.number(),
  })).nullable(),
  averagePauseDuration: z.number().nullable(),
  longPauses: z.number().nullable(),
  speechRatio: z.number().nullable(),
  acousticStatus: z.enum(['measured', 'unavailable']),
  vadVersion: z.string().nullable(),
  partTrends: z.array(z.object({
    part: z.enum(['part_1', 'part_2', 'part_3']),
    rawWpm: z.number(),
    fillerCount: z.number(),
    fillerRatePer100Words: z.number(),
    speechRatio: z.number().nullable(),
    acousticStatus: z.enum(['measured', 'unavailable']),
  })).nullable().optional(),
});

export const SpeakingTurnSchema = z.object({
  id: z.string().min(1),
  part: z.enum(['part_1', 'part_2', 'part_3']),
  questionNumber: z.number().int().nonnegative(),
  examinerSpoken: z.string(),
  question: z.string(),
  candidateTranscript: z.string(),
  durationSeconds: z.number().nonnegative(),
  timestamp: z.string(),
  audioPresent: z.boolean(),
});

export type SpeakingTurn = z.infer<typeof SpeakingTurnSchema>;

export const OneTimeProviderCredentialSchema = z.object({
  id: z.string().min(1),
  provider: z.literal('gemini'),
  sessionId: z.string().min(1),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  redeemedAt: z.string().datetime().nullable(),
  status: z.enum(['pending', 'redeemed', 'expired', 'destroyed']),
});

export type OneTimeProviderCredential = z.infer<typeof OneTimeProviderCredentialSchema>;

export const SpeakingRealtimeSessionSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1),
  userId: z.string().min(1),
  state: SpeakingSessionStateSchema,
  mode: z.enum(['realtime', 'turn_based']),
  roomName: z.string().nullable(),
  livekitUrl: z.string().nullable(),
  participantIdentity: z.string(),
  currentPart: z.enum(['part_1', 'part_2_preparation', 'part_2_speaking', 'part_3']).nullable(),
  fallbackReason: SpeakingFallbackReasonSchema.nullable(),
  consentStorage: z.boolean(),
  voiceId: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  lastEventAt: z.string().datetime(),
});

export type SpeakingRealtimeSession = z.infer<typeof SpeakingRealtimeSessionSchema>;

export const CreateLivekitSessionRequestSchema = z.object({
  voiceId: z.string().min(1).max(64).optional(),
  consentStorage: z.boolean().default(false),
  resumeSessionId: z.string().min(1).optional(),
  geminiApiKey: z.string().min(8).max(256).optional(),
});

export const CreateLivekitSessionResponseSchema = z.object({
  session: SpeakingRealtimeSessionSchema,
  token: z.string().nullable(),
  livekitUrl: z.string().nullable(),
  fallbackReason: SpeakingFallbackReasonSchema.nullable(),
  requestId: z.string().min(1),
});

export const RedeemCredentialRequestSchema = z.object({
  credentialId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const SpeakingAnalyzeRequestSchema = z.object({
  fullAudioBase64: z.string().optional(),
  mimeType: z.string().max(128).optional(),
  conversationHistory: z.array(z.object({
    turnIndex: z.number().optional(),
    part: z.string().optional(),
    question: z.string().optional(),
    userTranscript: z.string().optional(),
    timestampSeconds: z.number().optional(),
    durationSeconds: z.number().optional(),
  })).optional(),
  targetBand: z.number().min(0).max(9).optional(),
  totalDurationSeconds: z.number().nonnegative().optional(),
  speechSegments: z.array(SpeechSegmentSchema).nullable().optional(),
  consentStorage: z.boolean().optional(),
  sessionId: z.string().optional(),
});

export type SpeakingAnalyzeRequest = z.infer<typeof SpeakingAnalyzeRequestSchema>;

export const SpeakingAnalyzeUnavailableResponseSchema = z.object({
  error: z.string(),
  code: z.literal('AUDIO_REQUIRED'),
  telemetry: SpeakingTelemetrySchema,
  pronunciation: z.null(),
  overallSpeakingBand: z.null(),
});

export function publicSessionView(session: SpeakingRealtimeSession): SpeakingRealtimeSession {
  return {
    ...session,
    livekitUrl: session.livekitUrl,
  };
}
