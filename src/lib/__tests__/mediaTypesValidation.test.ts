import { describe, it, expect } from 'vitest';
import {
  MediaLessonSchema,
  MediaHandoffRequestSchema,
  ResolvedMediaHandoffReferenceSchema,
  MediaTranscriptVersionSchema,
  MediaTranscriptSegmentSchema,
  ShadowingAttemptSchema,
  DictationAttemptSchema,
  MediaResumeStateSchema,
} from '../../types/media';

describe('Media Domain Contracts and Zod Schemas', () => {
  it('validates a well-formed MediaLesson object with optional sourceRecordId and absent sourceVersionId', () => {
    const validLesson = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'IELTS Academic Lecture on Urban Planning',
      mediaType: 'youtube' as const,
      mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      youtubeId: 'wr6fQ4KpbRM',
      channelTitle: 'TED-Ed',
      durationMs: 180000,
      sourceRecordId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      // sourceVersionId is intentionally absent because P03 creates no SourceVersion for handoff_required
      processingState: 'ready' as const,
      transcriptState: 'ready' as const,
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
    };
    expect(MediaLessonSchema.parse(validLesson)).toEqual(validLesson);
  });

  it('accepts only sourceRecordId from browser navigation and strictly rejects forged handoff fields', () => {
    const handoffRequest = {
      sourceRecordId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
    };
    expect(MediaHandoffRequestSchema.parse(handoffRequest)).toEqual(handoffRequest);

    // Extra fields like userId, mediaUrl, or sourceVersionId must throw
    expect(() =>
      MediaHandoffRequestSchema.parse({
        ...handoffRequest,
        userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      })
    ).toThrow();

    expect(() =>
      MediaHandoffRequestSchema.parse({
        ...handoffRequest,
        mediaUrl: 'https://attacker.invalid/audio.mp3',
      })
    ).toThrow();

    expect(() =>
      MediaHandoffRequestSchema.parse({
        ...handoffRequest,
        sourceVersionId: '7ba7b810-9dad-11d1-80b4-00c04fd430c9',
      })
    ).toThrow();
  });

  it('validates only a server-resolved handoff reference with authenticated ownership', () => {
    const resolvedYouTube = {
      sourceRecordId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      authenticatedUserId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'IELTS Lecture',
      mediaType: 'youtube' as const,
      originalUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      provenanceCitation: 'IELTS Lecture on Youtube',
      retrievalDate: '2026-09-04T00:00:00.000Z',
    };
    expect(ResolvedMediaHandoffReferenceSchema.parse(resolvedYouTube)).toEqual(resolvedYouTube);

    const resolvedAudio = {
      sourceRecordId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      authenticatedUserId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Learner Recording',
      mediaType: 'audio' as const,
      originalFilename: 'lecture_recording.mp3',
      provenanceCitation: 'Audio Upload',
      retrievalDate: '2026-09-04T00:00:00.000Z',
    };
    expect(ResolvedMediaHandoffReferenceSchema.parse(resolvedAudio)).toEqual(resolvedAudio);
  });

  it('rejects a MediaTranscriptSegment containing mutable attempt properties', () => {
    const validSegment = {
      id: 'seg_a1b2c3d4e5f6',
      index: 0,
      startMs: 0,
      endMs: 3000,
      text: 'Good morning everyone, today we will talk about sustainability.',
      confidence: 'high' as const,
      speaker: 'Lecturer',
      translationVi: 'Chào buổi sáng mọi người, hôm nay chúng ta sẽ nói về sự bền vững.',
    };
    expect(MediaTranscriptSegmentSchema.parse(validSegment)).toEqual(validSegment);

    // Attempt pollution must be rejected by strict schema
    expect(() =>
      MediaTranscriptSegmentSchema.parse({
        ...validSegment,
        userRecordedAudio: 'data:audio/webm;base64,...',
      })
    ).toThrow();

    expect(() =>
      MediaTranscriptSegmentSchema.parse({
        ...validSegment,
        userDictationInput: 'Good morning everyone',
      })
    ).toThrow();

    expect(() =>
      MediaTranscriptSegmentSchema.parse({
        ...validSegment,
        shadowingScore: 85,
      })
    ).toThrow();
  });

  it('validates immutable MediaTranscriptVersion and enforces coverage ratio bounds', () => {
    const validVersion = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      lessonId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      versionNumber: 1,
      stage: 'raw_caption' as const,
      contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      normalizerVersion: 'v1',
      segments: [
        {
          id: 'seg_a1b2c3d4e5f6',
          index: 0,
          startMs: 0,
          endMs: 3000,
          text: 'Good morning everyone.',
          confidence: 'high' as const,
        },
      ],
      coverageRatio: 0.95,
      wordCount: 3,
      isComplete: true,
      createdAt: '2026-09-04T00:00:00.000Z',
    };
    expect(MediaTranscriptVersionSchema.parse(validVersion)).toEqual(validVersion);

    expect(() =>
      MediaTranscriptVersionSchema.parse({
        ...validVersion,
        coverageRatio: 1.5,
      })
    ).toThrow();
  });

  it('validates ShadowingAttempt and enforces acousticStatus', () => {
    const validAttempt = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      lessonId: '550e8400-e29b-41d4-a716-446655440000',
      segmentId: 'seg_a1b2c3d4e5f6',
      transcriptVersionId: '550e8400-e29b-41d4-a716-446655440001',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      audioDurationMs: 2900,
      acousticStatus: 'measured' as const,
      audioArtifactRef: 'idb-media://artifact-123',
      createdAt: '2026-09-04T00:00:00.000Z',
    };
    expect(ShadowingAttemptSchema.parse(validAttempt)).toEqual(validAttempt);

    const unavailableAttempt = {
      ...validAttempt,
      audioDurationMs: 0,
      acousticStatus: 'unavailable' as const,
      audioArtifactRef: undefined,
    };
    expect(ShadowingAttemptSchema.parse(unavailableAttempt)).toEqual(unavailableAttempt);
  });

  it('validates DictationAttempt and enforces diffTokens structure', () => {
    const validDictation = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      lessonId: '550e8400-e29b-41d4-a716-446655440000',
      segmentId: 'seg_a1b2c3d4e5f6',
      transcriptVersionId: '550e8400-e29b-41d4-a716-446655440001',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      mode: 'full_sentence' as const,
      difficulty: 'medium' as const,
      userResponseText: 'Good morning evryone.',
      expectedText: 'Good morning everyone.',
      accuracyScore: 67,
      diffTokens: [
        { expected: 'Good', user: 'Good', status: 'correct' as const },
        { expected: 'morning', user: 'morning', status: 'correct' as const },
        { expected: 'everyone', user: 'evryone', status: 'incorrect' as const },
      ],
      mistakeIds: ['550e8400-e29b-41d4-a716-446655440099'],
      createdAt: '2026-09-04T00:00:00.000Z',
    };
    expect(DictationAttemptSchema.parse(validDictation)).toEqual(validDictation);
  });

  it('validates MediaResumeState with speed and loop bounds', () => {
    const validResume = {
      lessonId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      activeSegmentId: 'seg_a1b2c3d4e5f6',
      playbackPositionMs: 1500,
      lastMode: 'shadowing' as const,
      playbackSpeed: 1.0,
      loopCount: 2,
      waitIntervalMs: 800,
      completedSegmentIds: ['seg_a1b2c3d4e5f6'],
      updatedAt: '2026-09-04T00:00:00.000Z',
    };
    expect(MediaResumeStateSchema.parse(validResume)).toEqual(validResume);

    // Speed out of range (< 0.5 or > 2.0)
    expect(() =>
      MediaResumeStateSchema.parse({
        ...validResume,
        playbackSpeed: 0.25,
      })
    ).toThrow();
  });

  it('validates all MediaProcessingState values including needs_review and requires_original_audio', () => {
    const allStates = [
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
    ] as const;

    const baseLesson = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'State Test Lesson',
      mediaType: 'youtube' as const,
      mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      durationMs: 60000,
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
    };

    for (const state of allStates) {
      const lesson = {
        ...baseLesson,
        processingState: state,
      };
      const parsed = MediaLessonSchema.parse(lesson);
      expect(parsed.processingState).toBe(state);

      // Round-trip JSON serialization
      const serialized = JSON.stringify(parsed);
      const deserialized = MediaLessonSchema.parse(JSON.parse(serialized));
      expect(deserialized).toEqual(parsed);
    }
  });
});
