import { describe, it, expect } from 'vitest';
import {
  MediaResumeStateSchema,
  StudioModeSchema,
  AssistanceModeSchema,
  MediaLessonSchema,
  DictationDraftSchema,
  LocalRecordingMetadataSchema,
  LocalOwnerScopeSchema,
  TEXT_DRAFT_EXPIRY_MS,
  RECORDING_EXPIRY_MS,
} from '../../types/media';

describe('P04 Batch A: R6 Resume and Original Audio Contracts', () => {
  const lessonId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const versionId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';
  const now = '2026-09-06T12:00:00.000Z';

  describe('MediaResumeStateSchema - Version Binding & Mode Separation', () => {
    it('accepts valid state (a): transcriptVersionId null, activeSegmentId null (degraded mode)', () => {
      const state = {
        lessonId,
        userId,
        transcriptVersionId: null,
        activeSegmentId: null,
        playbackPositionMs: 45000,
        studioMode: 'shadowing' as const,
        assistanceMode: 'guided' as const,
        playbackSpeed: 1.0,
        loopCount: 1,
        waitIntervalMs: 0,
        completedSegmentIds: [],
        updatedAt: now,
      };
      const parsed = MediaResumeStateSchema.parse(state);
      expect(parsed.transcriptVersionId).toBeNull();
      expect(parsed.activeSegmentId).toBeNull();
      expect(parsed.completedSegmentIds).toHaveLength(0);
      expect(parsed.studioMode).toBe('shadowing');
      expect(parsed.assistanceMode).toBe('guided');
    });

    it('accepts valid state (b): owned version present, activeSegmentId null (no active sentence)', () => {
      const state = {
        lessonId,
        userId,
        transcriptVersionId: versionId,
        activeSegmentId: null,
        playbackPositionMs: 12000,
        studioMode: 'dictation' as const,
        assistanceMode: 'independent' as const,
        playbackSpeed: 1.25,
        loopCount: 2,
        waitIntervalMs: 500,
        completedSegmentIds: ['seg_01', 'seg_02'],
        updatedAt: now,
      };
      const parsed = MediaResumeStateSchema.parse(state);
      expect(parsed.transcriptVersionId).toBe(versionId);
      expect(parsed.activeSegmentId).toBeNull();
      expect(parsed.completedSegmentIds).toEqual(['seg_01', 'seg_02']);
      expect(parsed.assistanceMode).toBe('independent');
    });

    it('accepts valid state (c): owned version present and activeSegmentId present', () => {
      const state = {
        lessonId,
        userId,
        transcriptVersionId: versionId,
        activeSegmentId: 'seg_03',
        playbackPositionMs: 25000,
        studioMode: 'dictation' as const,
        assistanceMode: 'guided' as const,
        playbackSpeed: 0.75,
        loopCount: 3,
        waitIntervalMs: 1000,
        completedSegmentIds: ['seg_01', 'seg_02'],
        updatedAt: now,
      };
      const parsed = MediaResumeStateSchema.parse(state);
      expect(parsed.transcriptVersionId).toBe(versionId);
      expect(parsed.activeSegmentId).toBe('seg_03');
    });

    it('rejects segment when transcriptVersionId is null (segment without version is invalid)', () => {
      const state = {
        lessonId,
        userId,
        transcriptVersionId: null,
        activeSegmentId: 'seg_orphan',
        playbackPositionMs: 5000,
        studioMode: 'shadowing' as const,
        assistanceMode: 'guided' as const,
        playbackSpeed: 1.0,
        loopCount: 1,
        waitIntervalMs: 0,
        completedSegmentIds: [],
        updatedAt: now,
      };
      expect(() => MediaResumeStateSchema.parse(state)).toThrow(
        /activeSegmentId requires a non-null transcriptVersionId/
      );
    });

    it('rejects non-empty completedSegmentIds when transcriptVersionId is null', () => {
      const state = {
        lessonId,
        userId,
        transcriptVersionId: null,
        activeSegmentId: null,
        playbackPositionMs: 5000,
        studioMode: 'dictation' as const,
        assistanceMode: 'guided' as const,
        playbackSpeed: 1.0,
        loopCount: 1,
        waitIntervalMs: 0,
        completedSegmentIds: ['seg_old_01'],
        updatedAt: now,
      };
      expect(() => MediaResumeStateSchema.parse(state)).toThrow(
        /completedSegmentIds must be empty when transcriptVersionId is null/
      );
    });

    it('migrates legacy fixture without losing valid studioMode and preserves playback constraints', () => {
      const legacyState = {
        lessonId,
        userId,
        transcriptVersionId: versionId,
        activeSegmentId: 'seg_01',
        playbackPositionMs: 1500,
        lastMode: 'shadowing' as const,
        playbackSpeed: 1.0,
        loopCount: 2,
        waitIntervalMs: 800,
        completedSegmentIds: ['seg_01'],
        updatedAt: now,
      };
      const parsed = MediaResumeStateSchema.parse(legacyState);
      expect(parsed.studioMode).toBe('shadowing');
      expect(parsed.lastMode).toBe('shadowing');
      expect(parsed.assistanceMode).toBe('guided'); // default
    });

    it('enforces existing bounds on playbackSpeed, loopCount, and waitIntervalMs', () => {
      const base = {
        lessonId,
        userId,
        transcriptVersionId: versionId,
        activeSegmentId: 'seg_01',
        playbackPositionMs: 1500,
        studioMode: 'dictation' as const,
        assistanceMode: 'guided' as const,
        playbackSpeed: 1.0,
        loopCount: 1,
        waitIntervalMs: 0,
        completedSegmentIds: [],
        updatedAt: now,
      };

      expect(() => MediaResumeStateSchema.parse({ ...base, playbackSpeed: 0.2 })).toThrow();
      expect(() => MediaResumeStateSchema.parse({ ...base, playbackSpeed: 2.5 })).toThrow();
      expect(() => MediaResumeStateSchema.parse({ ...base, loopCount: 0 })).toThrow();
      expect(() => MediaResumeStateSchema.parse({ ...base, loopCount: 15 })).toThrow();
      expect(() => MediaResumeStateSchema.parse({ ...base, waitIntervalMs: -100 })).toThrow();
    });

    it('rejects conflicting studioMode and lastMode when both are present', () => {
      const conflictingState = {
        lessonId,
        userId,
        transcriptVersionId: versionId,
        activeSegmentId: 'seg_01',
        playbackPositionMs: 1500,
        studioMode: 'shadowing' as const,
        lastMode: 'dictation' as const,
        playbackSpeed: 1.0,
        loopCount: 1,
        waitIntervalMs: 0,
        completedSegmentIds: ['seg_01'],
        updatedAt: now,
      };
      expect(() => MediaResumeStateSchema.parse(conflictingState)).toThrow(
        /studioMode and lastMode must not conflict/
      );
    });

    it('accepts matching studioMode and lastMode when both are present', () => {
      const matchingState = {
        lessonId,
        userId,
        transcriptVersionId: versionId,
        activeSegmentId: 'seg_01',
        playbackPositionMs: 1500,
        studioMode: 'shadowing' as const,
        lastMode: 'shadowing' as const,
        playbackSpeed: 1.0,
        loopCount: 1,
        waitIntervalMs: 0,
        completedSegmentIds: ['seg_01'],
        updatedAt: now,
      };
      const parsed = MediaResumeStateSchema.parse(matchingState);
      expect(parsed.studioMode).toBe('shadowing');
      expect(parsed.lastMode).toBe('shadowing');
    });

    it('rejects empty strings in completedSegmentIds', () => {
      const emptySegmentState = {
        lessonId,
        userId,
        transcriptVersionId: versionId,
        activeSegmentId: 'seg_01',
        playbackPositionMs: 1500,
        studioMode: 'shadowing' as const,
        playbackSpeed: 1.0,
        loopCount: 1,
        waitIntervalMs: 0,
        completedSegmentIds: ['seg_01', ''],
        updatedAt: now,
      };
      expect(() => MediaResumeStateSchema.parse(emptySegmentState)).toThrow();
    });
  });

  describe('MediaLessonSchema - Original Audio Representation', () => {
    const baseLesson = {
      id: lessonId,
      userId,
      title: 'Academic Lecture on Sustainable Cities',
      durationMs: 120000,
      processingState: 'ready' as const,
      transcriptState: 'ready' as const,
      createdAt: now,
      updatedAt: now,
    };

    it('accepts ready local-only source audio with null mediaUrl', () => {
      const localReadyLesson = {
        ...baseLesson,
        mediaType: 'audio' as const,
        mediaUrl: null,
        originalFilename: 'sustainable_cities.mp3',
        sourceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };
      const parsed = MediaLessonSchema.parse(localReadyLesson);
      expect(parsed.mediaType).toBe('audio');
      expect(parsed.mediaUrl).toBeNull();
      expect(parsed.originalFilename).toBe('sustainable_cities.mp3');
      expect(parsed.sourceHash).toHaveLength(64);
    });

    it('accepts metadata-only local source without sourceHash (P03 initial handoff intake)', () => {
      const handoffLesson = {
        ...baseLesson,
        mediaType: 'audio' as const,
        mediaUrl: null,
        processingState: 'requires_original_audio' as const,
        originalFilename: 'lecture_recording.wav',
        // sourceHash is absent because binary has not been ingested yet
      };
      const parsed = MediaLessonSchema.parse(handoffLesson);
      expect(parsed.mediaUrl).toBeNull();
      expect(parsed.sourceHash).toBeUndefined();
      expect(parsed.processingState).toBe('requires_original_audio');
    });

    it('rejects YouTube source when mediaUrl is null or invalid', () => {
      expect(() =>
        MediaLessonSchema.parse({
          ...baseLesson,
          mediaType: 'youtube' as const,
          mediaUrl: null,
        })
      ).toThrow();

      expect(() =>
        MediaLessonSchema.parse({
          ...baseLesson,
          mediaType: 'youtube' as const,
          mediaUrl: 'not_a_url',
        })
      ).toThrow();

      // Reject blob URL as mediaUrl
      expect(() =>
        MediaLessonSchema.parse({
          ...baseLesson,
          mediaType: 'youtube' as const,
          mediaUrl: 'blob:http://localhost:5173/550e8400-e29b-41d4-a716-446655440000',
        })
      ).toThrow();
    });

    it('rejects invalid sourceHash format', () => {
      expect(() =>
        MediaLessonSchema.parse({
          ...baseLesson,
          mediaType: 'audio' as const,
          mediaUrl: null,
          sourceHash: 'not-a-sha256-hash',
        })
      ).toThrow();
    });

    it('rejects originalFilename containing Unix or Windows path separators', () => {
      expect(() =>
        MediaLessonSchema.parse({
          ...baseLesson,
          mediaType: 'audio' as const,
          mediaUrl: null,
          originalFilename: '../../etc/passwd',
        })
      ).toThrow(/originalFilename must not contain path separators/);

      expect(() =>
        MediaLessonSchema.parse({
          ...baseLesson,
          mediaType: 'audio' as const,
          mediaUrl: null,
          originalFilename: 'C:\\Windows\\system32\\audio.mp3',
        })
      ).toThrow(/originalFilename must not contain path separators/);

      expect(() =>
        MediaLessonSchema.parse({
          ...baseLesson,
          mediaType: 'audio' as const,
          mediaUrl: null,
          originalFilename: 'nested/audio.mp3',
        })
      ).toThrow(/originalFilename must not contain path separators/);
    });

    it('accepts safe originalFilename without path separators', () => {
      const parsed = MediaLessonSchema.parse({
        ...baseLesson,
        mediaType: 'audio' as const,
        mediaUrl: null,
        originalFilename: 'lecture_audio_2026-09-06.mp3',
      });
      expect(parsed.originalFilename).toBe('lecture_audio_2026-09-06.mp3');
    });
  });

  describe('DictationDraftSchema & LocalRecordingMetadataSchema - Draft Isolation & Retention', () => {
    it('accepts a valid DictationDraft bound to exact lesson, version, and segment', () => {
      const draft = {
        scope: {
          kind: 'account' as const,
          subjectId: userId,
        },
        lessonId,
        transcriptVersionId: versionId,
        segmentId: 'seg_05',
        userResponseText: 'The rapid urbanization has caused significant challenges.',
        assistanceMode: 'guided' as const,
        lastContentEditedAt: now,
        expiresAt: new Date(Date.parse(now) + TEXT_DRAFT_EXPIRY_MS).toISOString(),
      };
      const parsed = DictationDraftSchema.parse(draft);
      expect(parsed.transcriptVersionId).toBe(versionId);
      expect(parsed.segmentId).toBe('seg_05');
      expect(parsed.userResponseText).toContain('rapid urbanization');
      expect(parsed.scope.kind).toBe('account');
    });

    it('supports guest scope for DictationDraft', () => {
      const guestDraft = {
        scope: {
          kind: 'guest' as const,
          guestSessionId: 'guest_sess_12345',
        },
        lessonId,
        transcriptVersionId: versionId,
        segmentId: 'seg_01',
        userResponseText: 'Opening statement.',
        assistanceMode: 'independent' as const,
        lastContentEditedAt: now,
        expiresAt: new Date(Date.parse(now) + TEXT_DRAFT_EXPIRY_MS).toISOString(),
      };
      const parsed = DictationDraftSchema.parse(guestDraft);
      expect(parsed.scope.kind).toBe('guest');
    });

    it('rejects raw microphone recording payload when passed as DictationDraft', () => {
      const rawAudioPayload = {
        scope: { kind: 'account' as const, subjectId: userId },
        lessonId,
        transcriptVersionId: versionId,
        segmentId: 'seg_01',
        userResponseText: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua8+56+2CY0CGQ2hyb21lFlSua8+56+2CY0CG',
        assistanceMode: 'guided' as const,
        lastContentEditedAt: now,
        expiresAt: new Date(Date.parse(now) + TEXT_DRAFT_EXPIRY_MS).toISOString(),
      };
      expect(() => DictationDraftSchema.parse(rawAudioPayload)).toThrow();
    });

    it('accepts a valid completed LocalRecordingMetadata with 7-day retention', () => {
      const recordingMeta = {
        scope: {
          kind: 'account' as const,
          subjectId: userId,
        },
        attemptId: '8ba7b810-9dad-11d1-80b4-00c04fd430c0',
        lessonId,
        transcriptVersionId: versionId,
        segmentId: 'seg_02',
        completedAt: now,
        expiresAt: new Date(Date.parse(now) + RECORDING_EXPIRY_MS).toISOString(),
        localArtifactRef: 'idb-media://userA/att_12345',
      };
      const parsed = LocalRecordingMetadataSchema.parse(recordingMeta);
      expect(parsed.localArtifactRef).toMatch(/^idb-media:\/\/.+/);
      expect(parsed.attemptId).toBe('8ba7b810-9dad-11d1-80b4-00c04fd430c0');
    });

    it('rejects recording metadata with durable blob URL as localArtifactRef', () => {
      const invalidRef = {
        scope: { kind: 'account' as const, subjectId: userId },
        attemptId: '8ba7b810-9dad-11d1-80b4-00c04fd430c0',
        lessonId,
        transcriptVersionId: versionId,
        segmentId: 'seg_02',
        completedAt: now,
        expiresAt: new Date(Date.parse(now) + RECORDING_EXPIRY_MS).toISOString(),
        localArtifactRef: 'blob:http://localhost:5173/att_12345',
      };
      expect(() => LocalRecordingMetadataSchema.parse(invalidRef)).toThrow();
    });

    it('verifies explicit clock constants for retention policy', () => {
      expect(TEXT_DRAFT_EXPIRY_MS).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(RECORDING_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
    });
  });
});
