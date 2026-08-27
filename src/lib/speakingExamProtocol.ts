import { z } from 'zod';
import { PART_1_SEED_QUESTIONS, pickCueCard } from './speakingExamContent';
import {
  SPEAKING_SESSION_STATES,
  type SpeakingExamPart,
  type SpeakingFallbackReason,
  type SpeakingSessionState,
} from './speakingRealtimeTypes';

export const GEMINI_LIVE_VOICE_IDS = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe', 'Autonoe',
  'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi',
  'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat',
] as const;

export type GeminiLiveVoiceId = (typeof GEMINI_LIVE_VOICE_IDS)[number];
export const DEFAULT_GEMINI_LIVE_VOICE: GeminiLiveVoiceId = 'Kore';

const GEMINI_LIVE_VOICE_SET = new Set<string>(GEMINI_LIVE_VOICE_IDS);

export const PART_1_QUESTION_COUNT = 4;
export const PART_3_QUESTION_COUNT = 3;
export const PART_2_PREP_SECONDS = 60;
export const PART_2_SPEAK_SECONDS = 120;

export function resolveGeminiLiveVoiceId(raw?: string | null): GeminiLiveVoiceId {
  const trimmed = raw?.trim();
  if (trimmed && GEMINI_LIVE_VOICE_SET.has(trimmed)) return trimmed as GeminiLiveVoiceId;
  return DEFAULT_GEMINI_LIVE_VOICE;
}

export function part3Questions(theme: string): string[] {
  const subject = theme.trim() || 'this topic';
  return [
    `How does ${subject.toLowerCase()} affect young people today?`,
    `What role should governments play regarding ${subject.toLowerCase()}?`,
    `Do you think ${subject.toLowerCase()} will become more important in the future? Why?`,
  ];
}

export function questionForPart(part: SpeakingExamPart, questionIndex: number, cueIndex = 0): string {
  const cue = pickCueCard(cueIndex);
  if (part === 'part_1') return PART_1_SEED_QUESTIONS[Math.min(questionIndex, PART_1_SEED_QUESTIONS.length - 1)];
  if (part === 'part_2_preparation' || part === 'part_2_speaking') return cue.prompt;
  return part3Questions(cue.part3Theme)[Math.min(questionIndex, PART_3_QUESTION_COUNT - 1)];
}

export const ExamStateMessageSchema = z.object({
  type: z.literal('exam_state'),
  state: z.enum(SPEAKING_SESSION_STATES),
  questionIndex: z.number().int().nonnegative().optional(),
  question: z.string().max(2000).optional(),
  instruction: z.string().max(4000).optional(),
  cueCardIndex: z.number().int().nonnegative().optional(),
});

export const ExaminerUtteranceMessageSchema = z.object({
  type: z.literal('examiner_utterance'),
  text: z.string().min(1).max(4000),
  part: z.enum(['part_1', 'part_2_preparation', 'part_2_speaking', 'part_3']),
});

export const LearnerTurnCompleteMessageSchema = z.object({
  type: z.literal('learner_turn_complete'),
  part: z.enum(['part_1', 'part_2_preparation', 'part_2_speaking', 'part_3']),
  durationSeconds: z.number().nonnegative(),
  audioPresent: z.boolean(),
});

export const ExamDataMessageSchema = z.discriminatedUnion('type', [
  ExamStateMessageSchema,
  ExaminerUtteranceMessageSchema,
  LearnerTurnCompleteMessageSchema,
]);

export type ExamDataMessage = z.infer<typeof ExamDataMessageSchema>;

export const ExamAgentEventSchema = z.object({
  type: z.literal('exam_state'),
  state: z.enum(SPEAKING_SESSION_STATES),
  questionIndex: z.number().int().nonnegative().optional(),
  question: z.string().max(2000).optional(),
});

export type ExamAgentEvent = z.infer<typeof ExamAgentEventSchema>;

export function parseExamDataMessage(raw: string): ExamDataMessage | null {
  try {
    const parsed = ExamDataMessageSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function encodeExamDataMessage(message: ExamDataMessage): string {
  return JSON.stringify(ExamDataMessageSchema.parse(message));
}

export function nextQuestionIndexAfterAnswer(part: SpeakingExamPart, questionIndex: number): {
  nextPart: SpeakingExamPart | 'finalizing';
  nextIndex: number;
} {
  if (part === 'part_1' && questionIndex + 1 < PART_1_QUESTION_COUNT) {
    return { nextPart: 'part_1', nextIndex: questionIndex + 1 };
  }
  if (part === 'part_1') return { nextPart: 'part_2_preparation', nextIndex: 0 };
  if (part === 'part_2_preparation') return { nextPart: 'part_2_speaking', nextIndex: 0 };
  if (part === 'part_2_speaking') return { nextPart: 'part_3', nextIndex: 0 };
  if (part === 'part_3' && questionIndex + 1 < PART_3_QUESTION_COUNT) {
    return { nextPart: 'part_3', nextIndex: questionIndex + 1 };
  }
  return { nextPart: 'finalizing', nextIndex: 0 };
}

export function bargeInAllowedForPart(part: SpeakingExamPart | null): boolean {
  return part === 'part_1' || part === 'part_3';
}

export function cutoffFallbackReason(): SpeakingFallbackReason {
  return 'provider_unavailable';
}

export function speakingControlIds() {
  return {
    startRealtime: 'start-realtime-session',
    switchTurnBased: 'switch-to-turn-based',
    switchTurnBasedPermission: 'switch-to-turn-based-from-permission',
    switchTurnBasedQuota: 'switch-to-turn-based-from-quota',
    switchTurnBasedProvider: 'switch-to-turn-based-from-provider',
    microphonePermission: 'microphone-permission',
    beginRecording: 'begin-recording',
    retryProvider: 'retry-provider',
    retryFailed: 'retry-failed',
    reconnect: 'reconnect',
    resumeInterrupted: 'resume-interrupted-session',
    endAnswer: 'end-answer',
    endExam: 'end-exam',
    consentStorage: 'consent-storage',
    restartExam: 'restart-exam',
  } as const;
}
