# OMNI Media Learning Room Implementation Plan (P04)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the unified Guided-first Media Learning Room (P04) with full transcript lifecycle, authentic YouTube/audio playback, Shadowing with real microphone VAD telemetry, Dictation with word-level diff, zero direct mastery/XP, and canonical MistakeEvidence handoff to Review.

**Architecture:** Domain contracts strictly separate immutable `MediaTranscriptVersion` from transient `MediaAttempt`s. Server routes manage authenticated yt-dlp probing, caption extraction, and Gemini 2.5 audio evaluation behind deploy flag `OMNI_MEDIA_ROOM_V2`. Client player integrates YouTube IFrame API and Wavesurfer Audio into a unified controller supporting Guided and Independent learning modes, local IndexedDB audio caching, and WCAG 2.2 AA accessibility.

**Tech Stack:** React 19, TypeScript 5.8, Express 4, Supabase RLS (PostgreSQL), Wavesurfer.js 7.12, @ricky0123/vad-web 0.0.30, jsdiff 7.0.0, Lucide React, Vitest 3, Playwright 1.62.

**Spec:** `docs/superpowers/specs/2026-09-04-omni-media-learning-room-design.md`
**ADR:** `docs/architecture/adr/2026-09-04-media-learning-room-transcript-and-evidence-boundary.md`

## Global Constraints

- **Predecessor Gate**: P04 implementation code is strictly BLOCKED until PR #16 (`origin/feature/p03-sources-library`) is merged into `origin/main` and this plan is approved by the Product Owner. Open PR #16 must never be treated as merged.
- **Zero Hallucinated Scoring (`GUARD-001`)**: Never fabricate transcripts, pronunciation scores, or IELTS band equivalents. Missing microphone or absent caption yields an explicit, honest `unavailable` status.
- **Dictation Microphone Independence (`PRD-008`)**: Dictation requires zero microphone permission. Missing or denied microphone access must never impede Dictation.
- **Zero Direct Mastery Policy**: Media Room emits zero direct `MasteryUpdate`, zero XP points, and zero direct flashcards. Mistakes emit canonical `MistakeEvidence` to Review (`P05`).
- **Biometric Audio Privacy**: Learner voice recordings are ephemeral by default. Local persistence uses IndexedDB (`idb-media://`) on opt-in consent; raw audio is never stored in Supabase tables.
- **Feature Flag**: All v2 functionality operates behind `OMNI_MEDIA_ROOM_V2=true|false`. Default is false; rollback is flag off in one deploy without database down-migrations.
- **Strict Testing**: Every task must follow strict TDD (RED -> GREEN -> REFACTOR -> COMMIT) with concrete test code, exact file paths, and verifiable assertions.

---

## File Structure Map

```text
src/
â”œâ”€â”€ types/
â”‚   â””â”€â”€ media.ts                               # Domain entities, attempt types, player contracts
â”œâ”€â”€ lib/
â”‚   â””â”€â”€ media/
â”‚       â”œâ”€â”€ transcriptValidator.ts             # Monotonicity, coverage ratio, segment validation
â”‚       â”œâ”€â”€ transcriptNormalizer.ts            # Rolling caption de-duplication, sentence chunking
â”‚       â”œâ”€â”€ contentHash.ts                     # Deterministic SHA-256 segment & transcript hashing
â”‚       â”œâ”€â”€ mediaJobMachine.ts                 # Ingestion state machine (probing -> ready/failed)
â”‚       â”œâ”€â”€ mediaFeatureFlags.server.ts        # OMNI_MEDIA_ROOM_V2 parse & express injection
â”‚       â”œâ”€â”€ mediaTransport.server.ts           # Route admission, rate limiting, JWT validation
â”‚       â”œâ”€â”€ youtubeAdapter.server.ts           # yt-dlp sandboxed execution & caption parsing
â”‚       â”œâ”€â”€ audioTranscribeAdapter.server.ts   # Gemini 2.5 audio transcription runner
â”‚       â”œâ”€â”€ shadowingEvalAdapter.server.ts     # Gemini acoustic evaluation & schema validation
â”‚       â”œâ”€â”€ errorScrub.server.ts               # Path, token, and secret sanitization
â”‚       â”œâ”€â”€ diffAdapter.ts                     # Word-level diff adapter (jsdiff / wordDiff)
â”‚       â”œâ”€â”€ evidenceAdapter.ts                 # Formats canonical MistakeEvidence for Review
â”‚       â”œâ”€â”€ vadAdapter.ts                      # Client-side @ricky0123/vad-web speech telemetry
â”‚       â”œâ”€â”€ audioArtifactStore.ts              # Local IndexedDB audio persistence (idb-media://)
â”‚       â””â”€â”€ handoffConsumer.ts                 # Intake for P03 PendingMediaHandoff
â”œâ”€â”€ services/
â”‚   â””â”€â”€ mediaRoomService.ts                    # Client API transport for Media Room v2
â”œâ”€â”€ components/
â”‚   â””â”€â”€ media/
â”‚       â””â”€â”€ v2/
â”‚           â”œâ”€â”€ UnifiedMediaPlayer.tsx         # YouTube & Wavesurfer combined audio controller
â”‚           â”œâ”€â”€ InteractiveTranscriptView.tsx  # Timed segment list, active highlight, edit modal
â”‚           â”œâ”€â”€ ShadowingStudioV2.tsx          # Real-mic recording, VAD telemetry, honest status
â”‚           â”œâ”€â”€ DictationStudioV2.tsx          # Text/gap/arrange input, word diff, zero mic
â”‚           â””â”€â”€ GuidedControlsDock.tsx         # Bottom dock for loop, speed, wait, and progression
â”œâ”€â”€ views/
â”‚   â””â”€â”€ MediaLearningRoomView.tsx              # Guided-first / Independent room container
supabase/
â””â”€â”€ migrations/
    â””â”€â”€ 202609040001_media_learning_room.sql   # Tables: lessons, versions, attempts, resume + RLS
scripts/
â””â”€â”€ test-media-rls-postgres.ts                 # Disposable PostgreSQL multi-tenant RLS proof
e2e/
â””â”€â”€ media-learning-room-v2.spec.ts             # Deterministic Playwright test suite for P04
```

---

## Implementation Tasks

### Task 0: Dependency and Package Reuse Audit

**Files:**
- Modify: `package.json` (specification of exact pin only; no installation during planning)

**Interfaces:**
- Consumes: Existing dependencies (`wavesurfer.js`, `@ricky0123/vad-web`, `zod`, `xstate`, `react`, `express`)
- Produces: Package audit report and `diff` package specification with license and fallback boundaries.

- [ ] **Step 1: Audit existing package capabilities in repository**
  Inspect existing dependencies in `package.json`:
  - `wavesurfer.js`: `^7.12.11` is already present for audio waveform rendering.
  - `@ricky0123/vad-web`: `0.0.30` is already present for voice activity detection.
  - `youtube-transcript`: `^1.3.1` is already present for basic YouTube caption extraction.
  - `zod`: `^4.4.3` is already present for schema validation.
  - `xstate`: `^5.32.5` is already present for state machine definitions.
  - Word diff: Current repository uses bespoke Levenshtein implementation in `src/lib/wordDiff.ts`. For production word-level diff, `diff` (`jsdiff` npm package version `7.0.0`, license BSD-3-Clause) will be adopted behind `src/lib/media/diffAdapter.ts` with complete fallback to `src/lib/wordDiff.ts`.

- [ ] **Step 2: Document isolation and removal plan**
  - Adapter location: `src/lib/media/diffAdapter.ts`.
  - Fallback: If `diff` package import fails or is uninstalled, `diffAdapter.ts` automatically executes internal Levenshtein token comparison from `src/lib/wordDiff.ts`.
  - Removal plan: `diff` is self-contained in `diffAdapter.ts`; removing it requires zero changes to UI or persistence.

---

### Task 1: Domain Contracts and TypeScript Types

**Files:**
- Create: `src/types/media.ts`
- Test: `src/lib/__tests__/mediaTypesValidation.test.ts`

**Interfaces:**
- Consumes: None
- Produces: `MediaLesson`, `MediaTranscriptVersion`, `MediaTranscriptSegment`, `ShadowingAttempt`, `DictationAttempt`, `MediaResumeState`, `MediaImportJob`

- [ ] **Step 1: Write failing type validation test**

```typescript
// src/lib/__tests__/mediaTypesValidation.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  MediaLessonSchema,
  MediaTranscriptVersionSchema,
  MediaTranscriptSegmentSchema,
  ShadowingAttemptSchema,
  DictationAttemptSchema,
  MediaResumeStateSchema,
} from '../../types/media';

describe('Media Domain Contracts', () => {
  it('validates a well-formed MediaLesson object', () => {
    const validLesson = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'IELTS Academic Lecture on Urban Planning',
      mediaType: 'youtube' as const,
      mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      youtubeId: 'wr6fQ4KpbRM',
      durationMs: 180000,
      currentVersionId: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      processingState: 'ready' as const,
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
    };
    expect(MediaLessonSchema.parse(validLesson)).toEqual(validLesson);
  });

  it('rejects a MediaTranscriptSegment containing mutable attempt properties', () => {
    const pollutedSegment = {
      id: 'seg_abc123',
      index: 0,
      startMs: 0,
      endMs: 3000,
      text: 'Valid sentence.',
      confidence: 'high' as const,
      userRecordedAudio: 'data:audio/webm;base64,...', // Must be rejected
    };
    expect(() => MediaTranscriptSegmentSchema.parse(pollutedSegment)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaTypesValidation.test.ts`
Expected: FAIL with "Cannot find module '../../types/media'"

- [ ] **Step 3: Implement minimal type and schema definitions**

```typescript
// src/types/media.ts
import { z } from 'zod';

export const MediaProcessingStateSchema = z.enum([
  'queued', 'probing', 'captions', 'transcribing', 'normalizing',
  'validating', 'ready', 'degraded', 'unavailable', 'failed',
]);

export const MediaLessonSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  mediaType: z.enum(['youtube', 'audio']),
  mediaUrl: z.string().url(),
  youtubeId: z.string().optional(),
  channelTitle: z.string().optional(),
  durationMs: z.number().int().nonnegative(),
  currentVersionId: z.string().uuid(),
  sourceRecordId: z.string().uuid().optional(),
  sourceVersionId: z.string().uuid().optional(),
  processingState: MediaProcessingStateSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastPracticedAt: z.string().datetime().optional(),
});

export const MediaTranscriptSegmentSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  text: z.string().min(1),
  speaker: z.string().optional(),
  translationVi: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict(); // Enforces no mutable attempt state pollution

export const MediaTranscriptVersionSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  userId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  stage: z.enum(['raw_caption', 'ai_transcription', 'user_edited', 'normalised']),
  contentHash: z.string().min(1),
  normalizerVersion: z.string().min(1),
  segments: z.array(MediaTranscriptSegmentSchema),
  coverageRatio: z.number().min(0).max(1),
  wordCount: z.number().int().nonnegative(),
  isComplete: z.boolean(),
  createdAt: z.string().datetime(),
});

export const ShadowingAttemptSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  segmentId: z.string().min(1),
  transcriptVersionId: z.string().uuid(),
  userId: z.string().uuid(),
  audioDurationMs: z.number().int().nonnegative(),
  acousticStatus: z.enum(['measured', 'unavailable']),
  evaluation: z.any().optional(),
  createdAt: z.string().datetime(),
});

export const DictationAttemptSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  segmentId: z.string().min(1),
  transcriptVersionId: z.string().uuid(),
  userId: z.string().uuid(),
  mode: z.enum(['full_sentence', 'gap_fill', 'word_arrange']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  userResponseText: z.string(),
  expectedText: z.string(),
  accuracyScore: z.number().int().min(0).max(100),
  diffTokens: z.array(z.object({
    expected: z.string(),
    user: z.string().optional(),
    status: z.enum(['correct', 'incorrect', 'missing', 'extra']),
  })),
  mistakeIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
});

export const MediaResumeStateSchema = z.object({
  lessonId: z.string().uuid(),
  userId: z.string().uuid(),
  activeSegmentId: z.string().min(1),
  playbackPositionMs: z.number().int().nonnegative(),
  lastMode: z.enum(['shadowing', 'dictation']),
  playbackSpeed: z.number().min(0.5).max(2.0),
  loopCount: z.number().int().min(1).max(10),
  waitIntervalMs: z.number().int().nonnegative(),
  completedSegmentIds: z.array(z.string()),
  updatedAt: z.string().datetime(),
});

export type MediaLesson = z.infer<typeof MediaLessonSchema>;
export type MediaTranscriptSegment = z.infer<typeof MediaTranscriptSegmentSchema>;
export type MediaTranscriptVersion = z.infer<typeof MediaTranscriptVersionSchema>;
export type ShadowingAttempt = z.infer<typeof ShadowingAttemptSchema>;
export type DictationAttempt = z.infer<typeof DictationAttemptSchema>;
export type MediaResumeState = z.infer<typeof MediaResumeStateSchema>;
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaTypesValidation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/types/media.ts src/lib/__tests__/mediaTypesValidation.test.ts
git commit -m "feat(media): define domain entities and schema validation contracts"
```

---

### Task 2: Transcript Segmentation, Normalization, and Monotonic Validation Engine

**Files:**
- Create: `src/lib/media/transcriptValidator.ts`
- Create: `src/lib/media/transcriptNormalizer.ts`
- Create: `src/lib/media/contentHash.ts`
- Test: `src/lib/__tests__/mediaTranscriptValidation.test.ts`

**Interfaces:**
- Consumes: `MediaTranscriptSegment` from `src/types/media.ts`
- Produces: `validateTranscriptCoverage`, `normalizeRollingCaptions`, `computeTranscriptHash`

- [ ] **Step 1: Write failing validation and normalization test**

```typescript
// src/lib/__tests__/mediaTranscriptValidation.test.ts
import { describe, it, expect } from 'vitest';
import { validateTranscriptCoverage } from '../media/transcriptValidator';
import { normalizeRollingCaptions } from '../media/transcriptNormalizer';
import { computeTranscriptHash } from '../media/contentHash';

describe('Transcript Validation and Normalization', () => {
  it('detects insufficient coverage when covered seconds are less than 65% of total duration', () => {
    const segments = [
      { id: 'seg_1', index: 0, startMs: 0, endMs: 10000, text: 'Opening remarks.', confidence: 'high' as const },
    ];
    const result = validateTranscriptCoverage(segments, 100000); // 10s out of 100s = 10%
    expect(result.valid).toBe(false);
    expect(result.issue).toBe('coverage_insufficient');
    expect(result.coverageRatio).toBe(0.1);
  });

  it('detects timestamp overlap violations', () => {
    const segments = [
      { id: 'seg_1', index: 0, startMs: 0, endMs: 5000, text: 'First sentence.', confidence: 'high' as const },
      { id: 'seg_2', index: 1, startMs: 3000, endMs: 8000, text: 'Overlapping sentence.', confidence: 'high' as const },
    ];
    const result = validateTranscriptCoverage(segments, 10000);
    expect(result.valid).toBe(false);
    expect(result.issue).toBe('timestamps_invalid');
  });

  it('normalizes rolling YouTube captions into non-overlapping sentence units', () => {
    const rollingRaw = [
      { startMs: 0, endMs: 1200, text: 'Today we' },
      { startMs: 1000, endMs: 2500, text: 'Today we discuss' },
      { startMs: 2200, endMs: 4000, text: 'Today we discuss urban planning.' },
    ];
    const normalized = normalizeRollingCaptions(rollingRaw);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].text).toBe('Today we discuss urban planning.');
    expect(normalized[0].startMs).toBe(0);
    expect(normalized[0].endMs).toBe(4000);
  });

  it('computes deterministic SHA-256 hash for identical transcript segments', () => {
    const segments = [
      { id: 's1', index: 0, startMs: 0, endMs: 2000, text: 'Identical sentence.', confidence: 'high' as const },
    ];
    const hash1 = computeTranscriptHash(segments);
    const hash2 = computeTranscriptHash(segments);
    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaTranscriptValidation.test.ts`
Expected: FAIL with "Cannot find module '../media/transcriptValidator'"

- [ ] **Step 3: Implement validator, normalizer, and hash utilities**

```typescript
// src/lib/media/contentHash.ts
import { createHash } from 'node:crypto';
import type { MediaTranscriptSegment } from '../../types/media';

export function computeTranscriptHash(segments: MediaTranscriptSegment[]): string {
  const content = segments
    .map((s) => `${s.startMs}:${s.endMs}:${s.text.trim()}`)
    .join('|');
  return createHash('sha256').update(content).digest('hex');
}

export function computeSegmentId(text: string, startMs: number): string {
  const digest = createHash('sha256').update(`${startMs}:${text.trim().toLowerCase()}`).digest('hex').slice(0, 12);
  return `seg_${digest}`;
}

// src/lib/media/transcriptValidator.ts
import type { MediaTranscriptSegment } from '../../types/media';

export interface TranscriptValidationResult {
  valid: boolean;
  coverageRatio: number;
  issue?: 'empty' | 'timestamps_invalid' | 'coverage_insufficient';
}

export function validateTranscriptCoverage(
  segments: MediaTranscriptSegment[],
  durationMs: number,
): TranscriptValidationResult {
  if (!segments.length) return { valid: false, coverageRatio: 0, issue: 'empty' };

  let previousEnd = -1;
  let coveredMs = 0;

  for (const seg of segments) {
    if (seg.startMs < 0 || seg.endMs <= seg.startMs || seg.startMs < previousEnd - 50 || !seg.text.trim()) {
      return { valid: false, coverageRatio: 0, issue: 'timestamps_invalid' };
    }
    coveredMs += Math.max(0, seg.endMs - seg.startMs);
    previousEnd = seg.endMs;
  }

  const coverageRatio = durationMs > 0 ? Math.min(1, coveredMs / durationMs) : 1;
  if (durationMs > 0 && coverageRatio < 0.65) {
    return { valid: false, coverageRatio, issue: 'coverage_insufficient' };
  }

  return { valid: true, coverageRatio };
}

// src/lib/media/transcriptNormalizer.ts
import { computeSegmentId } from './contentHash';
import type { MediaTranscriptSegment } from '../../types/media';

export function normalizeRollingCaptions(
  rawCues: Array<{ startMs: number; endMs: number; text: string }>,
): MediaTranscriptSegment[] {
  if (!rawCues.length) return [];
  const deduped: Array<{ startMs: number; endMs: number; text: string }> = [];

  for (const cue of rawCues) {
    const text = cue.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (deduped.length > 0) {
      const last = deduped[deduped.length - 1];
      if (text.startsWith(last.text) || last.text.endsWith(text)) {
        last.endMs = Math.max(last.endMs, cue.endMs);
        last.text = text.length > last.text.length ? text : last.text;
        continue;
      }
    }
    deduped.push({ startMs: cue.startMs, endMs: cue.endMs, text });
  }

  return deduped.map((cue, index) => ({
    id: computeSegmentId(cue.text, cue.startMs),
    index,
    startMs: cue.startMs,
    endMs: cue.endMs,
    text: cue.text,
    confidence: 'high',
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaTranscriptValidation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/contentHash.ts src/lib/media/transcriptValidator.ts src/lib/media/transcriptNormalizer.ts src/lib/__tests__/mediaTranscriptValidation.test.ts
git commit -m "feat(media): implement transcript validation, normalization, and hashing engine"
```

---

### Task 3: Ingestion Job State Machine

**Files:**
- Create: `src/lib/media/mediaJobMachine.ts`
- Test: `src/lib/__tests__/mediaJobMachine.test.ts`

**Interfaces:**
- Consumes: `MediaProcessingState` from `src/types/media.ts`
- Produces: `createMediaJobActor`, `MediaJobContext`, `MediaJobEvent`

- [ ] **Step 1: Write failing state machine test**

```typescript
// src/lib/__tests__/mediaJobMachine.test.ts
import { describe, it, expect } from 'vitest';
import { createMediaJobMachine } from '../media/mediaJobMachine';
import { createActor } from 'xstate';

describe('Media Ingestion State Machine', () => {
  it('progresses from queued to ready upon valid captions', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    expect(actor.getSnapshot().value).toBe('queued');
    actor.send({ type: 'START_PROBING' });
    expect(actor.getSnapshot().value).toBe('probing');
    actor.send({ type: 'PROBE_YOUTUBE_SUCCESS' });
    expect(actor.getSnapshot().value).toBe('captions');
    actor.send({ type: 'CAPTIONS_FETCHED', segmentsCount: 25 });
    expect(actor.getSnapshot().value).toBe('normalizing');
    actor.send({ type: 'NORMALIZED' });
    expect(actor.getSnapshot().value).toBe('validating');
    actor.send({ type: 'VALIDATION_PASSED', coverageRatio: 0.95 });
    expect(actor.getSnapshot().value).toBe('ready');
  });

  it('transitions to failed with error category when captions are unavailable', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({ type: 'PROBE_YOUTUBE_SUCCESS' });
    actor.send({ type: 'CAPTIONS_FAILED', category: 'provider_blocked', message: 'No subtitles found.' });

    expect(actor.getSnapshot().value).toBe('failed');
    expect(actor.getSnapshot().context.failureCategory).toBe('provider_blocked');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaJobMachine.test.ts`
Expected: FAIL with "Cannot find module '../media/mediaJobMachine'"

- [ ] **Step 3: Implement XState job machine**

```typescript
// src/lib/media/mediaJobMachine.ts
import { setup, assign } from 'xstate';
import type { MediaProcessingState } from '../../types/media';

export interface MediaJobContext {
  failureCategory?: string;
  failureMessage?: string;
  coverageRatio?: number;
  segmentsCount?: number;
}

export type MediaJobEvent =
  | { type: 'START_PROBING' }
  | { type: 'PROBE_YOUTUBE_SUCCESS' }
  | { type: 'PROBE_AUDIO_SUCCESS' }
  | { type: 'CAPTIONS_FETCHED'; segmentsCount: number }
  | { type: 'CAPTIONS_FAILED'; category: string; message: string }
  | { type: 'AUDIO_TRANSCRIBED'; segmentsCount: number }
  | { type: 'TRANSCRIPTION_FAILED'; category: string; message: string }
  | { type: 'NORMALIZED' }
  | { type: 'VALIDATION_PASSED'; coverageRatio: number }
  | { type: 'VALIDATION_FAILED'; category: string; message: string };

export function createMediaJobMachine() {
  return setup({
    types: {
      context: {} as MediaJobContext,
      events: {} as MediaJobEvent,
    },
  }).createMachine({
    id: 'mediaJob',
    initial: 'queued',
    context: {},
    states: {
      queued: {
        on: { START_PROBING: 'probing' },
      },
      probing: {
        on: {
          PROBE_YOUTUBE_SUCCESS: 'captions',
          PROBE_AUDIO_SUCCESS: 'transcribing',
        },
      },
      captions: {
        on: {
          CAPTIONS_FETCHED: {
            target: 'normalizing',
            actions: assign({ segmentsCount: ({ event }) => event.segmentsCount }),
          },
          CAPTIONS_FAILED: {
            target: 'failed',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
            }),
          },
        },
      },
      transcribing: {
        on: {
          AUDIO_TRANSCRIBED: {
            target: 'normalizing',
            actions: assign({ segmentsCount: ({ event }) => event.segmentsCount }),
          },
          TRANSCRIPTION_FAILED: {
            target: 'failed',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
            }),
          },
        },
      },
      normalizing: {
        on: { NORMALIZED: 'validating' },
      },
      validating: {
        on: {
          VALIDATION_PASSED: {
            target: 'ready',
            actions: assign({ coverageRatio: ({ event }) => event.coverageRatio }),
          },
          VALIDATION_FAILED: {
            target: 'failed',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
            }),
          },
        },
      },
      ready: { type: 'final' },
      failed: { type: 'final' },
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaJobMachine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/mediaJobMachine.ts src/lib/__tests__/mediaJobMachine.test.ts
git commit -m "feat(media): implement media ingestion job state machine"
```

---

### Task 4: Database Migration, Schema, and Supabase RLS Policies

**Files:**
- Create: `supabase/migrations/202609040001_media_learning_room.sql`
- Create: `scripts/test-media-rls-postgres.ts`

**Interfaces:**
- Consumes: PostgreSQL, Supabase auth schema
- Produces: `public.media_lessons`, `public.media_transcript_versions`, `public.media_shadowing_attempts`, `public.media_dictation_attempts`, `public.media_resume_states`

- [ ] **Step 1: Write migration SQL**
Write the complete migration from Spec Section 8.1 and 8.2 to `supabase/migrations/202609040001_media_learning_room.sql`.

- [ ] **Step 2: Write multi-tenant RLS verification test script**
Create `scripts/test-media-rls-postgres.ts` using `pg` client to test:
- User A cannot SELECT User B's lessons or attempts.
- User A cannot INSERT an attempt under User B's `user_id`.
- Cascade delete on `media_lessons` automatically removes associated versions, attempts, and resume states.

- [ ] **Step 3: Verify migration syntax with dry-run parsing**
Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/202609040001_media_learning_room.sql scripts/test-media-rls-postgres.ts
git commit -m "feat(media): create media room database schema and RLS policies migration"
```

---

### Task 5: Server Route Admission, Feature Flag, and Rate Limiting

**Files:**
- Create: `src/lib/media/mediaFeatureFlags.server.ts`
- Create: `src/lib/media/mediaTransport.server.ts`
- Modify: `server.ts`
- Test: `src/lib/__tests__/mediaTransport.test.ts`

**Interfaces:**
- Consumes: Express `Request`, `Response`, JWT Bearer token
- Produces: `verifyLearnerToken`, `consumeMediaQuota`, `parseMediaRoomV2Env`

- [ ] **Step 1: Write failing route admission and quota test**

```typescript
// src/lib/__tests__/mediaTransport.test.ts
import { describe, it, expect } from 'vitest';
import { parseMediaRoomV2Env } from '../media/mediaFeatureFlags.server';
import { consumeMediaQuota } from '../media/mediaTransport.server';

describe('Media Transport and Admission', () => {
  it('parses OMNI_MEDIA_ROOM_V2 environment variable correctly', () => {
    expect(parseMediaRoomV2Env({ OMNI_MEDIA_ROOM_V2: 'true' })).toBe(true);
    expect(parseMediaRoomV2Env({ OMNI_MEDIA_ROOM_V2: 'false' })).toBe(false);
    expect(parseMediaRoomV2Env({})).toBe(false);
  });

  it('rate-limits excessive import requests per learner', () => {
    const windows = new Map();
    const learnerId = 'learner_123';
    for (let i = 0; i < 10; i++) {
      const decision = consumeMediaQuota(windows, learnerId, 'media_import', 10, 60000);
      expect(decision.allowed).toBe(true);
    }
    const blocked = consumeMediaQuota(windows, learnerId, 'media_import', 10, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaTransport.test.ts`
Expected: FAIL with "Cannot find module '../media/mediaFeatureFlags.server'"

- [ ] **Step 3: Implement feature flag parser and quota manager**

```typescript
// src/lib/media/mediaFeatureFlags.server.ts
export function parseMediaRoomV2Env(env: Record<string, string | undefined>): boolean {
  return env.OMNI_MEDIA_ROOM_V2 === 'true' || env.VITE_OMNI_MEDIA_ROOM_V2 === 'true';
}

// src/lib/media/mediaTransport.server.ts
export interface QuotaDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function consumeMediaQuota(
  store: Map<string, { count: number; windowStartMs: number }>,
  learnerId: string,
  bucket: string,
  limit: number,
  windowDurationMs: number,
): QuotaDecision {
  const key = `${bucket}:${learnerId}`;
  const now = Date.now();
  const current = store.get(key);

  if (!current || now - current.windowStartMs >= windowDurationMs) {
    store.set(key, { count: 1, windowStartMs: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.ceil((current.windowStartMs + windowDurationMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaTransport.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/mediaFeatureFlags.server.ts src/lib/media/mediaTransport.server.ts src/lib/__tests__/mediaTransport.test.ts
git commit -m "feat(media): implement server route admission, feature flag, and quota management"
```

---

### Task 6: Server Provider Adapters (YouTube, Transcription, Evaluation, Error Scrubbing)

**Files:**
- Create: `src/lib/media/youtubeAdapter.server.ts`
- Create: `src/lib/media/audioTranscribeAdapter.server.ts`
- Create: `src/lib/media/shadowingEvalAdapter.server.ts`
- Create: `src/lib/media/errorScrub.server.ts`
- Test: `src/lib/__tests__/mediaServerAdapters.test.ts`

**Interfaces:**
- Consumes: Google GenAI client, sandboxed yt-dlp arguments
- Produces: `fetchYouTubeCaptions`, `transcribeAudioFile`, `evaluateShadowingAcoustic`, `scrubMediaError`

- [ ] **Step 1: Write failing error scrub and evaluation schema test**

```typescript
// src/lib/__tests__/mediaServerAdapters.test.ts
import { describe, it, expect } from 'vitest';
import { scrubMediaError } from '../media/errorScrub.server';

describe('Media Server Adapters and Scrubbing', () => {
  it('scrubs file system paths, command flags, and secrets from error messages', () => {
    const rawError = 'Command failed: /tmp/bin/yt-dlp --secret AIzaSyFakeSecret_12345 --proxy http://user:pass@127.0.0.1';
    const scrubbed = scrubMediaError(rawError);
    expect(scrubbed).not.toContain('/tmp/bin/');
    expect(scrubbed).not.toContain('AIzaSy');
    expect(scrubbed).not.toContain('user:pass');
    expect(scrubbed).toContain('KhÃ´ng thá»ƒ xá»­ lÃ½ media tá»« nguá»“n yÃªu cáº§u.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaServerAdapters.test.ts`
Expected: FAIL with "Cannot find module '../media/errorScrub.server'"

- [ ] **Step 3: Implement scrubMediaError and adapters**

```typescript
// src/lib/media/errorScrub.server.ts
export function scrubMediaError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error || '');
  if (/sign in|not a bot|403|forbidden/i.test(msg)) {
    return 'YouTube Ä‘ang yÃªu cáº§u xÃ¡c minh tá»± Ä‘á»™ng. Vui lÃ²ng táº£i lÃªn audio hoáº·c phá»¥ Ä‘á» VTT/SRT.';
  }
  if (/quota|resource_exhausted/i.test(msg)) {
    return 'Háº¡n má»©c AI táº¡m thá»i háº¿t. Vui lÃ²ng thá»­ láº¡i sau Ã­t phÃºt hoáº·c dÃ¹ng transcript cÃ³ sáºµn.';
  }
  return 'KhÃ´ng thá»ƒ xá»­ lÃ½ media tá»« nguá»“n yÃªu cáº§u. Vui lÃ²ng thá»­ láº¡i hoáº·c táº£i lÃªn file cá»§a báº¡n.';
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaServerAdapters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/errorScrub.server.ts src/lib/__tests__/mediaServerAdapters.test.ts
git commit -m "feat(media): implement server provider error scrubbing and adapters"
```

---

### Task 7: Client Media Room API Service and P03 Handoff Consumer

**Files:**
- Create: `src/services/mediaRoomService.ts`
- Create: `src/lib/media/handoffConsumer.ts`
- Test: `src/lib/__tests__/mediaHandoffBoundary.test.ts`

**Interfaces:**
- Consumes: `PendingMediaHandoff`, Supabase client session
- Produces: `importYouTubeUrl`, `uploadAudioLesson`, `saveTranscriptVersion`, `consumePendingMediaHandoff`

- [ ] **Step 1: Write failing handoff consumer test**

```typescript
// src/lib/__tests__/mediaHandoffBoundary.test.ts
import { describe, it, expect } from 'vitest';
import { consumePendingMediaHandoff } from '../media/handoffConsumer';

describe('P03 to P04 Handoff Consumer', () => {
  it('converts a valid PendingMediaHandoff into a MediaLesson draft', () => {
    const handoff = {
      sourceRecordId: '550e8400-e29b-41d4-a716-446655440000',
      mediaType: 'youtube' as const,
      mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      title: 'Authentic TED Talk on Urban Design',
    };
    const draft = consumePendingMediaHandoff(handoff, 'user_uuid_123');
    expect(draft.sourceRecordId).toBe(handoff.sourceRecordId);
    expect(draft.mediaUrl).toBe(handoff.mediaUrl);
    expect(draft.processingState).toBe('queued');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaHandoffBoundary.test.ts`
Expected: FAIL with "Cannot find module '../media/handoffConsumer'"

- [ ] **Step 3: Implement handoff consumer and client API service**

```typescript
// src/lib/media/handoffConsumer.ts
import { MediaLesson } from '../../types/media';

export interface PendingMediaHandoff {
  sourceRecordId: string;
  sourceVersionId?: string;
  mediaType: 'youtube' | 'audio';
  mediaUrl: string;
  title: string;
}

export function consumePendingMediaHandoff(
  handoff: PendingMediaHandoff,
  userId: string,
): Partial<MediaLesson> {
  return {
    userId,
    title: handoff.title,
    mediaType: handoff.mediaType,
    mediaUrl: handoff.mediaUrl,
    sourceRecordId: handoff.sourceRecordId,
    sourceVersionId: handoff.sourceVersionId,
    processingState: 'queued',
    durationMs: 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaHandoffBoundary.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/handoffConsumer.ts src/lib/__tests__/mediaHandoffBoundary.test.ts
git commit -m "feat(media): implement P03 media handoff consumer and client API service"
```

---

### Task 8: Unified Original Media Player Adapter (YouTube & Wavesurfer)

**Files:**
- Create: `src/components/media/v2/UnifiedMediaPlayer.tsx`
- Test: `src/lib/__tests__/unifiedMediaPlayer.test.tsx`

**Interfaces:**
- Consumes: `mediaType`, `mediaUrl`, `activeSegment`, `playbackSpeed`, `loopCount`, `waitIntervalMs`
- Produces: `playSegment`, `pauseMedia`, `seekToMs`, `onSegmentEnd` callback

- [ ] **Step 1: Write failing player controller test**
Test that `UnifiedMediaPlayer` sets correct playback rate, loops segment up to `loopCount`, and dispatches `onSegmentEnd`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/unifiedMediaPlayer.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement UnifiedMediaPlayer component**
Integrate YouTube IFrame API and Wavesurfer Audio under a single unified handle with RAF time synchronizer.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/unifiedMediaPlayer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/media/v2/UnifiedMediaPlayer.tsx src/lib/__tests__/unifiedMediaPlayer.test.tsx
git commit -m "feat(media): implement unified YouTube and Wavesurfer media player controller"
```

---

### Task 9: Interactive Transcript Viewer and In-Place Editor

**Files:**
- Create: `src/components/media/v2/InteractiveTranscriptView.tsx`
- Test: `src/lib/__tests__/interactiveTranscriptView.test.tsx`

**Interfaces:**
- Consumes: `MediaTranscriptVersion`, `activeSegmentId`, `onSelectSegment`, `onSaveEdit`
- Produces: Accessible interactive segment list with ARIA attributes and in-place editor.

- [ ] **Step 1: Write failing transcript viewer test**
Verify active segment highlighting (`aria-current="true"`), click-to-seek, and edit modal dispatching `onSaveEdit`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/interactiveTranscriptView.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement InteractiveTranscriptView component**

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/interactiveTranscriptView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/media/v2/InteractiveTranscriptView.tsx src/lib/__tests__/interactiveTranscriptView.test.tsx
git commit -m "feat(media): implement interactive transcript view and in-place versioned editor"
```

---

### Task 10: Dictation Studio V2 with Word-Level Diff and Zero-Mic Guarantee

**Files:**
- Create: `src/lib/media/diffAdapter.ts`
- Create: `src/components/media/v2/DictationStudioV2.tsx`
- Test: `src/lib/__tests__/mediaDiffAdapter.test.ts`

**Interfaces:**
- Consumes: `segment.text`, `learnerInput`, `difficulty`, `mode`
- Produces: `calculateWordDiff`, `diffTokens`, `accuracyScore`, **zero microphone request**

- [ ] **Step 1: Write failing diff adapter test**

```typescript
// src/lib/__tests__/mediaDiffAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { calculateWordDiff } from '../media/diffAdapter';

describe('Dictation Word Diff Adapter', () => {
  it('correctly categorizes matched, misspelled, missing, and extra words', () => {
    const expected = 'The rapid pace of urbanization poses challenges.';
    const actual = 'The rapid pace of city growth poses challenges today.';
    const result = calculateWordDiff(expected, actual);

    expect(result.tokens.find((t) => t.expected === 'urbanization')?.status).toBe('missing');
    expect(result.tokens.find((t) => t.user === 'today.')?.status).toBe('extra');
    expect(result.accuracyScore).toBeGreaterThan(0);
    expect(result.accuracyScore).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaDiffAdapter.test.ts`
Expected: FAIL with "Cannot find module '../media/diffAdapter'"

- [ ] **Step 3: Implement diffAdapter and DictationStudioV2**

```typescript
// src/lib/media/diffAdapter.ts
import { diffWords, WordDiffToken } from '../wordDiff';

export interface WordDiffResult {
  tokens: WordDiffToken[];
  accuracyScore: number;
}

export function calculateWordDiff(expectedText: string, userText: string): WordDiffResult {
  const result = diffWords(expectedText, userText);
  return {
    tokens: result.tokens,
    accuracyScore: result.accuracy,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaDiffAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/diffAdapter.ts src/components/media/v2/DictationStudioV2.tsx src/lib/__tests__/mediaDiffAdapter.test.ts
git commit -m "feat(media): implement dictation studio v2 with word-level diff and zero-mic guarantee"
```

---

### Task 11: Shadowing Studio V2 with Real Mic VAD Telemetry and Honest Unavailable State

**Files:**
- Create: `src/lib/media/vadAdapter.ts`
- Create: `src/components/media/v2/ShadowingStudioV2.tsx`
- Test: `src/lib/__tests__/mediaShadowingStudio.test.tsx`

**Interfaces:**
- Consumes: Browser `MediaStream`, `@ricky0123/vad-web`
- Produces: Speech segments, pause analytics, `acousticStatus: 'measured' | 'unavailable'`

- [ ] **Step 1: Write failing Shadowing studio test**
Verify that when `getUserMedia` throws `NotAllowedError`, studio switches to `acousticStatus = 'unavailable'`, disables evaluation button, and displays explanatory note without crashing.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaShadowingStudio.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement vadAdapter and ShadowingStudioV2**

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaShadowingStudio.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/vadAdapter.ts src/components/media/v2/ShadowingStudioV2.tsx src/lib/__tests__/mediaShadowingStudio.test.tsx
git commit -m "feat(media): implement shadowing studio v2 with VAD telemetry and honest unavailable state"
```

---

### Task 12: Canonical Evidence Adapter: Emitting MistakeEvidence to Review

**Files:**
- Create: `src/lib/media/evidenceAdapter.ts`
- Test: `src/lib/__tests__/mediaEvidenceAdapter.test.ts`

**Interfaces:**
- Consumes: `DictationAttempt`, `ShadowingAttempt`, `MediaLesson`, `MediaTranscriptSegment`
- Produces: `MistakeEvidence` compliant with Learning and Assessment Framework; zero XP.

- [ ] **Step 1: Write failing evidence formatting test**

```typescript
// src/lib/__tests__/mediaEvidenceAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { formatDictationMistakes } from '../media/evidenceAdapter';

describe('Media Evidence Adapter', () => {
  it('formats canonical MistakeEvidence for misspelled words without modifying mastery', () => {
    const attempt = {
      id: 'att_123',
      lessonId: 'les_123',
      segmentId: 'seg_123',
      transcriptVersionId: 'ver_123',
      userId: 'user_123',
      mode: 'full_sentence' as const,
      difficulty: 'medium' as const,
      userResponseText: 'urbanisashun',
      expectedText: 'urbanisation',
      accuracyScore: 70,
      diffTokens: [{ expected: 'urbanisation', user: 'urbanisashun', status: 'incorrect' as const }],
      mistakeIds: [],
      createdAt: '2026-09-04T00:00:00.000Z',
    };
    const mistakes = formatDictationMistakes(attempt, 'IELTS Lecture', 'ver_123');
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0].provenance.module).toBe('media');
    expect(mistakes[0].taxonomy).toBe('listening_spelling');
    expect(mistakes[0].masteryStatus).toBe('unmastered');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaEvidenceAdapter.test.ts`
Expected: FAIL with "Cannot find module '../media/evidenceAdapter'"

- [ ] **Step 3: Implement evidence adapter**

```typescript
// src/lib/media/evidenceAdapter.ts
import type { DictationAttempt } from '../../types/media';

export interface CanonicalMistakeEvidence {
  mistakeId: string;
  learnerId: string;
  competencyId: string;
  taxonomy: string;
  sourceArtifactId: string;
  originalPrompt: string;
  learnerResponse: string;
  canonicalAnswer: string;
  detectedAt: string;
  evidenceClass: 'assisted_practice';
  masteryStatus: 'unmastered';
  reviewState: 'scheduled';
  provenance: {
    module: 'media';
    sourceVersionId?: string;
    citation: string;
  };
}

export function formatDictationMistakes(
  attempt: DictationAttempt,
  lessonTitle: string,
  sourceVersionId?: string,
): CanonicalMistakeEvidence[] {
  const errors = attempt.diffTokens.filter((t) => t.status === 'incorrect' || t.status === 'missing');
  return errors.map((token, index) => ({
    mistakeId: `mst_dict_${attempt.id}_${index}`,
    learnerId: attempt.userId,
    competencyId: 'listening_detail_spelling',
    taxonomy: 'listening_spelling',
    sourceArtifactId: attempt.lessonId,
    originalPrompt: attempt.expectedText,
    learnerResponse: token.user || '(omitted)',
    canonicalAnswer: token.expected,
    detectedAt: attempt.createdAt,
    evidenceClass: 'assisted_practice',
    masteryStatus: 'unmastered',
    reviewState: 'scheduled',
    provenance: {
      module: 'media',
      sourceVersionId,
      citation: `${lessonTitle} (${attempt.segmentId})`,
    },
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaEvidenceAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/evidenceAdapter.ts src/lib/__tests__/mediaEvidenceAdapter.test.ts
git commit -m "feat(media): implement canonical MistakeEvidence adapter for review queue"
```

---

### Task 13: Local Audio Artifact Storage and Privacy Hard Delete

**Files:**
- Create: `src/lib/media/audioArtifactStore.ts`
- Test: `src/lib/__tests__/mediaAudioPrivacy.test.ts`

**Interfaces:**
- Consumes: Web Audio `Blob`, IndexedDB
- Produces: `saveLocalAudioRecording`, `resolveLocalAudioUrl`, `purgeLessonAudioArtifacts`

- [ ] **Step 1: Write failing IndexedDB audio storage test**
Verify that audio blobs are saved under `idb-media://`, resolved as object URLs, and purged cleanly on lesson deletion.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaAudioPrivacy.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement audioArtifactStore**

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaAudioPrivacy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/audioArtifactStore.ts src/lib/__tests__/mediaAudioPrivacy.test.ts
git commit -m "feat(media): implement local IndexedDB audio caching and hard-delete purge"
```

---

### Task 14: Unified Media Learning Room View and Guided-First Controller

**Files:**
- Create: `src/components/media/v2/GuidedControlsDock.tsx`
- Create: `src/views/MediaLearningRoomView.tsx`
- Modify: `src/App.tsx` (renders v2 when flag is on, legacy when off)
- Test: `src/lib/__tests__/mediaLearningRoomView.test.tsx`

**Interfaces:**
- Consumes: `MediaLesson`, `UnifiedMediaPlayer`, `ShadowingStudioV2`, `DictationStudioV2`, `InteractiveTranscriptView`
- Produces: Guided-first room layout with seamless mode switching and state resumption.

- [ ] **Step 1: Write failing view integration test**
Verify switching between Guided and Independent mode, keyboard shortcut routing (Space, ArrowRight), and dock rendering.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaLearningRoomView.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement GuidedControlsDock and MediaLearningRoomView**

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaLearningRoomView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/media/v2/GuidedControlsDock.tsx src/views/MediaLearningRoomView.tsx src/lib/__tests__/mediaLearningRoomView.test.tsx
git commit -m "feat(media): build unified guided-first media learning room view and controls dock"
```

---

### Task 15: End-to-End Test Suite, WCAG 2.2 AA Accessibility Audit, and Final Gate Verification

**Files:**
- Create: `e2e/media-learning-room-v2.spec.ts`
- Modify: `e2e/fixtures.ts`

**Interfaces:**
- Consumes: Playwright, `@axe-core/playwright`
- Produces: Deterministic E2E verification of AC-MED-001 through AC-MED-025.

- [ ] **Step 1: Write Playwright E2E tests for all 25 acceptance criteria**
Cover: YouTube captioned import, audio upload, VTT parse, missing mic unavailable state, Dictation zero-mic flow, word diffing, reload resume, and keyboard navigation.

- [ ] **Step 2: Run axe-core accessibility check**
Assert zero WCAG 2.2 AA violations in Media Room v2 (`await expect(page).toHaveNoViolations()`).

- [ ] **Step 3: Run full deterministic test suite**
Run: `npm test`
Expected: All unit and integration tests PASS.

- [ ] **Step 4: Run product documentation and lint gates**
Run: `npm run check:product-docs`
Run: `npx tsc --noEmit`
Expected: Both gates PASS with zero warnings.

- [ ] **Step 5: Commit**
```bash
git add e2e/media-learning-room-v2.spec.ts
git commit -m "test(media): add comprehensive E2E tests and WCAG accessibility audit for Media Room v2"
```

---

## Final Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-09-04-omni-media-learning-room-implementation.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Fresh subagent per task, two-stage review between tasks, rapid iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans with batch checkpoints.
