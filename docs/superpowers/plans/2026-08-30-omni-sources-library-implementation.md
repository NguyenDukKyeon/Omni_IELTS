# Sources & Library (P03) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the OMNI Sources & Library module into a Library-First, multi-source learning workspace with immutable versioning, span-level provenance, strict selected-source grounded chat, and a single-destination artifact generation pipeline (`1 SourceVersion/Span → 1 Chosen Destination → 1 Validated Draft → Destination Owner Persists`).

**Architecture:** Domain contracts and Supabase RLS isolate private learner documents. P03 extraction covers pasted text/Markdown, article URL, text-layer PDF, DOCX, and VTT/SRT only. YouTube, audio, and Task 1 chart inputs create `handoff_required` / `unavailable` reference records owned later by P04 or P07. `ImportJobMachine` manages parallel ingestion. `LibraryStore` manages search, filters, and collections. Grounded Chat is `POST /api/sources/grounded-chat` through the existing central AI router. `ArtifactJobMachine` generates one validated destination draft. Destination handoff adapters deliver drafts without creating learner mastery. Route cut-over is gated by `sources_library_v2`.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS v4, Lucide React, existing `@supabase/supabase-js`, existing `zod`, existing `xstate`, Vitest 3.2, Playwright. New packages only after Task 0 (Readability, jsdom, DOMPurify, pdf-parse, mammoth). Dexie is not added.

**Spec:** `docs/superpowers/specs/2026-08-30-omni-sources-library-design.md`

**ADR:** `docs/architecture/adr/2026-08-30-sources-library-domain-and-destination-boundary.md`

**Coding epic gate:** Do not start Tasks 1–12 until P02 is merged into `origin/main` and Product Owner approves this corrected plan.

## Global Constraints

- Library-first UX is the default landing view when `sources_library_v2` is ON; no automatic multi-artifact generation on import.
- Feature flag `sources_library_v2` / env `OMNI_SOURCES_LIBRARY_V2` defaults OFF. `sources` keeps rendering `SourceIngestionView` until the flag is ON. Rollback is flag OFF in one deploy. Keep the legacy view as a one-release facade; do not delete it in this epic.
- P03 extraction input is only: pasted text/Markdown, article URL extraction, text-layer PDF, DOCX, VTT/SRT captions.
- P03 must not implement YouTube caption retrieval, yt-dlp, `youtube-transcript` usage, audio download, audio transcription, waveform, media playback, or MediaSession ownership (P04).
- P03 must not implement IELTS Task 1 chart/image parsing or rendering (P07).
- For YouTube/audio/chart inputs, create a reference record with `unavailable` / `handoff_required` and direct the learner to the owning module. Do not claim extraction or transcription.
- Immutable source versioning with SHA-256 content hashing; updates append new `SourceVersion`s.
- Grounded chat answers only from explicitly selected `SourceVersion`s with block-level citations; fails closed with `unsupported_by_sources`; never silently triggers public web search; uses existing `GroundedProviderRouter` / `CAP-GLB-AI-ROUTER`; never `AI_TASK_PROFILES.grounded` (search tools).
- External web search (`CAP-GLB-SEARCH`) is invoked only via explicit learner action ("Tra cứu dẫn chứng") on `POST /api/sources/web-research`.
- Strict single-destination generation: 1 SourceVersion/Span → 1 Destination (`practice` | `mock_section` | `vocabulary_deck` | `note` | `idea_bank`) → 1 Validated Draft → Destination Owner Persists.
- Post-success CTA: Primary "Open artifact", Secondary "Create another output"; no auto-redirection.
- Zero learner mastery, XP, vocabulary cards, progress evidence, or four-skill package generation from Sources ingestion, chat, or AI draft creation.
- Complete 8 presentation states (loading, ready, empty, stale, degraded, unavailable, retryable_error, rejected) on all surfaces.
- Normalized and scrubbed error responses without raw provider stacks, `HTTP 429`, internal file paths, or API keys.
- All interactive Beta controls have registered UX Flow Contracts (`data-ux-flow`) **and** unique literal `data-ux-control` IDs inside `data-ux-scope="sources-library-v2"` (UX Contract v2 evidence).
- No public/paid Private Web Bridge dependency.
- No unpinned or speculative npm dependencies. Package-lock-only installs after Task 0.
- Do not invent or rename PRD, NFR, CAP, METRIC, or GUARD IDs.
- No fake transcript, citation, score, mastery, or "real exam" / "Đề thi thật" claim.

---

## File Structure & Ownership Map

```
src/
├── types/
│   └── sources.ts                         # Canonical SourceRecord, SourceVersion, Provenance & Job types
├── services/
│   └── sourcesStorage.ts                  # Supabase persistence with RLS; native IndexedDB/in-memory cache (no Dexie)
├── lib/
│   └── sources/
│       ├── featureFlags.ts                # sources_library_v2 kill switch
│       ├── extractors/
│       │   ├── textExtractor.ts           # Direct plain-text & Markdown normalizer
│       │   ├── urlExtractor.ts            # Readability + DOMPurify web extractor
│       │   ├── docxExtractor.ts           # Mammoth DOCX extractor
│       │   ├── pdfExtractor.ts            # Text-layer PDF page block extractor
│       │   ├── captionExtractor.ts        # VTT/SRT caption parser
│       │   ├── handoffReference.ts        # YouTube/audio/chart unavailable records
│       │   └── index.ts                   # extractDocument router
│       ├── importJobMachine.ts            # Batch ingestion state machine
│       ├── sourceErrors.ts                # Normalized typed errors & scrubbed diagnostics
│       ├── libraryStore.ts                # Library search, filter, and collection management
│       ├── groundedChat.ts                # Context builder, citation validator, Zod schemas
│       ├── artifactJobMachine.ts          # Single-destination generation & quality validation
│       └── destinationHandoff.ts          # Handoff adapters to Practice, Mock, Vocab, Note
├── components/
│   └── sources/
│       ├── SourcesLibraryExplorer.tsx
│       ├── SourceCard.tsx
│       ├── SourcesFilterBar.tsx
│       ├── CollectionDrawer.tsx
│       ├── SourceReader.tsx
│       ├── SourceGroundedChat.tsx
│       ├── CitationDrawer.tsx
│       ├── ArtifactStudioModal.tsx
│       ├── DestinationPicker.tsx
│       └── ArtifactDraftPreview.tsx
├── views/
│   ├── SourcesView.tsx                    # Flag-ON workspace
│   └── SourceIngestionView.tsx            # One-release facade; do not delete
└── lib/__tests__/
    ├── sourcesFeatureFlags.test.ts
    ├── sourcesDomain.test.ts
    ├── sourcesExtraction.test.ts
    ├── sourcesImportMachine.test.ts
    ├── sourcesLibraryStore.test.ts
    ├── sourcesGroundedChat.test.ts
    ├── sourcesArtifactJob.test.ts
    ├── sourcesDestinationHandoff.test.ts
    └── sourcesUxContracts.test.ts
server.ts                                  # POST /api/sources/grounded-chat and /api/sources/web-research
e2e/sources-library.spec.ts
```

Do not create `youtubeExtractor.ts`, `audioExtractor.ts`, or `chartExtractor.ts`.

---

## Tasks

### Task 0: Dependency inventory, official-docs pin, and fallback paths

**Files:**

- Modify only if Task 0 decides a package is required: `package.json` and `package-lock.json`
- Test: `src/lib/__tests__/sourcesFeatureFlags.test.ts` is not this task; this task is a documented gate that coding Tasks 1–12 must repeat before `npm install`

**Interfaces:**

- Consumes: current `package.json` / `package-lock.json` and official package documentation
- Produces: a written adopt/reuse/reject decision for each candidate; exact pinned versions; license; fallback; removal path

P03 currently needs **no** new packages to compile the flag, domain types, or job machines. Extraction packages are added only after this gate, during Task 2, as exact pins via `package-lock.json`.

Existing packages that must be **reused, not re-added**:

| Package | Current pin in `package.json` | P03 use | Forbidden P03 use |
|---|---|---|---|
| `zod` | `^4.4.3` (already present) | Grounded-chat and draft Zod schemas | None |
| `xstate` | `^5.32.5` (already present) | Optional `ImportJobMachine` actor | None |
| `@supabase/supabase-js` | `^2.57.4` (already present) | RLS-backed `sourcesStorage` | None |
| `youtube-transcript` | `^1.3.1` (already present) | None in P03 | Caption retrieval |
| `wavesurfer.js` | `^7.12.11` (already present) | None in P03 | Waveform / playback |
| `@google/genai` | already present | Only through existing `GroundedProviderRouter` / `aiGateway` | New parallel Gemini client inside Sources |

Candidate packages — adopt **only** if Task 2 extraction cannot be done with existing packages. Versions below were verified against official npm/GitHub on 2026-08-30 and **must be re-verified at implementation time** before any install. Pin the exact resolved version in `package-lock.json`. Do not commit `^` ranges for newly added packages.

| Package | Decision | Exact version to re-verify | License | Official docs | Fallback if install/docs fail | Removal path |
|---|---|---|---|---|---|---|
| `@mozilla/readability` | ADOPT for article URL extraction (`CAP-SRC-EXTRACT`) | `0.6.0` | Apache-2.0 | https://github.com/mozilla/readability | `URL_UNREACHABLE` + paste-text | Uninstall; keep paste/URL-fail path |
| `jsdom` | ADOPT as the documented Node DOM host for Readability and DOMPurify. Not a product capability. | Re-verify current Node-22 compatible release (npm latest was `30.0.1`; prefer the current documented Node 22 release) | MIT | https://github.com/jsdom/jsdom | Same as Readability: paste-text | Uninstall with Readability |
| `dompurify` | ADOPT for HTML sanitization of Readability/mammoth HTML | Re-verify current `3.x` (npm latest was `3.4.14`) | MPL-2.0 OR Apache-2.0 | https://github.com/cure53/DOMPurify | Reject unsanitized HTML; paste-text | Uninstall; reject HTML inputs |
| `pdf-parse` | ADOPT for **text-layer** PDF only | Re-verify current `2.4.5` or documented successor; confirm LICENSE file | Confirm LICENSE at install (Apache-2.0 expected for 2.x) | https://www.npmjs.com/package/pdf-parse and the package LICENSE | `PDF_SCANNED_NO_TEXT` + paste | Uninstall; paste-only PDF path |
| `mammoth` | ADOPT for DOCX | Re-verify current `1.12.2` | BSD-2-Clause | https://github.com/mwilliamson/mammoth.js | `MALFORMED_DOCUMENT` + paste | Uninstall; paste-only DOCX path |
| `dexie` | **REJECT for P03** | n/a | n/a | https://dexie.org (registry candidate only) | Native IndexedDB or in-memory cache in `sourcesStorage`; P09 owns offline queue | Never introduce |

Unpinned, speculative, or program-map-violating packages are prohibited, including AnyDoc/firecrawl, yt-dlp, new AI provider SDKs, `@testing-library/react`, and Dexie.

- [ ] **Step 1: Write the failing inventory test**

```ts
// src/lib/__tests__/sourcesDependencyPolicy.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));

describe('P03 dependency policy', () => {
  it('does not add Dexie, yt-dlp, or unpinned new Sources packages before Task 0 verification', () => {
    expect(pkg.dependencies.dexie).toBeUndefined();
    expect(pkg.dependencies['yt-dlp']).toBeUndefined();
  });

  it('keeps youtube-transcript and wavesurfer unused by P03 extractors', () => {
    expect(pkg.dependencies['youtube-transcript']).toBeDefined();
    expect(pkg.dependencies['wavesurfer.js']).toBeDefined();
  });

  it('requires package-lock entries for any newly adopted extraction package', () => {
    for (const name of ['@mozilla/readability', 'dompurify', 'pdf-parse', 'mammoth', 'jsdom']) {
      if (pkg.dependencies?.[name] || pkg.devDependencies?.[name]) {
        expect(pkg.dependencies?.[name] || pkg.devDependencies?.[name]).toMatch(/^\d/);
        expect(lock.packages[`node_modules/${name}`] || lock.dependencies?.[name]).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify RED or baseline**

Run: `npx vitest run src/lib/__tests__/sourcesDependencyPolicy.test.ts`

Expected: FAIL with `Cannot find module` until the test file exists; then PASS on the current lockfile (no Dexie, no new unpinned Sources packages).

- [ ] **Step 3: Record the verification log inside the Task 2 commit message when a package is actually added**

At Task 2 implementation time, open the official docs URLs above, copy the published version and LICENSE, then:

```bash
npm install @mozilla/readability@<verified> jsdom@<verified> dompurify@<verified> pdf-parse@<verified> mammoth@<verified> --save-exact
```

Do not run that command in this documentation PR. Do not add Dexie.

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/lib/__tests__/sourcesDependencyPolicy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit (documentation-only until coding epic)**

During the coding epic only:

```bash
git add src/lib/__tests__/sourcesDependencyPolicy.test.ts package.json package-lock.json
git commit -m "chore(sources): pin verified P03 extraction dependencies after official docs check"
```

---

### Task 1: Domain Schemas, Type Contracts & Storage Migration

**Files:**

- Create: `src/types/sources.ts`
- Create: `src/lib/sources/featureFlags.ts`
- Create: `supabase/migrations/202608300001_sources_library.sql`
- Create: `src/services/sourcesStorage.ts`
- Test: `src/lib/__tests__/sourcesDomain.test.ts`
- Test: `src/lib/__tests__/sourcesFeatureFlags.test.ts`

**Interfaces:**

- Consumes: Supabase client from `src/services/supabase.ts`
- Produces: `SourceRecord`, `SourceVersion`, `SourceBlock`, `SourceSpan`, `SourceProvenance`, `SourceCollection`, `SourceArtifactJob`, `ValidatedArtifactDraft`, `DestinationType`, `isSourcesLibraryV2Enabled`, `sourcesStorage`

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

  it('stores YouTube/audio/chart records as handoff_required without a fake version', () => {
    const record = createSourceRecord({
      userId: 'user_123',
      title: 'Lecture URL',
      type: 'youtube',
      provenance: {
        originType: 'youtube_import',
        retrievalDate: new Date().toISOString(),
        rightsState: 'restricted_citation_only',
        rawContentHash: computeContentHash('https://youtube.com/watch?v=example'),
        canonicalCitation: 'YouTube reference',
        owningModule: 'media',
        handoffReasonVi: 'P04 Media Lab owns caption retrieval and playback.',
      },
      processingState: 'handoff_required',
    });
    expect(record.processingState).toBe('handoff_required');
    expect(record.currentVersionId).toBe('');
  });
});
```

```ts
// src/lib/__tests__/sourcesFeatureFlags.test.ts
import { describe, expect, it } from 'vitest';
import { isSourcesLibraryV2Enabled, resolveSourcesViewName } from '../sources/featureFlags';

describe('sources_library_v2 kill switch', () => {
  it('defaults OFF and keeps the legacy facade', () => {
    expect(isSourcesLibraryV2Enabled({})).toBe(false);
    expect(resolveSourcesViewName({})).toBe('SourceIngestionView');
  });

  it('routes to SourcesView only when the flag is ON', () => {
    expect(resolveSourcesViewName({ OMNI_SOURCES_LIBRARY_V2: 'true' })).toBe('SourcesView');
  });

  it('rolls back to SourceIngestionView when the kill switch is false', () => {
    expect(resolveSourcesViewName({ OMNI_SOURCES_LIBRARY_V2: 'false' })).toBe('SourceIngestionView');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesDomain.test.ts src/lib/__tests__/sourcesFeatureFlags.test.ts`

Expected: FAIL with `Cannot find module '../../types/sources'` and `Cannot find module '../sources/featureFlags'`.

- [ ] **Step 3: Write minimal implementation**

Implement `src/types/sources.ts` with the contracts from SPEC §3 and §6.2, including `SourceProcessingState` values `unavailable` and `handoff_required`, `DestinationType`, and `SourceArtifactJob`.

Implement `src/lib/sources/featureFlags.ts`:

```ts
export function isSourcesLibraryV2Enabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.OMNI_SOURCES_LIBRARY_V2 === 'true';
}

export function resolveSourcesViewName(env: Record<string, string | undefined> = process.env):
  | 'SourceIngestionView'
  | 'SourcesView' {
  return isSourcesLibraryV2Enabled(env) ? 'SourcesView' : 'SourceIngestionView';
}
```

SQL migration matches SPEC §9.1 (`processing_state` CHECK includes `unavailable`, `handoff_required`). `sourcesStorage` talks to Supabase with the owner RLS policies and an in-memory/native IndexedDB cache. Do not import Dexie. Do not call `awardXP` or vocabulary insert APIs.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesDomain.test.ts src/lib/__tests__/sourcesFeatureFlags.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/sources.ts src/lib/sources/featureFlags.ts supabase/migrations/202608300001_sources_library.sql src/services/sourcesStorage.ts src/lib/__tests__/sourcesDomain.test.ts src/lib/__tests__/sourcesFeatureFlags.test.ts
git commit -m "feat(sources): define P03 domain contracts, flag, and Supabase RLS schema"
```

---

### Task 2: Multi-Format Content Extraction & Sanitization Pipeline

**Files:**

- Create: `src/lib/sources/extractors/textExtractor.ts`
- Create: `src/lib/sources/extractors/urlExtractor.ts`
- Create: `src/lib/sources/extractors/docxExtractor.ts`
- Create: `src/lib/sources/extractors/pdfExtractor.ts`
- Create: `src/lib/sources/extractors/captionExtractor.ts`
- Create: `src/lib/sources/extractors/handoffReference.ts`
- Create: `src/lib/sources/extractors/index.ts`
- Test: `src/lib/__tests__/sourcesExtraction.test.ts`

**Interfaces:**

- Consumes: Raw text, URLs, files, buffers for P03-owned formats
- Produces: `extractDocument(input: ExtractionInput): Promise<ExtractionResult>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesExtraction.test.ts
import { describe, expect, it } from 'vitest';
import { extractDocument } from '../sources/extractors';

describe('P03 extraction pipeline', () => {
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

  it('does not extract or transcribe YouTube, audio, or chart inputs', async () => {
    const yt = await extractDocument({
      type: 'youtube',
      content: 'https://youtube.com/watch?v=example',
      title: 'Lecture',
    });
    expect(yt.success).toBe(false);
    if (!yt.success) {
      expect(yt.error.code).toBe('HANDOFF_REQUIRED');
      expect(yt.error.owningModule).toBe('media');
      expect(yt.error.userMessageVi).toMatch(/Media/i);
    }

    const audio = await extractDocument({ type: 'audio', content: 'fixture.mp3', title: 'Talk' });
    expect(audio.success).toBe(false);
    if (!audio.success) expect(audio.error.owningModule).toBe('media');

    const chart = await extractDocument({ type: 'chart_image', content: 'chart.png', title: 'Task 1' });
    expect(chart.success).toBe(false);
    if (!chart.success) {
      expect(chart.error.code).toBe('HANDOFF_REQUIRED');
      expect(chart.error.owningModule).toBe('mock');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesExtraction.test.ts`

Expected: FAIL with `Cannot find module '../sources/extractors'`.

- [ ] **Step 3: Write minimal implementation**

`extractDocument` routes:

- `text` → `extractTextBlocks`
- `vtt_srt` → caption parser
- `url` / `pdf` / `docx` → Task 0 packages, after pins
- `youtube` / `audio` → `createHandoffRecord('media')` returning `success: false`, `code: 'HANDOFF_REQUIRED'`
- `chart_image` → `createHandoffRecord('mock')`

Do not import `youtube-transcript`, `wavesurfer.js`, or any chart renderer. URL/PDF/DOCX adapters may be stubbed to `UNSUPPORTED_FORMAT` until Task 0 pins are installed in this same task; they must not silently no-op as success.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesExtraction.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/extractors/ src/lib/__tests__/sourcesExtraction.test.ts package.json package-lock.json
git commit -m "feat(sources): extract P03-owned formats and hand off YouTube/audio/chart"
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

  it('keeps sibling jobs independent when one item is a YouTube handoff', async () => {
    const textJob = await processImportJob(
      createImportJob({
        id: 'job_text',
        userId: 'user_1',
        title: 'Essay',
        type: 'text',
        rawContent: 'Capital expenditure in clean tech remains the core claim.',
      }),
    );
    const ytJob = await processImportJob(
      createImportJob({
        id: 'job_yt',
        userId: 'user_1',
        title: 'Lecture',
        type: 'youtube',
        rawContent: 'https://youtube.com/watch?v=example',
      }),
    );
    expect(textJob.state).toBe('ready');
    expect(ytJob.state).toBe('handoff_required');
    expect(ytJob.sourceRecord?.processingState).toBe('handoff_required');
    expect(ytJob.sourceVersion).toBeUndefined();
  });

  it('normalizes provider errors into scrubbed learner-facing messages', () => {
    const rawError = new Error('HTTP 429: provider quota at internal/provider.ts:45');
    const normalized = normalizeSourceError(rawError);

    expect(normalized.code).toBe('QUOTA_EXCEEDED');
    expect(normalized.userMessageVi).toContain('Hạn ngạch');
    expect(normalized.userMessageVi).not.toContain('HTTP 429');
    expect(normalized.userMessageVi).not.toContain('internal/provider.ts');
    expect(normalized.retryable).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesImportMachine.test.ts`

Expected: FAIL with `Cannot find module '../sources/importJobMachine'`.

- [ ] **Step 3: Write minimal implementation**

`normalizeSourceError` maps quota/429 text to `QUOTA_EXCEEDED` and **rebuilds** `userMessageVi` from a fixed Vietnamese string. It must not concatenate the raw `error.message`. `processImportJob` maps `HANDOFF_REQUIRED` extraction errors to job state `handoff_required` without calling an extractor for captions, audio, or charts. Jobs are independent: throwing in one `processImportJob` call cannot mutate another job object.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesImportMachine.test.ts`

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/sourceErrors.ts src/lib/sources/importJobMachine.ts src/lib/__tests__/sourcesImportMachine.test.ts
git commit -m "feat(sources): implement import job machine and scrubbed error normalization"
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

Expected: FAIL with `Cannot find module '../sources/libraryStore'`.

- [ ] **Step 3: Write minimal implementation**

Implement `filterSources` and `searchSources` as pure functions over `SourceRecord[]`. Include `processingState` so `handoff_required` cards remain visible with an honest badge.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesLibraryStore.test.ts`

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/libraryStore.ts src/lib/__tests__/sourcesLibraryStore.test.ts
git commit -m "feat(sources): implement library search, filter, and collection store"
```

---

### Task 5: Selected-Source Context & Executable Grounded Chat

**Files:**

- Create: `src/lib/sources/groundedChat.ts`
- Modify: `server.ts` (add `POST /api/sources/grounded-chat` and `POST /api/sources/web-research` only)
- Test: `src/lib/__tests__/sourcesGroundedChat.test.ts`

**Interfaces:**

- Consumes: selected `SourceVersion[]` plus `SourceRecord` metadata, existing `GroundedProviderRouter`, `AI_TASK_PROFILES.balanced`, `classifyApiFailure`, `zod`
- Produces: `buildGroundedContext`, `validateGroundedCitations`, `executeGroundedChat`, `GroundedChatRequestSchema`, `GroundedChatResponseSchema`

Exact API boundary:

- `POST /api/sources/grounded-chat` body `{ selectedVersionIds: string[]; question: string; sourceSpan?: SourceSpan; conversationId?: string }`
- `POST /api/sources/web-research` body `{ question: string; conversationId?: string }` — the only path that may invoke `CAP-GLB-SEARCH`
- Server handler must call `router.execute` on the existing `GroundedProviderRouter` instance used by Live Hub / AI gateway. It must not construct `@google/genai` or fetch `/api/gemini/*`.
- Model profile: `AI_TASK_PROFILES.balanced` (`capability: 'text'`, `tools: []`). Do not use `AI_TASK_PROFILES.grounded` (it enables `googleSearch`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sourcesGroundedChat.test.ts
import { describe, expect, it, vi } from 'vitest';
import {
  buildGroundedContext,
  executeGroundedChat,
  validateGroundedCitations,
  GroundedChatResponseSchema,
} from '../sources/groundedChat';
import { SourceRecord, SourceVersion } from '../../types/sources';
import { normalizeSourceError } from '../sources/sourceErrors';

const selected: SourceVersion = {
  id: 'v_01',
  sourceId: 's_01',
  versionNumber: 1,
  stage: 'normalised',
  contentHash: 'abc',
  plainText: 'Solar subsidies reduce macroeconomic risk.',
  blocks: [{ id: 'b_001', order: 1, type: 'paragraph', text: 'Solar subsidies reduce macroeconomic risk.' }],
  wordCount: 5,
  createdAt: '2026-08-30T00:00:00Z',
};

const record: SourceRecord = {
  id: 's_01',
  userId: 'u1',
  title: 'Macroeconomics',
  summary: '',
  type: 'text',
  collectionIds: [],
  tags: [],
  provenance: {
    originType: 'pasted_text',
    retrievalDate: '2026-08-30T00:00:00Z',
    rightsState: 'owned_by_learner',
    rawContentHash: 'abc',
    canonicalCitation: 'Macroeconomics',
  },
  currentVersionId: 'v_01',
  processingState: 'ready',
  lastUsedAt: '2026-08-30T00:00:00Z',
  createdAt: '2026-08-30T00:00:00Z',
  updatedAt: '2026-08-30T00:00:00Z',
};

describe('Grounded Chat engine', () => {
  it('builds context from selected versions and record metadata only', () => {
    const context = buildGroundedContext([{ version: selected, record }], ['v_01']);
    expect(context).toContain('Solar subsidies reduce macroeconomic risk.');
    expect(context).toContain('v_01');
    expect(context).toContain('b_001');
    expect(context).toContain('Macroeconomics');
  });

  it('rejects citations to unknown block IDs', () => {
    const parsed = GroundedChatResponseSchema.parse({
      groundingStatus: 'fully_grounded',
      answer: 'Claim [Source: Macroeconomics, §b_999]',
      citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_999' }],
      webCitations: [],
    });
    const result = validateGroundedCitations(parsed, [selected]);
    expect(result.groundingStatus).toBe('unsupported_by_sources');
    expect(result.citations).toEqual([]);
  });

  it('rejects citations to unselected versions', () => {
    const parsed = GroundedChatResponseSchema.parse({
      groundingStatus: 'fully_grounded',
      answer: 'Claim [Source: Other, §b_001]',
      citations: [{ sourceVersionId: 'v_unselected', sourceTitle: 'Other', blockId: 'b_001' }],
      webCitations: [],
    });
    const result = validateGroundedCitations(parsed, [selected]);
    expect(result.groundingStatus).toBe('unsupported_by_sources');
  });

  it('returns unsupported_by_sources when the model answers with no citation', () => {
    const parsed = GroundedChatResponseSchema.parse({
      groundingStatus: 'fully_grounded',
      answer: 'The moon is made of cheese.',
      citations: [],
      webCitations: [],
    });
    const result = validateGroundedCitations(parsed, [selected]);
    expect(result.groundingStatus).toBe('unsupported_by_sources');
  });

  it('does not call web search from private-source chat', async () => {
    const search = vi.fn();
    const routerExecute = vi.fn(async () => ({
      value: {
        groundingStatus: 'fully_grounded',
        answer: 'Solar subsidies reduce macroeconomic risk [Source: Macroeconomics, §b_001].',
        citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_001' }],
        webCitations: [],
      },
      provider: 'gemini',
      model: 'gemini-3.7-flash',
    }));

    const result = await executeGroundedChat({
      selectedVersionIds: ['v_01'],
      question: 'What do subsidies do?',
      versions: [selected],
      records: [record],
      routerExecute,
      webSearch: search,
    });

    expect(search).not.toHaveBeenCalled();
    expect(routerExecute).toHaveBeenCalledTimes(1);
    expect(result.groundingStatus).toBe('fully_grounded');
    expect(result.webCitations).toEqual([]);
  });

  it('scrubs provider failures before they reach the learner', () => {
    const normalized = normalizeSourceError(new Error('HTTP 429: provider quota at internal/provider.ts:45'));
    expect(normalized.userMessageVi).not.toContain('HTTP 429');
    expect(normalized.userMessageVi).not.toContain('internal/provider.ts');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesGroundedChat.test.ts`

Expected: FAIL with `Cannot find module '../sources/groundedChat'`.

- [ ] **Step 3: Write minimal implementation**

`groundedChat.ts` must:

1. Zod-parse the request and response.
2. Build prompt context from selected versions + record title/rights/canonical citation only.
3. Call `routerExecute` (the existing central router). Never instantiate a new provider client.
4. Run `validateGroundedCitations` and coerce invalid/unselected/missing citations to `unsupported_by_sources`.
5. Leave `webSearch` uncalled.
6. Map thrown provider errors through `normalizeSourceError`.

`server.ts` wires:

```ts
app.post('/api/sources/grounded-chat', async (req, res) => { /* executeGroundedChat via GroundedProviderRouter */ });
app.post('/api/sources/web-research', async (req, res) => { /* CAP-GLB-SEARCH only */ });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesGroundedChat.test.ts`

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/groundedChat.ts src/lib/__tests__/sourcesGroundedChat.test.ts server.ts
git commit -m "feat(sources): execute grounded chat through the central AI router"
```

---

### Task 6: Artifact Job Machine & Single-Destination Draft Generators

**Files:**

- Create: `src/lib/sources/artifactJobMachine.ts`
- Test: `src/lib/__tests__/sourcesArtifactJob.test.ts`

**Interfaces:**

- Consumes: `SourceVersion`, `SourceSpan`, `DestinationType`, existing central AI router
- Produces: `createArtifactJob`, `executeArtifactJob`, `validateDraftPayload`, `ValidatedArtifactDraft`

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

  it('does not emit mastery, XP, or vocabulary side effects from draft creation', () => {
    const job = createArtifactJob({
      id: 'job_art_2',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'vocabulary_deck',
      targetBand: 7.0,
    });
    expect(job).not.toHaveProperty('xpDelta');
    expect(job).not.toHaveProperty('masteryUpdate');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesArtifactJob.test.ts`

Expected: FAIL with `Cannot find module '../sources/artifactJobMachine'`.

- [ ] **Step 3: Write minimal implementation**

`createArtifactJob` stores exactly one `destination`. `validateDraftPayload` is destination-specific. Router calls for generation use `AI_TASK_PROFILES.balanced` or `deep` with empty tools, never search. Invalid drafts become `needs_review` or `failed`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesArtifactJob.test.ts`

Expected: PASS (3 tests).

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
    expect(handoff.autoRedirect).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/sourcesDestinationHandoff.test.ts`

Expected: FAIL with `Cannot find module '../sources/destinationHandoff'`.

- [ ] **Step 3: Write minimal implementation**

`prepareDestinationHandoff` returns route + CTA labels + `autoRedirect: false`. It does not write Practice/Mock/Vocabulary rows.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/sourcesDestinationHandoff.test.ts`

Expected: PASS (1 test).

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
- Modify: `src/lib/uxFlowContracts.ts`
- Test: `src/lib/__tests__/sourcesUxContracts.test.ts`

**Interfaces:**

- Consumes: `SourceRecord[]`, `SourceCollection[]`, `libraryStore`, P02 `UxControlContract` (or the P02 plan types if the coding epic lands after that merge)
- Produces: components inside `data-ux-scope="sources-library-v2"` with literal `data-ux-flow` and unique literal `data-ux-control` IDs listed in SPEC §8.3

- [ ] **Step 1: Write the failing unit/component test**

```ts
// src/lib/__tests__/sourcesUxContracts.test.ts
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourcesFilterBar } from '../../components/sources/SourcesFilterBar';
import { UX_FLOW_CONTRACTS } from '../uxFlowContracts';

describe('Sources Library Explorer UX contracts', () => {
  it('registers P03 flow contracts with executable evidence', () => {
    const sourceFlowIds = UX_FLOW_CONTRACTS.filter((f) => f.module === 'sources').map((f) => f.id);
    expect(sourceFlowIds).toEqual(
      expect.arrayContaining([
        'sources.manage',
        'sources.library.filter',
        'sources.selection.toggle',
        'sources.collection.create',
      ]),
    );
  });

  it('renders unique data-ux-control IDs on filter and search controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(SourcesFilterBar, {
        query: '',
        onQueryChange: () => undefined,
        mediaType: 'all',
        onMediaTypeChange: () => undefined,
      }),
    );
    expect(html).toContain('data-ux-scope="sources-library-v2"');
    expect(html).toContain('data-ux-control="sources.library.search-input"');
    expect(html).toContain('data-ux-flow="sources.library.filter"');
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/lib/__tests__/sourcesUxContracts.test.ts`

Expected: FAIL with `Cannot find module '../../components/sources/SourcesFilterBar'` (and missing new flow ids).

- [ ] **Step 3: Minimal implementation**

Implement the four components with accessible names, keyboard focus, and the SPEC §8.3 control IDs. Register matching `UxControlContract` rows (owner, preconditions, action, before/after, side effects, failure categories, recovery, evidence `e2e/sources-library.spec.ts`). Do not mount Wavesurfer or a YouTube player on `handoff_required` cards.

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/lib/__tests__/sourcesUxContracts.test.ts`

Expected: PASS.

- [ ] **Step 5: Accessibility and control evidence**

Each interactive element must have a visible label, 4.5:1 contrast, a unique `data-ux-control`, and a registered `data-ux-flow`. Add `aria-pressed` on selection toggles.

- [ ] **Step 6: Commit**

```bash
git add src/components/sources/SourceCard.tsx src/components/sources/SourcesFilterBar.tsx src/components/sources/CollectionDrawer.tsx src/components/sources/SourcesLibraryExplorer.tsx src/lib/uxFlowContracts.ts src/lib/__tests__/sourcesUxContracts.test.ts
git commit -m "feat(sources): implement Library Explorer with UX Contract v2 controls"
```

---

### Task 9: Source Reader, Span Selector & Grounded Chat Canvas UI

**Files:**

- Create: `src/components/sources/SourceReader.tsx`
- Create: `src/components/sources/SourceGroundedChat.tsx`
- Create: `src/components/sources/CitationDrawer.tsx`
- Test: `src/lib/__tests__/sourcesGroundedChatUi.test.ts`

**Interfaces:**

- Consumes: `SourceRecord`, `SourceVersion`, `executeGroundedChat` client wrapper
- Produces: Reader + chat that posts to `/api/sources/grounded-chat` and exposes a separate web-research control

- [ ] **Step 1: Write the failing component test**

```ts
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourceGroundedChat } from '../../components/sources/SourceGroundedChat';

describe('Grounded Chat UI', () => {
  it('separates private-source send from explicit web research controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(SourceGroundedChat, {
        selectedVersionIds: ['v_01'],
        contextLabel: 'Context: 1 source, 5 words',
      }),
    );
    expect(html).toContain('data-ux-control="sources.chat.send"');
    expect(html).toContain('data-ux-flow="sources.chat.send"');
    expect(html).toContain('data-ux-control="sources.chat.web-research"');
    expect(html).toContain('data-ux-flow="sources.chat.web-research"');
    expect(html).toContain('Tra cứu dẫn chứng');
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/lib/__tests__/sourcesGroundedChatUi.test.ts`

Expected: FAIL with `Cannot find module '../../components/sources/SourceGroundedChat'`.

- [ ] **Step 3: Minimal implementation**

- Reader renders ordered blocks; no waveform, no MediaSession, no Task 1 canvas.
- `handoff_required` sources show an honest banner naming P04 or P07.
- Chat send posts only to `/api/sources/grounded-chat`.
- Web-research button is a separate control and is the only caller of `/api/sources/web-research`.
- Citation drawer uses `data-ux-control="sources.chat.citation-open"`.

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/lib/__tests__/sourcesGroundedChatUi.test.ts`

Expected: PASS.

- [ ] **Step 5: Accessibility and control evidence**

Chat composer is a labelled textbox. Send and web-research are focusable buttons. Citation chips are buttons, not dead spans. `unsupported_by_sources` is announced with `role="status"`.

- [ ] **Step 6: Commit**

```bash
git add src/components/sources/SourceReader.tsx src/components/sources/SourceGroundedChat.tsx src/components/sources/CitationDrawer.tsx src/lib/__tests__/sourcesGroundedChatUi.test.ts src/lib/uxFlowContracts.ts
git commit -m "feat(sources): implement reader and grounded chat UI with isolated web research"
```

---

### Task 10: Artifact Studio Modal, Destination Picker & Draft Preview UI

**Files:**

- Create: `src/components/sources/DestinationPicker.tsx`
- Create: `src/components/sources/ArtifactDraftPreview.tsx`
- Create: `src/components/sources/ArtifactStudioModal.tsx`
- Test: `src/lib/__tests__/sourcesArtifactStudioUi.test.ts`

**Interfaces:**

- Consumes: `SourceVersion`, `SourceSpan`, `artifactJobMachine`, `destinationHandoff`
- Produces: modal with five destination cards, eight presentation states, primary "Open artifact", secondary "Create another output"

- [ ] **Step 1: Write the failing component test**

```ts
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DestinationPicker } from '../../components/sources/DestinationPicker';
import { ArtifactDraftPreview } from '../../components/sources/ArtifactDraftPreview';

describe('Artifact Studio UI', () => {
  it('exposes exactly one selectable destination control set', () => {
    const html = renderToStaticMarkup(
      React.createElement(DestinationPicker, { selected: 'practice', onSelect: () => undefined }),
    );
    expect(html).toContain('data-ux-control="sources.artifact.destination-practice"');
    expect(html).toContain('data-ux-control="sources.artifact.destination-mock"');
    expect(html).toContain('data-ux-control="sources.artifact.destination-vocabulary"');
    expect(html).toContain('data-ux-control="sources.artifact.destination-note"');
    expect(html).toContain('data-ux-control="sources.artifact.destination-idea-bank"');
    expect(html).toContain('data-ux-control="sources.artifact.generate"');
  });

  it('shows open-artifact and create-another without auto-redirect attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(ArtifactDraftPreview, {
        jobId: 'job_01',
        destination: 'practice',
        targetRoute: '/practice?draftId=draft_01',
      }),
    );
    expect(html).toContain('data-ux-control="sources.artifact.open"');
    expect(html).toContain('data-ux-control="sources.artifact.create-another"');
    expect(html).not.toContain('data-auto-redirect="true"');
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/lib/__tests__/sourcesArtifactStudioUi.test.ts`

Expected: FAIL with `Cannot find module '../../components/sources/DestinationPicker'`.

- [ ] **Step 3: Minimal implementation**

Five destination cards are mutually exclusive (`role="radio"` or equivalent). Generate stays disabled until one destination is chosen. Success state renders the two CTAs and does not call `navigate` until `sources.artifact.open` is activated.

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/lib/__tests__/sourcesArtifactStudioUi.test.ts`

Expected: PASS.

- [ ] **Step 5: Accessibility and control evidence**

Modal uses `role="dialog"` and initial focus on the destination group. Escape closes. All 8 states have visible copy. Controls listed in SPEC §8.3 are present as literals.

- [ ] **Step 6: Commit**

```bash
git add src/components/sources/DestinationPicker.tsx src/components/sources/ArtifactDraftPreview.tsx src/components/sources/ArtifactStudioModal.tsx src/lib/__tests__/sourcesArtifactStudioUi.test.ts src/lib/uxFlowContracts.ts
git commit -m "feat(sources): implement Artifact Studio destination picker and draft preview"
```

---

### Task 11: Main Sources View Integration, Feature Flag & Route Facade

**Files:**

- Create: `src/views/SourcesView.tsx`
- Modify: `src/App.tsx` (flagged route mapping for `sources`)
- Keep: `src/views/SourceIngestionView.tsx` as one-release facade (do not delete)
- Test: `src/lib/__tests__/sourcesViewFacade.test.ts`

**Interfaces:**

- Consumes: `resolveSourcesViewName`, explorer, reader, chat, artifact modal
- Produces: 3-zone desktop / 3-tab mobile workspace when flag ON; legacy view when flag OFF

- [ ] **Step 1: Write the failing unit test**

```ts
// src/lib/__tests__/sourcesViewFacade.test.ts
import { describe, expect, it } from 'vitest';
import { resolveSourcesViewName } from '../sources/featureFlags';

describe('Sources route facade', () => {
  it('does not route sources to SourcesView while the kill switch is off', () => {
    expect(resolveSourcesViewName({ OMNI_SOURCES_LIBRARY_V2: undefined })).toBe('SourceIngestionView');
    expect(resolveSourcesViewName({ OMNI_SOURCES_LIBRARY_V2: 'false' })).toBe('SourceIngestionView');
  });

  it('routes sources to SourcesView only when sources_library_v2 is on', () => {
    expect(resolveSourcesViewName({ OMNI_SOURCES_LIBRARY_V2: 'true' })).toBe('SourcesView');
  });
});
```

Also add a component assertion that `SourcesView` markup includes `data-ux-scope="sources-library-v2"` and does not import `SourceToLearningPackageModal` or call `awardXP`.

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/lib/__tests__/sourcesViewFacade.test.ts`

Expected: FAIL until `App.tsx` uses `resolveSourcesViewName` / the flag helper (the helper exists from Task 1; this test fails on missing `SourcesView` export and missing flag branch).

- [ ] **Step 3: Minimal implementation**

```tsx
case 'sources':
  return isSourcesLibraryV2Enabled() ? <SourcesView /> : <SourceIngestionView />;
```

`SourcesView` desktop: Library | Reader/Chat | Evidence/jobs. Mobile tabs: Library, Reader & Chat, Create. Do not auto-redirect after draft success. Do not generate four-skill packages, XP, or vocabulary cards. Leave `SourceIngestionView.tsx` in the tree as the rollback facade.

Rollback: `OMNI_SOURCES_LIBRARY_V2=false` restores `SourceIngestionView` in one deploy. No schema down-migration.

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/lib/__tests__/sourcesViewFacade.test.ts`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: PASS with 0 errors.

- [ ] **Step 5: Accessibility and control evidence**

Workspace tabs are keyboard reachable. Flag-OFF path is covered by existing `e2e/sources.spec.ts`. Flag-ON path is covered by Task 12.

- [ ] **Step 6: Commit**

```bash
git add src/views/SourcesView.tsx src/App.tsx src/lib/__tests__/sourcesViewFacade.test.ts
git commit -m "feat(sources): gate SourcesView behind sources_library_v2 with one-release facade"
```

---

### Task 12: UX Contracts v2, Fixtures, Deterministic Playwright & Accessibility Suite

**Files:**

- Create: `e2e/sources-library.spec.ts`
- Create: `src/lib/__tests__/sourcesFullFlow.test.ts`
- Modify: `src/lib/uxFlowContracts.ts`
- Modify: `playwright.config.ts` only if needed to inject `OMNI_SOURCES_LIBRARY_V2=true` for this spec
- Fixtures under `e2e/fixtures/sources/` for `fix-src-text-01`, `fix-src-pdf-01`, `fix-src-pdf-scanned`, `fix-src-docx-01`, `fix-src-url-01`, `fix-src-url-blocked`, `fix-src-vtt-01`, `fix-src-yt-01`, `fix-src-audio-01`, `fix-src-chart-01`

**Interfaces:**

- Consumes: Full Sources stack with flag ON
- Produces: Deterministic unit + Playwright evidence for AC-SRC-001…016

- [ ] **Step 1: Write the failing integration test**

Keep the Task 12 unit flow from import → version → one destination → handoff with `autoRedirect === false` and assert XP/mastery counters remain `0`.

- [ ] **Step 2: Write failing Playwright coverage**

`e2e/sources-library.spec.ts` must be executable, use `data-ux-control` locators, and cover:

| AC | Playwright test title | Exact assertion |
|---|---|---|
| AC-SRC-001 | `library-first initial state` | Flag ON; `sources.library.search-input` visible; no `SourceToLearningPackageModal`; no auto quiz |
| AC-SRC-002 | `independent batch jobs` | PDF + URL + pasted text create three job rows; one can `ready` while another `failed` or `handoff_required` |
| AC-SRC-003 | `immutable edited version` | Edit extracted text; UI shows v2 `edited`; v1 still listed |
| AC-SRC-004 | `selected-source chat` | Send on `sources.chat.send` cites selected block; unsupported question shows `unsupported_by_sources` |
| AC-SRC-005 | `explicit web research` | `sources.chat.send` does not call `/api/sources/web-research`; `sources.chat.web-research` does and labels `[Web:` |
| AC-SRC-006 | `exactly one destination` | Selecting a second destination deselects the first; generate disabled until one is chosen |
| AC-SRC-008 | `no auto-redirect after success` | After ready draft, URL stays on Sources; both CTAs visible; navigation happens only after `sources.artifact.open` |
| AC-SRC-010 | `no mastery/progress/XP from import/draft` | Snapshot XP / vocab count / competency before and after import+draft; all remain unchanged |
| AC-SRC-011 | `typed recovery for malformed input` | Corrupted PDF shows `EXTRACTION_FAILED` and paste CTA; no page error |
| AC-SRC-012 | `typed scanned PDF rejection` | `fix-src-pdf-scanned` shows `PDF_SCANNED_NO_TEXT` |
| AC-SRC-013 | `typed quota recovery` | Mock provider 429; `retry_wait` + retry control; text excludes `HTTP 429` and `internal/provider.ts` |
| AC-SRC-014 | `desktop and mobile presentation states` | Desktop Chromium and 390×844 each show loading/ready/empty/unavailable (YouTube card without player) |
| AC-SRC-015 | `RLS policy verification strategy` | Two storage-state users; user B `GET` of user A `source_records` returns 0 rows (Playwright API request + documented SQL policy test) |
| AC-SRC-016 | `keyboard and axe coverage` | Tab/Shift+Tab/Enter/Esc through search, select, import, chat, destination, generate; `@axe-core/playwright` 0 violations |

AC-SRC-007 and AC-SRC-009 remain covered by unit tests in Tasks 6–7 plus the generate/`Open artifact` path in this spec.

- [ ] **Step 3: Run RED**

Run: `npx playwright test e2e/sources-library.spec.ts --project=chromium-desktop`

Expected: FAIL because `SourcesView` / flag-ON workspace and locators do not exist yet if this task is started early; during this task, FAIL on missing spec file first (`No tests found`), then on missing locators until Task 8–11 land.

- [ ] **Step 4: Minimal implementation of the spec and fixtures**

Add the Playwright file, fixture bytes, and UX control evidence IDs. Do not weaken assertions. Do not hit live YouTube, live OCR, or Private Web Bridge.

- [ ] **Step 5: GREEN**

Run:

```bash
npx vitest run src/lib/__tests__/sourcesFullFlow.test.ts src/lib/__tests__/sourcesGroundedChat.test.ts
npx playwright test e2e/sources-library.spec.ts --project=chromium-desktop
npx playwright test e2e/sources-library.spec.ts --project=chromium-mobile
npx playwright test e2e/accessibility.spec.ts --project=chromium-desktop
npm run check:ux-contracts
npm run check:product-docs
```

Expected: all listed commands PASS. Product-docs output: `Product documentation gate passed: 5 documents, N stable IDs.` (stable ID count is the existing product baseline; this plan must not mint IDs).

- [ ] **Step 6: Accessibility and control evidence**

`check-ux-contracts` must count migrated `sources-library-v2` controls. Every SPEC §8.3 `data-ux-control` is activated or table-asserted in `e2e/sources-library.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add e2e/sources-library.spec.ts e2e/fixtures/sources src/lib/__tests__/sourcesFullFlow.test.ts src/lib/uxFlowContracts.ts
git commit -m "test(sources): prove P03 acceptance criteria with Playwright and UX Contract v2"
```

---

## Plan Self-Review Checklist

1. **Spec Coverage**:
   - Library-First UX, Explorer, Collections, Search/Filters → Tasks 4, 8, 11
   - SourceRecord, SourceVersion, Spans, Provenance → Tasks 1, 2
   - P03-owned extractors + YouTube/audio/chart handoff → Tasks 2, 3
   - Selected-Source executable Grounded Chat & citation isolation → Tasks 5, 9
   - 1 Source/Span → 1 Destination Pipeline → Tasks 6, 10
   - Destination Handoff Adapters (No auto-redirect) → Tasks 7, 10
   - Feature flag / one-release facade / rollback → Tasks 1, 11
   - Zero Mastery / XP / vocab / four-skill package policy → Tasks 1, 6, 11, 12
   - Complete 8 Presentation States & Error Scrubbing → Tasks 3, 8, 10, 12
   - Supabase RLS & Storage → Tasks 1, 12 (AC-SRC-015)
   - Acceptance Criteria AC-SRC-001 to AC-SRC-016 → Task 12
   - Dependency pins and Dexie rejection → Task 0
2. **No unfinished-work placeholders** in these P03 planning files.
3. **Type Consistency**: `SourceRecord`, `SourceVersion`, `SourceSpan`, `SourceArtifactJob`, `ValidatedArtifactDraft` names and fields are consistent across all tasks.
4. **Program map**: P04 owns YouTube/audio/playback; P07 owns Task 1 rendering; P03 does not implement those runtimes.
5. **Dispatch gate**: P03 coding remains blocked until P02 is on `origin/main` and Product Owner approves this corrected plan.
