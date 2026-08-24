import { z } from 'zod';
import { calculateSpeakingTelemetry, SpeechSegment } from './speakingTelemetry';

export const MediaShadowingEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100),
  intonationScore: z.number().min(0).max(100),
  accuracyScore: z.number().min(0).max(100),
  feedbackVi: z.string().min(1),
  swallowedWords: z.array(z.string().min(1)).max(30).optional(),
  stressHighlights: z.array(z.object({
    word: z.string().min(1),
    isCorrect: z.boolean(),
    tip: z.string().min(1).optional(),
  })).max(30).optional(),
  actionableAdvice: z.string().min(1).optional(),
  acousticStatus: z.enum(['measured', 'unavailable']).optional(),
  telemetry: z.object({
    rawWpm: z.number().nonnegative(),
    articulationRate: z.number().nonnegative().nullable(),
    fillerCount: z.number().int().nonnegative(),
    fillerRatePer100Words: z.number().nonnegative(),
    silentPauses: z.array(z.object({
      start: z.number().nonnegative(),
      end: z.number().nonnegative(),
      duration: z.number().nonnegative(),
    })).nullable(),
    averagePauseDuration: z.number().nonnegative().nullable(),
    longPauses: z.number().int().nonnegative().nullable(),
    speechRatio: z.number().min(0).max(1).nullable(),
    acousticStatus: z.enum(['measured', 'unavailable']),
    vadVersion: z.string().nullable(),
  }).optional(),
});

export function parseMediaShadowingEvaluation(input: unknown) {
  return MediaShadowingEvaluationSchema.parse(input);
}

export function finalizeMediaShadowingEvaluation(
  input: unknown,
  context: {
    transcript: string;
    durationSeconds: number;
    speechSegments: SpeechSegment[] | null;
  },
) {
  const evaluation = parseMediaShadowingEvaluation(input);
  return {
    ...evaluation,
    acousticStatus: 'measured' as const,
    telemetry: calculateSpeakingTelemetry({
      ...context,
      vadVersion: context.speechSegments?.length ? 'silero-vad-web-0.0.30' : undefined,
    }),
  };
}

export type ParsedMediaShadowingEvaluation = z.infer<typeof MediaShadowingEvaluationSchema>;
