# ADR: Sources & Library Domain Boundary, Immutable Lineage, and Destination-Owned Persistence

**Date:** 2026-08-30

**Status:** Accepted (coordinator-corrected; coding blocked pending Product Owner approval)

**Deciders:** Omni Architecture Council, Product Owner

**Module:** Sources & Library (`CAP-SRC-*`)

**Related Specs:** `docs/superpowers/specs/2026-08-30-omni-sources-library-design.md`

**Program map:** `docs/superpowers/plans/2026-08-30-omni-rebuild-program-map.md` (P03 after P02; P04 Media and P07 Academic Mock remain separate)

---

## 1. Context & Problem Statement

The legacy implementation of learning source ingestion in Omni IELTS had architectural vulnerabilities and pedagogical misalignments:

1. **Monolithic Mass Generation**: Ingesting a single document automatically triggered generation of Reading, Listening, Speaking, Writing, Vocabulary, and Grammar items simultaneously. This caused high AI latency, poor item quality, high token costs, and cognitive overwhelm for the self-learner.
2. **Boundary Violation & Direct Persistence**: The ingestion module directly created vocabulary cards in SRS and awarded gamified XP upon creation, violating the Learning Framework rule that AI generation does not equal learner competency evidence.
3. **Lack of Immutable Versioning & Provenance**: Editing or re-extracting a document mutated the single `LearningSource` object, destroying lineage and breaking downstream citations in practice attempts.
4. **Ungrounded Hallucination Risk**: The global chat had access to arbitrary LLM knowledge or silently triggered public search, mixing external web facts with private learner sources without clear attribution.
5. **Program-map leakage**: Treating YouTube caption retrieval, audio transcription, waveform/MediaSession, and Task 1 chart rendering as Sources extractors would duplicate P04 and P07 and would let P03 claim work it does not own.

We must lock the architectural boundaries, versioning rules, destination handoffs, extraction scope, feature flag, and privacy constraints for P03 before implementation commences.

---

## 2. Decision Drivers

- **Pedagogical Quality**: Learners need focused, high-relevance IELTS tasks derived from specific source sections rather than noisy catch-all quiz bundles.
- **Evidence Integrity**: Downstream attempts must cite exact immutable source versions and block/timestamp spans. Generation of drafts must never fabricate learner progress.
- **Module Autonomy & Persistence Boundaries**: Destination modules (Practice, Mock, Vocabulary, Note/Tutor) must own schema validation, persistence, and attempt lifecycles for their respective domain entities.
- **Privacy & Grounding Isolation**: Private uploaded documents must remain isolated under Supabase RLS. Multi-source chat must answer strictly from selected sources and fail closed (`unsupported_by_sources`) rather than guessing or searching the public web without consent.
- **Honest capability claims**: P03 may extract only pasted text/Markdown, article URLs, text-layer PDF, DOCX, and VTT/SRT. YouTube, audio, and chart inputs are reference records with `unavailable` / `handoff_required` state.

---

## 3. Considered Options

### Option A: Retain Ingestion-Side Multi-Artifact Generator with Shared Storage

- Ingestion generates all 4 skills and directly writes to `practice_activities`, `vocab_cards`, and `mock_packages`.
- *Rejected*: Violates single-responsibility principle; bypasses destination validation; creates orphan data if generation partially fails; conflates draft generation with persisted learner assets.

### Option B: Decoupled Single-Destination Pipeline with Validated Draft Handoff (Selected)

- Sources & Library acts as a NotebookLM-like asset hub:
  1. Manages immutable `SourceRecord` and `SourceVersion`s.
  2. Grounded Chat is an executable `POST /api/sources/grounded-chat` that uses the existing central AI router (`CAP-GLB-AI-ROUTER` / `GroundedProviderRouter`) over explicitly selected `SourceVersion`s with a citation validator.
  3. Artifact Studio enforces: **1 Source/Span → 1 Chosen Destination → 1 Validated Draft → Destination Owner Accepts & Persists**.
  4. Post-generation presents "Open artifact" and "Create another output" without auto-redirect.
  5. Emits zero learner mastery, XP, vocabulary cards, progress evidence, or four-skill packages.
  6. YouTube/audio/chart inputs create honest handoff records; P04 and P07 own retrieval, transcription, playback, and Task 1 rendering.

### Option C: Stateless Transformation Utility (No Stored Source Records)

- Treat Sources purely as an ephemeral text converter that streams drafts directly into destination modules without storing original sources or versions.
- *Rejected*: Breaks revision history, multi-source collections, span selection, and provenance tracking required for IELTS Academic verification.

### Option D: P03 owns YouTube, audio, and chart extraction in the same epic

- Implement `youtube-transcript` / `yt-dlp`, transcription, waveform, MediaSession, and Task 1 chart parsing inside Sources.
- *Rejected*: Violates the approved program map (P04 Media, P07 Academic Mock). Would fabricate or duplicate transcripts and Task 1 renderers. Forbidden in this epic.

---

## 4. Decision Outcome

We select **Option B**.

### Specific Architectural Invariants

1. **Immutable Versioning**: `SourceVersion` rows are append-only and identified by SHA-256 content hashes. Updates create a new version (`v2`, `stage: 'edited'`).
2. **Single-Destination Job Machine**: `SourceArtifactJob` accepts exactly one `destination` (`practice`, `mock_section`, `vocabulary_deck`, `note`, `idea_bank`).
3. **Validated Draft Contract**: Artifact Studio produces a `ValidatedArtifactDraft` with a strict provenance bundle copied from the input source (never model-invented provenance). Every ready draft retains an explicit source-version/span reference: Practice already has `sourceSpanRef`; Mock and Note also carry `sourceSpanRef`; Vocabulary/Idea Bank keep per-item `sourceSpan`. The destination module owns the validation and persistence of the resulting entity. Invalid or incomplete output is `needs_review` / `failed`, never `ready`. P03 does not fabricate Listening audio, answer keys, transcripts, scores, mastery, XP, or destination rows.

4. **Grounded Isolation**: Grounded Chat searches only selected `SourceVersion`s through `POST /api/sources/grounded-chat`. The request body carries only `selectedVersionIds` (plus question / optional span). The server verifies the learner Supabase access token with Supabase Auth (`getUser`) using URL + anon key only — never a service-role key — before any repository, AI, Brave, or quota call. A syntactically valid Bearer string is not sufficient. Hydration then uses a request-scoped `SourcesRepository` with the verified learner JWT, the anon key, and existing RLS. Model execution is delegated to the central balanced-text executor (`executeBalancedText` / `GroundedProviderRouter` / `AI_TASK_PROFILES.balanced`, `capability: 'text'`, `tools: []`); the Sources handler must not create or select a Gemini client. It never hydrates from process memory, never trusts client-supplied source text, never opens a new provider path, never constructs `@google/genai` inside Sources, never calls `/api/gemini/*`, and never uses `AI_TASK_PROFILES.grounded` (that profile enables search tools). Missing, foreign, or unselected IDs yield one non-disclosing typed `selection_unavailable` failure and do not invoke AI. Unknown or mismatched selected spans yield `unsupported_by_sources` and never fall back to full `plainText`. Context over the 32k-token conservative estimate yields typed `select_smaller_source` with no model call. Missing or invalid auth yields typed `auth_required`. Cloud unavailability yields typed `unavailable` with no fake context. Guests are not given silent cloud Source Chat. The server must not log or persist raw `SourceVersion` plain text, bearer tokens, or API keys. External search (`CAP-GLB-SEARCH`) is isolated behind the same verified-JWT `POST /api/sources/web-research` path and the explicit learner trigger ("Tra cứu dẫn chứng") and tagged as `web_citation`. If no existing approved search adapter is configured, web-research returns typed `unavailable` rather than adding a crawler. Destination handoff is navigable only for `job.state === 'ready'` with a validated draft whose destination matches the job; queued/processing/failed/missing-draft jobs return a non-navigable typed result with `autoRedirect: false` and no destination writes.


5. **Zero Mastery Policy**: Sources module emits zero `SkillEvidence`, `MistakeEvidence`, `MasteryUpdate`, XP, or automatic vocabulary cards.
6. **Extraction scope**: P03 extractors implement pasted text/Markdown, article URL, text-layer PDF, DOCX, and VTT/SRT only. YouTube, audio, and chart/image create `handoff_required` / `unavailable` reference records pointing at P04 or P07. No fake transcript, citation, score, or "real exam" claim.
7. **Feature flag**: `sources_library_v2` (env `OMNI_SOURCES_LIBRARY_V2`) defaults OFF. `sources` continues to render legacy `SourceIngestionView` until the flag is ON. Rollback is flag OFF in one deploy. The legacy view is kept as a one-release facade and is not deleted in the P03 coding epic.
8. **No Private Web Bridge dependency**: P03 does not require public or paid `CAP-GLB-PRIVATE-WEB-BRIDGE`.
9. **Dispatch gate**: P03 implementation remains blocked until P02 is merged into `origin/main` and this corrected plan receives Product Owner approval.

---

## 5. Consequences & Trade-offs

### Positive

- Clean modular boundaries: Sources does not need to know internal database schemas of Practice or Mock.
- Predictable AI costs and high task quality through focused single-output generation.
- Full auditability: every question or vocab card can trace back to `sourceId`, `versionId`, and exact `blockId`/`timeRangeMs`.
- Strict learner data privacy via Supabase RLS policies.
- Honest YouTube/audio/chart states instead of fabricated transcripts or Task 1 charts.
- Kill-switch rollback without schema down-migration.

### Negative / Mitigations

- **Trade-off**: Learner must click through to destination module to save draft.
  - *Mitigation*: Smooth deep-linking via "Open artifact" CTA with auto-recovery of pending draft in destination module.
- **Trade-off**: Multi-step batch import requires robust client-side job polling/state machine.
  - *Mitigation*: Implemented via deterministic `ImportJobMachine` with clear UI progress for each item.
- **Trade-off**: A YouTube URL entered in Sources does not yield captions in this epic.
  - *Mitigation*: Store a reference record with `handoff_required`, tell the learner Media Lab (P04) owns caption retrieval and playback, and never invent a transcript.
- **Trade-off**: Flag OFF keeps the legacy auto-generating `SourceIngestionView` visible until Product Owner turns `sources_library_v2` on.
  - *Mitigation*: Default OFF is the rollback target. The new workspace never ports auto XP, vocabulary cards, mastery, or four-skill package generation.
