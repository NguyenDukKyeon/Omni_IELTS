# ADR-2026-09-04: Media Learning Room Transcript Lifecycle, Handoff, and Evidence Boundary

**Status:** Proposed (implementation blocked pending P03 merge and Product Owner approval)
**Date:** 2026-09-04
**Deciders:** Coordinator, Media Module Architect, Assessment & Learning Framework Owner
**Domain:** Voice & Media / Learning Activity / Assessment
**Document Reference:** `docs/superpowers/specs/2026-09-04-omni-media-learning-room-design.md`
**Program Map Reference:** `docs/superpowers/plans/2026-08-30-omni-rebuild-program-map.md` (P04)

---

## 1. Context & Problem Statement

The legacy implementation of the Media module (`MediaLabView`, `OriginalMediaPlayer`, `ShadowingStudio`, `DictationStudio`) provided valuable initial prototyping of YouTube integration, Wavesurfer waveforms, and Gemini audio evaluation. However, the legacy architecture contains significant structural defects and architectural boundary violations:

1. **Coupled Content and Learner State**: `MediaTranscriptSegment` directly contained mutable learner attempt fields (`userRecordedAudio`, `userDictationInput`, `shadowingScore`, `shadowingEvaluation`). Any edit to the transcript risked overwriting or corrupting historical learner attempt records.
2. **Client-Only LocalStorage Persistence**: Media sessions and segments were serialized as an unindexed JSON blob in browser `localStorage` (`omni_ielts_media_v1`). This risked quota overflow, offered zero cross-device synchronization, and lacked Row-Level Security (RLS) protections.
3. **Direct Gamification and Uncoordinated Mastery**: The UI components directly invoked `awardXP()` and `addMistake()`, mutating ad-hoc mistake objects without conforming to the canonical `MistakeEvidence` schema defined in the **Learning and Assessment Framework**.
4. **Disconnected Module Boundary with Sources (P03)**: In P03 (`origin/feature/p03-sources-library`), when a learner imports a YouTube URL or audio file, Sources generates a `SourceRecord` in `handoff_required` state (`createHandoffRecord('media')`). P03 deliberately does NOT create a `SourceVersion` for these items. The legacy Media Lab had no mechanism to consume or resolve these handoff records.
5. **Acoustic and Transcript Availability Fallback Risks**: Without explicit architectural boundaries, failures in transcript retrieval or microphone access risked either breaking the entire room or falling back to speculative text-only pronunciation scoringâ€”violating `GUARD-001`.

A rigorous architectural decision is required to formalize the lifecycle of transcripts, establish explicit module handoffs, enforce truthful failure boundaries, protect biometric learner audio, route all AI through the central router, and isolate evidence generation.

---

## 2. Decision Drivers

- **Pedagogical Integrity (`GUARD-001`, `PRD-008`)**: Never fabricate transcripts, pronunciation scores, or IELTS band equivalents. Missing prerequisites (e.g. absent microphone or missing caption) must yield an explicit, honest `unavailable` status.
- **Microphone Independence for Dictation (`PRD-008`)**: Dictation must test listening comprehension and spelling without requiring audio recording permissions. Denying or missing microphone access must never impede Dictation.
- **Source-to-Media Provenance (`CAP-MED-IMPORT`, `CAP-SRC-VERSION`)**: Media consumes sources; Sources keeps provenance. Media must reference upstream `sourceRecordId` via a P04-owned `MediaHandoffReference`. Because P03 intentionally creates no `SourceVersion` for `handoff_required` items, `sourceVersionId` is absent at handoff and P04 creates its own `MediaTranscriptVersion`.
- **Zero Direct Mastery Policy**: Media Room is a practice and retrieval environment, not a mastery arbiter. All learning evidence must be emitted as immutable envelopes to Review & Progress (`P05`).
- **Centralized AI Execution (`CAP-GLB-AI-ROUTER`)**: All machine learning operations are routed through the central AI router with strict schema verification and circuit breaking, avoiding direct provider client SDKs inside Media.
- **Biometric Audio Privacy (`sensitive_audio`)**: Learner voice recordings must not be permanently stored in cloud databases. Local playback must use sandboxed client storage (`IndexedDB`) with explicit learner consent.

---

## 3. Decision

### 3.1 Transcript, Versioning, and Provenance Ownership

1. **Entity Ownership**: The Media module owns `MediaLesson` and `MediaTranscriptVersion`.
2. **Immutable Append-Only Versions**: Once created, a `MediaTranscriptVersion` is immutable.
   - Version 1 is created during ingestion as either `raw_caption` (from YouTube VTT/SRT) or `ai_transcription` (from AI audio transcription via router).
   - Learner edits do not mutate the existing version; they write a new version with `versionNumber = N + 1`, `stage = 'user_edited'`, and `normalizerVersion = 'user-edited-v1'`.
3. **Deterministic Segment Identification**: Each `MediaTranscriptSegment` receives a deterministic ID computed from its contents and timestamps (`seg_<hash(text + startMs)>`). When a transcript is edited, unchanged segments retain their deterministic ID, preserving historical links to past attempts.
4. **Provenance Tracking**:
   - If the lesson was initiated from the Sources Library, `MediaLesson.sourceRecordId` points to the originating P03 record. `MediaLesson.sourceVersionId` is absent initially because P03 creates no `SourceVersion` for `handoff_required` media.
   - If imported directly into Media, provenance records the original external URL or audio file SHA-256 hash.

### 3.2 Handoff Boundaries: P03 â†’ P04 and P04 â†’ Evidence/Review

1. **P03 â†’ P04 Handoff Contract**:
   - P03 extractors handle text, PDF, DOCX, and standalone VTT/SRT files. For YouTube URLs and raw audio files, P03 emits a `SourceRecord` with `processing_state = 'handoff_required'` without creating a `SourceVersion`. P03 does NOT export a `PendingMediaHandoff` type.
   - At the navigation boundary, P04 defines and ingests a `MediaHandoffReference` derived from the P03 `SourceRecord`:
     ```typescript
     export interface MediaHandoffReference {
       sourceRecordId: string;
       userId: string;
       title: string;
       mediaType: 'youtube' | 'audio';
       mediaUrl: string;
       sourceVersionId?: string; // Optional: absent on initial handoff from P03
       provenanceCitation?: string;
       retrievalDate?: string;
     }
     ```
   - Media Room ingests this reference, creates the `MediaLesson`, and initiates caption extraction or transcription. P04 creates its own first `MediaTranscriptVersion`. P03 never invokes yt-dlp, media player APIs, or audio transcription.
2. **P04 â†’ Review & Evidence Boundary**:
   - Media Room emits zero `MasteryUpdate`, zero direct XP increments, and zero direct flashcard mutations.
   - When a Dictation attempt contains incorrect or missing words, Media formats a canonical `MistakeEvidence` record (`taxonomy: 'listening_spelling'`, `evidenceClass: 'assisted_practice'`) and dispatches it to the global Evidence bus.
   - When a Shadowing attempt contains acoustic errors, Media formats a canonical `MistakeEvidence` record (`taxonomy: 'pronunciation'`, `evidenceClass: 'assisted_practice'`).
   - Downstream mastery progression and spaced-repetition scheduling are handled exclusively by P05 (Review & Progress).

### 3.3 Decoupled Playback vs. Transcript Availability

1. **Player-First Independence**: Original audio/video playback via YouTube IFrame or Wavesurfer is decoupled from transcript readiness.
2. **Graceful Degradation for No-Caption Media**:
   - If a YouTube video has no captions, the original media player still loads and streams authentic video/audio.
   - The transcript capability enters `unavailable_transcript`, and the room transitions to a `degraded` state (not terminal `failed`).
   - Dictation and transcript-aligned Shadowing are disabled with a clear Vietnamese explanatory note.
   - Original playback remains usable for unguided authentic listening.
   - The system **never** hallucinates a transcript, calls fallback TTS, or invents pronunciation scores.
3. **Malformed Subtitle Rejection**:
   - Uploaded subtitle files with corrupt or non-monotonic timestamps fail validation with typed `SUBTITLE_PARSE_ERROR` or `needs_review`.
   - The system preserves the original raw file and prompts learner correction; it **never generates fake fallback timings**.

### 3.4 Shadowing vs. Dictation Privacy and Evidence Boundary

1. **Hardware and Permission Isolation**:
   - **Dictation**: Requires original audio playback and text input (keyboard typing, gap-fill, or word arrangement via `diff@7.0.0` / jsdiff library). It **never prompts for microphone permission**. If the browser blocks microphone access, Dictation remains 100% operational.
   - **Shadowing**: Requires authentic microphone audio captured via `navigator.mediaDevices.getUserMedia`.
2. **Acoustic Truthfulness**:
   - If the microphone is missing (`NotFoundError`) or permission is denied (`NotAllowedError`), Shadowing marks `acousticStatus = 'unavailable'`.
   - The UI disables the evaluation trigger with a clear Vietnamese explanation.
   - The system **never** falls back to text-only pronunciation scoring.
3. **Biometric Privacy & Ephemeral Voice**:
   - Learner microphone audio is held in ephemeral browser memory.
   - If the learner enables "LÆ°u bÃ i thu Ã¢m trÃªn thiáº¿t bá»‹ nÃ y" (Opt-In Consent), the audio blob is saved to client-side IndexedDB (`omni_ielts_media_artifacts_v1`) under URI `idb-media://<id>`.
   - Server evaluation transmits audio over TLS to `/api/media/evaluate-shadowing`, which forwards the request to the central AI router (`CAP-GLB-AI-ROUTER`) and immediately releases the memory buffer.
   - Raw audio binaries and base64 strings are **strictly forbidden** from being stored in Supabase PostgreSQL tables or application logs.

---

## 4. Consequences & Trade-Offs

### 4.1 Positive Consequences

- **Strict Pedagogical Honesty**: Pronunciation scores represent genuine acoustic analysis; missing prerequisites produce honest `unavailable` states rather than deceptive numbers.
- **Robust Data Integrity**: Separation of `MediaTranscriptVersion` and `MediaAttempt` ensures transcripts can be corrected without corrupting historical study logs.
- **Frictionless Dictation**: Learners on restricted hardware or privacy-sensitive environments can practice Dictation without microphone friction.
- **Biometric Compliance**: Keeping raw voice audio off cloud databases eliminates sensitive biometric data exposure risks.
- **Architectural Harmony**: Seamless consumption of P03 handoffs and emission of P05 evidence preserves clean modularity across the Omni rebuild roadmap.

### 4.2 Negative Consequences & Mitigations

- **Trade-Off**: Direct YouTube caption fetch may fail due to YouTube bot challenges.
  - *Mitigation*: The backend employs pinned `yt-dlp` with PO-token provider boundary arguments and provides immediate fallback to learner VTT/SRT upload or audio upload.
- **Trade-Off**: Audio recordings stored in IndexedDB do not sync across devices.
  - *Mitigation*: Accepted trade-off for privacy and cost control. Telemetry metrics (WPM, pause durations, accuracy scores) sync via Supabase, while heavy audio binaries remain local.
- **Trade-Off**: Incomplete YouTube captions (< 65% coverage) cannot be marked as a ready lesson.
  - *Mitigation*: Display `coverage_insufficient` warning badge and allow the learner to fill gaps using the transcript editor.

---

## 5. Rejected Alternatives & Rationale

### 5.1 Rejected: Inlining Learner Attempts into Transcript Segments
*Proposal*: Continue storing `userRecordedAudio`, `userDictationInput`, and `shadowingScore` directly inside `MediaTranscriptSegment`.
*Rationale for Rejection*: Violates separation of concerns. If a learner edits a spelling mistake in a transcript, should previous attempts be wiped or mutated? Separating `MediaTranscriptVersion` from `MediaAttempt` allows immutable transcript versioning and multi-attempt history.

### 5.2 Rejected: Text-Only Pronunciation Scoring Fallback
*Proposal*: If the learner has no microphone, prompt them to read along and estimate their score based on speech-to-text text or reading speed.
*Rationale for Rejection*: Directly violates `GUARD-001` (Fabricated Learning/Assessment Data) and `PRD-008`. Pronunciation and prosody are physical acoustic phenomena (phoneme accuracy, intonation contours, sentence stress, vowel reduction). Text-only scoring is scientifically invalid and pedagogically dishonest.

### 5.3 Rejected: Global Microphone Permission Requirement
*Proposal*: Request microphone permission upon entering the Media Learning Room.
*Rationale for Rejection*: Violates `PRD-008`. Dictation is a listening and orthographic skill that requires only speakers/headphones. Forcing microphone permission degrades the experience for learners who only wish to do Dictation.

### 5.4 Rejected: Direct XP and Mastery Mutation inside Media Components
*Proposal*: Call `awardXP(15)` and directly increment mastery levels upon completing a Dictation sentence.
*Rationale for Rejection*: Bypasses the centralized Review & Progress module (`P05`). Direct manipulation causes XP inflation, breaks unassisted transfer tracking (`METRIC-003`), and pollutes the mastery state machine.

### 5.5 Rejected: Cloud Database Storage of Raw Audio Blobs
*Proposal*: Upload learner microphone recordings to Supabase Storage buckets.
*Rationale for Rejection*: Storing thousands of 5-second WebM blobs introduces massive egress/storage costs (`METRIC-006`), creates GDPR/biometric privacy liabilities, and provides negligible pedagogical value after initial feedback. Local IndexedDB with optional retention is strictly superior.

### 5.6 Rejected: Fallback Segmenting for Malformed Subtitles
*Proposal*: If a subtitle file contains malformed timestamps, invent arbitrary 4-second segment intervals.
*Rationale for Rejection*: Violates `GUARD-001`. Invented timestamps align incorrectly with the underlying authentic audio, causing learners to listen to truncated or misaligned sentences during Dictation and Shadowing.
