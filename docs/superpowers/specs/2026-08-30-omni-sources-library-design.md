# OMNI Sources & Library Domain Specification and UX Architecture (P03)

**Status:** Approved Specification Baseline (Ready for Implementation Planning)  
**Date:** 2026-08-30  
**Owner:** Sources Module (`owner: sources`)  
**Architecture Context:** Content & Provenance / Source Ingestion  
**Document Type:** Domain Specification & UX Architecture Contract  

---

## 1. Executive Summary & Problem Framing

### 1.1 Purpose
This document defines the complete product and engineering design for **OMNI Sources & Library (P03)**. It replaces the legacy monolithic source ingestion view (which automatically generated 4-skill quizzes and directly awarded XP/cards upon import) with a **Library-First, NotebookLM-inspired, IELTS-pedagogy-grounded learning workspace**.

### 1.2 Core Architectural Principles
1. **Library-First UX**: The default landing experience is a persistent, searchable, filterable library of learner-owned and curated sources, organised by collections, processing status, source type, rights status, and last used time.
2. **Immutable Versioning & Fine-Grained Provenance**: Every imported asset creates an immutable `SourceRecord` with versioned `SourceVersion`s (`raw`, `normalised`, `edited`), content hashing, and block/page/timestamp `SourceSpan`s.
3. **Selected-Source Grounded Chat**: Grounded inquiry searches *only* over explicitly selected `SourceVersion`s. If selected sources do not support an answer, the system returns `unsupported_by_sources`; it never silently falls back to public web search. External search (`CAP-GLB-SEARCH`) is invoked only via explicit learner action ("Tra cứu dẫn chứng").
4. **Strict One-Source/Span → One-Output Destination Flow**:
   $$\text{One SourceVersion or selected span} \longrightarrow \text{Choose exactly ONE destination} \longrightarrow \text{Generate \& validate ONE draft} \longrightarrow \text{Destination owner accepts \& persists}$$
   Destinations: `Practice activity` | `Mock section` | `Vocabulary deck` | `Note` | `Idea Bank`.
5. **No Auto-Redirect on Success**: Upon draft readiness, the learner is presented with a primary CTA **"Open artifact"** (deep link to destination) and a secondary CTA **"Create another output"** (reset generator with same source). The system never navigates automatically.
6. **Zero Mastery from Ingestion or AI Drafts**: Source import, text extraction, grounded chat, and AI draft generation emit zero learner mastery, competency score, or progress updates. Evidence emitted from Sources is at most `exposure` when opened as study material. Downstream attempts inside Practice/Mock/Vocabulary emit learning evidence upon learner submission.
7. **Complete State Representation & Error Normalization**: Every surface handles `initial/loading`, `ready/success`, `empty`, `stale`, `degraded`, `unavailable`, `retryable_error`, and `rejected`. Raw provider errors, API keys, and stack traces are scrubbed before reaching the UI.

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
│  - destination: 'practice' | 'mock_section' | 'vocabulary_deck' | ...   │
│  - state: 'queued' | 'processing' | 'validating' | 'ready' | 'failed'    │
│  - draft: ValidatedArtifactDraft                                         │
│  - handoff: DestinationHandoff                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

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
  processingState: 'queued' | 'processing' | 'ready' | 'degraded' | 'failed' | 'rejected';
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
  speaker?: string; // for dialogue/interview
  pageIndex?: number; // for PDF / DOCX
  startMs?: number; // for audio / YouTube
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

### 4.1 Selection & Context Formation
- **Explicit Selection Rule**: Learners may select 1 to $N$ sources via checkboxes in the Library Explorer or Collection view. The chat input displays an active token chip: `Context: 2 sources (4,250 words)` or `Context: Selected span (180 words)`.
- **Token Budget & Truncation**: When total selected context exceeds the prompt budget (e.g. 32k tokens), the system prompts the learner to select a sub-collection or specific blocks, preventing silent arbitrary middle-truncation.
- **Single Source Chat vs Multi-Source Chat**: In Source Detail, single-source chat is pre-scoped to `currentVersionId`. In Library Explorer, multi-source chat activates only when $\ge 1$ source is checked.

### 4.2 Citation Enforcement & Refusal Policy
- Every statement generated by Grounded Chat must reference specific block IDs: `[Source: "{sourceTitle}", §{blockId}]`.
- **Negative Proof / Missing Support**: If the selected sources do not contain sufficient evidence to answer the query, the AI response contract returns:
  ```json
  {
    "groundingStatus": "unsupported_by_sources",
    "answer": "Nguồn tài liệu đã chọn không chứa thông tin để trả lời câu hỏi này. Bạn có thể chọn thêm nguồn khác hoặc kích hoạt 'Tra cứu dẫn chứng' từ web.",
    "citations": []
  }
  ```
- **Web Search Boundary**: External Web Search (`CAP-GLB-SEARCH`) is NEVER invoked automatically. If the learner explicitly clicks "Tra cứu dẫn chứng từ web", the response emits separate `web_citations` clearly distinguished from learner source citations.

---

## 5. Ingestion, Extraction & Format Pipelines

### 5.1 Supported Formats & Specialized Adapters

| Source Format | Extractor Engine | Sanitization & Normalization | Failure Mode & Fallback |
|---|---|---|---|
| **Text / Markdown** | Direct text parser | Normalize whitespace, strip control characters | Rejects empty string (< 15 chars) with `INVALID_INPUT` |
| **Web URL** | Mozilla Readability via fetch | DOMPurify HTML sanitization, strip ads/nav/scripts | Returns `URL_UNREACHABLE` or `BLOCKED_BY_ROBOTS`; offers manual copy-paste fallback |
| **PDF** | `pdf-parse` / text extractor | Page-by-page block chunking, header/footer deduplication | Encrypted/scanned PDF without text returns `PDF_SCANNED_NO_TEXT` (no default hosted OCR); prompts for text paste |
| **DOCX** | `mammoth` / docx parser | Paragraph, heading, and table extraction | Malformed DOCX returns `MALFORMED_DOCUMENT` with recovery instructions |
| **YouTube URL** | `youtube-transcript` / `yt-dlp` adapter | Turn-based timestamped block formatting | Missing captions returns `CAPTIONS_UNAVAILABLE`; does NOT fabricate synthetic transcript |
| **Audio (MP3/WAV/M4A)** | Audio duration parser + AI Transcribe pipeline | Timestamped turns (`startMs`, `endMs`) | Unsupported audio format returns `UNSUPPORTED_AUDIO_CODEC` |
| **VTT / SRT** | Subtitle parser | Parse timestamps and dialogue turns | Syntax error in subtitle returns `SUBTITLE_PARSE_ERROR` |
| **Task 1 Chart / Image** | Structured image metadata & prompt extractor | Validates chart labels, units, and axes | Low-resolution image returns `CHART_ILLEGIBLE` |

### 5.2 Import Job State Machine (`ImportJobMachine`)

```
[idle] ──(SUBMIT_IMPORT)──► [queued] ──(START_EXTRACT)──► [processing]
                                                              │
                     ┌────────────────────────────────────────┼────────────────────────────────────────┐
                     ▼                                        ▼                                        ▼
                  [ready]                               [needs_review]                               [failed]
          (SourceVersion created,                  (Scanned PDF / Low confidence,              (Invalid URL /
           provenance recorded)                     prompts learner confirmation)             corrupted file)
```

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

---

## 8. Presentation States & UX Flow Contracts

### 8.1 Required 8 UI States

| State | Library Explorer Surface | Source Reader & Detail Surface | Artifact Studio Surface |
|---|---|---|---|
| **1. Loading** | Skeleton grid of source cards | Shimmering text reader blocks | Circular progress with step indicator (1/3 Analyzing...) |
| **2. Success / Ready** | Grid/list with search, filters, badges | Full formatted reader, spans, grounded chat | Validated draft preview with "Open artifact" & "Create another" |
| **3. Empty** | Empty library illustration + "Add your first source" CTA | "No source selected" state | "Select a source to begin creation" state |
| **4. Stale** | Indicator on cached offline items ("Cached 2h ago") | Stale banner with "Refresh from server" | N/A (jobs must be fresh) |
| **5. Degraded** | Low-bandwidth mode (previews without heavy media) | Audio waveform disabled; plain audio player active | Lightweight draft validation without deep AI enrichment |
| **6. Unavailable** | Offline mode banner with cached-only access | External fetch / YouTube player offline indicator | Generation disabled with "Requires internet connection" |
| **7. Retryable Error** | Rate limit / quota banner with countdown timer | Provider timeout with "Retry inquiry" button | Provider busy with "Wait 15s & retry" CTA |
| **8. Rejected / Blocked** | Copyright / unsupported format badge | Scanned PDF / rights-blocked notice with text paste advice | Destination validation failure with highlighted errors |

### 8.2 Error Normalization & Scrubbing Contract
Every API failure returns a sanitized `AppError` without raw keys, paths, or provider stack traces:
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
    | 'NETWORK_DISCONNECTED';
  userMessageVi: string;
  suggestedActionVi: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  diagnosticId: string; // scrubbed correlation ID
}
```

### 8.3 Stable UX Flow Contracts (`data-ux-flow`)

| Flow ID | Trigger / Action | Expected State Transition | Evidence Test |
|---|---|---|---|
| `sources.library.filter` | Change filter, search query, or tag | List updates instantly without full reload | `e2e/sources-library.spec.ts` |
| `sources.import.submit` | Submit file, URL, or pasted text | Form → `queued` → `processing` → `ready` card | `e2e/sources-import.spec.ts` |
| `sources.selection.toggle` | Check/uncheck source in library | Selected count updates, grounded chat context recalculates | `e2e/sources-chat.spec.ts` |
| `sources.chat.send` | Send question in Grounded Chat | `idle` → `streaming/generating` → cited answer | `e2e/sources-chat.spec.ts` |
| `sources.artifact.open-modal` | Click "Create from this source" | Modal opens with destination picker & source pre-selected | `e2e/sources-artifact.spec.ts` |
| `sources.artifact.generate` | Choose 1 destination & click Generate | `picker` → `processing` → `validating` → `ready_draft` | `e2e/sources-artifact.spec.ts` |
| `sources.artifact.open` | Click primary "Open artifact" | Navigates to target module with draft payload | `e2e/sources-artifact.spec.ts` |
| `sources.artifact.create-another` | Click secondary "Create another output" | Modal resets to destination picker; source stays selected | `e2e/sources-artifact.spec.ts` |
| `sources.collection.create` | Create a new study collection | Collection added to sidebar, filterable immediately | `e2e/sources-library.spec.ts` |
| `sources.delete` | Confirm source deletion | Source & versions removed from store & DB | `e2e/sources-library.spec.ts` |

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
  processing_state TEXT NOT NULL DEFAULT 'queued' CHECK (processing_state IN ('queued', 'processing', 'ready', 'degraded', 'failed', 'rejected')),
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

### 9.2 Local Storage & Offline Cache (Dexie.js / IndexedDB)
- Read-only cached copies of `source_records`, `source_versions`, and `source_collections` are stored in IndexedDB for instant startup and offline reader capability.
- Offline mutations (creating collections, selecting spans, drafting notes) are queued into an idempotent sync queue. Ingestion and AI generation remain disabled while offline with clear UI communication.

---

## 10. Acceptance Criteria Matrix

| ID | Title | Verification Description |
|---|---|---|
| **AC-SRC-001** | Library-First Initial View | Opening Sources lands on Library Explorer showing existing sources, search bar, collection tags, and rights badges; no automatic quiz generation occurs. |
| **AC-SRC-002** | Multi-Format Batch Ingestion | Batch importing a PDF, a Web URL, and pasted text creates 3 independent `queued` jobs, which process and resolve to `ready` or explicit `failed` states independently. |
| **AC-SRC-003** | Immutable Versioning & Provenance | Editing an extracted source creates `SourceVersion(v2, stage: 'edited')` with a distinct SHA-256 hash. Original `v1` remains intact. |
| **AC-SRC-004** | Grounded Chat Strictness | Asking a question in Grounded Chat returns inline block citations `[Source: Title, §b_002]`. When asked about an unmentioned topic, AI returns `unsupported_by_sources` without hallucinating or searching the web. |
| **AC-SRC-005** | Explicit Web Search Isolation | Grounded Chat does NOT trigger external web search. Clicking "Tra cứu dẫn chứng" triggers `CAP-GLB-SEARCH` explicitly and tags results as `[Web: Title, URL]`. |
| **AC-SRC-006** | Single Destination Choice | Artifact Studio UI allows selecting exactly ONE destination (`practice`, `mock_section`, `vocabulary_deck`, `note`, `idea_bank`). Simultaneous multi-destination generation is prevented by design. |
| **AC-SRC-007** | Quality Validation Gate | If AI generates an invalid practice question (e.g. missing correct answer or malformed options), validator sets job to `needs_review` or `failed` with error details, not raw crash. |
| **AC-SRC-008** | Post-Success Handoff & No Auto-Redirect | When draft generation succeeds, UI displays Primary CTA "Open artifact" and Secondary CTA "Create another output". The viewport does not redirect automatically. |
| **AC-SRC-009** | Destination Persistence Ownership | Clicking "Open artifact" deep-links to destination module with `ValidatedArtifactDraft`. Final database save is executed by the destination module owner. |
| **AC-SRC-010** | No Mastery or Progress from Sources | Importing 10 sources and generating 5 drafts results in zero increase in learner XP, zero changes to `CompetencyState`, and zero mastery updates. |
| **AC-SRC-011** | Corrupted / Malformed Handling | Ingesting a corrupted PDF or invalid URL displays typed `EXTRACTION_FAILED` message with manual paste CTA, without throwing an uncaught runtime error. |
| **AC-SRC-012** | Scanned PDF Rejection | Uploading an image-only scanned PDF displays `PDF_SCANNED_NO_TEXT` notice advising text extraction or OCR pre-processing, rather than fabricating gibberish. |
| **AC-SRC-013** | Rate Limit & Quota Handling | Simulating provider 429 rate limit sets job state to `retry_wait` with countdown timer and manual retry button. |
| **AC-SRC-014** | Complete UI States | All 8 presentation states (loading, ready, empty, stale, degraded, unavailable, retryable_error, rejected) render cleanly on desktop and mobile viewports. |
| **AC-SRC-015** | RLS & Tenant Privacy | Attempting to query `source_records` of another `user_id` via Supabase client returns empty results (0 rows). |
| **AC-SRC-016** | WCAG 2.2 AA Accessibility | Source reader, selection handles, modal dialogs, and filters are fully navigable via keyboard (Tab/Shift+Tab/Enter/Esc), have visible focus rings, and pass contrast audits. |

---

## 11. Fixture Matrix & UX Proof Requirements

### 11.1 Test Fixtures Matrix

| Fixture ID | Type | Content Description | Expected Test Outcome |
|---|---|---|---|
| `fix-src-text-01` | Text | 600-word Academic essay on Renewable Subsidies | Clean extraction, 4 blocks, word count 602 |
| `fix-src-pdf-01` | PDF | 2-page digital PDF on Urban Heat Islands | Clean extraction, 2 pages, 8 blocks, page indexes preserved |
| `fix-src-pdf-scanned` | PDF | 1-page image-only scan | Rejection with `PDF_SCANNED_NO_TEXT` error |
| `fix-src-docx-01` | DOCX | 3-page Word report with headings & tables | Clean extraction, table converted to structured block |
| `fix-src-url-01` | URL | Clean article HTML from reputable news source | Mozilla Readability parses title, body; ads stripped |
| `fix-src-url-blocked` | URL | 403 Forbidden / Cloudflare challenge page | Rejection with `URL_UNREACHABLE`; fallback paste offered |
| `fix-src-yt-01` | YouTube | Video with English standard closed captions | Subtitles parsed into timestamped dialogue blocks |
| `fix-src-yt-no-cc` | YouTube | Video with no captions available | Rejection with `CAPTIONS_UNAVAILABLE` |
| `fix-src-chart-01` | Chart | Academic Writing Task 1 Line Graph image & data | Metadata extracted; labels and units validated |

### 11.2 UX Proof Suite
1. **Deterministic E2E Tests (`e2e/sources-library.spec.ts`)**:
   - Test 1: Import all valid fixture formats and verify Library cards.
   - Test 2: Multi-source selection and grounded chat with citation verification.
   - Test 3: Artifact Studio single-destination generation and "Open artifact" / "Create another output" flow.
   - Test 4: Negative tests for corrupted files, scanned PDFs, and rate limits.
2. **Accessibility & Responsive Checks**:
   - Automated Axe core audit with 0 violations.
   - Mobile viewport check ($375\text{px}$) for Library explorer, Reader, and Modals.
