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
3. **Validated Draft Contract**: Artifact Studio produces a `ValidatedArtifactDraft` with a strict provenance bundle copied from the input source (never model-invented provenance). The artifact router receives the exact `SourceSpan` used for the job and a bounded context built only from validated blocks of `job.selection`, or from that exact version's usable blocks when no selection exists — never unrelated or full `plainText`. The same 32k-token conservative estimate applies; overflow is `needs_review` with no router call. Every ready draft retains an explicit source-version/span reference: Practice already has `sourceSpanRef`; Mock and Note also carry `sourceSpanRef`; Vocabulary/Idea Bank keep per-item `sourceSpan`. The destination module owns the validation and persistence of the resulting entity. Invalid or incomplete output is `needs_review` / `failed`, never `ready`. P03 does not fabricate Listening audio, answer keys, transcripts, scores, mastery, XP, or destination rows.

4. **Grounded Isolation**: Grounded Chat searches only selected `SourceVersion`s through `POST /api/sources/grounded-chat`. Both this route and `POST /api/sources/web-research` call server-only `parseSourcesLibraryV2Env(process.env)` first; when the flag is not `true` they return typed `feature_disabled` at HTTP 403 before JWT verification, quota, repository hydration, Brave, or the AI router, without exposing the flag name, source IDs, or secrets. The request body carries only `selectedVersionIds` (plus question / optional span). The server verifies the learner Supabase access token with Supabase Auth (`getUser`) using URL + anon key only — never a service-role key — before any repository, AI, Brave, or quota call. A syntactically valid Bearer string is not sufficient. After verified identity, each route consumes a separate in-process `consumeFixedWindowQuota` bucket keyed only by that learner `userId` (grounded-chat vs web-research; never IP or unverified Bearer text). Defaults are 20 / 10 requests per hour, env-configurable and clamped; this is not a paid plan and is not durable across instances. Limit exceeded is typed `quota_exceeded` HTTP 429 with `Retry-After` and zero repository/router/Brave calls. Forged JWTs do not consume quota. Hydration then uses a request-scoped `SourcesRepository` with the verified learner JWT, the anon key, and existing RLS. Model execution is delegated to the central balanced-text executor (`executeBalancedText` / `GroundedProviderRouter` / `AI_TASK_PROFILES.balanced`, `capability: 'text'`, `tools: []`); the Sources handler must not create or select a Gemini client. It never hydrates from process memory, never trusts client-supplied source text, never opens a new provider path, never constructs `@google/genai` inside Sources, never calls `/api/gemini/*`, and never uses `AI_TASK_PROFILES.grounded` (that profile enables search tools). Missing, foreign, or unselected IDs yield one non-disclosing typed `selection_unavailable` failure and do not invoke AI. Unknown or mismatched selected spans yield `unsupported_by_sources` and never fall back to full `plainText`. A source with non-empty `plainText` but zero usable blocks is `unsupported_by_sources` with no model call. The 32k-token conservative estimate covers the complete provider prompt (instructions + selected source context + question + JSON instruction); the request schema caps `question` at 8,000 Unicode code points for both grounded chat and web research. Oversized question or total prompt yields typed `select_smaller_source` with no model or Brave call. Missing or invalid auth yields typed `auth_required`. Cloud unavailability yields typed `unavailable` with no fake context. Guests are not given silent cloud Source Chat. The server must not log or persist raw `SourceVersion` plain text, bearer tokens, or API keys. External search (`CAP-GLB-SEARCH`) is isolated behind the same verified-JWT `POST /api/sources/web-research` path and the explicit learner trigger ("Tra cứu dẫn chứng") and tagged as `web_citation`. If no existing approved search adapter is configured, web-research returns typed `unavailable` rather than adding a crawler. Destination handoff is navigable only for `job.state === 'ready'` with a validated draft whose destination matches the job, controlled provenance exists, and an explicit source-version/span reference matches `job.sourceVersionId` (and `job.selection` exactly when a selection exists); queued/processing/failed/missing-draft/missing-or-mismatched-span jobs return a non-navigable typed result with `autoRedirect: false` and no destination writes.


5. **Zero Mastery Policy**: Sources module emits zero `SkillEvidence`, `MistakeEvidence`, `MasteryUpdate`, XP, or automatic vocabulary cards.
6. **Extraction scope**: P03 extractors implement pasted text/Markdown, article URL, text-layer PDF, DOCX, and VTT/SRT only. YouTube, audio, and chart/image create `handoff_required` / `unavailable` reference records pointing at P04 or P07. No fake transcript, citation, score, or "real exam" claim.
7. **Batch C0 transport**: Import and artifact controls are backed by authenticated server routes before they are rendered. Import request validation, PDF/DOCX base64 decoding and signatures, verified JWT, separate quota buckets, learner-JWT/RLS persistence, and typed lifecycle results stay in server-only transport modules. Artifact jobs use the existing balanced text executor with no tools, persist only `source_artifact_jobs`, and expose learner-scoped status reads; destination persistence remains owner-controlled. The browser wrapper obtains the current session token per request and never stores or logs it. No delete control is exposed without a corresponding real learner-owned delete route.
8. **Feature flag**: `sources_library_v2` (env `OMNI_SOURCES_LIBRARY_V2`) defaults OFF. `sources` continues to render legacy `SourceIngestionView` until the flag is ON. The same env is a real API kill switch: `parseSourcesLibraryV2Env(process.env)` gates `POST /api/sources/grounded-chat` and `POST /api/sources/web-research` to typed HTTP 403 `feature_disabled` before any JWT, quota, repository, Brave, or router work. Rollback is flag OFF in one deploy. The legacy view is kept as a one-release facade and is not deleted in the P03 coding epic.
9. **No Private Web Bridge dependency**: P03 does not require public or paid `CAP-GLB-PRIVATE-WEB-BRIDGE`.
10. **Dispatch gate**: P03 implementation remains blocked until P02 is merged into `origin/main` and this corrected plan receives Product Owner approval.

---

## 4.1 Batch C correction delta

The Batch C correction supersedes the earlier implementation notes where they conflict:

1. The destination handoff is a typed, in-memory `PendingArtifactHandoff` held at the app navigation boundary. It is created only by the learner's explicit `Open artifact` action, consumed by the matching destination owner, and is not persisted or resumed after reload. Sources never writes destination rows.
2. `OMNI_SOURCES_LIBRARY_V2` is the single deploy-level flag. Express injects the server-parsed boolean into the browser shell as `window.__OMNI_FLAGS__.sourcesLibraryV2`; there is no manually synchronised `VITE_OMNI_SOURCES_LIBRARY_V2` flag. OFF selects the legacy view and rejects every Sources cloud route before work; ON selects SourcesView and its routes.
3. Source import authenticates the verified learner before binary decoding, hashing, extraction, or quota consumption. Cheap schema and length checks remain before authentication. Semantically invalid or oversized requests consume no quota, and raw source bytes/text never enter logs or error bodies.
4. Source import and artifact generation use distinct documented in-process quota configurations and defaults. Artifact target bands are validated at 3.0 through 9.0 in 0.5 increments by the request schema, job factory, and UI.

### 4.2 Batch C.2 security and integrity correction

The import route has a header-only admission boundary before any JSON body
parser. The global Express JSON parser explicitly skips the import path,
including its accepted trailing-slash form. The admission boundary checks the
feature flag, Bearer syntax, verified learner JWT, JSON content type, and a
declared `Content-Length` before the route installs its scoped parser. That
parser is limited to `SOURCE_IMPORT_MAX_BASE64_CHARS` plus a fixed 16 KiB JSON
envelope allowance. Requests without a declared length still receive the same
bounded parser, so chunked bodies cannot bypass the limit. No client-provided
forwarded IP header is used for identity or rate limiting.

DOCX archives are inspected from central-directory metadata before Mammoth:
512 entries maximum, 4 MiB uncompressed per entry, 16 MiB total uncompressed,
and a 100:1 entry compression-ratio ceiling. Malformed, encrypted,
multi-disk, ZIP64, and unsupported-structure archives fail closed. PDF and
DOCX parsing runs in a short-lived child process with a 256 MiB V8 old-space
limit and a 15 second timeout. PDF extraction is limited to the first 100
pages and uses only public `pdf-parse` controls. Both formats reject, rather
than truncate, output over 200,000 Unicode code points or 2,000 blocks. These
failures use the typed `RESOURCE_LIMIT_EXCEEDED` result and never create a
source version.

Artifact generation hydrates exactly one RLS-visible version, requires
`version.sourceId === record.id` and `record.processingState === 'ready'`, and
validates every supplied span record/version/block ID against that pair before
the `artifact-generation` quota, job writes, or router call. A historical
version is valid when it belongs to that ready record; `currentVersionId` is
not required to equal the selected version.

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
  - *Mitigation*: A typed in-memory handoff opens the matching destination only after the learner clicks; reload does not persist or resume the draft.
- **Trade-off**: Multi-step batch import requires robust client-side job polling/state machine.
  - *Mitigation*: Implemented via deterministic `ImportJobMachine` with clear UI progress for each item.
- **Trade-off**: A YouTube URL entered in Sources does not yield captions in this epic.
  - *Mitigation*: Store a reference record with `handoff_required`, tell the learner Media Lab (P04) owns caption retrieval and playback, and never invent a transcript.
- **Trade-off**: Flag OFF keeps the legacy auto-generating `SourceIngestionView` visible until Product Owner turns `sources_library_v2` on.
  - *Mitigation*: Default OFF is the rollback target. The new workspace never ports auto XP, vocabulary cards, mastery, or four-skill package generation.
