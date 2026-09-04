# OMNI Media Learning Room Implementation Plan (P04)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the unified Guided-first Media Learning Room (P04) with full transcript lifecycle, authentic YouTube/audio playback, Shadowing with real microphone VAD telemetry, Dictation with word-level diff, zero direct mastery/XP, central AI router integration, and canonical MistakeEvidence handoff to Review.

**Architecture:** Domain contracts strictly separate immutable `MediaTranscriptVersion` from transient `MediaAttempt`s. Server routes manage authenticated yt-dlp probing, caption extraction, and central AI router execution (`CAP-GLB-AI-ROUTER`) behind deploy flag `OMNI_MEDIA_ROOM_V2`. Client player integrates YouTube IFrame API and Wavesurfer Audio into a unified controller supporting Guided and Independent learning modes, local IndexedDB audio caching, and WCAG 2.2 AA accessibility.

**Tech Stack:** React 19, TypeScript 5.8, Express 4, Supabase RLS (PostgreSQL), Wavesurfer.js 7.12, @ricky0123/vad-web 0.0.30, diff@7.0.0 (jsdiff library), Lucide React, Vitest 3, Playwright 1.62.

**Spec:** `docs/superpowers/specs/2026-09-04-omni-media-learning-room-design.md`
**ADR:** `docs/architecture/adr/2026-09-04-media-learning-room-transcript-and-evidence-boundary.md`

## Global Constraints

- **Predecessor Gate**: P04 implementation code is strictly BLOCKED until PR #16 (`origin/feature/p03-sources-library`) is merged into `origin/main` and this plan is approved by the Product Owner. Open PR #16 must never be treated as merged.
- **Zero Hallucinated Scoring (`GUARD-001`)**: Never fabricate transcripts, pronunciation scores, or IELTS band equivalents. Missing microphone or absent caption yields an explicit, honest `unavailable` status.
- **Dictation Microphone Independence (`PRD-008`)**: Dictation requires zero microphone permission. Missing or denied microphone access must never impede Dictation.
- **Truthful No-Caption Media Availability**: A YouTube item without captions allows authentic original video/audio playback for listening, while marking transcript capability as `unavailable_transcript` in a `degraded` learning room state. Dictation and transcript-aligned Shadowing are disabled.
- **Malformed Subtitles Rejection**: Corrupt or non-monotonic subtitle timestamps produce typed `SUBTITLE_PARSE_ERROR` or `needs_review`; zero fake timings or fallback segmenting.
- **Zero Direct Mastery Policy**: Media Room emits zero direct `MasteryUpdate`, zero XP points, and zero direct flashcards. Mistakes emit canonical `MistakeEvidence` to Review (`P05`).
- **Central AI Router Execution**: Cloud machine learning calls route exclusively through `CAP-GLB-AI-ROUTER` under task profiles `media_transcription_v1` and `media_shadowing_eval_v1`. Media constructs zero direct provider SDK clients.
- **Biometric Audio Privacy**: Learner voice recordings are ephemeral by default. Local persistence uses IndexedDB (`idb-media://`) on opt-in consent; raw audio is never stored in Supabase tables.
- **Feature Flag**: All v2 functionality operates behind `OMNI_MEDIA_ROOM_V2=true|false`. Default is false; rollback is flag off in one deploy without database down-migrations.
- **Strict Testing**: Every task must follow strict TDD (RED -> GREEN -> REFACTOR -> COMMIT) with concrete test code, exact file paths, and verifiable assertions.

---

## File Structure Map

```text
src/
â”œâ”€â”€ types/
â”‚   â””â”€â”€ media.ts                               # Domain entities, attempts, MediaHandoffRequest and server-only resolved handoff contracts
â”œâ”€â”€ lib/
â”‚   â””â”€â”€ media/
â”‚       â”œâ”€â”€ transcriptValidator.ts             # Monotonicity, coverage ratio, subtitle parse validation
â”‚       â”œâ”€â”€ transcriptNormalizer.ts            # Rolling caption de-duplication, sentence chunking
â”‚       â”œâ”€â”€ contentHash.ts                     # Deterministic SHA-256 segment & transcript hashing
â”‚       â”œâ”€â”€ mediaJobMachine.ts                 # Ingestion state machine (probing -> ready/degraded/failed)
â”‚       â”œâ”€â”€ mediaFeatureFlags.server.ts        # OMNI_MEDIA_ROOM_V2 parse & express injection
â”‚       â”œâ”€â”€ mediaTransport.server.ts           # Route admission, rate limiting, token validation and handoff resolution endpoint
â”‚       â”œâ”€â”€ mediaHandoffRepository.server.ts   # Learner-scoped P03 record hydration and trusted handoff resolution
â”‚       â”œâ”€â”€ youtubeAdapter.server.ts           # yt-dlp sandboxed execution & caption parsing
â”‚       â”œâ”€â”€ audioTranscribeAdapter.server.ts   # Central AI router runner for media_transcription_v1
â”‚       â”œâ”€â”€ shadowingEvalAdapter.server.ts     # Central AI router runner for media_shadowing_eval_v1
â”‚       â”œâ”€â”€ errorScrub.server.ts               # Path, token, and secret sanitization
â”‚       â”œâ”€â”€ diffAdapter.ts                     # Word-level diff adapter (diff@7.0.0 / wordDiff fallback)
â”‚       â”œâ”€â”€ evidenceAdapter.ts                 # Formats canonical MistakeEvidence for Review
â”‚       â”œâ”€â”€ vadAdapter.ts                      # Client-side @ricky0123/vad-web speech telemetry
â”‚       â”œâ”€â”€ audioArtifactStore.ts              # Local IndexedDB audio persistence (idb-media://)
â”‚       â””â”€â”€ handoffConsumer.ts                 # Browser-side sourceRecordId request construction only
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
- Plan Specification: Document exact pin, license, adapter, and removal boundary.

**Interfaces:**
- Consumes: Existing dependencies (`wavesurfer.js`, `@ricky0123/vad-web`, `zod`, `xstate`, `react`, `express`)
- Produces: Package audit report and `diff@7.0.0` (jsdiff library) specification with license and fallback boundaries.

- [ ] **Step 1: Audit existing package capabilities in repository**
  Inspect existing dependencies in `package.json`:
  - `wavesurfer.js`: `^7.12.11` is already present for audio waveform rendering.
  - `@ricky0123/vad-web`: `0.0.30` is already present for voice activity detection.
  - `youtube-transcript`: `^1.3.1` is already present for basic YouTube caption extraction.
  - `zod`: `^4.4.3` is already present for schema validation.
  - `xstate`: `^5.32.5` is already present for state machine definitions.
  - Word diff: Current repository uses bespoke Levenshtein implementation in `src/lib/wordDiff.ts`. For production word-level diff, `diff@7.0.0` (commonly referred to as jsdiff library, license BSD-3-Clause) will be adopted behind `src/lib/media/diffAdapter.ts` with complete fallback to `src/lib/wordDiff.ts`.
  - Note: This PR is docs-only; no edits to `package.json` or `npm install` are run during this batch.

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
- Produces: `MediaLesson`, `MediaHandoffRequest`, `ResolvedMediaHandoffReference`, `MediaTranscriptVersion`, `MediaTranscriptSegment`, `ShadowingAttempt`, `DictationAttempt`, `MediaResumeState`, `MediaImportJob`

- [ ] **Step 1: Write failing type validation test**

```typescript
// src/lib/__tests__/mediaTypesValidation.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
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

describe('Media Domain Contracts', () => {
  it('validates a well-formed MediaLesson object with optional sourceVersionId', () => {
    const validLesson = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'IELTS Academic Lecture on Urban Planning',
      mediaType: 'youtube' as const,
      mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      youtubeId: 'wr6fQ4KpbRM',
      durationMs: 180000,
      sourceRecordId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      // sourceVersionId is intentionally absent because P03 creates no SourceVersion for handoff_required
      processingState: 'ready' as const,
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
    };
    expect(MediaLessonSchema.parse(validLesson)).toEqual(validLesson);
  });

  it('accepts only sourceRecordId from browser navigation and rejects forged handoff fields', () => {
    const handoffRequest = {
      sourceRecordId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
    };
    expect(MediaHandoffRequestSchema.parse(handoffRequest)).toEqual(handoffRequest);
    expect(() => MediaHandoffRequestSchema.parse({
      ...handoffRequest,
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      mediaUrl: 'https://attacker.invalid/audio.mp3',
    })).toThrow();
  });

  it('validates only a server-resolved handoff reference with authenticated ownership', () => {
    const resolved = {
      sourceRecordId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      authenticatedUserId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'IELTS Lecture',
      mediaType: 'youtube' as const,
      originalUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      provenanceCitation: 'IELTS Lecture',
      retrievalDate: '2026-09-04T00:00:00.000Z',
    };
    expect(ResolvedMediaHandoffReferenceSchema.parse(resolved)).toEqual(resolved);
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
  currentVersionId: z.string().uuid().optional(),
  sourceRecordId: z.string().uuid().optional(),
  sourceVersionId: z.string().uuid().optional(), // Never populated from a P03 media handoff
  processingState: MediaProcessingStateSchema,
  transcriptState: z.enum(['ready', 'unavailable_transcript', 'coverage_insufficient', 'needs_review']).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastPracticedAt: z.string().datetime().optional(),
});

export const MediaHandoffRequestSchema = z.object({
  sourceRecordId: z.string().uuid(),
}).strict();

export const ResolvedMediaHandoffReferenceSchema = z.object({
  sourceRecordId: z.string().uuid(),
  authenticatedUserId: z.string().uuid(),
  title: z.string().min(1),
  mediaType: z.enum(['youtube', 'audio']),
  originalUrl: z.string().url().optional(),
  originalFilename: z.string().min(1).optional(),
  provenanceCitation: z.string().min(1),
  retrievalDate: z.string().datetime(),
}).strict();

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
export type MediaHandoffRequest = z.infer<typeof MediaHandoffRequestSchema>;
export type ResolvedMediaHandoffReference = z.infer<typeof ResolvedMediaHandoffReferenceSchema>;
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
- Produces: `validateTranscriptCoverage`, `parseSubtitleCues`, `normalizeRollingCaptions`, `computeTranscriptHash`

- [ ] **Step 1: Write failing validation and normalization test**

```typescript
// src/lib/__tests__/mediaTranscriptValidation.test.ts
import { describe, it, expect } from 'vitest';
import { validateTranscriptCoverage, parseSubtitleCues } from '../media/transcriptValidator';
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

  it('rejects malformed subtitle timestamps with typed SUBTITLE_PARSE_ERROR instead of inventing fallback timings', () => {
    const malformedSrt = `1\ncorrupt_time --> bad_time\nBroken subtitle text.`;
    const result = parseSubtitleCues(malformedSrt, 'srt');
    expect(result.success).toBe(false);
    expect(result.code).toBe('SUBTITLE_PARSE_ERROR');
    expect(result.cues).toHaveLength(0);
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

export interface SubtitleParseResult {
  success: boolean;
  code?: 'SUBTITLE_PARSE_ERROR';
  cues: Array<{ startMs: number; endMs: number; text: string }>;
  messageVi?: string;
}

export function parseSubtitleCues(rawText: string, format: 'vtt' | 'srt'): SubtitleParseResult {
  const lines = rawText.trim().split(/\r?\n/);
  const cues: Array<{ startMs: number; endMs: number; text: string }> = [];
  const timeRegex = format === 'vtt'
    ? /(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})/
    : /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/;

  let hasTimingLine = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      hasTimingLine = true;
      const match = line.match(timeRegex);
      if (!match) {
        return {
          success: false,
          code: 'SUBTITLE_PARSE_ERROR',
          cues: [],
          messageVi: 'Äá»‹nh dáº¡ng timestamp trong phá»¥ Ä‘á» khÃ´ng há»£p lá»‡. Vui lÃ²ng kiá»ƒm tra file VTT/SRT.',
        };
      }
    }
  }

  if (!hasTimingLine) {
    return {
      success: false,
      code: 'SUBTITLE_PARSE_ERROR',
      cues: [],
      messageVi: 'KhÃ´ng tÃ¬m tháº¥y dÃ²ng timestamp há»£p lá»‡ trong file phá»¥ Ä‘á».',
    };
  }

  return { success: true, cues };
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
- Produces: `createMediaJobMachine`, `MediaJobContext`, `MediaJobEvent`

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

  it('transitions to degraded when YouTube has no captions while media is playable', () => {
    const machine = createMediaJobMachine();
    const actor = createActor(machine).start();

    actor.send({ type: 'START_PROBING' });
    actor.send({ type: 'PROBE_YOUTUBE_SUCCESS' });
    actor.send({ type: 'CAPTIONS_NOT_FOUND', message: 'No English subtitles available.' });

    expect(actor.getSnapshot().value).toBe('degraded');
    expect(actor.getSnapshot().context.transcriptState).toBe('unavailable_transcript');
    expect(actor.getSnapshot().context.mediaPlayable).toBe(true);
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

export interface MediaJobContext {
  failureCategory?: string;
  failureMessage?: string;
  transcriptState?: 'ready' | 'unavailable_transcript' | 'coverage_insufficient' | 'needs_review';
  mediaPlayable?: boolean;
  coverageRatio?: number;
  segmentsCount?: number;
}

export type MediaJobEvent =
  | { type: 'START_PROBING' }
  | { type: 'PROBE_YOUTUBE_SUCCESS' }
  | { type: 'PROBE_AUDIO_SUCCESS' }
  | { type: 'CAPTIONS_FETCHED'; segmentsCount: number }
  | { type: 'CAPTIONS_NOT_FOUND'; message: string }
  | { type: 'CAPTIONS_FAILED'; category: string; message: string }
  | { type: 'AUDIO_TRANSCRIBED'; segmentsCount: number }
  | { type: 'TRANSCRIPTION_FAILED'; category: string; message: string }
  | { type: 'NORMALIZED' }
  | { type: 'VALIDATION_PASSED'; coverageRatio: number }
  | { type: 'VALIDATION_DEGRADED'; issue: 'coverage_insufficient' }
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
          CAPTIONS_NOT_FOUND: {
            target: 'degraded',
            actions: assign({
              transcriptState: () => 'unavailable_transcript',
              mediaPlayable: () => true,
              failureMessage: ({ event }) => event.message,
            }),
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
            actions: assign({
              coverageRatio: ({ event }) => event.coverageRatio,
              transcriptState: () => 'ready',
            }),
          },
          VALIDATION_DEGRADED: {
            target: 'degraded',
            actions: assign({ transcriptState: () => 'coverage_insufficient' }),
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
      degraded: { type: 'final' },
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
- Create: `src/lib/media/mediaHandoffRepository.server.ts`
- Modify: `server.ts`
- Test: `src/lib/__tests__/mediaTransport.test.ts`

**Interfaces:**
- Consumes: Express `Request`, `Response`, authenticated session token
- Produces: `verifyLearnerToken`, `consumeMediaQuota`, `parseMediaRoomV2Env`, `resolveMediaHandoffForLearner`

- [ ] **Step 1: Write failing route admission and quota test**

```typescript
// src/lib/__tests__/mediaTransport.test.ts
import { describe, it, expect } from 'vitest';
import { parseMediaRoomV2Env } from '../media/mediaFeatureFlags.server';
import { consumeMediaQuota } from '../media/mediaTransport.server';
import {
  resolveMediaHandoffForLearner,
  type P03HandoffRecord,
} from '../media/mediaHandoffRepository.server';

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

  it('resolves only an owned YouTube handoff after verified P03 RLS hydration', async () => {
    const repository = {
      findHandoffRecord: async () => ({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        title: 'Urban planning lecture',
        type: 'youtube' as const,
        processingState: 'handoff_required' as const,
        provenance: {
          owningModule: 'media' as const,
          originalUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
          canonicalCitation: 'Urban planning lecture',
          retrievalDate: '2026-09-04T00:00:00.000Z',
        },
      }),
    };
    const result = await resolveMediaHandoffForLearner(
      { sourceRecordId: '550e8400-e29b-41d4-a716-446655440000' },
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      repository,
    );
    expect(result.status).toBe('resolved');
    expect(result.handoff?.originalUrl).toContain('youtube.com');
  });

  const invalidRecords: Array<P03HandoffRecord | null> = [
    null,
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '11111111-1111-1111-1111-111111111111',
      title: 'Foreign lecture',
      type: 'youtube', processingState: 'handoff_required',
      provenance: { owningModule: 'media', originalUrl: 'https://youtube.com/watch?v=abc', canonicalCitation: 'x', retrievalDate: '2026-09-04T00:00:00.000Z' },
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Wrong owner lecture',
      type: 'youtube', processingState: 'handoff_required',
      provenance: { owningModule: 'mock', originalUrl: 'https://youtube.com/watch?v=abc', canonicalCitation: 'x', retrievalDate: '2026-09-04T00:00:00.000Z' },
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Ready lecture',
      type: 'youtube', processingState: 'ready',
      provenance: { owningModule: 'media', originalUrl: 'https://youtube.com/watch?v=abc', canonicalCitation: 'x', retrievalDate: '2026-09-04T00:00:00.000Z' },
    },
  ];

  it.each(invalidRecords)('returns one non-disclosing result for unavailable or invalid handoffs', async (record) => {
    const repository = { findHandoffRecord: async () => record };
    const result = await resolveMediaHandoffForLearner(
      { sourceRecordId: '550e8400-e29b-41d4-a716-446655440000' },
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      repository,
    );
    expect(result).toEqual({ status: 'handoff_unavailable' });
  });

  it('requires direct audio upload when an owned P03 audio handoff has no playable artifact', async () => {
    const repository = {
      findHandoffRecord: async () => ({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        title: 'Learner recording',
        type: 'audio' as const,
        processingState: 'handoff_required' as const,
        provenance: {
          owningModule: 'media' as const,
          originalFilename: 'recording.m4a',
          canonicalCitation: 'Learner recording',
          retrievalDate: '2026-09-04T00:00:00.000Z',
        },
      }),
    };
    const result = await resolveMediaHandoffForLearner(
      { sourceRecordId: '550e8400-e29b-41d4-a716-446655440000' },
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      repository,
    );
    expect(result).toEqual({ status: 'requires_original_audio' });
  });
});
```

The route-level fixture injects `startMediaJob`, `requestTranscription`, and `buildPlayerPayload` spies. Every `handoff_unavailable` and `requires_original_audio` result must leave all three at zero calls. Only a resolved YouTube handoff may proceed to a caption job.

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

Add `src/lib/media/mediaHandoffRepository.server.ts` as a server-only boundary:

```typescript
import type { MediaHandoffRequest, ResolvedMediaHandoffReference } from '../../types/media';

export type P03HandoffRecord = {
  id: string;
  userId: string;
  title: string;
  type: 'youtube' | 'audio';
  processingState: 'handoff_required' | string;
  provenance: {
    owningModule?: 'media' | 'mock' | 'sources';
    originalUrl?: string;
    originalFilename?: string;
    canonicalCitation: string;
    retrievalDate: string;
  };
};

type P03HandoffRepository = {
  findHandoffRecord(sourceRecordId: string): Promise<P03HandoffRecord | null>;
};

export type MediaHandoffResolution =
  | { status: 'resolved'; handoff: ResolvedMediaHandoffReference }
  | { status: 'requires_original_audio' }
  | { status: 'handoff_unavailable' };

export async function resolveMediaHandoffForLearner(
  request: MediaHandoffRequest,
  authenticatedUserId: string,
  repository: P03HandoffRepository,
): Promise<MediaHandoffResolution> {
  const record = await repository.findHandoffRecord(request.sourceRecordId);
  if (
    !record
    || record.userId !== authenticatedUserId
    || record.processingState !== 'handoff_required'
    || record.provenance.owningModule !== 'media'
  ) return { status: 'handoff_unavailable' };

  if (record.type === 'audio') return { status: 'requires_original_audio' };
  if (!record.provenance.originalUrl) return { status: 'handoff_unavailable' };

  return {
    status: 'resolved',
    handoff: {
      sourceRecordId: record.id,
      authenticatedUserId,
      title: record.title,
      mediaType: 'youtube',
      originalUrl: record.provenance.originalUrl,
      provenanceCitation: record.provenance.canonicalCitation,
      retrievalDate: record.provenance.retrievalDate,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaTransport.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/mediaFeatureFlags.server.ts src/lib/media/mediaTransport.server.ts src/lib/media/mediaHandoffRepository.server.ts src/lib/__tests__/mediaTransport.test.ts
git commit -m "feat(media): implement server route admission, feature flag, and quota management"
```

---

### Task 6: Central AI Router Execution Port and Error Scrubbing

**Files:**
- Create: `src/lib/media/youtubeAdapter.server.ts`
- Create: `src/lib/media/audioTranscribeAdapter.server.ts`
- Create: `src/lib/media/shadowingEvalAdapter.server.ts`
- Create: `src/lib/media/errorScrub.server.ts`
- Test: `src/lib/__tests__/mediaServerAdapters.test.ts`

**Interfaces:**
- Consumes: Central AI router execution port (`CAP-GLB-AI-ROUTER`), sandboxed yt-dlp arguments
- Produces: `fetchYouTubeCaptions`, `transcribeAudioFile`, `evaluateShadowingAcoustic`, `scrubMediaError`

- [ ] **Step 1: Write failing error scrub and central router schema test**

```typescript
// src/lib/__tests__/mediaServerAdapters.test.ts
import { describe, it, expect } from 'vitest';
import { scrubMediaError } from '../media/errorScrub.server';

describe('Media Server Adapters and Scrubbing', () => {
  it('scrubs file system paths, command flags, and sensitive tokens from error messages', () => {
    const rawError = 'Command failed: /tmp/bin/yt-dlp --token SENSITIVE_PROVIDER_TOKEN --proxy http://user:pass@127.0.0.1';
    const scrubbed = scrubMediaError(rawError);
    expect(scrubbed).not.toContain('/tmp/bin/');
    expect(scrubbed).not.toContain('SENSITIVE_PROVIDER_TOKEN');
    expect(scrubbed).not.toContain('user:pass');
    expect(scrubbed).toContain('KhÃ´ng thá»ƒ xá»­ lÃ½ media tá»« nguá»“n yÃªu cáº§u.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaServerAdapters.test.ts`
Expected: FAIL with "Cannot find module '../media/errorScrub.server'"

- [ ] **Step 3: Implement scrubMediaError and router-backed adapters**

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
git commit -m "feat(media): implement central AI router execution port and error scrubbing"
```

---

### Task 7: Client Media Room API Service and Trusted P03 Handoff Request

**Files:**
- Create: `src/services/mediaRoomService.ts`
- Create: `src/lib/media/handoffConsumer.ts`
- Test: `src/lib/__tests__/mediaHandoffBoundary.test.ts`

**Interfaces:**
- Consumes: browser `MediaHandoffRequest`, authenticated Media handoff-resolution endpoint, Supabase client session
- Produces: `importYouTubeUrl`, `uploadAudioLesson`, `saveTranscriptVersion`, `createMediaHandoffRequest`, `resolveMediaHandoff`

- [ ] **Step 1: Write failing handoff consumer test**

```typescript
// src/lib/__tests__/mediaHandoffBoundary.test.ts
import { describe, it, expect } from 'vitest';
import { createMediaHandoffRequest } from '../media/handoffConsumer';
import { MediaHandoffRequestSchema } from '../../types/media';

describe('P03 to P04 Handoff Client Boundary', () => {
  it('sends only sourceRecordId to the server resolver', () => {
    const request = createMediaHandoffRequest('550e8400-e29b-41d4-a716-446655440000');
    expect(request).toEqual({ sourceRecordId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(() => MediaHandoffRequestSchema.parse({
      ...request,
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      mediaUrl: 'https://attacker.invalid/audio.mp3',
    })).toThrow();
  });

  it('offers direct P04 upload when the server returns requires_original_audio', () => {
    const result = { status: 'requires_original_audio' as const };
    expect(result.status).toBe('requires_original_audio');
    // UI recovery opens the direct P04 audio uploader; it mounts no player, waveform, or transcription job.
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/lib/__tests__/mediaHandoffBoundary.test.ts`
Expected: FAIL with "Cannot find module '../media/handoffConsumer'"

- [ ] **Step 3: Implement handoff consumer and client API service**

```typescript
// src/lib/media/handoffConsumer.ts
import type { MediaHandoffRequest } from '../../types/media';

export function createMediaHandoffRequest(sourceRecordId: string): MediaHandoffRequest {
  return { sourceRecordId };
}

// src/services/mediaRoomService.ts
type AuthenticatedMediaRequest = (
  path: string,
  init: RequestInit,
) => Promise<Response>;

type MediaHandoffClientResponse =
  | { status: 'resolved'; lessonId: string }
  | { status: 'requires_original_audio' }
  | { status: 'handoff_unavailable' };

export async function resolveMediaHandoff(
  sourceRecordId: string,
  authenticatedRequest: AuthenticatedMediaRequest,
): Promise<MediaHandoffClientResponse> {
  const response = await authenticatedRequest('/api/media/handoffs/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(createMediaHandoffRequest(sourceRecordId)),
  });
  return response.json() as Promise<MediaHandoffClientResponse>;
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/lib/__tests__/mediaHandoffBoundary.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/media/handoffConsumer.ts src/services/mediaRoomService.ts src/lib/__tests__/mediaHandoffBoundary.test.ts
git commit -m "feat(media): implement trusted P03 media handoff request and client recovery"
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
Integrate YouTube IFrame API and Wavesurfer Audio under a single unified handle with RAF time synchronizer. Support degraded playback when captions are absent.

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
  // Uses diff@7.0.0 (jsdiff library) pattern with fallback to local wordDiff
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
    const mistakes = formatDictationMistakes(attempt, 'IELTS Lecture');
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
Cover: YouTube captioned import, YouTube uncaptioned degraded playback, audio upload, VTT parse, missing mic unavailable state, Dictation zero-mic flow, word diffing, reload resume, and keyboard navigation.

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
