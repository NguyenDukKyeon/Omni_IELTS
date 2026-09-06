import { z } from 'zod';

export const MediaTypeSchema = z.enum(['youtube', 'audio']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const MediaProcessingStateSchema = z.enum([
  'queued',
  'probing',
  'captions',
  'transcribing',
  'normalizing',
  'validating',
  'ready',
  'degraded',
  'unavailable',
  'failed',
  'needs_review',
  'requires_original_audio',
]);
export type MediaProcessingState = z.infer<typeof MediaProcessingStateSchema>;

export const MediaTranscriptStateSchema = z.enum([
  'ready',
  'unavailable_transcript',
  'coverage_insufficient',
  'needs_review',
]);
export type MediaTranscriptState = z.infer<typeof MediaTranscriptStateSchema>;

export const MediaLessonSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string().min(1),
    mediaType: MediaTypeSchema,
    mediaUrl: z.string().nullable().optional(),
    youtubeId: z.string().optional(),
    channelTitle: z.string().optional(),
    durationMs: z.number().int().nonnegative(),
    currentVersionId: z.string().uuid().optional(),
    sourceRecordId: z.string().uuid().optional(),
    sourceVersionId: z.string().uuid().optional(), // Never populated for P03 media handoffs
    processingState: MediaProcessingStateSchema,
    transcriptState: MediaTranscriptStateSchema.optional(),
    originalFilename: z.string().min(1).max(255).optional(),
    sourceHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lastPracticedAt: z.string().datetime().optional(),
  })
  .refine(
    (lesson) => {
      // YouTube sources require an HTTP(S) url; blob/data/file URLs are strictly forbidden
      if (lesson.mediaType === 'youtube') {
        return (
          typeof lesson.mediaUrl === 'string' &&
          /^https?:\/\/[^\s]+$/.test(lesson.mediaUrl) &&
          !lesson.mediaUrl.startsWith('blob:') &&
          !lesson.mediaUrl.startsWith('data:')
        );
      }
      // If audio has a mediaUrl, it must be HTTP(S)
      if (lesson.mediaUrl != null) {
        return (
          /^https?:\/\/[^\s]+$/.test(lesson.mediaUrl) &&
          !lesson.mediaUrl.startsWith('blob:') &&
          !lesson.mediaUrl.startsWith('data:')
        );
      }
      // Audio without mediaUrl (local-only or P03 handoff) is valid
      return true;
    },
    {
      message: 'mediaUrl is required for YouTube sources and must be a valid HTTP(S) URL',
    }
  );
export type MediaLesson = z.infer<typeof MediaLessonSchema>;

/**
 * Browser navigation handoff request. It carries only sourceRecordId.
 * Extra fields are strictly rejected.
 */
export const MediaHandoffRequestSchema = z
  .object({
    sourceRecordId: z.string().uuid(),
  })
  .strict();
export type MediaHandoffRequest = z.infer<typeof MediaHandoffRequestSchema>;

/**
 * Server-only resolved handoff reference after verified JWT and learner-scoped P03 RLS hydration.
 */
export const ResolvedMediaHandoffReferenceSchema = z
  .object({
    sourceRecordId: z.string().uuid(),
    authenticatedUserId: z.string().uuid(),
    title: z.string().min(1),
    mediaType: MediaTypeSchema,
    originalUrl: z.string().url().optional(),
    originalFilename: z.string().min(1).optional(),
    provenanceCitation: z.string().min(1),
    retrievalDate: z.string().datetime(),
  })
  .strict();
export type ResolvedMediaHandoffReference = z.infer<typeof ResolvedMediaHandoffReferenceSchema>;

export const TranscriptStageSchema = z.enum(['raw_caption', 'ai_transcription', 'user_edited', 'normalised']);
export type TranscriptStage = z.infer<typeof TranscriptStageSchema>;

export const MediaTranscriptSegmentSchema = z
  .object({
    id: z.string().min(1),
    index: z.number().int().nonnegative(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string().min(1),
    speaker: z.string().optional(),
    translationVi: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low']),
  })
  .strict()
  .refine((seg) => seg.endMs > seg.startMs, {
    message: 'endMs must be strictly greater than startMs',
  });
export type MediaTranscriptSegment = z.infer<typeof MediaTranscriptSegmentSchema>;

export const MediaTranscriptVersionSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  userId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  stage: TranscriptStageSchema,
  contentHash: z.string().min(1),
  normalizerVersion: z.string().min(1),
  segments: z.array(MediaTranscriptSegmentSchema),
  coverageRatio: z.number().min(0).max(1),
  wordCount: z.number().int().nonnegative(),
  isComplete: z.boolean(),
  createdAt: z.string().datetime(),
});
export type MediaTranscriptVersion = z.infer<typeof MediaTranscriptVersionSchema>;

export const AcousticStatusSchema = z.enum(['measured', 'unavailable']);
export type AcousticStatus = z.infer<typeof AcousticStatusSchema>;

export const SilentPauseSchema = z
  .object({
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  })
  .strict();

export const ShadowingTelemetrySchema = z
  .object({
    rawWpm: z.number().nonnegative(),
    articulationRate: z.number().nullable(),
    fillerCount: z.number().int().nonnegative(),
    fillerRatePer100Words: z.number().nonnegative(),
    silentPauses: z.array(SilentPauseSchema),
    averagePauseDurationMs: z.number().nullable(),
    longPauseCount: z.number().int().nonnegative(),
    speechRatio: z.number().min(0).max(1),
    acousticStatus: AcousticStatusSchema,
    vadVersion: z.string().min(1),
  })
  .strict();
export type ShadowingTelemetry = z.infer<typeof ShadowingTelemetrySchema>;

export const StressHighlightSchema = z
  .object({
    word: z.string().min(1),
    isCorrect: z.boolean(),
    tip: z.string().optional(),
  })
  .strict();

export const ShadowingEvaluationSchema = z
  .object({
    overallScore: z.number().min(0).max(100),
    fluencyScore: z.number().min(0).max(100),
    intonationScore: z.number().min(0).max(100),
    accuracyScore: z.number().min(0).max(100),
    feedbackVi: z.string().min(1),
    swallowedWords: z.array(z.string()),
    stressHighlights: z.array(StressHighlightSchema),
    actionableAdviceVi: z.string().optional(),
    acousticStatus: AcousticStatusSchema,
    telemetry: ShadowingTelemetrySchema.optional(),
  })
  .strict();
export type ShadowingEvaluation = z.infer<typeof ShadowingEvaluationSchema>;

export const ShadowingAttemptSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  segmentId: z.string().min(1),
  transcriptVersionId: z.string().uuid(),
  userId: z.string().uuid(),
  audioDurationMs: z.number().int().nonnegative(),
  acousticStatus: AcousticStatusSchema,
  audioArtifactRef: z.string().regex(/^idb-media:\/\/.+/).optional(), // client-only IndexedDB URI
  evaluation: ShadowingEvaluationSchema.optional(),
  createdAt: z.string().datetime(),
});
export type ShadowingAttempt = z.infer<typeof ShadowingAttemptSchema>;

export const DictationModeSchema = z.enum(['full_sentence', 'gap_fill', 'word_arrange']);
export type DictationMode = z.infer<typeof DictationModeSchema>;

export const DictationDifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type DictationDifficulty = z.infer<typeof DictationDifficultySchema>;

export const WordDiffTokenSchema = z
  .object({
    expected: z.string().max(200),
    user: z.string().min(1).max(200).optional(),
    status: z.enum(['correct', 'incorrect', 'missing', 'extra']),
  })
  .strict()
  .refine((token) => (token.status === 'extra' ? true : token.expected.length >= 1), {
    message: 'expected text must not be empty unless status is extra',
  });
export type WordDiffToken = z.infer<typeof WordDiffTokenSchema>;

export const DictationAttemptSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  segmentId: z.string().min(1),
  transcriptVersionId: z.string().uuid(),
  userId: z.string().uuid(),
  mode: DictationModeSchema,
  difficulty: DictationDifficultySchema,
  userResponseText: z.string().max(2000),
  expectedText: z.string().min(1).max(2000),
  accuracyScore: z.number().int().min(0).max(100),
  diffTokens: z.array(WordDiffTokenSchema).max(500),
  mistakeIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
});
export type DictationAttempt = z.infer<typeof DictationAttemptSchema>;

export const StudioModeSchema = z.enum(['shadowing', 'dictation']);
export type StudioMode = z.infer<typeof StudioModeSchema>;

export const AssistanceModeSchema = z.enum(['guided', 'independent']);
export type AssistanceMode = z.infer<typeof AssistanceModeSchema>;

export const TEXT_DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
export const RECORDING_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const LocalOwnerScopeSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('account'),
      subjectId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('guest'),
      guestSessionId: z.string().min(1),
    })
    .strict(),
]);
export type LocalOwnerScope = z.infer<typeof LocalOwnerScopeSchema>;

export const DictationDraftSchema = z
  .object({
    scope: LocalOwnerScopeSchema,
    lessonId: z.string().uuid(),
    transcriptVersionId: z.string().uuid(),
    segmentId: z.string().min(1),
    userResponseText: z
      .string()
      .max(2000)
      .refine((val) => !val.startsWith('data:') && !val.startsWith('blob:'), {
        message: 'Raw media payloads are not permitted in text drafts',
      }),
    assistanceMode: AssistanceModeSchema,
    lastContentEditedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict();
export type DictationDraft = z.infer<typeof DictationDraftSchema>;

export const LocalRecordingMetadataSchema = z
  .object({
    scope: LocalOwnerScopeSchema,
    attemptId: z.string().uuid(),
    lessonId: z.string().uuid(),
    transcriptVersionId: z.string().uuid(),
    segmentId: z.string().min(1),
    completedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    localArtifactRef: z.string().regex(/^idb-media:\/\/.+/),
  })
  .strict();
export type LocalRecordingMetadata = z.infer<typeof LocalRecordingMetadataSchema>;

const RawMediaResumeStateSchema = z.object({
  lessonId: z.string().uuid(),
  userId: z.string().uuid(),
  transcriptVersionId: z.string().uuid().nullable().default(null),
  activeSegmentId: z.string().min(1).nullable().default(null),
  playbackPositionMs: z.number().int().nonnegative(),
  studioMode: StudioModeSchema.optional(),
  lastMode: StudioModeSchema.optional(),
  assistanceMode: AssistanceModeSchema.default('guided'),
  playbackSpeed: z.number().min(0.5).max(2.0),
  loopCount: z.number().int().min(1).max(10),
  waitIntervalMs: z.number().int().nonnegative(),
  completedSegmentIds: z.array(z.string()),
  updatedAt: z.string().datetime(),
});

export const MediaResumeStateSchema = RawMediaResumeStateSchema
  .refine((val) => val.studioMode !== undefined || val.lastMode !== undefined, {
    message: 'studioMode or lastMode must be provided',
  })
  .refine((val) => !(val.transcriptVersionId === null && val.activeSegmentId !== null), {
    message: 'activeSegmentId requires a non-null transcriptVersionId',
    path: ['activeSegmentId'],
  })
  .refine(
    (val) => !(val.transcriptVersionId === null && val.completedSegmentIds && val.completedSegmentIds.length > 0),
    {
      message: 'completedSegmentIds must be empty when transcriptVersionId is null',
      path: ['completedSegmentIds'],
    }
  )
  .transform((val) => {
    const resolvedMode = val.studioMode ?? val.lastMode!;
    return {
      ...val,
      studioMode: resolvedMode,
      lastMode: resolvedMode,
    };
  });
export type MediaResumeState = z.infer<typeof MediaResumeStateSchema>;
