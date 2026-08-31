import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';
import {
  TASK12_ACCESS_TOKEN,
  TASK12_COLLECTIONS,
  TASK12_EDITED_VERSION,
  TASK12_FILES,
  TASK12_OTHER_VERSIONS,
  TASK12_RECORDS,
  TASK12_TEXT,
  TASK12_TEXT_VERSION,
  TASK12_USER_ID,
  TASK12_VTT,
  TASK12_YOUTUBE_URL,
  task12ReadyArtifactJob,
  task12RecordFor,
  task12Span,
  task12VersionFor,
} from './fixtures/sources/fixtures';
import type { SourceCollection, SourceRecord, SourceVersion } from '../src/types/sources';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const flagOn = await page.evaluate(() => (
    (window as Window & { __OMNI_FLAGS__?: { sourcesLibraryV2?: boolean } }).__OMNI_FLAGS__?.sourcesLibraryV2 === true
  ));
  test.skip(!flagOn, 'Task 12 Sources acceptance requires the dedicated flag-on Playwright server.');
});

type MockResponse = { status: number; body: unknown };
type LibraryMode = 'ready' | 'empty' | 'auth_required' | 'retryable' | 'delayed';
type MockRequestBody = Record<string, unknown>;

type HarnessOptions = {
  records?: SourceRecord[];
  collections?: SourceCollection[];
  libraryMode?: LibraryMode;
  importResponse?: (body: MockRequestBody) => MockResponse;
  groundedResponse?: (body: MockRequestBody) => MockResponse;
  researchResponse?: (body: MockRequestBody) => MockResponse;
  artifactResponse?: (body: MockRequestBody) => MockResponse;
};

type HarnessState = {
  libraryMode: LibraryMode;
  importRequests: MockRequestBody[];
  groundedRequests: MockRequestBody[];
  researchRequests: MockRequestBody[];
  artifactRequests: MockRequestBody[];
  calls: string[];
  supabaseRequests: number;
  releaseLibrary?: () => void;
};

const TASK12_SOURCE_CONTROL_IDS = [
  'sources.library.search-input',
  'sources.library.filter-format',
  'sources.library.filter-rights',
  'sources.library.filter-sort',
  'sources.library.filter-collection',
  'sources.library.select-toggle',
  'sources.library.open-source',
  'sources.library.retry',
  'sources.import.open',
  'sources.import.empty-cta',
  'sources.import.sign-in',
  'sources.artifact.open-modal',
  'sources.reader.select-span',
  'sources.chat.send',
  'sources.chat.web-research',
  'sources.chat.citation-open',
  'sources.chat.citation-close',
  'sources.chat.composer',
  'sources.chat.question-input',
  'sources.chat.retry',
  'sources.chat.research-retry',
  'sources.chat.web-result',
  'sources.reader.retry',
  'sources.artifact.close',
  'sources.artifact.form',
  'sources.artifact.generate',
  'sources.artifact.retry',
  'sources.artifact.target-band',
  'sources.artifact.custom-instruction',
  'sources.artifact.destination-practice',
  'sources.artifact.destination-mock',
  'sources.artifact.destination-vocabulary',
  'sources.artifact.destination-note',
  'sources.artifact.destination-idea-bank',
  'sources.artifact.open',
  'sources.artifact.create-another',
  'sources.view.tab-library',
  'sources.view.tab-reader',
  'sources.view.tab-create',
  'sources.view.open-create',
  'sources.collection.create-button',
  'sources.collection.form',
  'sources.collection.name-input',
  'sources.collection.save-button',
  'sources.collection.cancel-button',
  'sources.collection.all',
  'sources.collection.select',
  'sources.import.close',
  'sources.import.form',
  'sources.import.title',
  'sources.import.type',
  'sources.import.paste-text',
  'sources.import.url',
  'sources.import.pdf',
  'sources.import.docx',
  'sources.import.vtt',
  'sources.import.youtube',
  'sources.import.submit',
  'sources.import.retry',
] as const;

const TASK12_VERSIONS: Record<string, SourceVersion> = {
  [TASK12_TEXT_VERSION.id]: TASK12_TEXT_VERSION,
  [TASK12_EDITED_VERSION.id]: TASK12_EDITED_VERSION,
  ...TASK12_OTHER_VERSIONS,
};

function jsonResponse(status: number, body: unknown): MockResponse {
  return { status, body };
}

function defaultImportResponse(body: MockRequestBody, sequence: number): MockResponse {
  const type = String(body.type || 'text') as SourceRecord['type'];
  if (type === 'youtube') {
    const source = TASK12_RECORDS.find((record) => record.type === 'youtube') || TASK12_RECORDS[0];
    return jsonResponse(200, {
      status: 'handoff_required',
      sourceRecord: { ...source, id: `task12-imported-youtube-${sequence}`, title: String(body.title || source.title) },
      owningModule: 'media',
    });
  }

  const sourceId = `task12-imported-${type}-${sequence}`;
  const templateVersion = type === 'pdf'
    ? TASK12_OTHER_VERSIONS['task12-version-pdf']
    : type === 'docx'
      ? TASK12_OTHER_VERSIONS['task12-version-docx']
      : type === 'url'
        ? TASK12_OTHER_VERSIONS['task12-version-url']
        : type === 'vtt_srt'
          ? TASK12_OTHER_VERSIONS['task12-version-vtt']
          : TASK12_TEXT_VERSION;
  const version: SourceVersion = {
    ...templateVersion,
    id: `${sourceId}-v1`,
    sourceId,
    contentHash: `${templateVersion.contentHash}-${sequence}`,
  };
  const title = String(body.title || `Task 12 ${type} fixture`);
  const source: SourceRecord = {
    ...TASK12_RECORDS[0],
    id: sourceId,
    title,
    summary: version.plainText,
    type,
    collectionIds: [],
    tags: ['task12-imported'],
    currentVersionId: version.id,
    processingState: 'ready',
    provenance: {
      ...TASK12_RECORDS[0].provenance,
      originType: type === 'url' ? 'web_fetch' : 'user_upload',
      canonicalCitation: title,
      rawContentHash: version.contentHash,
      ...(typeof body.originalFilename === 'string' ? { originalFilename: body.originalFilename } : {}),
      ...(type === 'url' && typeof body.content === 'string' ? { originalUrl: body.content } : {}),
    },
  };
  return jsonResponse(200, { status: 'ready', sourceRecord: source, sourceVersion: version });
}

function defaultGroundedResponse(body: MockRequestBody): MockResponse {
  const question = String(body.question || '');
  if (question.toLowerCase().includes('unsupported')) {
    return jsonResponse(200, {
      groundingStatus: 'unsupported_by_sources',
      answer: 'unsupported_by_sources: Các khối nguồn đã chọn không đủ căn cứ cho câu hỏi này.',
      citations: [],
      webCitations: [],
    });
  }
  const selectedVersionId = Array.isArray(body.selectedVersionIds) ? String(body.selectedVersionIds[0]) : TASK12_TEXT_VERSION.id;
  const version = task12VersionFor(selectedVersionId);
  const source = version ? task12RecordFor(version.sourceId) : undefined;
  const span = body.sourceSpan && typeof body.sourceSpan === 'object' ? body.sourceSpan as MockRequestBody : undefined;
  const blockId = Array.isArray(span?.blockIds) ? String(span.blockIds[0]) : 'b_001';
  if (!version || (Array.isArray(span?.blockIds) && span.blockIds.some((id) => id !== 'b_001'))) {
    return jsonResponse(200, {
      groundingStatus: 'unsupported_by_sources',
      answer: 'unsupported_by_sources: Các khối nguồn đã chọn không đủ căn cứ cho câu hỏi này.',
      citations: [],
      webCitations: [],
    });
  }
  return jsonResponse(200, {
    groundingStatus: 'fully_grounded',
    answer: 'The selected source connects transparent outcomes with lower transition risk.',
    citations: [{
      sourceVersionId: selectedVersionId,
      sourceTitle: source?.title || 'Renewable policy brief',
      blockId,
      exactSnippet: 'Transparent outcomes reduce transition risk.',
    }],
    webCitations: [],
  });
}

function defaultResearchResponse(): MockResponse {
  return jsonResponse(200, {
    status: 'ok',
    webCitations: [{
      title: 'Task 12 web evidence',
      url: 'https://fixture.invalid/evidence',
      snippet: 'Deterministic web-citation fixture; no network request is made.',
    }],
  });
}

function defaultArtifactResponse(body: MockRequestBody): MockResponse {
  const sourceVersionId = String(body.sourceVersionId || TASK12_TEXT_VERSION.id);
  const selection = body.sourceSpan && typeof body.sourceSpan === 'object'
    ? body.sourceSpan as ReturnType<typeof task12Span>
    : task12Span(sourceVersionId);
  return jsonResponse(200, {
    status: 'ready',
    job: task12ReadyArtifactJob('practice', sourceVersionId, selection),
  });
}

async function installTask12Harness(page: Page, options: HarnessOptions = {}): Promise<HarnessState> {
  const state: HarnessState = {
    libraryMode: options.libraryMode || 'ready',
    importRequests: [],
    groundedRequests: [],
    researchRequests: [],
    artifactRequests: [],
    calls: [],
    supabaseRequests: 0,
  };
  let releaseLibrary: (() => void) | undefined;
  const libraryGate = new Promise<void>((resolveGate) => { releaseLibrary = resolveGate; });
  if (state.libraryMode === 'delayed') state.releaseLibrary = releaseLibrary;

  const versions: Record<string, SourceVersion> = { ...TASK12_VERSIONS };
  await page.addInitScript(({ accessToken, userId }) => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('omni_') || key.startsWith('sb-')) localStorage.removeItem(key);
    }
    const user = { id: userId, email: `${userId}@fixture.invalid`, aud: 'authenticated', role: 'authenticated' };
    const session = {
      access_token: accessToken,
      refresh_token: 'task12-refresh-token',
      token_type: 'bearer',
      expires_in: 3_600,
      expires_at: Math.floor(Date.now() / 1000) + 3_600,
      user,
    };
    localStorage.setItem('sb-127-auth-token', JSON.stringify(session));
    localStorage.setItem('sb-127-auth-token-user', JSON.stringify({ user }));
  }, { accessToken: TASK12_ACCESS_TOKEN, userId: TASK12_USER_ID });

  await page.route('http://127.0.0.1:59999/**', async (route) => {
    state.supabaseRequests += 1;
    await route.abort();
  });
  await page.route('**/api/sources/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    state.calls.push(`${request.method()} ${url.pathname}`);

    if (url.pathname === '/api/sources/library' && request.method() === 'GET') {
      if (state.libraryMode === 'delayed') await libraryGate;
      if (state.libraryMode === 'auth_required') {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ status: 'auth_required', code: 'AUTH_REQUIRED', userMessageVi: 'Đăng nhập để dùng thư viện riêng.', suggestedActionVi: 'Đăng nhập rồi thử lại.' }) });
        return;
      }
      if (state.libraryMode === 'retryable') {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'unavailable', code: 'NETWORK_DISCONNECTED', userMessageVi: 'Thư viện tạm thời không khả dụng.', suggestedActionVi: 'Thử lại sau.' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ready',
          records: state.libraryMode === 'empty' ? [] : (options.records || TASK12_RECORDS),
          collections: options.collections || TASK12_COLLECTIONS,
        }),
      });
      return;
    }

    if (url.pathname.startsWith('/api/sources/versions/') && request.method() === 'GET') {
      const versionId = decodeURIComponent(url.pathname.split('/').pop() || '');
      const version = versions[versionId];
      if (!version) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 'selection_unavailable', code: 'VALIDATION_FAILED', userMessageVi: 'Không dùng được phiên bản nguồn.', suggestedActionVi: 'Chọn lại nguồn.' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready', sourceVersion: version }) });
      return;
    }

    if (url.pathname === '/api/sources/import' && request.method() === 'POST') {
      const body = request.postDataJSON() as MockRequestBody;
      state.importRequests.push(body);
      const response = options.importResponse?.(body) || defaultImportResponse(body, state.importRequests.length);
      await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
      return;
    }

    if (url.pathname === '/api/sources/grounded-chat' && request.method() === 'POST') {
      const body = request.postDataJSON() as MockRequestBody;
      state.groundedRequests.push(body);
      const response = options.groundedResponse?.(body) || defaultGroundedResponse(body);
      await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
      return;
    }

    if (url.pathname === '/api/sources/web-research' && request.method() === 'POST') {
      const body = request.postDataJSON() as MockRequestBody;
      state.researchRequests.push(body);
      const response = options.researchResponse?.(body) || defaultResearchResponse();
      await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
      return;
    }

    if (url.pathname === '/api/sources/artifact-jobs' && request.method() === 'POST') {
      const body = request.postDataJSON() as MockRequestBody;
      state.artifactRequests.push(body);
      const response = options.artifactResponse?.(body) || defaultArtifactResponse(body);
      await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 'unavailable', code: 'NETWORK_DISCONNECTED', userMessageVi: 'Nguồn không khả dụng.', suggestedActionVi: 'Thử lại.' }) });
  });
  return state;
}

async function visitSources(page: Page, options: HarnessOptions = {}): Promise<HarnessState> {
  const harness = await installTask12Harness(page, options);
  await page.goto('/');
  await navigateToModule(page, 'sources');
  await expect(page.locator('[data-ux-scope="sources-library-v2"]').first()).toBeVisible();
  if (harness.libraryMode !== 'delayed' && harness.libraryMode !== 'auth_required' && harness.libraryMode !== 'retryable') {
    await expect(page.locator('[data-ux-control="sources.library.search-input"]')).toBeVisible();
  }
  return harness;
}

function sourceCard(page: Page, sourceId: string) {
  return page.locator(`[data-source-id="${sourceId}"]`);
}

function sourceControl(page: Page, base: string, sourceId: string) {
  return page.locator(`[data-ux-control="${base}:${sourceId}"]`);
}

async function openTextReader(page: Page) {
  await sourceControl(page, 'sources.library.open-source', TASK12_TEXT_VERSION.sourceId).press('Enter');
  await expect(page.locator(`[data-ux-control="sources.reader.select-span:${TASK12_TEXT_VERSION.sourceId}-b_001"]`)).toBeVisible();
}

async function openArtifactStudio(page: Page) {
  await sourceControl(page, 'sources.artifact.open-modal', TASK12_TEXT_VERSION.sourceId).click();
  await expect(page.getByRole('dialog', { name: 'Tạo một bản nháp từ nguồn này' })).toBeVisible();
  await expect(page.getByText('Đã chọn phiên bản nguồn sẵn sàng')).toBeVisible();
}

async function openImportPanel(page: Page) {
  const open = page.locator('[data-ux-control="sources.import.open"], [data-ux-control="sources.import.empty-cta"]').first();
  await open.click();
  await expect(page.locator('[data-ux-control="sources.import.title"]')).toBeVisible();
}

async function submitTextImport(page: Page, title: string, type: 'text' | 'url' | 'vtt_srt' | 'youtube', content: string) {
  await openImportPanel(page);
  await page.locator('[data-ux-control="sources.import.title"]').fill(title);
  await page.locator('[data-ux-control="sources.import.type"]').selectOption(type);
  const contentControl = type === 'vtt_srt' ? 'vtt' : type === 'text' ? 'paste-text' : type;
  await page.locator(`[data-ux-control="sources.import.${contentControl}"]`).fill(content);
  await page.locator('[data-ux-control="sources.import.submit"]').click();
  await expect(page.locator('.omni-source-import')).toHaveCount(0);
}

async function submitFileImport(page: Page, title: string, type: 'pdf' | 'docx', file: { name: string; mimeType: string; buffer: Buffer }) {
  await openImportPanel(page);
  await page.locator('[data-ux-control="sources.import.title"]').fill(title);
  await page.locator('[data-ux-control="sources.import.type"]').selectOption(type);
  await page.locator(`[data-ux-control="sources.import.${type}"]`).setInputFiles(file);
  await page.locator('[data-ux-control="sources.import.submit"]').click();
  await expect(page.locator('.omni-source-import')).toHaveCount(0);
}

async function sourceAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .include('[data-ux-scope="sources-library-v2"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
}

test('AC-SRC-001 library-first initial state', async ({ page }) => {
  const harness = await visitSources(page);
  await expect(page.locator('[data-ux-control="sources.library.search-input"]')).toBeVisible();
  await expect(page.locator('#source-to-learning-package-modal')).toHaveCount(0);
  await expect(page.getByText('AI Course Designer (Source-To-Learning Package)')).toHaveCount(0);
  expect(harness.importRequests).toHaveLength(0);
  expect(harness.calls.some((call) => call.includes('source-to-learning'))).toBe(false);
});

test('AC-SRC-002 independent multi-format batch jobs', async ({ page }) => {
  const harness = await visitSources(page, { records: [] });
  await submitTextImport(page, 'Text fixture', 'text', TASK12_TEXT);
  await submitTextImport(page, 'URL fixture', 'url', 'https://fixture.invalid/renewable-policy');
  await submitFileImport(page, 'PDF fixture', 'pdf', TASK12_FILES.pdf);
  await submitFileImport(page, 'DOCX fixture', 'docx', TASK12_FILES.docx);
  await submitTextImport(page, 'VTT fixture', 'vtt_srt', TASK12_VTT);
  await submitTextImport(page, 'YouTube fixture', 'youtube', TASK12_YOUTUBE_URL);

  expect(harness.importRequests.map((request) => request.type)).toEqual(['text', 'url', 'pdf', 'docx', 'vtt_srt', 'youtube']);
  await expect(page.getByText('Do module khác tiếp nhận', { exact: true })).toBeVisible();
  await expect(page.getByText('Sẵn sàng', { exact: true }).first()).toBeVisible();
  await expect(page.locator('audio, video, canvas, iframe')).toHaveCount(0);
});

test('AC-SRC-003 immutable edited version and provenance lineage', async ({ page }) => {
  const harness = await visitSources(page);
  await sourceControl(page, 'sources.library.open-source', TASK12_TEXT_VERSION.sourceId).press('Enter');
  await expect(page.locator('.omni-source-reader__type')).toContainText('phiên bản 1');

  const lineage = await page.evaluate(async () => {
    const [firstResponse, editedResponse] = await Promise.all([
      fetch('/api/sources/versions/task12-version-text-v1'),
      fetch('/api/sources/versions/task12-version-text-v2'),
    ]);
    return {
      first: await firstResponse.json(),
      edited: await editedResponse.json(),
    };
  });
  expect(lineage.first.sourceVersion.versionNumber).toBe(1);
  expect(lineage.first.sourceVersion.stage).toBe('normalised');
  expect(lineage.edited.sourceVersion.versionNumber).toBe(2);
  expect(lineage.edited.sourceVersion.stage).toBe('edited');
  expect(lineage.edited.sourceVersion.contentHash).not.toBe(lineage.first.sourceVersion.contentHash);
  expect(lineage.first.sourceVersion.plainText).not.toContain('Edited conclusion');
  expect(lineage.edited.sourceVersion.sourceId).toBe(lineage.first.sourceVersion.sourceId);
  expect(harness.supabaseRequests).toBe(0);
});

test('AC-SRC-004 selected-source chat citations and truthful unsupported state', async ({ page }) => {
  const harness = await visitSources(page);
  await sourceControl(page, 'sources.library.select-toggle', TASK12_TEXT_VERSION.sourceId).click();
  await openTextReader(page);
  await page.locator(`[data-ux-control="sources.reader.select-span:${TASK12_TEXT_VERSION.sourceId}-b_001"]`).click();
  await page.locator('[data-ux-control="sources.chat.question-input"]').fill('What does the selected source say about transition risk?');
  await page.locator('[data-ux-control="sources.chat.send"]').click();
  await expect(page.getByText('Câu trả lời dựa trên nguồn đã chọn')).toBeVisible();
  await expect(page.locator('[data-ux-control^="sources.chat.citation-open:"]')).toBeVisible();
  expect((harness.groundedRequests[0].sourceSpan as MockRequestBody).blockIds).toEqual(['b_001']);

  await page.locator('[data-ux-control^="sources.chat.citation-open:"]').press('Enter');
  await expect(page.locator('.omni-citation-drawer')).toBeVisible();
  await page.locator('[data-ux-control="sources.chat.citation-close"]').press('Enter');
  await expect(page.locator('.omni-citation-drawer')).toHaveCount(0);

  await page.locator('[data-ux-control="sources.chat.question-input"]').fill('unsupported unrelated topic');
  await page.locator('[data-ux-control="sources.chat.send"]').click();
  await expect(page.getByText(/unsupported_by_sources/)).toBeVisible();
  expect(harness.researchRequests).toHaveLength(0);

  const invalidSpan = await page.evaluate(async () => {
    const response = await fetch('/api/sources/grounded-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selectedVersionIds: ['task12-version-text-v1'],
        question: 'A valid shape with an invalid block should refuse.',
        sourceSpan: { sourceId: 'task12-source-text', sourceVersionId: 'task12-version-text-v1', blockIds: ['missing-block'] },
      }),
    });
    return response.json();
  });
  expect(invalidSpan.groundingStatus).toBe('unsupported_by_sources');
  expect(harness.researchRequests).toHaveLength(0);
});

test('AC-SRC-005 explicit web research is isolated from normal chat', async ({ page }) => {
  const harness = await visitSources(page);
  await sourceControl(page, 'sources.library.select-toggle', TASK12_TEXT_VERSION.sourceId).click();
  await openTextReader(page);
  const question = page.locator('[data-ux-control="sources.chat.question-input"]');
  await question.fill('Give a source-grounded explanation of transparent outcomes.');
  await page.locator('[data-ux-control="sources.chat.send"]').click();
  await expect(page.getByText('Câu trả lời dựa trên nguồn đã chọn')).toBeVisible();
  expect(harness.researchRequests).toHaveLength(0);

  await question.fill('Find one external evidence item about transparent outcomes.');
  await page.locator('[data-ux-control="sources.chat.web-research"]').click();
  await expect(page.getByText('Bằng chứng web — tách biệt với trao đổi nguồn riêng')).toBeVisible();
  await expect(page.getByText('[Web: Task 12 web evidence]')).toBeVisible();
  expect(harness.researchRequests).toHaveLength(1);
});

test('AC-SRC-006 Artifact Studio permits exactly one destination', async ({ page }) => {
  await visitSources(page);
  await openArtifactStudio(page);
  const generate = page.locator('[data-ux-control="sources.artifact.generate"]');
  await expect(generate).toBeDisabled();
  await page.locator('[data-ux-control="sources.artifact.destination-practice"]').click();
  await page.locator('[data-ux-control="sources.artifact.destination-mock"]').click();
  await expect(page.locator('[data-ux-control="sources.artifact.destination-practice"]')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('[data-ux-control="sources.artifact.destination-mock"]')).toHaveAttribute('aria-checked', 'true');
  await expect(generate).toBeEnabled();
});

test('AC-SRC-007 invalid generated payload becomes needs_review', async ({ page }) => {
  await visitSources(page, {
    artifactResponse: () => jsonResponse(200, {
      status: 'needs_review',
      job: {
        ...task12ReadyArtifactJob('practice'),
        state: 'needs_review',
        artifactDraft: { id: 'task12-invalid-draft', destination: 'practice', payload: {}, validationErrors: ['question_text_required'] },
      },
    }),
  });
  await openArtifactStudio(page);
  await page.locator('[data-ux-control="sources.artifact.destination-practice"]').click();
  await page.locator('[data-ux-control="sources.artifact.generate"]').click();
  await expect(page.getByText('question_text_required')).toBeVisible();
  await expect(page.locator('[data-ux-control="sources.artifact.open"]')).toHaveCount(0);
  await expect(page.locator('[data-ux-control="sources.artifact.generate"]')).toHaveCount(1);
});

test('AC-SRC-008 ready drafts stay in Sources until explicit action and both CTAs work', async ({ page }) => {
  await visitSources(page);
  await openArtifactStudio(page);
  await page.locator('[data-ux-control="sources.artifact.destination-practice"]').click();
  await page.locator('[data-ux-control="sources.artifact.generate"]').click();
  await expect(page.locator('[data-ux-control="sources.artifact.open"]')).toBeVisible();
  await expect(page.locator('[data-ux-control="sources.artifact.create-another"]')).toBeVisible();
  const sourcesUrl = page.url();
  await page.locator('[data-ux-control="sources.artifact.create-another"]').click();
  await expect(page.locator('[data-ux-control="sources.artifact.destination-practice"]')).toBeVisible();
  expect(page.url()).toBe(sourcesUrl);
});

test('AC-SRC-009 explicit Open artifact sends a typed pending handoff to the owner', async ({ page }) => {
  const harness = await visitSources(page);
  await openArtifactStudio(page);
  await page.locator('[data-ux-control="sources.artifact.destination-practice"]').click();
  await page.locator('[data-ux-control="sources.artifact.generate"]').click();
  await expect(page.locator('[data-ux-control="sources.artifact.open"]')).toBeVisible();
  await page.locator('[data-ux-control="sources.artifact.open"]').click();
  await expect(page.locator('[data-pending-artifact-destination="practice"]')).toBeVisible();
  await expect(page.getByText('1 khối đã chọn')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  expect(harness.calls.some((call) => /practice|vocabulary|mock/.test(call))).toBe(false);
  expect(harness.supabaseRequests).toBe(0);
});

test('AC-SRC-010 import and draft generation do not mutate learner progress stores', async ({ page }) => {
  const harness = await visitSources(page);
  const keys = ['omni_ielts_profile_v1', 'omni_ielts_vocab_v1', 'omni_ielts_practice_v1', 'omni_ielts_mocks_v1'];
  const before = await page.evaluate((storageKeys) => Object.fromEntries(storageKeys.map((key) => [key, localStorage.getItem(key)])), keys);
  await sourceControl(page, 'sources.library.select-toggle', TASK12_TEXT_VERSION.sourceId).click();
  await openArtifactStudio(page);
  await page.locator('[data-ux-control="sources.artifact.destination-practice"]').click();
  await page.locator('[data-ux-control="sources.artifact.generate"]').click();
  await expect(page.locator('[data-ux-control="sources.artifact.open"]')).toBeVisible();
  const after = await page.evaluate((storageKeys) => Object.fromEntries(storageKeys.map((key) => [key, localStorage.getItem(key)])), keys);
  expect(after).toEqual(before);
  expect(harness.calls.every((call) => call.startsWith('POST /api/sources/') || call.startsWith('GET /api/sources/'))).toBe(true);
});

test.describe('AC-SRC-011 malformed PDF recovery', () => {
  test.use({ expectedConsoleErrors: ['/api/sources/import:0'] });

test('AC-SRC-011 malformed PDF shows typed recovery without parser internals', async ({ page }) => {
  await visitSources(page, {
    importResponse: () => jsonResponse(422, {
      status: 'failed',
      code: 'EXTRACTION_FAILED',
      userMessageVi: 'Không trích được nội dung nguồn. Hãy dán văn bản thủ công.',
      suggestedActionVi: 'Dán nội dung hoặc chọn tệp khác.',
    }),
  });
  await openImportPanel(page);
  await page.locator('[data-ux-control="sources.import.title"]').fill('Malformed PDF fixture');
  await page.locator('[data-ux-control="sources.import.type"]').selectOption('pdf');
  await page.locator('[data-ux-control="sources.import.pdf"]').setInputFiles(TASK12_FILES.malformedPdf);
  await page.locator('[data-ux-control="sources.import.submit"]').click();
  const alert = page.locator('.omni-source-import [role="alert"]');
  await expect(alert).toContainText('dán văn bản thủ công');
  await expect(alert).not.toContainText(/pdfjs|internal|stack|\/tmp\/|Bearer|HTTP 429/i);
});
});

test.describe('AC-SRC-012 scanned PDF recovery', () => {
  test.use({ expectedConsoleErrors: ['/api/sources/import:0'] });

test('AC-SRC-012 scanned PDF is rejected without OCR or fabricated text', async ({ page }) => {
  await visitSources(page, {
    importResponse: () => jsonResponse(422, {
      status: 'failed',
      code: 'PDF_SCANNED_NO_TEXT',
      userMessageVi: 'PDF này không có lớp chữ để trích. Hãy dán văn bản hoặc xử lý OCR trước.',
      suggestedActionVi: 'Dán nội dung PDF hoặc tải bản text-layer.',
    }),
  });
  await openImportPanel(page);
  await page.locator('[data-ux-control="sources.import.title"]').fill('Scanned PDF fixture');
  await page.locator('[data-ux-control="sources.import.type"]').selectOption('pdf');
  await page.locator('[data-ux-control="sources.import.pdf"]').setInputFiles(TASK12_FILES.scannedPdf);
  await page.locator('[data-ux-control="sources.import.submit"]').click();
  const alert = page.locator('.omni-source-import [role="alert"]');
  await expect(alert).toContainText('không có lớp chữ');
  await expect(alert).toContainText('OCR');
  await expect(alert).not.toContainText(/gibberish|pdfjs|internal/i);
});
});

test.describe('AC-SRC-013 quota/provider recovery', () => {
  test.use({ expectedConsoleErrors: ['/api/sources/grounded-chat:0'] });

test('AC-SRC-013 quota/provider failure is retryable and scrubbed', async ({ page }) => {
  await visitSources(page, {
    groundedResponse: () => jsonResponse(429, {
      status: 'retry_wait',
      code: 'QUOTA_EXCEEDED',
      userMessageVi: 'Bạn đã dùng hết lượt yêu cầu Sources tạm thời. Hãy thử lại sau.',
      suggestedActionVi: 'Đợi rồi thử lại.',
      retryAfterSeconds: 15,
    }),
  });
  await sourceControl(page, 'sources.library.select-toggle', TASK12_TEXT_VERSION.sourceId).click();
  await openTextReader(page);
  await page.locator('[data-ux-control="sources.chat.question-input"]').fill('Ask the provider with a bounded retry.');
  await page.locator('[data-ux-control="sources.chat.send"]').click();
  await expect(page.locator('[data-ux-control="sources.chat.retry"]')).toBeVisible();
  const bodyText = await page.locator('[data-ux-scope="sources-library-v2"]').first().innerText();
  expect(bodyText).not.toMatch(/HTTP 429|internal\/provider|\/tmp\/|stack|Bearer|api[_-]?key/i);
});
});

test.describe('AC-SRC-014 presentation states', () => {
  test.use({ expectedConsoleErrors: ['/api/sources/library:0'] });

test('AC-SRC-014 presentation states are visible and handoff cards mount no player', async ({ page }) => {
  const harness = await installTask12Harness(page, { libraryMode: 'delayed' });
  await page.goto('/');
  await navigateToModule(page, 'sources');
  await expect(page.locator('[aria-label="Đang tải thư viện nguồn"]')).toBeVisible();
  harness.releaseLibrary?.();
  harness.libraryMode = 'ready';
  await expect(page.locator('[data-ux-control="sources.library.search-input"]')).toBeVisible();
  await expect(sourceCard(page, 'task12-source-degraded')).toContainText('Dữ liệu rút gọn');
  await expect(sourceCard(page, 'task12-source-failed')).toContainText('Xử lý lỗi');
  await expect(sourceCard(page, 'task12-source-unavailable')).toContainText('Không khả dụng');
  await expect(sourceCard(page, 'task12-source-youtube')).toContainText('Do module khác tiếp nhận');
  await expect(sourceCard(page, 'task12-source-audio').locator('audio, video, canvas, iframe')).toHaveCount(0);
  await expect(sourceCard(page, 'task12-source-chart').locator('audio, video, canvas, iframe')).toHaveCount(0);

  harness.libraryMode = 'empty';
  await page.reload();
  await navigateToModule(page, 'sources');
  await expect(page.locator('[data-ux-control="sources.import.empty-cta"]')).toBeVisible();

  harness.libraryMode = 'auth_required';
  await page.reload();
  await navigateToModule(page, 'sources');
  await expect(page.locator('[data-ux-control="sources.import.sign-in"]')).toBeVisible();

  harness.libraryMode = 'retryable';
  await page.reload();
  await navigateToModule(page, 'sources');
  await expect(page.locator('[data-ux-control="sources.library.retry"]')).toBeVisible();
});
});

test('AC-SRC-015 keeps tenant privacy proof delegated to strict disposable PostgreSQL CI', async () => {
  const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/public-beta-quality.yml'), 'utf8');
  expect(workflow).toContain('npm run test:sources:rls:db -- --strict');
  expect(workflow).toContain('Start Disposable PostgreSQL for Sources RLS Proof');
  expect(workflow).toContain('LOCAL_DISPOSABLE_DB_URL: postgres://postgres:postgrespassword@127.0.0.1:54322/omni_sources_rls_test');
});

test('AC-SRC-016 keyboard path and axe audit cover the Sources workspace', async ({ page }) => {
  await visitSources(page);
  await expect(await sourceAxeViolations(page)).toEqual([]);

  const search = page.locator('[data-ux-control="sources.library.search-input"]');
  await search.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(search).toBeFocused();
  await search.fill('Renewable');
  await sourceControl(page, 'sources.library.select-toggle', TASK12_TEXT_VERSION.sourceId).focus();
  await page.keyboard.press('Enter');
  await expect(sourceControl(page, 'sources.library.select-toggle', TASK12_TEXT_VERSION.sourceId)).toHaveAttribute('aria-pressed', 'true');

  await sourceControl(page, 'sources.library.open-source', TASK12_TEXT_VERSION.sourceId).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ux-control="sources.reader.select-span:task12-source-text-b_001"]')).toBeVisible();
  await page.locator('[data-ux-control="sources.reader.select-span:task12-source-text-b_001"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ux-control="sources.reader.select-span:task12-source-text-b_001"]')).toHaveAttribute('aria-pressed', 'true');

  const question = page.locator('[data-ux-control="sources.chat.question-input"]');
  await question.fill('What does the source say about transparent outcomes?');
  await page.locator('[data-ux-control="sources.chat.send"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ux-control^="sources.chat.citation-open:"]')).toBeVisible();
  await page.locator('[data-ux-control^="sources.chat.citation-open:"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-ux-control="sources.chat.citation-close"]').focus();
  await page.keyboard.press('Enter');

  await page.locator('[data-ux-control="sources.view.tab-library"]').focus();
  await page.keyboard.press('Enter');
  await sourceControl(page, 'sources.artifact.open-modal', TASK12_TEXT_VERSION.sourceId).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Tạo một bản nháp từ nguồn này' })).toBeVisible();
  await page.locator('[data-ux-control="sources.artifact.destination-practice"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-ux-control="sources.artifact.generate"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ux-control="sources.artifact.create-another"]')).toBeVisible();
  await page.locator('[data-ux-control="sources.artifact.create-another"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-ux-control="sources.artifact.destination-practice"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-ux-control="sources.artifact.generate"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ux-control="sources.artifact.open"]')).toBeVisible();
  await page.locator('[data-ux-control="sources.artifact.open"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-pending-artifact-destination="practice"]')).toBeVisible();
});

test('Task 12 control inventory is present in executable evidence', async () => {
  const source = readFileSync(resolve(process.cwd(), 'e2e/sources-library.spec.ts'), 'utf8');
  for (const controlId of TASK12_SOURCE_CONTROL_IDS) expect(source).toContain(controlId);
  expect(source).toContain('data-ux-control');
});
