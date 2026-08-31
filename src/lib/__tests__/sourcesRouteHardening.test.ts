import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { consumeFixedWindowQuota } from '../mediaImport';
import {
  GROUNDED_CHAT_QUESTION_MAX_CHARS,
  handleGroundedChatRequest,
  handleWebResearchRequest,
} from '../sources/groundedChat';
import { SourceRecord, SourceVersion } from '../../types/sources';

const FORGED_BEARER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmb3JnZXIiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.forged-signature';
const SECRET_KEY = 'AIzaSyA1234567890abcdefghijklmnopqrstu';
const LEAKY_SOURCE_ID = 'src_leaky_should_never_appear';

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

const groundedValue = {
  groundingStatus: 'fully_grounded' as const,
  answer: 'Solar subsidies reduce macroeconomic risk [Source: Macroeconomics, §b_001].',
  citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_001' }],
  webCitations: [],
};

function ownedRepo() {
  return {
    getSelectedVersions: vi.fn(async () => ({
      status: 'ok' as const,
      items: [{ version: selected, record }],
    })),
  };
}

function verified(userId = 'u1') {
  return vi.fn(async (accessToken: string) => ({
    status: 'ok' as const,
    userId,
    accessToken,
  }));
}

function successRouter() {
  return vi.fn(async () => ({
    value: groundedValue,
    provider: 'gemini',
    model: 'gemini-3.7-flash',
  }));
}

function assertSafeBody(body: unknown) {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/Bearer|forged-signature|service.role|api[_-]?key|AIza|gsk_|ya29\.|sk-proj|HTTP 429|internal\/provider|OMNI_SOURCES_LIBRARY_V2|sources_library_v2|plainText/i);
  expect(serialized).not.toContain(SECRET_KEY);
  expect(serialized).not.toContain(LEAKY_SOURCE_ID);
  expect(serialized).not.toContain(FORGED_BEARER);
}

function createClockedQuota(input: {
  chatLimit: number;
  webLimit: number;
  windowMs: number;
  now: () => number;
}) {
  const chatWindows = new Map();
  const webWindows = new Map();
  return ({ bucket, userId }: { bucket: 'grounded-chat' | 'web-research'; userId: string }) => consumeFixedWindowQuota(
    bucket === 'grounded-chat' ? chatWindows : webWindows,
    userId,
    input.now(),
    bucket === 'grounded-chat' ? input.chatLimit : input.webLimit,
    input.windowMs,
  );
}

describe('Sources API feature-flag kill switch', () => {
  it('fails closed on grounded-chat when the flag is off before any injected dependency', async () => {
    const verifyAccessToken = verified();
    const getSelectedVersions = vi.fn();
    const repositoryForToken = vi.fn(() => ({ getSelectedVersions }));
    const routerExecute = successRouter();
    const webSearch = vi.fn();
    const consumeQuota = vi.fn();

    const result = await handleGroundedChatRequest({
      featureEnabled: false,
      authorizationHeader: 'Bearer learner-jwt',
      body: {
        selectedVersionIds: [LEAKY_SOURCE_ID, 'v_01'],
        question: `What leaked ${SECRET_KEY}?`,
      },
      cloudConfigured: true,
      verifyAccessToken,
      repositoryForToken,
      routerExecute,
      webSearch,
      consumeQuota,
    });

    expect(result.status).toBe(403);
    expect(result.body.status).toBe('feature_disabled');
    expect(result.body.code).toBe('FEATURE_DISABLED');
    expect(String(result.body.userMessageVi || '')).toMatch(/không|chưa/i);
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(repositoryForToken).not.toHaveBeenCalled();
    expect(getSelectedVersions).not.toHaveBeenCalled();
    expect(routerExecute).not.toHaveBeenCalled();
    expect(webSearch).not.toHaveBeenCalled();
    expect(consumeQuota).not.toHaveBeenCalled();
    assertSafeBody(result.body);
  });

  it('fails closed on web-research when the flag is off before JWT, quota, or Brave', async () => {
    const verifyAccessToken = verified();
    const webSearch = vi.fn(async () => ({
      webCitations: [{ title: 'should not leak', url: 'https://example.org/secret' }],
    }));
    const consumeQuota = vi.fn();

    const result = await handleWebResearchRequest({
      featureEnabled: false,
      authorizationHeader: `Bearer ${FORGED_BEARER}`,
      body: { question: `Find ${SECRET_KEY} about ${LEAKY_SOURCE_ID}` },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken,
      webSearch,
      consumeQuota,
    });

    expect(result.status).toBe(403);
    expect(result.body.status).toBe('feature_disabled');
    expect(result.body.code).toBe('FEATURE_DISABLED');
    expect(result.body).toEqual(expect.objectContaining({
      status: 'feature_disabled',
      code: 'FEATURE_DISABLED',
    }));
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(webSearch).not.toHaveBeenCalled();
    expect(consumeQuota).not.toHaveBeenCalled();
    assertSafeBody(result.body);
  });

  it('uses the same typed feature-disabled body for both routes', async () => {
    const chat = await handleGroundedChatRequest({
      featureEnabled: false,
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What?' },
      cloudConfigured: true,
      verifyAccessToken: verified(),
      repositoryForToken: () => ownedRepo(),
      routerExecute: successRouter(),
    });
    const web = await handleWebResearchRequest({
      featureEnabled: false,
      authorizationHeader: 'Bearer learner-jwt',
      body: { question: 'What?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken: verified(),
      webSearch: vi.fn(),
    });
    expect(chat.status).toBe(web.status);
    expect(chat.body.status).toBe(web.body.status);
    expect(chat.body.code).toBe(web.body.code);
    expect(chat.body.userMessageVi).toBe(web.body.userMessageVi);
  });
});

describe('Sources verified-user quota', () => {
  it('allows a verified learner under the grounded-chat quota and then 429s with zero further repo/router calls', async () => {
    let now = 1_000;
    const consumeQuota = createClockedQuota({
      chatLimit: 1,
      webLimit: 10,
      windowMs: 60_000,
      now: () => now,
    });
    const repo = ownedRepo();
    const repositoryForToken = vi.fn(() => repo);
    const routerExecute = successRouter();
    const webSearch = vi.fn();

    const under = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: verified('learner-a'),
      repositoryForToken,
      routerExecute,
      webSearch,
      consumeQuota,
    });
    expect(under.status).toBe(200);
    expect(under.body.groundingStatus).toBe('fully_grounded');
    expect(repositoryForToken).toHaveBeenCalledTimes(1);
    expect(routerExecute).toHaveBeenCalledTimes(1);

    const over = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: verified('learner-a'),
      repositoryForToken,
      routerExecute,
      webSearch,
      consumeQuota,
    });

    expect(over.status).toBe(429);
    expect(over.body.status).toBe('quota_exceeded');
    expect(over.body.code).toBe('QUOTA_EXCEEDED');
    expect(over.headers?.['Retry-After']).toBe(String(over.body.retryAfterSeconds));
    expect(Number(over.body.retryAfterSeconds)).toBeGreaterThan(0);
    expect(String(over.body.userMessageVi || '')).toMatch(/thử lại|hạn|phút/i);
    expect(repositoryForToken).toHaveBeenCalledTimes(1);
    expect(routerExecute).toHaveBeenCalledTimes(1);
    expect(webSearch).not.toHaveBeenCalled();
    assertSafeBody(over.body);
    expect(JSON.stringify(over.body)).not.toContain('HTTP 429');
  });

  it('tracks web-research quota separately from grounded chat for the same verified user', async () => {
    const consumeQuota = createClockedQuota({
      chatLimit: 1,
      webLimit: 1,
      windowMs: 60_000,
      now: () => 5_000,
    });
    const routerExecute = successRouter();
    const webSearch = vi.fn(async () => ({
      webCitations: [{ title: 'OECD note', url: 'https://example.org/oecd' }],
    }));
    const verifyAccessToken = verified('learner-a');

    const chat = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken,
      repositoryForToken: () => ownedRepo(),
      routerExecute,
      consumeQuota,
    });
    expect(chat.status).toBe(200);

    const webUnder = await handleWebResearchRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { question: 'What is a subsidy?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken,
      webSearch,
      consumeQuota,
    });
    expect(webUnder.status).toBe(200);
    expect(webSearch).toHaveBeenCalledTimes(1);

    const webOver = await handleWebResearchRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { question: 'What is a subsidy again?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken,
      webSearch,
      consumeQuota,
    });
    expect(webOver.status).toBe(429);
    expect(webOver.body.status).toBe('quota_exceeded');
    expect(webOver.headers?.['Retry-After']).toBe(String(webOver.body.retryAfterSeconds));
    expect(webSearch).toHaveBeenCalledTimes(1);
    assertSafeBody(webOver.body);

    const chatOver = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'Another chat?' },
      cloudConfigured: true,
      verifyAccessToken,
      repositoryForToken: () => ownedRepo(),
      routerExecute,
      consumeQuota,
    });
    expect(chatOver.status).toBe(429);
    expect(routerExecute).toHaveBeenCalledTimes(1);
  });

  it('never consumes quota for a forged JWT', async () => {
    const consumeQuota = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));
    const repositoryForToken = vi.fn(() => ownedRepo());
    const routerExecute = successRouter();
    const webSearch = vi.fn();

    const chat = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: `Bearer ${FORGED_BEARER}`,
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: async () => ({ status: 'auth_required' }),
      repositoryForToken,
      routerExecute,
      webSearch,
      consumeQuota,
    });
    const web = await handleWebResearchRequest({
      featureEnabled: true,
      authorizationHeader: `Bearer ${FORGED_BEARER}`,
      body: { question: 'What is a subsidy?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken: async () => ({ status: 'auth_required' }),
      webSearch,
      consumeQuota,
    });

    expect(chat.status).toBe(401);
    expect(web.status).toBe(401);
    expect(consumeQuota).not.toHaveBeenCalled();
    expect(repositoryForToken).not.toHaveBeenCalled();
    expect(routerExecute).not.toHaveBeenCalled();
    expect(webSearch).not.toHaveBeenCalled();
    assertSafeBody(chat.body);
    assertSafeBody(web.body);
  });

  it('keys quota by verified userId, not bearer text, and resets after the configured window', async () => {
    let now = 0;
    const consumeQuota = createClockedQuota({
      chatLimit: 1,
      webLimit: 1,
      windowMs: 60_000,
      now: () => now,
    });
    const routerExecute = successRouter();
    const first = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer token-one',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: async () => ({ status: 'ok', userId: 'same-user', accessToken: 'token-one' }),
      repositoryForToken: () => ownedRepo(),
      routerExecute,
      consumeQuota,
    });
    const secondBearer = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer token-two',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: async () => ({ status: 'ok', userId: 'same-user', accessToken: 'token-two' }),
      repositoryForToken: () => ownedRepo(),
      routerExecute,
      consumeQuota,
    });
    expect(first.status).toBe(200);
    expect(secondBearer.status).toBe(429);
    expect(routerExecute).toHaveBeenCalledTimes(1);

    now = 61_000;
    const afterWindow = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer token-three',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: async () => ({ status: 'ok', userId: 'same-user', accessToken: 'token-three' }),
      repositoryForToken: () => ownedRepo(),
      routerExecute,
      consumeQuota,
    });
    expect(afterWindow.status).toBe(200);
    expect(routerExecute).toHaveBeenCalledTimes(2);
  });

  it('does not let one verified learner consume another learner’s quota', async () => {
    const consumeQuota = createClockedQuota({
      chatLimit: 1,
      webLimit: 1,
      windowMs: 60_000,
      now: () => 10_000,
    });
    const routerExecute = successRouter();
    const first = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer a',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: verified('user-a'),
      repositoryForToken: () => ownedRepo(),
      routerExecute,
      consumeQuota,
    });
    const other = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer b',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: verified('user-b'),
      repositoryForToken: () => ownedRepo(),
      routerExecute,
      consumeQuota,
    });
    expect(first.status).toBe(200);
    expect(other.status).toBe(200);
    expect(routerExecute).toHaveBeenCalledTimes(2);
  });
});

describe('Bounded web-research question policy', () => {
  it('rejects an oversized web-search question before Brave and without leaking the payload', async () => {
    const webSearch = vi.fn();
    const consumeQuota = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));
    const hugeQuestion = 'Q'.repeat(GROUNDED_CHAT_QUESTION_MAX_CHARS + 1);

    const result = await handleWebResearchRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { question: hugeQuestion },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken: verified(),
      webSearch,
      consumeQuota,
    });

    expect(result.status).toBe(400);
    expect(result.body.status).toBe('select_smaller_source');
    expect(result.body.code).toBe('INVALID_INPUT');
    expect(webSearch).not.toHaveBeenCalled();
    expect(JSON.stringify(result.body)).not.toContain('Q'.repeat(50));
    assertSafeBody(result.body);
  });
});

describe('Sources quota env parser', () => {
  it('documents bounded in-process defaults without claiming paid pricing or durability', async () => {
    const { parseSourcesQuotaEnv } = await import('../sources/quota.server');
    expect(parseSourcesQuotaEnv({})).toEqual({
      groundedChat: { limit: 20, windowMs: 3_600_000 },
      webResearch: { limit: 10, windowMs: 3_600_000 },
      sourceImport: { limit: 30, windowMs: 3_600_000 },
      artifactGeneration: { limit: 10, windowMs: 3_600_000 },
    });
    expect(parseSourcesQuotaEnv({
      OMNI_SOURCES_GROUNDED_CHAT_QUOTA_LIMIT: '999999',
      OMNI_SOURCES_GROUNDED_CHAT_QUOTA_WINDOW_MS: '10',
      OMNI_SOURCES_WEB_RESEARCH_QUOTA_LIMIT: '0',
      OMNI_SOURCES_WEB_RESEARCH_QUOTA_WINDOW_MS: '999999999',
      OMNI_SOURCES_IMPORT_QUOTA_LIMIT: '999999',
      OMNI_SOURCES_IMPORT_QUOTA_WINDOW_MS: '10',
      OMNI_SOURCES_ARTIFACT_GENERATION_QUOTA_LIMIT: '0',
      OMNI_SOURCES_ARTIFACT_GENERATION_QUOTA_WINDOW_MS: '999999999',
    })).toEqual({
      groundedChat: { limit: 100, windowMs: 60_000 },
      webResearch: { limit: 1, windowMs: 86_400_000 },
      sourceImport: { limit: 100, windowMs: 60_000 },
      artifactGeneration: { limit: 1, windowMs: 86_400_000 },
    });
    expect(parseSourcesQuotaEnv({
      OMNI_SOURCES_GROUNDED_CHAT_QUOTA_LIMIT: 'not-a-number',
    }).groundedChat.limit).toBe(20);
  });
});

describe('Sources route wiring', () => {
  const serverSource = readFileSync('server.ts', 'utf8');

  function routeBody(route: string, nextMarker: string): string {
    const start = serverSource.indexOf(route);
    const end = serverSource.indexOf(nextMarker, start + 1);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return serverSource.slice(start, end);
  }

  it('gates every Sources cloud route on the same server flag before handlers run', () => {
    const chat = routeBody(
      "app.post('/api/sources/grounded-chat'",
      "app.post('/api/sources/web-research'",
    );
    const web = routeBody(
      "app.post('/api/sources/web-research'",
      'const ConsentActionSchema',
    );
    expect(chat).toMatch(/parseSourcesLibraryV2Env\s*\(\s*process\.env\s*\)/);
    expect(web).toMatch(/parseSourcesLibraryV2Env\s*\(\s*process\.env\s*\)/);
    expect(chat).toMatch(/featureEnabled/);
    expect(web).toMatch(/featureEnabled/);
    expect(chat).toMatch(/consumeQuota/);
    expect(web).toMatch(/consumeQuota/);
    expect(chat).toMatch(/Retry-After/);
    expect(web).toMatch(/Retry-After/);
    for (const route of [
      "app.get('/api/sources/library'",
      "app.get('/api/sources/versions/:versionId'",
      "app.post('/api/sources/import'",
      "app.post('/api/sources/artifact-jobs'",
      "app.get('/api/sources/artifact-jobs/:jobId'",
    ]) {
      const start = serverSource.indexOf(route);
      expect(start).toBeGreaterThan(-1);
      const next = serverSource.indexOf('\napp.', start + route.length);
      const body = serverSource.slice(start, next === -1 ? undefined : next);
      expect(body).toMatch(/parseSourcesLibraryV2Env\s*\(\s*process\.env\s*\)/);
      expect(body).toMatch(/featureEnabled/);
    }
  });
});
