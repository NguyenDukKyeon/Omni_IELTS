# OMNI Sources & Library Domain Specification and UX Architecture (P03)

**Status:** Coordinator-corrected specification (implementation blocked pending Product Owner approval)

**Date:** 2026-08-30

**Owner:** Sources Module (`owner: sources`)

**Architecture Context:** Content & Provenance / Source Ingestion

**Document Type:** Domain Specification & UX Architecture Contract

**Program map:** `docs/superpowers/plans/2026-08-30-omni-rebuild-program-map.md`

**Coding epic gate:** P03 implementation remains blocked until P02 is merged into `origin/main` and this corrected plan receives Product Owner approval.

---

## 1. Executive Summary & Problem Framing

### 1.1 Purpose

This document defines the complete product and engineering design for **OMNI Sources & Library (P03)**. It replaces the legacy monolithic source ingestion view (which automatically generated 4-skill quizzes and directly awarded XP/cards upon import) with a **Library-First, NotebookLM-inspired, IELTS-pedagogy-grounded learning workspace**.

P03 owns Library-first sources, provenance, selection, grounded chat, single-output draft jobs, and destination handoff. It does not own Media playback/transcription or Academic Mock Task 1 rendering.

### 1.2 Core Architectural Principles

1. **Library-First UX**: The default landing experience is a persistent, searchable, filterable library of learner-owned and curated sources, organised by collections, processing status, source type, rights status, and last used time.
2. **Immutable Versioning & Fine-Grained Provenance**: Every imported asset creates an immutable `SourceRecord` with versioned `SourceVersion`s (`raw`, `normalised`, `edited`), content hashing, and block/page/timestamp `SourceSpan`s.
3. **Selected-Source Grounded Chat**: Grounded inquiry searches *only* over explicitly selected `SourceVersion`s. If selected sources do not support an answer, the system returns `unsupported_by_sources`; it never silently falls back to public web search. External search (`CAP-GLB-SEARCH`) is invoked only via explicit learner action ("Tra cứu dẫn chứng").
4. **Strict One-Source/Span → One-Output Destination Flow**:
   One SourceVersion or selected span → Choose exactly ONE destination → Generate and validate ONE draft → Destination owner accepts and persists.
   Destinations: `Practice activity` | `Mock section` | `Vocabulary deck` | `Note` | `Idea Bank`.
5. **No Auto-Redirect on Success**: Upon draft readiness, the learner is presented with a primary CTA **"Open artifact"** (deep link to destination) and a secondary CTA **"Create another output"** (reset generator with same source). The system never navigates automatically.
6. **Zero Mastery from Ingestion or AI Drafts**: Source import, text extraction, grounded chat, and AI draft generation emit zero learner mastery, competency score, XP, vocabulary cards, progress updates, or four-skill package generation. Evidence emitted from Sources is at most `exposure` when opened as study material. Downstream attempts inside Practice/Mock/Vocabulary emit learning evidence upon learner submission.
7. **Complete State Representation & Error Normalization**: Every surface handles `initial/loading`, `ready/success`, `empty`, `stale`, `degraded`, `unavailable`, `retryable_error`, and `rejected`. Raw provider errors, HTTP status strings, internal file paths, API keys, and stack traces are scrubbed before reaching the UI.
8. **Honest module handoff**: YouTube, audio, and Task 1 chart/image inputs may create a `SourceRecord` in `unavailable` or `handoff_required` state only. P03 does not extract, transcribe, render, or play them.

### 1.3 Program-map ownership boundary

| Input / concern | P03 may do | P03 must not do | Owner |
|---|---|---|---|
| Pasted text / Markdown | Extract, normalise, version | Fabricate filler text | P03 |
| Article URL | Fetch + Readability + DOMPurify | Bypass sanitization or silent truncation | P03 |
| Text-layer PDF | Extract page/block text | Hosted OCR by default (`CAP-SRC-HOSTED-OCR` is post-beta) | P03 |
| DOCX | Extract paragraphs, headings, tables | Execute macros or unsanitized HTML | P03 |
| VTT / SRT captions | Parse timestamps and dialogue turns | Invent missing captions | P03 |
| YouTube URL | Create reference record `handoff_required` / `unavailable`; point learner to Media | Caption retrieval, `yt-dlp`, `youtube-transcript`, audio download, fake transcript | P04 |
| Audio (MP3/WAV/M4A) | Create reference record `handoff_required` / `unavailable`; point learner to Media | Transcription, waveform, media playback, MediaSession ownership | P04 |
| Task 1 chart / image | Create reference record `handoff_required` / `unavailable`; point learner to Mock | Chart/image parsing or deterministic Task 1 rendering | P07 |
| Practice / Mock / Vocab / Note persistence | Hand off one `ValidatedArtifactDraft` | Persist destination entities, award XP, emit mastery | Destination owners |
| Private Web Bridge | None | Depend on public/paid Private Web Bridge | `CAP-GLB-PRIVATE-WEB-BRIDGE` remains founder/invite-only |

---

## 2. Traceability & Capability Mapping

This specification realizes the requirements defined in the product baseline without minting unauthorized IDs:

| Requirement / Constraint | Capability ID | Mechanism | Metric / Guardrail | Spec Section |
|---|---|---|---|---|
| PRD-005 (Multi-source Workspace) | `CAP-SRC-WORKSPACE` | Workspace & collection grouping | `METRIC-001` | Section 3 |
| PRD-005, NFR-001 (Batch Import) | `CAP-SRC-IMPORT-BATCH` | Parallel independent ingestion jobs | `METRIC-006` | Section 5 |
| PRD-005 (Extract & Validate) | `CAP-SRC-EXTRACT` | Document normalization & sanitization | `GUARD-001` | Section 5 |
| PRD-005, NFR-004 (Immutable Versions) | `CAP-SRC-VERSION` | Hashed immutable source versions | `GUARD-001` | Section 3 |
| PRD-005, NFR-004 (Provenance & Rights) | `CAP-SRC-PROVENANCE` | Citation, rights & lineage tracking | `GUARD-003` | Section 3, 4 |
| PRD-005 (Source Selection) | `CAP-SRC-SELECTION` | Include/exclude multi-source selection | `GUARD-001` | Section 4 |
| PRD-005, NFR-005 (Grounded Chat) | `CAP-SRC-GROUNDED-CHAT` | Cited answers over selected sources | `GUARD-003` | Section 4 |
| PRD-005, NFR-005 (Artifact Studio) | `CAP-SRC-ARTIFACT-STUDIO` | One-source to one-destination draft job | `METRIC-006` | Section 6 |
| PRD-005, NFR-004 (Live Hub Records) | `CAP-SRC-LIVE-HUB` | Fresh/stale/report/forecast source records | `GUARD-003` | Section 7 |
| PRD-002, PRD-013 (App Shell & States) | `CAP-GLB-APP-SHELL` | Focus Dock integration & 8 UI states | `METRIC-005` | Section 8 |
| NFR-004 (Identity, Privacy & RLS) | `CAP-GLB-IDENTITY` | Private data isolation, Supabase RLS | `GUARD-002` | Section 9 |
| NFR-005 (AI router, kill switch) | `CAP-GLB-AI-ROUTER` | Central router only; `sources_library_v2` flag | `METRIC-006`, `GUARD-001`, `GUARD-004` | Sections 4, 8.4 |

---

## 3. Domain Model & Core Type Contracts

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             SourceRecord                                 │
│  - id: uuid                                                              │
│  - userId: uuid                                                          │
│  - title: string                                                         │
│  - type: 'text' | 'pdf' | 'docx' | 'url' | 'youtube' | 'audio' | ...     │
│  - rightsState: 'owned_by_learner' | 'fair_use_academic' | ...           │
│  - collectionIds: uuid[]                                                 │
│  - currentVersionId: uuid                                                │
│  - provenance: SourceProvenance                                          │
│  - processingState includes unavailable | handoff_required               │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ 1..n
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            SourceVersion                                 │
│  - id: uuid                                                              │
│  - versionNumber: number (1, 2, 3...)                                    │
│  - stage: 'raw' | 'normalised' | 'edited'                                │
│  - contentHash: sha256-string                                            │
│  - blocks: SourceBlock[] (id, text, type, pageIndex, timeRangeMs)        │
│  - wordCount, durationMs, metadata                                       │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Referenced by
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          SourceArtifactJob                               │
│  - id: uuid                                                              │
│  - sourceVersionId: uuid                                                 │
│  - selection?: SourceSpan                                                │
│  - destination: 'practice' | 'mock_section' | 'vocabulary_deck' | ...    │
│  - state: 'queued' | 'processing' | 'validating' | 'ready' | 'failed'    │
│  - draft: ValidatedArtifactDraft                                         │
│  - handoff: DestinationHandoff                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

`youtube`, `audio`, and `chart_image` remain valid `SourceMediaType` values so a learner can store a reference. Those records are not extractable in P03. Their `processingState` is `unavailable` or `handoff_required`, `currentVersionId` may be empty, and `extractionReport.warnings` names the owning future module.

### 3.1 SourceRecord

Represents the root entity of a learner's or curated learning source:

```ts
export type SourceMediaType =
  | 'text'
  | 'pdf'
  | 'docx'
  | 'url'
  | 'youtube'
  | 'audio'
  | 'vtt_srt'
  | 'chart_image';

export type ContentRightsState =
  | 'owned_by_learner'
  | 'licensed_public'
  | 'fair_use_academic'
  | 'restricted_citation_only'
  | 'rejected_unsupported';

export type SourceProcessingState =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'degraded'
  | 'failed'
  | 'rejected'
  | 'unavailable'
  | 'handoff_required';

export interface SourceProvenance {
  originType: 'user_upload' | 'pasted_text' | 'web_fetch' | 'youtube_import' | 'live_hub' | 'curated_benchmark';
  originalUrl?: string;
  originalFilename?: string;
  authorOrSpeaker?: string;
  publicationDate?: string;
  retrievalDate: string; // ISO-8601
  license?: string;
  rightsState: ContentRightsState;
  rightsNotesVi?: string;
  rawContentHash: string; // SHA-256
  canonicalCitation: string;
  owningModule?: 'sources' | 'media' | 'mock';
  handoffReasonVi?: string;
}

export interface SourceRecord {
  id: string; // uuid
  userId: string; // uuid
  title: string;
  summary: string;
  type: SourceMediaType;
  collectionIds: string[];
  tags: string[];
  provenance: SourceProvenance;
  currentVersionId: string;
  targetBandEstimate?: number;
  processingState: SourceProcessingState;
  lastUsedAt: string; // ISO-8601
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 SourceVersion & SourceSpan

Every change, extraction stage, or manual edit creates a new immutable version:

```ts
export type VersionStage = 'raw' | 'normalised' | 'edited';

export interface SourceBlock {
  id: string; // e.g. "b_001"
  order: number;
  type: 'paragraph' | 'heading' | 'transcript_turn' | 'table_row' | 'chart_caption' | 'list_item';
  text: string;
  speaker?: string; // populated only when a VTT/SRT or a future P04 transcript supplies it
  pageIndex?: number; // for PDF / DOCX
  startMs?: number; // for VTT/SRT now; audio / YouTube only after P04 handoff
  endMs?: number;
}

export interface SourceVersion {
  id: string; // uuid
  sourceId: string; // uuid
  versionNumber: number;
  stage: VersionStage;
  contentHash: string; // SHA-256 of normalized text
  plainText: string;
  blocks: SourceBlock[];
  wordCount: number;
  pageCount?: number;
  durationMs?: number;
  mediaUrl?: string;
  extractionReport?: {
    extractor: string;
    extractedAt: string;
    sanitizationApplied: string[];
    warnings: string[];
  };
  createdAt: string;
}

export interface SourceSpan {
  sourceId: string;
  sourceVersionId: string;
  blockIds?: string[];
  pageIndex?: number;
  startMs?: number;
  endMs?: number;
  exactTextSnippet?: string;
}
```

### 3.3 SourceCollection

Organizes sources into thematic or skill-specific study collections:

```ts
export interface SourceCollection {
  id: string;
  userId: string;
  name: string;
  color: string; // token reference e.g. "var(--color-vermilion-subtle)"
  icon: string; // icon identifier
  description?: string;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}
```

---

## 4. Grounded Chat & Citation Architecture

Grounded Chat is an executable server capability, not a client-side citation parser. It is `CAP-SRC-GROUNDED-CHAT` and consumes `CAP-GLB-AI-ROUTER`. It never opens a parallel provider SDK, never calls `/api/gemini/*` directly, and never uses `AI_TASK_PROFILES.grounded` (that profile enables `googleSearch`).

### 4.1 API boundary

| Action | Method and path | Router profile | Search tools |
|---|---|---|---|
| Private-source chat | `POST /api/sources/grounded-chat` | `CAP-GLB-AI-ROUTER` via existing `GroundedProviderRouter` + `AI_TASK_PROFILES.balanced` (`capability: 'text'`, tools empty) | None |
| Explicit web research | `POST /api/sources/web-research` | Existing `CAP-GLB-SEARCH` path used by Live Hub / forecast grounding | Only after the learner clicks "Tra cứu dẫn chứng" |

Request body for private-source chat (Zod-validated):

```ts
{
  selectedVersionIds: string[]; // required, min 1
  question: string;             // required
  sourceSpan?: SourceSpan;      // optional tighter selection
  conversationId?: string;
}
```

The handler does not receive source plaintext in the request. It authenticates the learner and hydrates exactly the selected IDs through a request-scoped repository (section 4.1.1). Versions in `unavailable` or `handoff_required` that the learner owns are excluded from prompt context and reported in `excludedSources`. Missing, foreign, or otherwise non-visible IDs never produce a partial context.

### 4.1.1 Authenticated request-scoped SourcesRepository boundary

Current Source rows live in browser IndexedDB / client-Supabase storage. `server.ts` has no process-memory Source catalogue and no authenticated Source repository of its own. Grounded Chat therefore cannot invent hydration.

`POST /api/sources/grounded-chat` must:

1. Authenticate the learner from the `Authorization: Bearer <Supabase JWT>` header. Guests keep offline/sample library behaviour on the client; cloud Source Chat is not silently available without a learner JWT.
2. Construct a **request-scoped** `SourcesRepository` that queries `source_versions` and parent `source_records` through Supabase using that learner JWT and the existing RLS policies.
3. Use the Supabase URL and **anon key only**. Never a service-role key, never a shared server session, never a parallel provider SDK.
4. Hydrate **exactly** the `selectedVersionIds`. Do not accept client-supplied raw source text, and do not read Source rows from process memory.
5. If any selected ID is missing, belongs to another learner, or is not RLS-visible, return one typed `selection_unavailable` response that does not disclose whether a row exists, and **do not** invoke the AI router.
6. Missing or invalid auth: typed `auth_required` (`NormalizedSourceError` code `AUTH_REQUIRED`). No provider call.
7. Supabase or the cloud source store unavailable: typed `unavailable`. No fake context and no provider call.
8. Do not log or persist raw `SourceVersion` plain text, bearer tokens, or API keys.

`POST /api/sources/web-research` remains the only explicit `CAP-GLB-SEARCH` path. It also requires authenticated cloud access: the handler verifies the learner Supabase access token server-side with Supabase Auth using the project URL and **anon key only** (never a service-role key) before any Brave/search, repository, AI, or quota call. Missing, malformed, expired, invalid, or unverifiable JWTs return typed `auth_required` (HTTP 401). Supabase transport or configuration failure returns typed `unavailable` (HTTP 503). A syntactically valid Bearer string is not sufficient. If no existing approved search adapter used by Live Hub / forecast grounding (Brave Search) is configured, return typed `unavailable`. Do not add crawling or search packages, and do not use `AI_TASK_PROFILES.grounded`.


### 4.2 Selection & Context Formation

- **Explicit Selection Rule**: Learners may select 1 to N sources via checkboxes in the Library Explorer or Collection view. The chat input displays an active token chip: `Context: 2 sources (4,250 words)` or `Context: Selected span (180 words)`.
- **Token Budget & Truncation**: When total selected context exceeds the prompt budget (32k tokens), the system prompts the learner to select a sub-collection or specific blocks, preventing silent arbitrary middle-truncation. The runtime uses a documented conservative estimate: Unicode code-point count ÷ 3, plus 256 tokens of instruction overhead. If that estimate exceeds 32,000, grounded chat returns typed `select_smaller_source` and does not call the model. An explicit `sourceSpan` is validated against hydrated selected pairs (`sourceId` + `sourceVersionId` + every supplied `blockId` on that exact version). Unknown or mismatched spans yield `unsupported_by_sources` with no model call and never fall back to full `plainText`.
- **Single Source Chat vs Multi-Source Chat**: In Source Detail, single-source chat is pre-scoped to `currentVersionId`. In Library Explorer, multi-source chat activates only when at least one source is checked.
- Unselected versions are never added to the model context.

### 4.3 Citation validator and refusal policy

Every model response is parsed with Zod:

```ts
{
  groundingStatus: 'fully_grounded' | 'partially_grounded' | 'unsupported_by_sources';
  answer: string;
  citations: Array<{ sourceVersionId: string; sourceTitle: string; blockId: string; exactSnippet?: string }>;
  webCitations: []; // must be empty on /api/sources/grounded-chat
}
```

`validateGroundedCitations(response, selectedVersions)` rejects the answer and returns `unsupported_by_sources` when any of the following is true:

- a citation `sourceVersionId` is not in the selected set;
- a citation `blockId` does not exist on that version;
- the model emitted `webCitations` on the private-source endpoint;
- the model returned an answer with no citations while `groundingStatus !== 'unsupported_by_sources'`.

**Negative Proof / Missing Support**:

```json
{
  "groundingStatus": "unsupported_by_sources",
  "answer": "Nguồn tài liệu đã chọn không chứa thông tin để trả lời câu hỏi này. Bạn có thể chọn thêm nguồn khác hoặc kích hoạt 'Tra cứu dẫn chứng' từ web.",
  "citations": [],
  "webCitations": []
}
```

**Web Search Boundary**: External Web Search (`CAP-GLB-SEARCH`) is never invoked by `/api/sources/grounded-chat`. The separate control `data-ux-control="sources.chat.web-research"` posts to `/api/sources/web-research`. Web hits are labelled `[Web: Title, URL]` and stored in `webCitations`, never mixed unmarked with source citations.

Provider failures pass through existing `classifyApiFailure` / `NormalizedSourceError`. Learner-facing text excludes `HTTP 429`, internal paths such as `internal/provider.ts`, stack frames, and secret-shaped strings.

### 4.4 Required tests

- invalid citation (unknown `blockId`) → `unsupported_by_sources`;
- citation to an unselected `SourceVersion` → rejected;
- answer with no citation and a claim → `unsupported_by_sources`;
- private-source chat does not call search tools or `/api/sources/web-research`;
- provider failure is scrubbed (no `HTTP 429`, no `internal/provider.ts`).

---

## 5. Ingestion, Extraction & Format Pipelines

### 5.1 Supported Formats & Specialized Adapters

P03 extraction is limited to pasted text / Markdown, article URL extraction, text-layer PDF, DOCX, and VTT/SRT captions.

| Source Format | P03 adapter | Sanitization & Normalization | Failure Mode & Fallback |
|---|---|---|---|
| **Text / Markdown** | Direct text parser | Normalize whitespace, strip control characters | Rejects empty string (< 15 chars) with `INVALID_INPUT` |
| **Web URL** | Mozilla Readability via fetch + jsdom | DOMPurify HTML sanitization, strip ads/nav/scripts | Returns `URL_UNREACHABLE` or `BLOCKED_BY_ROBOTS`; offers manual copy-paste fallback |
| **PDF (text layer)** | `pdf-parse` text extractor | Page-by-page block chunking, header/footer deduplication | Encrypted/scanned PDF without text returns `PDF_SCANNED_NO_TEXT` (no default hosted OCR); prompts for text paste |
| **DOCX** | `mammoth` docx parser | Paragraph, heading, and table extraction; HTML sanitized before storage | Malformed DOCX returns `MALFORMED_DOCUMENT` with recovery instructions |
| **VTT / SRT** | Subtitle parser | Parse timestamps and dialogue turns | Syntax error in subtitle returns `SUBTITLE_PARSE_ERROR` |
| **YouTube URL** | Reference-only `createHandoffRecord('media')` | No caption fetch, no `yt-dlp`, no `youtube-transcript` | `handoff_required` / `unavailable`; learner is directed to P04 Media Lab. No fake transcript. |
| **Audio (MP3/WAV/M4A)** | Reference-only `createHandoffRecord('media')` | No transcription, no waveform, no MediaSession | `handoff_required` / `unavailable`; learner is directed to P04 Media Lab |
| **Task 1 Chart / Image** | Reference-only `createHandoffRecord('mock')` | No chart parsing, no axis/label extraction, no Task 1 renderer | `handoff_required` / `unavailable`; learner is directed to P07 Academic Mock |

### 5.2 Import Job State Machine (`ImportJobMachine`)

```
[idle] ──(SUBMIT_IMPORT)──► [queued] ──(START_EXTRACT)──► [processing]
                                                              │
     ┌──────────────────────────────┬─────────────────────────┼──────────────────────────┐
     ▼                              ▼                         ▼                          ▼
  [ready]                    [needs_review]            [handoff_required]            [failed]
  (P03 extractable            (Scanned PDF /            (YouTube / audio /           (Invalid URL /
   SourceVersion created)      low confidence)           chart reference only)        corrupted file)
```

Independent batch jobs: one failure does not cancel siblings (`CAP-SRC-IMPORT-BATCH`, `METRIC-006`).

---

## 6. One-Source/Span → One-Output Destination Flow

### 6.1 Strict Single-Destination Rule

To prevent cognitive overload, low-quality mass-generation, and module boundary leakage, **one generation job produces exactly ONE destination draft**:

```text
[One SourceVersion or Selected Span]
                  │
                  ▼
   [Select EXACTLY ONE Destination]
   ├── 1. IELTS Practice (Reading / Listening / Writing / Speaking activity)
   ├── 2. IELTS Mock Section (Passage bundle / Task prompt)
   ├── 3. Vocabulary Deck (Contextual vocabulary card deck)
   ├── 4. Note (Structured summary & key academic takeaways)
   └── 5. Idea Bank (Categorized Task 2 / Speaking arguments & facts)
                  │
                  ▼
   [Generate & Validate ONE Draft] (ArtifactJobMachine)
                  │
                  ▼
   [Destination Owner Accepts & Persists]
```

A source in `handoff_required` or `unavailable` cannot enter Artifact Studio until an owning module supplies a normalised `SourceVersion`. P03 must not invent that version.

### 6.2 Destination Contracts & Payloads

```ts
export type DestinationType =
  | 'practice'
  | 'mock_section'
  | 'vocabulary_deck'
  | 'note'
  | 'idea_bank';

export interface ValidatedPracticeDraft {
  skill: 'reading' | 'listening' | 'writing' | 'speaking';
  targetBand: number;
  activityTitle: string;
  sourceSpanRef: SourceSpan;
  questionPayload: Record<string, unknown>; // validated against question schema
  provenance: SourceProvenance;
}

export interface ValidatedMockDraft {
  sectionType: 'reading_passage' | 'listening_section' | 'writing_task1' | 'writing_task2' | 'speaking_part';
  blueprintId?: string;
  targetBand: number;
  packagePayload: Record<string, unknown>;
  sourceSpanRef: SourceSpan;
  provenance: SourceProvenance;
}

export interface ValidatedVocabularyDraft {
  deckTitle: string;
  targetBand: number;
  cards: Array<{
    word: string;
    pos: string;
    contextSentence: string;
    definitionVi: string;
    definitionEn: string;
    phonetic: string;
    collocations: string[];
    cefrLevel: 'B1' | 'B2' | 'C1' | 'C2';
    sourceSpan: SourceSpan;
  }>;
  provenance: SourceProvenance;
}

export interface ValidatedNoteDraft {
  title: string;
  summaryVi: string;
  keyTakeaways: string[];
  annotatedCitations: Array<{ claim: string; blockId: string }>;
  sourceSpanRef: SourceSpan;
  provenance: SourceProvenance;
}

export interface ValidatedIdeaBankDraft {
  topic: string;
  ideas: Array<{
    perspective: string;
    argumentEn: string;
    explanationVi: string;
    exampleOrData: string;
    sourceSpan: SourceSpan;
  }>;
  provenance: SourceProvenance;
}

export interface SourceArtifactJob {
  id: string;
  userId: string;
  sourceVersionId: string;
  selection?: SourceSpan;
  destination: DestinationType;
  targetBand: number;
  customInstruction?: string;
  state:
    | 'queued'
    | 'processing'
    | 'validating'
    | 'ready'
    | 'needs_review'
    | 'retry_wait'
    | 'rejected'
    | 'failed'
    | 'cancelled';
  artifactDraft?: {
    id: string;
    destination: DestinationType;
    payload:
      | ValidatedPracticeDraft
      | ValidatedMockDraft
      | ValidatedVocabularyDraft
      | ValidatedNoteDraft
      | ValidatedIdeaBankDraft;
    validationErrors?: string[];
  };
  destinationHandoff?: {
    status: 'pending' | 'accepted' | 'rejected';
    destinationEntityId?: string;
    acceptedAt?: string;
  };
  error?: {
    code: string;
    messageVi: string;
    retryable: boolean;
    diagnosticId: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 Post-Success Action Rule

When an artifact job succeeds:

- **No Automatic Redirection**: The learner remains in the Sources & Library interface.
- **Primary CTA**: **"Open artifact"** (`Mở [bài tập / bộ từ vựng / ghi chú]`) → Deep links to the destination module (`/practice?draftId=...` or `/vocabulary?deckId=...`).
- **Secondary CTA**: **"Create another output"** (`Tạo đầu ra khác từ nguồn này`) → Resets the destination picker modal to allow choosing a different destination from the same source.

---

## 7. Live Hub Source Records Contract

`CAP-SRC-LIVE-HUB` defines source records sourced from exam recalls, reports, and forecasts:

- Live Hub items exist in three distinct tabs:
  1. `Exam Reports`: Verified historical exam topic recalls with test date, country, and council (e.g. IDP/BC).
  2. `Forecast`: Predictive topic sets (explicitly labelled as Forecast / Xu hướng, NEVER "Đề thi thật").
  3. `Saved & Generated`: Learner's saved Live Hub snapshots and derived practice items.
- Live Hub records inherit `SourceRecord` and maintain strict citation: citation proves the reported recall source, not the AI-completed practice questions.
- P03 does not convert Live Hub records into Practice or Mock packages; conversion remains `CAP-PRC-LIVE-HUB-CONVERT` / `CAP-MCK-LIVE-HUB-CONVERT`.

---

## 8. Presentation States, Feature Flag & UX Flow Contracts

### 8.1 Required 8 UI States

| State | Library Explorer Surface | Source Reader & Detail Surface | Artifact Studio Surface |
|---|---|---|---|
| **1. Loading** | Skeleton grid of source cards | Shimmering text reader blocks | Circular progress with step indicator (1/3 Analyzing...) |
| **2. Success / Ready** | Grid/list with search, filters, badges | Full formatted reader, spans, grounded chat | Validated draft preview with "Open artifact" & "Create another" |
| **3. Empty** | Empty library illustration + "Add your first source" CTA | "No source selected" state | "Select a source to begin creation" state |
| **4. Stale** | Indicator on cached offline items ("Cached 2h ago") | Stale banner with "Refresh from server" | Jobs must be fresh; stale jobs show refresh |
| **5. Degraded** | Low-bandwidth mode (previews without heavy media) | Reader text-only; no waveform and no MediaSession | Lightweight draft validation without deep AI enrichment |
| **6. Unavailable** | Offline mode banner with cached-only access; YouTube/audio/chart cards in `handoff_required` | Honest "owned by Media/Mock" banner, not a player | Generation disabled with "Requires internet connection" or "Source not extractable in P03" |
| **7. Retryable Error** | Rate limit / quota banner with countdown timer | Provider timeout with "Retry inquiry" button | Provider busy with "Wait 15s & retry" CTA |
| **8. Rejected / Blocked** | Copyright / unsupported format badge | Scanned PDF / rights-blocked notice with text paste advice | Destination validation failure with highlighted errors |

Degraded and unavailable reader states must not mount Wavesurfer, MediaSession, YouTube iframes, or a Task 1 chart renderer.

### 8.2 Error Normalization & Scrubbing Contract

Every API failure returns a sanitized `AppError` without raw keys, paths, HTTP status tokens, or provider stack traces:

```ts
export interface NormalizedSourceError {
  code:
    | 'AUTH_REQUIRED'
    | 'QUOTA_EXCEEDED'
    | 'PROVIDER_BUSY'
    | 'UNSUPPORTED_FORMAT'
    | 'EXTRACTION_FAILED'
    | 'RIGHTS_REJECTED'
    | 'VALIDATION_FAILED'
    | 'NETWORK_DISCONNECTED'
    | 'HANDOFF_REQUIRED';
  userMessageVi: string;
  suggestedActionVi: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  diagnosticId: string; // scrubbed correlation ID
}
```

Scrubbing fixture intent: given `new Error('HTTP 429: provider quota at internal/provider.ts:45')`, the learner-facing message excludes both `HTTP 429` and `internal/provider.ts`.

### 8.3 Stable UX Flow and Control Contracts

Every P03 interactive control uses a literal unique `data-ux-control` ID **and** a registered `data-ux-flow`. The migrated workspace is scoped with `data-ux-scope="sources-library-v2"` and must satisfy UX Contract v2 (`UxControlContract` from P02). Flow IDs alone are not sufficient evidence.

| Flow ID | Control IDs | Trigger / Action | Expected State Transition | Evidence Test |
|---|---|---|---|---|
| `sources.library.filter` | `sources.library.search-input`, `sources.library.filter-format`, `sources.library.filter-rights`, `sources.library.filter-sort` | Change filter, search query, or tag | List updates instantly without full reload | `e2e/sources-library.spec.ts` |
| `sources.import.submit` | `sources.import.open`, `sources.import.submit`, `sources.import.paste-text`, `sources.import.url`, `sources.import.pdf`, `sources.import.docx`, `sources.import.vtt` | Submit file, URL, or pasted text | Form → `queued` → `processing` → `ready` or typed failure | `e2e/sources-library.spec.ts` |
| `sources.selection.toggle` | `sources.library.select-toggle`, `sources.library.open-source` | Check/uncheck source in library | Selected count updates, grounded chat context recalculates | `e2e/sources-library.spec.ts` |
| `sources.chat.send` | `sources.chat.send`, `sources.chat.citation-open` | Send question in Grounded Chat | `idle` → `streaming/generating` → cited answer or `unsupported_by_sources` | `e2e/sources-library.spec.ts` |
| `sources.chat.web-research` | `sources.chat.web-research` | Explicit "Tra cứu dẫn chứng" | Does not run on `sources.chat.send`; tags `[Web: Title, URL]` | `e2e/sources-library.spec.ts` |
| `sources.artifact.open-modal` | `sources.artifact.open-modal` | Click "Create from this source" | Modal opens with destination picker & source pre-selected | `e2e/sources-library.spec.ts` |
| `sources.artifact.generate` | `sources.artifact.destination-practice`, `sources.artifact.destination-mock`, `sources.artifact.destination-vocabulary`, `sources.artifact.destination-note`, `sources.artifact.destination-idea-bank`, `sources.artifact.generate` | Choose 1 destination & click Generate | `picker` → `processing` → `validating` → `ready_draft` | `e2e/sources-library.spec.ts` |
| `sources.artifact.open` | `sources.artifact.open` | Click primary "Open artifact" | Navigates to target module with draft payload; no auto-redirect beforehand | `e2e/sources-library.spec.ts` |
| `sources.artifact.create-another` | `sources.artifact.create-another` | Click secondary "Create another output" | Modal resets to destination picker; source stays selected | `e2e/sources-library.spec.ts` |
| `sources.collection.create` | `sources.collection.create-button`, `sources.collection.save-button` | Create a new study collection | Collection added to sidebar, filterable immediately | `e2e/sources-library.spec.ts` |
| `sources.delete` | `sources.delete.confirm` | Confirm source deletion | Source & versions removed from store & DB | `e2e/sources-library.spec.ts` |

### 8.4 Feature flag `sources_library_v2` and one-release facade

Routing `sources` to the new workspace is forbidden until this flag is specified, implemented, and testable.

| Item | Contract |
|---|---|
| Flag key | `sources_library_v2` |
| Server env | `OMNI_SOURCES_LIBRARY_V2` (`true` / `false`) |
| Default | **OFF**. `src/App.tsx` `case 'sources'` continues to render legacy `SourceIngestionView`. |
| ON | `case 'sources'` renders `SourcesView` inside `data-ux-scope="sources-library-v2"`. |
| Kill switch | Set `OMNI_SOURCES_LIBRARY_V2=false` and redeploy. No schema down-migration. New tables remain dormant. |
| One-release facade | Keep `src/views/SourceIngestionView.tsx` imported and constructible. Do not delete it in the P03 coding epic. A hidden compatibility export remains for one release after flag ON. |
| Rollback | Flag OFF restores the legacy route in one deploy. Learners see `SourceIngestionView`. No XP/mastery repair is required because the new path never wrote those records. |
| Import side effects | The new workspace never calls `awardXP`, never inserts vocabulary cards, never emits `SkillEvidence` / `MistakeEvidence` / `MasteryUpdate`, and never opens `SourceToLearningPackageModal` as an automatic four-skill generator. |

---

## 9. Persistence, Storage & Security Architecture

### 9.1 Database Schema (Supabase PostgreSQL with RLS)

```sql
-- 1. Source Records
CREATE TABLE IF NOT EXISTS public.source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL CHECK (media_type IN ('text', 'pdf', 'docx', 'url', 'youtube', 'audio', 'vtt_srt', 'chart_image')),
  collection_ids UUID[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_version_id UUID,
  processing_state TEXT NOT NULL DEFAULT 'queued' CHECK (processing_state IN ('queued', 'processing', 'ready', 'degraded', 'failed', 'rejected', 'unavailable', 'handoff_required')),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Source Versions
CREATE TABLE IF NOT EXISTS public.source_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.source_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  stage TEXT NOT NULL CHECK (stage IN ('raw', 'normalised', 'edited')),
  content_hash TEXT NOT NULL,
  plain_text TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  word_count INT NOT NULL DEFAULT 0,
  page_count INT,
  duration_ms INT,
  media_url TEXT,
  extraction_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Source Collections
CREATE TABLE IF NOT EXISTS public.source_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'vermilion',
  icon TEXT NOT NULL DEFAULT 'folder',
  description TEXT,
  source_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Source Artifact Jobs
CREATE TABLE IF NOT EXISTS public.source_artifact_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_version_id UUID NOT NULL REFERENCES public.source_versions(id) ON DELETE CASCADE,
  selection JSONB,
  destination TEXT NOT NULL CHECK (destination IN ('practice', 'mock_section', 'vocabulary_deck', 'note', 'idea_bank')),
  target_band NUMERIC(3,1) NOT NULL DEFAULT 7.0,
  custom_instruction TEXT,
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'processing', 'validating', 'ready', 'needs_review', 'retry_wait', 'rejected', 'failed', 'cancelled')),
  artifact_draft JSONB,
  destination_handoff JSONB NOT NULL DEFAULT '{"status": "pending"}'::jsonb,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Enforcement
ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_artifact_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "source_records_owner_all" ON public.source_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "source_versions_owner_all" ON public.source_versions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "source_collections_owner_all" ON public.source_collections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "source_artifact_jobs_owner_all" ON public.source_artifact_jobs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 9.2 Local Storage & Offline Cache

P03 does **not** add Dexie.js. Dexie remains a registry candidate for `CAP-GLB-IDENTITY` / `CAP-MCK-RESUME` and is out of this epic.

- `sourcesStorage` may cache read-only copies of the caller's `source_records`, `source_versions`, and `source_collections` with native IndexedDB or an in-memory map.
- Offline mutations (creating collections, selecting spans) are queued for later sync. Ingestion and AI generation remain disabled while offline.
- Full offline queue ownership stays with P09.

P03 has no public or paid Private Web Bridge dependency.

---

## 10. Acceptance Criteria Matrix

| ID | Title | Verification Description |
|---|---|---|
| **AC-SRC-001** | Library-First Initial View | Opening Sources with `sources_library_v2` ON lands on Library Explorer showing existing sources, search bar, collection tags, and rights badges; no automatic quiz generation occurs. |
| **AC-SRC-002** | Multi-Format Batch Ingestion | Batch importing a text-layer PDF, a Web URL, and pasted text creates 3 independent `queued` jobs, which process and resolve to `ready` or explicit `failed` states independently. A YouTube or audio item in the same batch becomes `handoff_required` without blocking the others. |
| **AC-SRC-003** | Immutable Versioning & Provenance | Editing an extracted source creates `SourceVersion(v2, stage: 'edited')` with a distinct SHA-256 hash. Original `v1` remains intact. |
| **AC-SRC-004** | Grounded Chat Strictness | `POST /api/sources/grounded-chat` returns inline block citations `[Source: Title, §b_002]` only for selected versions. Unmentioned topics, invalid block IDs, and unselected versions return `unsupported_by_sources` without hallucinating or searching the web. |
| **AC-SRC-005** | Explicit Web Search Isolation | Grounded Chat does NOT trigger external web search. Clicking "Tra cứu dẫn chứng" (`sources.chat.web-research`) triggers `CAP-GLB-SEARCH` explicitly and tags results as `[Web: Title, URL]`. |
| **AC-SRC-006** | Single Destination Choice | Artifact Studio UI allows selecting exactly ONE destination (`practice`, `mock_section`, `vocabulary_deck`, `note`, `idea_bank`). Simultaneous multi-destination generation is prevented by design. |
| **AC-SRC-007** | Quality Validation Gate | If AI generates an invalid practice question (e.g. missing correct answer or malformed options), validator sets job to `needs_review` or `failed` with error details, not raw crash. |
| **AC-SRC-008** | Post-Success Handoff & No Auto-Redirect | When draft generation succeeds, UI displays Primary CTA "Open artifact" and Secondary CTA "Create another output". The viewport does not redirect automatically. |
| **AC-SRC-009** | Destination Persistence Ownership | Clicking "Open artifact" deep-links to destination module with `ValidatedArtifactDraft`. Final database save is executed by the destination module owner. |
| **AC-SRC-010** | No Mastery or Progress from Sources | Importing 10 sources and generating 5 drafts results in zero increase in learner XP, zero vocabulary cards inserted by Sources, zero changes to `CompetencyState`, and zero mastery updates. |
| **AC-SRC-011** | Corrupted / Malformed Handling | Ingesting a corrupted PDF or invalid URL displays typed `EXTRACTION_FAILED` message with manual paste CTA, without throwing an uncaught runtime error. |
| **AC-SRC-012** | Scanned PDF Rejection | Uploading an image-only scanned PDF displays `PDF_SCANNED_NO_TEXT` notice advising text extraction or OCR pre-processing, rather than fabricating gibberish. |
| **AC-SRC-013** | Rate Limit & Quota Handling | Simulating provider 429 rate limit sets job state to `retry_wait` with countdown timer and manual retry button. Learner text excludes `HTTP 429` and `internal/provider.ts`. |
| **AC-SRC-014** | Complete UI States | All 8 presentation states (loading, ready, empty, stale, degraded, unavailable, retryable_error, rejected) render cleanly on desktop and mobile viewports. Unavailable YouTube/audio/chart cards do not mount a player or Task 1 renderer. |
| **AC-SRC-015** | RLS & Tenant Privacy | Attempting to query `source_records` of another `user_id` via Supabase client returns empty results (0 rows). Playwright uses two authenticated clients as the verification strategy. |
| **AC-SRC-016** | WCAG 2.2 AA Accessibility | Source reader, selection handles, modal dialogs, and filters are fully navigable via keyboard (Tab/Shift+Tab/Enter/Esc), have visible focus rings, unique `data-ux-control` IDs, and pass axe with 0 violations. |

---

## 11. Fixture Matrix & UX Proof Requirements

### 11.1 Test Fixtures Matrix

| Fixture ID | Type | Content Description | Expected Test Outcome |
|---|---|---|---|
| `fix-src-text-01` | Text | 600-word Academic essay on Renewable Subsidies | Clean extraction, 4 blocks, word count 602 |
| `fix-src-pdf-01` | PDF | 2-page digital text-layer PDF on Urban Heat Islands | Clean extraction, 2 pages, 8 blocks, page indexes preserved |
| `fix-src-pdf-scanned` | PDF | 1-page image-only scan | Rejection with `PDF_SCANNED_NO_TEXT` error; no OCR, no fabricated text |
| `fix-src-docx-01` | DOCX | 3-page Word report with headings & tables | Clean extraction, table converted to structured block |
| `fix-src-url-01` | URL | Clean article HTML from a fixture file (not a live third-party host) | Mozilla Readability parses title, body; ads stripped |
| `fix-src-url-blocked` | URL | 403 Forbidden / Cloudflare challenge page fixture | Rejection with `URL_UNREACHABLE`; fallback paste offered |
| `fix-src-vtt-01` | VTT/SRT | Two-cue English caption file | Timestamped `transcript_turn` blocks; `startMs`/`endMs` preserved |
| `fix-src-yt-01` | YouTube URL | Any YouTube URL entered in P03 import | Reference `SourceRecord` with `processingState: 'handoff_required'`, `owningModule: 'media'`. Zero caption rows. No `yt-dlp`. No fake transcript. |
| `fix-src-yt-no-cc` | YouTube URL | YouTube URL with no captions | Same honest `handoff_required` / `unavailable` record. P03 does not attempt caption retrieval. |
| `fix-src-audio-01` | Audio file | MP3/WAV/M4A uploaded in P03 | Reference record `handoff_required` to P04. No transcription, waveform, or MediaSession. |
| `fix-src-chart-01` | Chart image | Academic Writing Task 1 line-graph image | Reference record `handoff_required` to P07. No label/unit/axis extraction and no Task 1 renderer. |

### 11.2 UX Proof Suite

1. **Deterministic Playwright (`e2e/sources-library.spec.ts`)** with `OMNI_SOURCES_LIBRARY_V2=true` covers AC-SRC-001 through AC-SRC-016 as listed in the implementation plan Task 12.
2. **Accessibility & Responsive Checks**:
   - Automated axe-core audit with 0 violations on Library, Reader, Chat, and Artifact Studio.
   - Keyboard-only path for search, select, import, chat send, web-research, destination pick, generate, open artifact, create another.
   - Desktop Chromium and Pixel-class mobile (390×844) for Library explorer, Reader, and Modals.
3. **Flag off proof**: with `OMNI_SOURCES_LIBRARY_V2=false`, `sources` still renders `SourceIngestionView`.

---

## 12. Non-goals and honesty rules

- Do not invent, rename, or mint PRD, NFR, CAP, METRIC, or GUARD IDs.
- Preserve exactly: one SourceVersion/span → one destination → one validated draft → destination owner persists.
- Preserve no fake transcript, citation, score, mastery, XP, or "real exam" / "Đề thi thật" claim.
- Preserve no public/paid Private Web Bridge dependency.
- Do not implement YouTube caption retrieval, yt-dlp, audio download, audio transcription, waveform, media playback, or MediaSession ownership.
- Do not implement IELTS Task 1 chart/image parsing or rendering.
- P03 coding remains blocked until P02 is on `origin/main` and Product Owner approves this corrected plan.
