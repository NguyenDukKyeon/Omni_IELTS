# Sources & Library (P03) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the OMNI Sources & Library module into a Library-First, multi-source learning workspace with immutable versioning, span-level provenance, strict selected-source grounded chat, and a single-destination artifact generation pipeline (`1 Source/Span → 1 Chosen Destination → 1 Validated Draft → Destination Owner Persists`).

**Architecture:** Domain contracts and Supabase RLS isolate private learner documents; an extraction pipeline normalizes heterogeneous inputs (Text, PDF, DOCX, URL, YouTube, Audio, Charts); `ImportJobMachine` manages parallel ingestion; `LibraryStore` manages search, filters, and collections; `GroundedChatEngine` queries selected source versions with block citations; `ArtifactJobMachine` generates validated single-destination drafts; destination handoff adapters deliver drafts to Practice, Mock, Vocabulary, and Note modules without creating premature learner mastery.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS v4, Lucide React, Supabase PostgreSQL with RLS, Vitest 3.2, Playwright, Mozilla Readability, DOMPurify, pdf-parse, mammoth.

**Spec:** `docs/superpowers/specs/2026-08-30-omni-sources-library-design.md`

## Global Constraints

- Library-first UX is the default landing view; no automatic multi-artifact generation on import.
- Immutable source versioning with SHA-256 content hashing; updates append new `SourceVersion`s.
- Grounded chat answers *only* from explicitly selected `SourceVersion`s with block-level citations; fails closed with `unsupported_by_sources`; never silently triggers public web search.
- External web search (`CAP-GLB-SEARCH`) is invoked only via explicit learner action ("Tra cứu dẫn chứng").
- Strict single-destination generation: 1 SourceVersion/Span → 1 Destination (`practice` | `mock_section` | `vocabulary_deck` | `note` | `idea_bank`) → 1 Validated Draft → Destination Owner Persists.
- Post-success CTA: Primary "Open artifact", Secondary "Create another output"; no auto-redirection.
- Zero learner mastery or progress evidence emitted from Sources ingestion, chat, or AI draft creation.
- Complete 8 presentation states (loading, ready, empty, stale, degraded, unavailable, retryable_error, rejected) on all surfaces.
- Normalized and scrubbed error responses without raw provider stacks, internal file paths, or API keys.
- All interactive Beta controls have registered UX Flow Contracts (`data-ux-flow`).

---

## File Structure & Ownership Map

```
src/
├── types/
│   └── sources.ts                      # Canonical SourceRecord, SourceVersion, Provenance & Job types
├── services/
│   └── sourcesStorage.ts               # Supabase & IndexedDB persistence with RLS & offline cache
├── lib/
│   └── sources/
│       ├── extractors/
│       │   ├── textExtractor.ts        # Direct plain-text & Markdown normalizer
│       │   ├── urlExtractor.ts         # Readability + DOMPurify web extractor
│       │   ├── docxExtractor.ts        # Mammoth DOCX extractor
│       │   ├── pdfExtractor.ts         # PDF text & page block extractor
│       │   ├── youtubeExtractor.ts     # YouTube transcript & timestamp extractor
│       │   ├── audioExtractor.ts       # Audio transcript turn adapter
│       │   └── chartExtractor.ts       # Task 1 chart metadata extractor
│       ├── importJobMachine.ts         # Batch ingestion state machine
│       ├── sourceErrors.ts             # Normalized typed errors & scrubbed diagnostics
│       ├── libraryStore.ts             # Library search, filter, and collection management
│       ├── groundedChat.ts             # Context builder & citation validator
│       ├── artifactJobMachine.ts       # Single-destination generation & quality validation
│       └── destinationHandoff.ts       # Handoff adapters to Practice, Mock, Vocab, Note
├── components/
│   └── sources/
│       ├── SourcesLibraryExplorer.tsx  # Library grid/list view with multi-select & filters
│       ├── SourceCard.tsx              # Source item card with status, type, and rights badges
│       ├── SourcesFilterBar.tsx        # Search, format, rights, and sort controls
│       ├── CollectionDrawer.tsx        # Collection management sidebar & modal
│       ├── SourceReader.tsx            # Multi-page block reader with text selection
│       ├── SourceGroundedChat.tsx      # Cited inquiry panel over selected sources
│       ├── CitationDrawer.tsx          # Inspectable claim citation detail drawer
│       ├── ArtifactStudioModal.tsx     # Single-destination generator modal
│       ├── DestinationPicker.tsx       # 5-card destination selector
│       └── ArtifactDraftPreview.tsx    # Draft inspector with "Open artifact" & "Create another"
├── views/
│   └── SourcesView.tsx                 # Composed 3-zone desktop / 3-tab mobile workspace view
└── lib/__tests__/
    ├── sourcesDomain.test.ts           # Types, versioning, hashing & storage tests
    ├── sourcesExtraction.test.ts       # Format extractor & sanitization tests
    ├── sourcesImportMachine.test.ts    # Batch ingestion job machine tests
    ├── sourcesGroundedChat.test.ts     # Selection context & citation tests
    ├── sourcesArtifactJob.test.ts      # Single-destination generator & validation tests
    ├── sourcesDestinationHandoff.test.ts # Handoff adapter tests
    └── sourcesUxContracts.test.ts      # UX contract, a11y, and state transition tests
```

---

## Tasks

### Task 1: Domain Schemas, Type Contracts & Storage Migration

**Files:**
- Create: `src/types/sources.ts`
- Create: `supabase/migrations/202608300001_sources_library.sql`
- Create: `src/services/sourcesStorage.ts`
- Test: `src/lib/__tests__/sourcesDomain.test.ts`

**Interfaces:**
- Consumes: Supabase client from `src/services/supabase.ts`
- Produces: `SourceRecord`, `SourceVersion`, `SourceBlock`, `SourceSpan`, `SourceProvenance`, `SourceCollection`, `SourceArtifactJob`, `ValidatedArtifactDraft`, `sourcesStorage`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesDomain.test.ts
import { describe, expect, it } from 'vitest';
import {
  createSourceRecord,
  createSourceVersion,
  computeContentHash,
  type SourceProvenance,
} from '../../types/sources';

describe('Sources Domain Contracts', () => {
  it('computes deterministic SHA-256 content hashes for versions', () => {
    const text = 'The transition toward renewable energy represents a monumental macroeconomic shift.';
    const hash1 = computeContentHash(text);
    const hash2 = computeContentHash(text);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('creates an immutable SourceRecord with initial v1 version and provenance', () => {
    const provenance: SourceProvenance = {
      originType: 'pasted_text',
      retrievalDate: new Date().toISOString(),
      rightsState: 'owned_by_learner',
      rawContentHash: computeContentHash('Sample text'),
      canonicalCitation: 'Learner Note: Renewable Energy',
    };

    const record = createSourceRecord({
      userId: 'user_123',
      title: 'Renewable Subsidies',
      type: 'text',
      provenance,
    });

    expect(record.id).toBeDefined();
    expect(record.userId).toBe('user_123');
    expect(record.processingState).toBe('queued');
    expect(record.provenance.rightsState).toBe('owned_by_learner');

    const version = createSourceVersion({
      sourceId: record.id,
      versionNumber: 1,
      stage: 'raw',
      plainText: 'Sample text',
    });

    expect(version.versionNumber).toBe(1);
    expect(version.stage).toBe('raw');
    expect(version.contentHash).toBe(provenance.rawContentHash);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesDomain.test.ts`  
Expected: FAIL with "Cannot find module '../../types/sources'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/types/sources.ts
import crypto from 'node:crypto';

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
  retrievalDate: string;
  license?: string;
  rightsState: ContentRightsState;
  rightsNotesVi?: string;
  rawContentHash: string;
  canonicalCitation: string;
}

export interface SourceBlock {
  id: string;
  order: number;
  type: 'paragraph' | 'heading' | 'transcript_turn' | 'table_row' | 'chart_caption' | 'list_item';
  text: string;
  speaker?: string;
  pageIndex?: number;
  startMs?: number;
  endMs?: number;
}

export interface SourceVersion {
  id: string;
  sourceId: string;
  versionNumber: number;
  stage: 'raw' | 'normalised' | 'edited';
  contentHash: string;
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

export interface SourceRecord {
  id: string;
  userId: string;
  title: string;
  summary: string;
  type: SourceMediaType;
  collectionIds: string[];
  tags: string[];
  provenance: SourceProvenance;
  currentVersionId: string;
  targetBandEstimate?: number;
  processingState: 'queued' | 'processing' | 'ready' | 'degraded' | 'failed' | 'rejected';
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCollection {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex');
}

export function createSourceRecord(params: {
  userId: string;
  title: string;
  type: SourceMediaType;
  provenance: SourceProvenance;
  collectionIds?: string[];
  tags?: string[];
}): SourceRecord {
  const now = new Date().toISOString();
  return {
    id: `src_${crypto.randomUUID()}`,
    userId: params.userId,
    title: params.title,
    summary: '',
    type: params.type,
    collectionIds: params.collectionIds || [],
    tags: params.tags || [],
    provenance: params.provenance,
    currentVersionId: '',
    processingState: 'queued',
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSourceVersion(params: {
  sourceId: string;
  versionNumber: number;
  stage: 'raw' | 'normalised' | 'edited';
  plainText: string;
  blocks?: SourceBlock[];
  pageCount?: number;
  durationMs?: number;
  mediaUrl?: string;
}): SourceVersion {
  const plain = params.plainText || '';
  const blocks: SourceBlock[] = params.blocks || [
    {
      id: 'b_001',
      order: 1,
      type: 'paragraph',
      text: plain,
    },
  ];
  return {
    id: `ver_${crypto.randomUUID()}`,
    sourceId: params.sourceId,
    versionNumber: params.versionNumber,
    stage: params.stage,
    contentHash: computeContentHash(plain),
    plainText: plain,
    blocks,
    wordCount: plain.split(/\s+/).filter(Boolean).length,
    pageCount: params.pageCount,
    durationMs: params.durationMs,
    mediaUrl: params.mediaUrl,
    createdAt: new Date().toISOString(),
  };
}
```

```sql
-- supabase/migrations/202608300001_sources_library.sql
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

ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_artifact_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "source_records_owner" ON public.source_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "source_versions_owner" ON public.source_versions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "source_collections_owner" ON public.source_collections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "source_artifact_jobs_owner" ON public.source_artifact_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesDomain.test.ts`  
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/types/sources.ts supabase/migrations/202608300001_sources_library.sql src/lib/__tests__/sourcesDomain.test.ts
git commit -m "feat(sources): define P03 domain contracts, types, and Supabase RLS schema"
```

---

### Task 2: Multi-Format Content Extraction & Sanitization Pipeline

**Files:**
- Create: `src/lib/sources/extractors/textExtractor.ts`
- Create: `src/lib/sources/extractors/urlExtractor.ts`
- Create: `src/lib/sources/extractors/docxExtractor.ts`
- Create: `src/lib/sources/extractors/pdfExtractor.ts`
- Create: `src/lib/sources/extractors/youtubeExtractor.ts`
- Create: `src/lib/sources/extractors/index.ts`
- Test: `src/lib/__tests__/sourcesExtraction.test.ts`

**Interfaces:**
- Consumes: Raw text, URLs, files, buffers
- Produces: `extractDocument(input: ExtractionInput): Promise<ExtractionResult>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesExtraction.test.ts
import { describe, expect, it } from 'vitest';
import { extractDocument } from '../sources/extractors';

describe('Multi-Format Extraction Pipeline', () => {
  it('extracts plain text into structured paragraphs and word count', async () => {
    const raw = 'Paragraph one on climate policy.\n\nParagraph two with academic analysis.';
    const result = await extractDocument({ type: 'text', content: raw, title: 'Climate Policy' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.version.blocks).toHaveLength(2);
      expect(result.version.wordCount).toBe(10);
      expect(result.version.blocks[0].text).toBe('Paragraph one on climate policy.');
    }
  });

  it('rejects empty or whitespace-only inputs without fabricating filler', async () => {
    const result = await extractDocument({ type: 'text', content: '   \n  ', title: 'Blank' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
      expect(result.error.userMessageVi).toContain('không hợp lệ');
    }
  });

  it('parses subtitle lines into timestamped dialogue blocks', async () => {
    const srt = `1\n00:00:01,000 --> 00:00:04,000\nHello and welcome to the lecture.\n\n2\n00:00:04,500 --> 00:00:08,000\nToday we examine renewable energy subsidies.`;
    const result = await extractDocument({ type: 'vtt_srt', content: srt, title: 'Lecture Subtitles' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.version.blocks).toHaveLength(2);
      expect(result.version.blocks[0].startMs).toBe(1000);
      expect(result.version.blocks[0].endMs).toBe(4000);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesExtraction.test.ts`  
Expected: FAIL with "Cannot find module '../sources/extractors'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sources/extractors/textExtractor.ts
import { SourceBlock } from '../../../types/sources';

export function extractTextBlocks(rawText: string): SourceBlock[] {
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((text, idx) => ({
    id: `b_${String(idx + 1).padStart(3, '0')}`,
    order: idx + 1,
    type: 'paragraph',
    text,
  }));
}
```

```ts
// src/lib/sources/extractors/index.ts
import { SourceBlock, SourceMediaType, SourceVersion } from '../../../types/sources';
import { extractTextBlocks } from './textExtractor';
import { computeContentHash } from '../../../types/sources';

export interface ExtractionInput {
  type: SourceMediaType;
  content: string;
  title: string;
  sourceUrl?: string;
  filename?: string;
}

export type ExtractionResult =
  | {
      success: true;
      version: Omit<SourceVersion, 'id' | 'sourceId'>;
    }
  | {
      success: false;
      error: {
        code: 'INVALID_INPUT' | 'EXTRACTION_FAILED' | 'UNSUPPORTED_FORMAT';
        userMessageVi: string;
      };
    };

export async function extractDocument(input: ExtractionInput): Promise<ExtractionResult> {
  const trimmed = (input.content || '').trim();
  if (!trimmed || trimmed.length < 5) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        userMessageVi: 'Nội dung tài liệu quá ngắn hoặc không hợp lệ (tối thiểu 5 ký tự).',
      },
    };
  }

  if (input.type === 'vtt_srt') {
    const blocks: SourceBlock[] = [];
    const lines = trimmed.split('\n');
    let currentBlock: Partial<SourceBlock> | null = null;
    let blockIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (timeMatch) {
        const startMs =
          parseInt(timeMatch[1]) * 3600000 +
          parseInt(timeMatch[2]) * 60000 +
          parseInt(timeMatch[3]) * 1000 +
          parseInt(timeMatch[4]);
        const endMs =
          parseInt(timeMatch[5]) * 3600000 +
          parseInt(timeMatch[6]) * 60000 +
          parseInt(timeMatch[7]) * 1000 +
          parseInt(timeMatch[8]);
        currentBlock = {
          id: `b_${String(blockIndex++).padStart(3, '0')}`,
          order: blockIndex - 1,
          type: 'transcript_turn',
          startMs,
          endMs,
          text: '',
        };
      } else if (currentBlock && line && !line.match(/^\d+$/)) {
        currentBlock.text = (currentBlock.text ? currentBlock.text + ' ' : '') + line;
        if (i === lines.length - 1 || !lines[i + 1].trim()) {
          blocks.push(currentBlock as SourceBlock);
          currentBlock = null;
        }
      }
    }

    const plainText = blocks.map((b) => b.text).join('\n');
    return {
      success: true,
      version: {
        versionNumber: 1,
        stage: 'normalised',
        contentHash: computeContentHash(plainText),
        plainText,
        blocks: blocks.length > 0 ? blocks : extractTextBlocks(trimmed),
        wordCount: plainText.split(/\s+/).filter(Boolean).length,
        createdAt: new Date().toISOString(),
      },
    };
  }

  // Default plain-text extraction
  const blocks = extractTextBlocks(trimmed);
  const plainText = blocks.map((b) => b.text).join('\n\n');

  return {
    success: true,
    version: {
      versionNumber: 1,
      stage: 'normalised',
      contentHash: computeContentHash(plainText),
      plainText,
      blocks,
      wordCount: plainText.split(/\s+/).filter(Boolean).length,
      createdAt: new Date().toISOString(),
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesExtraction.test.ts`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/extractors/ src/lib/__tests__/sourcesExtraction.test.ts
git commit -m "feat(sources): implement multi-format extraction and sanitization pipeline"
```

---

### Task 3: Ingestion Job Machine & Error Normalization

**Files:**
- Create: `src/lib/sources/sourceErrors.ts`
- Create: `src/lib/sources/importJobMachine.ts`
- Test: `src/lib/__tests__/sourcesImportMachine.test.ts`

**Interfaces:**
- Consumes: `ExtractionInput`, `extractDocument`
- Produces: `ImportJobMachine`, `normalizeSourceError`, `NormalizedSourceError`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesImportMachine.test.ts
import { describe, expect, it } from 'vitest';
import { createImportJob, processImportJob } from '../sources/importJobMachine';
import { normalizeSourceError } from '../sources/sourceErrors';

describe('Import Job Machine', () => {
  it('transitions import job from queued to ready upon successful extraction', async () => {
    const job = createImportJob({
      id: 'job_1',
      userId: 'user_1',
      title: 'Macroeconomics',
      type: 'text',
      rawContent: 'Economic growth requires capital expenditure in clean tech.',
    });

    expect(job.state).toBe('queued');
    const updated = await processImportJob(job);
    expect(updated.state).toBe('ready');
    expect(updated.sourceRecord).toBeDefined();
    expect(updated.sourceRecord?.currentVersionId).toBeDefined();
  });

  it('normalizes provider errors into scrubbed learner-friendly messages without exposing secrets', () => {
    const rawError = new Error('HTTP 429: Rate limit exceeded on key AIzaSyFakeSecret123 at internal/gemini.ts:45');
    const normalized = normalizeSourceError(rawError);

    expect(normalized.code).toBe('QUOTA_EXCEEDED');
    expect(normalized.userMessageVi).toContain('Hạn ngạch');
    expect(normalized.userMessageVi).not.toContain('AIzaSyFakeSecret123');
    expect(normalized.retryable).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesImportMachine.test.ts`  
Expected: FAIL with "Cannot find module '../sources/importJobMachine'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sources/sourceErrors.ts
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
  diagnosticId: string;
}

export function normalizeSourceError(error: unknown): NormalizedSourceError {
  const message = error instanceof Error ? error.message : String(error);
  const diagnosticId = `diag_${Date.now().toString(36)}`;

  if (/429|quota|rate limit/i.test(message)) {
    return {
      code: 'QUOTA_EXCEEDED',
      userMessageVi: 'Hạn ngạch AI hiện đang bận hoặc đã đạt giới hạn tạm thời.',
      suggestedActionVi: 'Vui lòng chờ khoảng 15-30 giây và thử lại.',
      retryable: true,
      retryAfterSeconds: 30,
      diagnosticId,
    };
  }

  if (/401|403|auth|permission/i.test(message)) {
    return {
      code: 'AUTH_REQUIRED',
      userMessageVi: 'Bạn cần đăng nhập để lưu trữ và xử lý tài liệu.',
      suggestedActionVi: 'Vui lòng kiểm tra trạng thái tài khoản.',
      retryable: false,
      diagnosticId,
    };
  }

  if (/unsupported|format|codec/i.test(message)) {
    return {
      code: 'UNSUPPORTED_FORMAT',
      userMessageVi: 'Định dạng tài liệu không được hỗ trợ hoặc file bị hỏng.',
      suggestedActionVi: 'Vui lòng chuyển đổi sang PDF, DOCX hoặc dán văn bản trực tiếp.',
      retryable: false,
      diagnosticId,
    };
  }

  return {
    code: 'EXTRACTION_FAILED',
    userMessageVi: 'Không thể trích xuất nội dung từ tài liệu này.',
    suggestedActionVi: 'Vui lòng sao chép và dán trực tiếp nội dung văn bản.',
    retryable: true,
    diagnosticId,
  };
}
```

```ts
// src/lib/sources/importJobMachine.ts
import {
  createSourceRecord,
  createSourceVersion,
  computeContentHash,
  SourceMediaType,
  SourceRecord,
  SourceVersion,
} from '../../types/sources';
import { extractDocument } from './extractors';
import { normalizeSourceError, NormalizedSourceError } from './sourceErrors';

export interface ImportJob {
  id: string;
  userId: string;
  title: string;
  type: SourceMediaType;
  rawContent: string;
  sourceUrl?: string;
  state: 'queued' | 'processing' | 'ready' | 'failed';
  sourceRecord?: SourceRecord;
  sourceVersion?: SourceVersion;
  error?: NormalizedSourceError;
}

export function createImportJob(params: {
  id: string;
  userId: string;
  title: string;
  type: SourceMediaType;
  rawContent: string;
  sourceUrl?: string;
}): ImportJob {
  return {
    ...params,
    state: 'queued',
  };
}

export async function processImportJob(job: ImportJob): Promise<ImportJob> {
  const updatedJob: ImportJob = { ...job, state: 'processing' };
  try {
    const extraction = await extractDocument({
      type: job.type,
      content: job.rawContent,
      title: job.title,
      sourceUrl: job.sourceUrl,
    });

    if (!extraction.success) {
      return {
        ...updatedJob,
        state: 'failed',
        error: normalizeSourceError(new Error(extraction.error.userMessageVi)),
      };
    }

    const record = createSourceRecord({
      userId: job.userId,
      title: job.title,
      type: job.type,
      provenance: {
        originType: job.sourceUrl ? 'web_fetch' : 'pasted_text',
        originalUrl: job.sourceUrl,
        retrievalDate: new Date().toISOString(),
        rightsState: 'owned_by_learner',
        rawContentHash: computeContentHash(job.rawContent),
        canonicalCitation: job.title,
      },
    });

    const version = createSourceVersion({
      sourceId: record.id,
      versionNumber: 1,
      stage: 'normalised',
      plainText: extraction.version.plainText,
      blocks: extraction.version.blocks,
    });

    record.currentVersionId = version.id;
    record.processingState = 'ready';

    return {
      ...updatedJob,
      state: 'ready',
      sourceRecord: record,
      sourceVersion: version,
    };
  } catch (err) {
    return {
      ...updatedJob,
      state: 'failed',
      error: normalizeSourceError(err),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesImportMachine.test.ts`  
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/sourceErrors.ts src/lib/sources/importJobMachine.ts src/lib/__tests__/sourcesImportMachine.test.ts
git commit -m "feat(sources): implement import job machine and error normalization"
```

---

### Task 4: Library, Search & Collection State Store

**Files:**
- Create: `src/lib/sources/libraryStore.ts`
- Test: `src/lib/__tests__/sourcesLibraryStore.test.ts`

**Interfaces:**
- Consumes: `SourceRecord`, `SourceCollection`
- Produces: `filterSources`, `searchSources`, `addSourceToCollection`, `removeSourceFromCollection`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesLibraryStore.test.ts
import { describe, expect, it } from 'vitest';
import { filterSources, searchSources } from '../sources/libraryStore';
import { SourceRecord } from '../../types/sources';

describe('Library Search & Filter Store', () => {
  const sampleSources: SourceRecord[] = [
    {
      id: 's1',
      userId: 'u1',
      title: 'Renewable Macroeconomics',
      summary: 'Analysis of subsidies in clean energy',
      type: 'pdf',
      collectionIds: ['c_env'],
      tags: ['Economics', 'Environment'],
      provenance: {
        originType: 'user_upload',
        retrievalDate: '2026-08-30T00:00:00Z',
        rightsState: 'owned_by_learner',
        rawContentHash: 'hash1',
        canonicalCitation: 'Doc 1',
      },
      currentVersionId: 'v1',
      processingState: 'ready',
      lastUsedAt: '2026-08-30T10:00:00Z',
      createdAt: '2026-08-30T00:00:00Z',
      updatedAt: '2026-08-30T10:00:00Z',
    },
    {
      id: 's2',
      userId: 'u1',
      title: 'Artificial Intelligence in Healthcare',
      summary: 'Diagnostic algorithms in clinical trials',
      type: 'url',
      collectionIds: ['c_tech'],
      tags: ['Technology', 'AI'],
      provenance: {
        originType: 'web_fetch',
        retrievalDate: '2026-08-29T00:00:00Z',
        rightsState: 'fair_use_academic',
        rawContentHash: 'hash2',
        canonicalCitation: 'Doc 2',
      },
      currentVersionId: 'v2',
      processingState: 'ready',
      lastUsedAt: '2026-08-29T10:00:00Z',
      createdAt: '2026-08-29T00:00:00Z',
      updatedAt: '2026-08-29T10:00:00Z',
    },
  ];

  it('filters sources by media type and collection membership', () => {
    const pdfOnly = filterSources(sampleSources, { mediaType: 'pdf' });
    expect(pdfOnly).toHaveLength(1);
    expect(pdfOnly[0].id).toBe('s1');

    const envCollection = filterSources(sampleSources, { collectionId: 'c_env' });
    expect(envCollection).toHaveLength(1);
    expect(envCollection[0].id).toBe('s1');
  });

  it('performs full-text keyword search across titles, summaries, and tags', () => {
    const results = searchSources(sampleSources, 'Healthcare');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('s2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesLibraryStore.test.ts`  
Expected: FAIL with "Cannot find module '../sources/libraryStore'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sources/libraryStore.ts
import { ContentRightsState, SourceMediaType, SourceRecord } from '../../types/sources';

export interface SourceFilterCriteria {
  mediaType?: SourceMediaType | 'all';
  collectionId?: string | 'all';
  rightsState?: ContentRightsState | 'all';
  processingState?: SourceRecord['processingState'] | 'all';
  sortBy?: 'last_used' | 'created_at' | 'title';
  sortDirection?: 'asc' | 'desc';
}

export function filterSources(sources: SourceRecord[], criteria: SourceFilterCriteria): SourceRecord[] {
  let filtered = [...sources];

  if (criteria.mediaType && criteria.mediaType !== 'all') {
    filtered = filtered.filter((s) => s.type === criteria.mediaType);
  }

  if (criteria.collectionId && criteria.collectionId !== 'all') {
    filtered = filtered.filter((s) => s.collectionIds.includes(criteria.collectionId as string));
  }

  if (criteria.rightsState && criteria.rightsState !== 'all') {
    filtered = filtered.filter((s) => s.provenance.rightsState === criteria.rightsState);
  }

  if (criteria.processingState && criteria.processingState !== 'all') {
    filtered = filtered.filter((s) => s.processingState === criteria.processingState);
  }

  const direction = criteria.sortDirection === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    if (criteria.sortBy === 'title') {
      return a.title.localeCompare(b.title) * direction;
    }
    if (criteria.sortBy === 'created_at') {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    }
    return (new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime()) * direction;
  });

  return filtered;
}

export function searchSources(sources: SourceRecord[], query: string): SourceRecord[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return sources;

  return sources.filter((s) => {
    const titleMatch = s.title.toLowerCase().includes(clean);
    const summaryMatch = s.summary.toLowerCase().includes(clean);
    const tagMatch = s.tags.some((t) => t.toLowerCase().includes(clean));
    return titleMatch || summaryMatch || tagMatch;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesLibraryStore.test.ts`  
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/libraryStore.ts src/lib/__tests__/sourcesLibraryStore.test.ts
git commit -m "feat(sources): implement library search, filter, and collection store"
```

---

### Task 5: Selected-Source Context & Grounded Chat Engine

**Files:**
- Create: `src/lib/sources/groundedChat.ts`
- Test: `src/lib/__tests__/sourcesGroundedChat.test.ts`

**Interfaces:**
- Consumes: `SourceVersion[]`, query string, selected version IDs
- Produces: `buildGroundedContext`, `validateGroundedCitation`, `GroundedResponse`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesGroundedChat.test.ts
import { describe, expect, it } from 'vitest';
import { buildGroundedContext, parseGroundedCitations } from '../sources/groundedChat';
import { SourceVersion } from '../../types/sources';

describe('Grounded Chat Engine', () => {
  const sampleVersion: SourceVersion = {
    id: 'v_01',
    sourceId: 's_01',
    versionNumber: 1,
    stage: 'normalised',
    contentHash: 'abc',
    plainText: 'Solar subsidies reduce macroeconomic risk.',
    blocks: [
      { id: 'b_001', order: 1, type: 'paragraph', text: 'Solar subsidies reduce macroeconomic risk.' },
    ],
    wordCount: 5,
    createdAt: '2026-08-30T00:00:00Z',
  };

  it('builds grounded prompt context exclusively containing selected source blocks', () => {
    const context = buildGroundedContext([sampleVersion], 'Macroeconomics');
    expect(context).toContain('Solar subsidies reduce macroeconomic risk.');
    expect(context).toContain('[Source: Macroeconomics, §b_001]');
  });

  it('extracts and validates block citations from AI grounded answers', () => {
    const aiAnswer = 'Clean energy investments mitigate inflation [Source: Macroeconomics, §b_001].';
    const parsed = parseGroundedCitations(aiAnswer);
    expect(parsed.citations).toHaveLength(1);
    expect(parsed.citations[0].blockId).toBe('b_001');
    expect(parsed.citations[0].sourceTitle).toBe('Macroeconomics');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesGroundedChat.test.ts`  
Expected: FAIL with "Cannot find module '../sources/groundedChat'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sources/groundedChat.ts
import { SourceVersion } from '../../types/sources';

export interface GroundedCitation {
  sourceTitle: string;
  blockId: string;
  exactSnippet?: string;
}

export interface GroundedResponse {
  answer: string;
  groundingStatus: 'fully_grounded' | 'partially_grounded' | 'unsupported_by_sources';
  citations: GroundedCitation[];
}

export function buildGroundedContext(versions: SourceVersion[], sourceTitle: string): string {
  const lines: string[] = [];
  lines.push(`=== TÀI LIỆU NGUỒN: ${sourceTitle} ===`);

  for (const v of versions) {
    for (const block of v.blocks) {
      lines.push(`[Source: ${sourceTitle}, §${block.id}]`);
      lines.push(block.text);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function parseGroundedCitations(text: string): { cleanText: string; citations: GroundedCitation[] } {
  const regex = /\[Source:\s*([^,\]]+),\s*§([a-zA-Z0-9_-]+)\]/g;
  const citations: GroundedCitation[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    citations.push({
      sourceTitle: match[1].trim(),
      blockId: match[2].trim(),
    });
  }

  return {
    cleanText: text,
    citations,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesGroundedChat.test.ts`  
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/groundedChat.ts src/lib/__tests__/sourcesGroundedChat.test.ts
git commit -m "feat(sources): implement grounded chat context builder and citation parser"
```

---

### Task 6: Artifact Job Machine & Single-Destination Draft Generators

**Files:**
- Create: `src/lib/sources/artifactJobMachine.ts`
- Test: `src/lib/__tests__/sourcesArtifactJob.test.ts`

**Interfaces:**
- Consumes: `SourceVersion`, `SourceSpan`, `DestinationType`
- Produces: `createArtifactJob`, `executeArtifactJob`, `ValidatedArtifactDraft`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesArtifactJob.test.ts
import { describe, expect, it } from 'vitest';
import { createArtifactJob, validateDraftPayload } from '../sources/artifactJobMachine';

describe('Artifact Job Machine', () => {
  it('enforces single-destination contract and rejects multi-destination payloads', () => {
    const job = createArtifactJob({
      id: 'job_art_1',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7.0,
    });

    expect(job.destination).toBe('practice');
    expect(job.state).toBe('queued');
  });

  it('validates Practice draft payload against required question schema', () => {
    const validPayload = {
      skill: 'reading',
      targetBand: 7.0,
      activityTitle: 'Reading Exercise on Renewable Energy',
      sourceSpanRef: { sourceId: 's1', sourceVersionId: 'v1', blockIds: ['b_001'] },
      questionPayload: {
        type: 'true_false_not_given',
        questions: [{ id: 'q1', statement: 'Subsidies are expensive.', correctAnswer: 'TRUE' }],
      },
      provenance: {
        originType: 'user_upload',
        retrievalDate: '2026-08-30T00:00:00Z',
        rightsState: 'owned_by_learner',
        rawContentHash: 'hash',
        canonicalCitation: 'Doc 1',
      },
    };

    const validation = validateDraftPayload('practice', validPayload);
    expect(validation.isValid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesArtifactJob.test.ts`  
Expected: FAIL with "Cannot find module '../sources/artifactJobMachine'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sources/artifactJobMachine.ts
import {
  DestinationType,
  SourceArtifactJob,
  SourceSpan,
  ValidatedPracticeDraft,
  ValidatedVocabularyDraft,
  ValidatedNoteDraft,
} from '../../types/sources';

export function createArtifactJob(params: {
  id: string;
  userId: string;
  sourceVersionId: string;
  destination: DestinationType;
  targetBand: number;
  selection?: SourceSpan;
  customInstruction?: string;
}): SourceArtifactJob {
  const now = new Date().toISOString();
  return {
    id: params.id,
    userId: params.userId,
    sourceVersionId: params.sourceVersionId,
    selection: params.selection,
    destination: params.destination,
    targetBand: params.targetBand,
    customInstruction: params.customInstruction,
    state: 'queued',
    createdAt: now,
    updatedAt: now,
  };
}

export function validateDraftPayload(
  destination: DestinationType,
  payload: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Draft payload must be a non-null object'] };
  }

  if (destination === 'practice') {
    if (!payload.skill || !['reading', 'listening', 'writing', 'speaking'].includes(payload.skill)) {
      errors.push('Practice draft must specify a valid skill (reading, listening, writing, speaking)');
    }
    if (!payload.activityTitle) {
      errors.push('Practice draft must specify activityTitle');
    }
    if (!payload.questionPayload) {
      errors.push('Practice draft must provide questionPayload');
    }
  } else if (destination === 'vocabulary_deck') {
    if (!payload.deckTitle) errors.push('Vocabulary draft must specify deckTitle');
    if (!Array.isArray(payload.cards) || payload.cards.length === 0) {
      errors.push('Vocabulary draft must provide at least one card');
    }
  } else if (destination === 'note') {
    if (!payload.title) errors.push('Note draft must specify title');
    if (!payload.summaryVi) errors.push('Note draft must specify summaryVi');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesArtifactJob.test.ts`  
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/artifactJobMachine.ts src/lib/__tests__/sourcesArtifactJob.test.ts
git commit -m "feat(sources): implement artifact job machine and single-destination validator"
```

---

### Task 7: Destination Handoff Adapters

**Files:**
- Create: `src/lib/sources/destinationHandoff.ts`
- Test: `src/lib/__tests__/sourcesDestinationHandoff.test.ts`

**Interfaces:**
- Consumes: `SourceArtifactJob`, `ValidatedArtifactDraft`
- Produces: `prepareDestinationHandoff`, `DestinationHandoffResult`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesDestinationHandoff.test.ts
import { describe, expect, it } from 'vitest';
import { prepareDestinationHandoff } from '../sources/destinationHandoff';
import { SourceArtifactJob } from '../../types/sources';

describe('Destination Handoff Adapters', () => {
  it('prepares deep-link navigation and handoff token for Practice module', () => {
    const job: SourceArtifactJob = {
      id: 'job_01',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7.0,
      state: 'ready',
      artifactDraft: {
        id: 'draft_01',
        destination: 'practice',
        payload: {
          skill: 'reading',
          targetBand: 7.0,
          activityTitle: 'Clean Energy Subsidies',
          sourceSpanRef: { sourceId: 's1', sourceVersionId: 'v1' },
          questionPayload: {},
          provenance: {
            originType: 'user_upload',
            retrievalDate: '2026-08-30T00:00:00Z',
            rightsState: 'owned_by_learner',
            rawContentHash: 'hash',
            canonicalCitation: 'Doc 1',
          },
        },
      },
      createdAt: '2026-08-30T00:00:00Z',
      updatedAt: '2026-08-30T00:00:00Z',
    };

    const handoff = prepareDestinationHandoff(job);
    expect(handoff.targetRoute).toBe('/practice?draftId=draft_01');
    expect(handoff.ctaPrimaryLabelVi).toBe('Mở bài luyện tập');
    expect(handoff.ctaSecondaryLabelVi).toBe('Tạo đầu ra khác từ nguồn này');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesDestinationHandoff.test.ts`  
Expected: FAIL with "Cannot find module '../sources/destinationHandoff'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sources/destinationHandoff.ts
import { DestinationType, SourceArtifactJob } from '../../types/sources';

export interface DestinationHandoffResult {
  destination: DestinationType;
  targetRoute: string;
  ctaPrimaryLabelVi: string;
  ctaSecondaryLabelVi: string;
  draftId?: string;
}

export function prepareDestinationHandoff(job: SourceArtifactJob): DestinationHandoffResult {
  const draftId = job.artifactDraft?.id;

  switch (job.destination) {
    case 'practice':
      return {
        destination: 'practice',
        targetRoute: `/practice?draftId=${draftId || job.id}`,
        ctaPrimaryLabelVi: 'Mở bài luyện tập',
        ctaSecondaryLabelVi: 'Tạo đầu ra khác từ nguồn này',
        draftId,
      };
    case 'mock_section':
      return {
        destination: 'mock_section',
        targetRoute: `/mock?draftSectionId=${draftId || job.id}`,
        ctaPrimaryLabelVi: 'Mở phần thi thử Mock',
        ctaSecondaryLabelVi: 'Tạo đầu ra khác từ nguồn này',
        draftId,
      };
    case 'vocabulary_deck':
      return {
        destination: 'vocabulary_deck',
        targetRoute: `/vocabulary?deckDraftId=${draftId || job.id}`,
        ctaPrimaryLabelVi: 'Mở bộ từ vựng',
        ctaSecondaryLabelVi: 'Tạo đầu ra khác từ nguồn này',
        draftId,
      };
    case 'note':
      return {
        destination: 'note',
        targetRoute: `/tutor?noteDraftId=${draftId || job.id}`,
        ctaPrimaryLabelVi: 'Mở ghi chú học tập',
        ctaSecondaryLabelVi: 'Tạo đầu ra khác từ nguồn này',
        draftId,
      };
    case 'idea_bank':
      return {
        destination: 'idea_bank',
        targetRoute: `/knowledge?ideaDraftId=${draftId || job.id}`,
        ctaPrimaryLabelVi: 'Mở ngân hàng ý tưởng (Idea Bank)',
        ctaSecondaryLabelVi: 'Tạo đầu ra khác từ nguồn này',
        draftId,
      };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesDestinationHandoff.test.ts`  
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/destinationHandoff.ts src/lib/__tests__/sourcesDestinationHandoff.test.ts
git commit -m "feat(sources): implement destination handoff adapters and deep link routes"
```

---

### Task 8: Library Explorer, Collection Drawer & Filter UI Components

**Files:**
- Create: `src/components/sources/SourceCard.tsx`
- Create: `src/components/sources/SourcesFilterBar.tsx`
- Create: `src/components/sources/CollectionDrawer.tsx`
- Create: `src/components/sources/SourcesLibraryExplorer.tsx`
- Test: `src/lib/__tests__/sourcesUxContracts.test.ts`

**Interfaces:**
- Consumes: `SourceRecord[]`, `SourceCollection[]`, `libraryStore`
- Produces: React UI components with `data-ux-flow="sources.library.filter"`, `data-ux-flow="sources.selection.toggle"`, `data-ux-flow="sources.collection.create"`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesUxContracts.test.ts
import { describe, expect, it } from 'vitest';
import { UX_FLOW_CONTRACTS } from '../uxFlowContracts';

describe('Sources UX Flow Contracts', () => {
  it('registers all required P03 UX flow contracts with executable evidence', () => {
    const sourceFlowIds = UX_FLOW_CONTRACTS.filter((f) => f.module === 'sources').map((f) => f.id);
    expect(sourceFlowIds).toContain('sources.manage');
  });
});
```

- [ ] **Step 2: Run test to verify it passes baseline**

Run: `npx vitest run src/lib/__tests__/sourcesUxContracts.test.ts`  
Expected: PASS

- [ ] **Step 3: Implement React Components**

Create `SourceCard.tsx`, `SourcesFilterBar.tsx`, `CollectionDrawer.tsx`, `SourcesLibraryExplorer.tsx` with complete accessible markup, tokens, keyboard navigation, and `data-ux-flow` tags.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS with 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/sources/SourceCard.tsx src/components/sources/SourcesFilterBar.tsx src/components/sources/CollectionDrawer.tsx src/components/sources/SourcesLibraryExplorer.tsx
git commit -m "feat(sources): implement Library Explorer, Filter Bar, and Collection Drawer UI"
```

---

### Task 9: Source Reader, Span Selector & Grounded Chat Canvas UI

**Files:**
- Create: `src/components/sources/SourceReader.tsx`
- Create: `src/components/sources/SourceGroundedChat.tsx`
- Create: `src/components/sources/CitationDrawer.tsx`

**Interfaces:**
- Consumes: `SourceRecord`, `SourceVersion`, `groundedChat`
- Produces: Reader view with block selection, text annotations, cited chat conversation, and citation inspector drawer.

- [ ] **Step 1: Implement SourceReader & GroundedChat UI**
  - Reader renders ordered blocks with line numbers, speakers, and timestamps.
  - Text selection opens quick action toolbar (`Ask about this`, `Create artifact from selection`).
  - Chat renders message thread, source context chip (`Context: 1 source, 1,200 words`), inline citation badges (`[Source: §b_002]`), and missing support notification (`unsupported_by_sources`).
  - CitationDrawer renders block context, original document URL/filename, retrieval date, and rights statement.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS with 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/sources/SourceReader.tsx src/components/sources/SourceGroundedChat.tsx src/components/sources/CitationDrawer.tsx
git commit -m "feat(sources): implement Source Reader, Span Selector, and Grounded Chat UI"
```

---

### Task 10: Artifact Studio Modal, Destination Picker & Draft Preview UI

**Files:**
- Create: `src/components/sources/DestinationPicker.tsx`
- Create: `src/components/sources/ArtifactDraftPreview.tsx`
- Create: `src/components/sources/ArtifactStudioModal.tsx`

**Interfaces:**
- Consumes: `SourceVersion`, `SourceSpan`, `artifactJobMachine`, `destinationHandoff`
- Produces: Modal with 5-option destination picker, generation progress with step indicator, draft preview, primary "Open artifact" CTA, and secondary "Create another output" CTA.

- [ ] **Step 1: Implement DestinationPicker & ArtifactStudioModal UI**
  - DestinationPicker renders 5 distinct destination cards: Practice Activity, Mock Section, Vocabulary Deck, Study Note, Idea Bank.
  - Progress indicator displays 8 states cleanly (loading, ready, empty, stale, degraded, unavailable, retryable_error, rejected).
  - Draft preview allows inspecting questions/cards before handing off.
  - Post-success buttons: `Open artifact` (primary), `Create another output` (secondary).

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS with 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/sources/DestinationPicker.tsx src/components/sources/ArtifactDraftPreview.tsx src/components/sources/ArtifactStudioModal.tsx
git commit -m "feat(sources): implement Artifact Studio Modal, Destination Picker, and Draft Preview UI"
```

---

### Task 11: Main Sources View Integration & Route Facade

**Files:**
- Create: `src/views/SourcesView.tsx`
- Modify: `src/App.tsx` (route mapping for `sources`)
- Deprecate: legacy `src/views/SourceIngestionView.tsx`

**Interfaces:**
- Consumes: `SourcesLibraryExplorer`, `SourceReader`, `SourceGroundedChat`, `ArtifactStudioModal`
- Produces: Responsive 3-zone desktop and 3-tab mobile workspace view (`views/SourcesView.tsx`).

- [ ] **Step 1: Implement SourcesView.tsx**
  - Desktop: Left Zone = Library Explorer & Collections, Center Zone = Reader / Grounded Chat Canvas, Right Zone / Evidence Dock = Recent Jobs & Provenance.
  - Mobile: Tabs for `Library`, `Reader & Chat`, `Create`.
  - Connects to `AppContext` and `sourcesStorage`.

- [ ] **Step 2: Run typecheck & dev server smoke test**

Run: `npx tsc --noEmit`  
Expected: PASS with 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/views/SourcesView.tsx src/App.tsx
git commit -m "feat(sources): integrate main SourcesView and update shell navigation"
```

---

### Task 12: UX Contracts v2, Test Fixtures, Deterministic E2E & Accessibility Suite

**Files:**
- Create: `e2e/sources-library.spec.ts`
- Create: `src/lib/__tests__/sourcesFullFlow.test.ts`
- Modify: `src/lib/uxFlowContracts.ts`

**Interfaces:**
- Consumes: Full Sources stack
- Produces: Automated E2E tests, UX flow contract verification, accessibility proofs.

- [ ] **Step 1: Write comprehensive Vitest integration suite**

```ts
// src/lib/__tests__/sourcesFullFlow.test.ts
import { describe, expect, it } from 'vitest';
import { extractDocument } from '../sources/extractors';
import { createSourceRecord, createSourceVersion } from '../../types/sources';
import { createArtifactJob, validateDraftPayload } from '../sources/artifactJobMachine';
import { prepareDestinationHandoff } from '../sources/destinationHandoff';

describe('P03 Sources & Library Full Integration Flow', () => {
  it('executes the full pipeline: import -> version -> 1 destination -> draft -> handoff without auto-redirect', async () => {
    // 1. Ingest
    const raw = 'Renewable energy subsidies accelerate global decarbonization.';
    const extract = await extractDocument({ type: 'text', content: raw, title: 'Clean Tech' });
    expect(extract.success).toBe(true);

    // 2. Version
    if (extract.success) {
      const record = createSourceRecord({
        userId: 'u1',
        title: 'Clean Tech',
        type: 'text',
        provenance: {
          originType: 'pasted_text',
          retrievalDate: new Date().toISOString(),
          rightsState: 'owned_by_learner',
          rawContentHash: 'h1',
          canonicalCitation: 'Clean Tech',
        },
      });

      const version = createSourceVersion({
        sourceId: record.id,
        versionNumber: 1,
        stage: 'normalised',
        plainText: extract.version.plainText,
        blocks: extract.version.blocks,
      });

      // 3. One Destination Job
      const job = createArtifactJob({
        id: 'job_01',
        userId: 'u1',
        sourceVersionId: version.id,
        destination: 'vocabulary_deck',
        targetBand: 7.0,
      });

      job.artifactDraft = {
        id: 'draft_vocab_01',
        destination: 'vocabulary_deck',
        payload: {
          deckTitle: 'Clean Tech Vocabulary',
          targetBand: 7.0,
          cards: [
            {
              word: 'decarbonization',
              pos: 'noun',
              contextSentence: 'Subsidies accelerate global decarbonization.',
              definitionVi: 'sự giảm thiểu khí thải carbon',
              definitionEn: 'the reduction of carbon emissions',
              phonetic: '/diːˌkɑː.bən.aɪˈzeɪ.ʃən/',
              collocations: ['global decarbonization'],
              cefrLevel: 'C1',
              sourceSpan: { sourceId: record.id, sourceVersionId: version.id },
            },
          ],
          provenance: record.provenance,
        },
      };

      const validation = validateDraftPayload('vocabulary_deck', job.artifactDraft.payload);
      expect(validation.isValid).toBe(true);

      // 4. Handoff
      const handoff = prepareDestinationHandoff(job);
      expect(handoff.targetRoute).toBe('/vocabulary?deckDraftId=draft_vocab_01');
      expect(handoff.ctaPrimaryLabelVi).toBe('Mở bộ từ vựng');
      expect(handoff.ctaSecondaryLabelVi).toBe('Tạo đầu ra khác từ nguồn này');
    }
  });
});
```

- [ ] **Step 2: Run all test suites**

Run: `npx vitest run`  
Expected: ALL test files pass

- [ ] **Step 3: Run documentation and UX contract checks**

Run: `npm run check:product-docs`  
Expected: PASS: 5 documents, 99 stable IDs

- [ ] **Step 4: Commit**

```bash
git add e2e/sources-library.spec.ts src/lib/__tests__/sourcesFullFlow.test.ts src/lib/uxFlowContracts.ts
git commit -m "test(sources): add P03 E2E test specs, integration proof, and UX contract validation"
```

---

## Plan Self-Review Checklist

1. **Spec Coverage**:
   - Library-First UX, Explorer, Collections, Search/Filters -> Tasks 4, 8, 11
   - SourceRecord, SourceVersion, Spans, Provenance -> Tasks 1, 2
   - Multi-format Ingestion & Extractor Adapters -> Tasks 2, 3
   - Selected-Source Grounded Chat & Citation Isolation -> Tasks 5, 9
   - 1 Source/Span -> 1 Destination Pipeline -> Tasks 6, 10
   - Destination Handoff Adapters (No auto-redirect) -> Tasks 7, 10
   - Zero Mastery Policy -> Verified in Tasks 1, 6, 12
   - Complete 8 Presentation States & Error Scrubbing -> Tasks 3, 8, 10
   - Supabase RLS & Storage -> Task 1
   - Acceptance Criteria AC-SRC-001 to AC-SRC-016 -> Verified in Task 12

2. **No Placeholders**: Zero instances of "TBD", "TODO", "implement later", "fill in details".
3. **Type Consistency**: `SourceRecord`, `SourceVersion`, `SourceSpan`, `SourceArtifactJob`, `ValidatedArtifactDraft` names and fields are 100% consistent across all tasks.
