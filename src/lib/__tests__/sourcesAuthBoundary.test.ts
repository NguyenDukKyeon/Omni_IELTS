import { describe, expect, it, vi } from 'vitest';
import {
  handleGroundedChatRequest,
  handleWebResearchRequest,
} from '../sources/groundedChat';
import { verifyLearnerAccessToken } from '../sources/sourcesRepository.server';
import { SourceRecord, SourceVersion } from '../../types/sources';

const FORGED_BEARER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmb3JnZXIiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.forged-signature';

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

describe('Sources Auth verification (JWT before any cloud call)', () => {
  it('classifies a forged JWT as auth_required using only URL + anon key', async () => {
    const getUser = vi.fn(async () => ({
      user: null,
      error: { status: 401, message: 'invalid JWT' },
    }));

    const result = await verifyLearnerAccessToken({
      accessToken: FORGED_BEARER,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-public-key',
      getUser,
    });

    expect(result).toEqual({ status: 'auth_required' });
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith(FORGED_BEARER);
    expect(JSON.stringify(result)).not.toMatch(/Bearer|service_role|anon-public-key|FORGED_BEARER/i);
  });

  it('classifies malformed tokens as auth_required without calling Supabase Auth', async () => {
    const getUser = vi.fn();
    const result = await verifyLearnerAccessToken({
      accessToken: 'not-a-jwt',
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-public-key',
      getUser,
    });
    expect(result).toEqual({ status: 'auth_required' });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('classifies Supabase transport failures as unavailable, not auth_required', async () => {
    const getUser = vi.fn(async () => {
      throw new Error('fetch failed');
    });
    const result = await verifyLearnerAccessToken({
      accessToken: FORGED_BEARER,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-public-key',
      getUser,
    });
    expect(result).toEqual({ status: 'unavailable' });
  });

  it('never accepts a service-role key as the verifier credential', async () => {
    const getUser = vi.fn();
    const result = await verifyLearnerAccessToken({
      accessToken: FORGED_BEARER,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig',
      getUser,
    });
    expect(result).toEqual({ status: 'unavailable' });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('does not call webSearch for a forged bearer token', async () => {
    const webSearch = vi.fn(async () => ({
      webCitations: [{ title: 'should not leak', url: 'https://example.org/secret' }],
    }));
    const verifyAccessToken = vi.fn(async () => ({ status: 'auth_required' as const }));

    const result = await handleWebResearchRequest({
      featureEnabled: true,
      authorizationHeader: `Bearer ${FORGED_BEARER}`,
      body: { question: 'What is a subsidy?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken,
      webSearch,
    });

    expect(result.status).toBe(401);
    expect(result.body.status).toBe('auth_required');
    expect(result.body.code).toBe('AUTH_REQUIRED');
    expect(webSearch).not.toHaveBeenCalled();
    expect(verifyAccessToken).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result.body)).not.toMatch(/Bearer|forged-signature|service.role|api[_-]?key/i);
  });

  it('does not call webSearch when the bearer is only syntactically present and unverified', async () => {
    const webSearch = vi.fn(async () => ({
      webCitations: [{ title: 'Brave hit', url: 'https://example.org' }],
    }));
    const result = await handleWebResearchRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer totally-syntactically-valid-token',
      body: { question: 'What is a subsidy?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      webSearch,
    });
    expect(result.status).toBe(401);
    expect(result.body.status).toBe('auth_required');
    expect(webSearch).not.toHaveBeenCalled();
  });

  it('returns unavailable 503 on Auth transport failure and still does not call Brave', async () => {
    const webSearch = vi.fn();
    const result = await handleWebResearchRequest({
      featureEnabled: true,
      authorizationHeader: `Bearer ${FORGED_BEARER}`,
      body: { question: 'What is a subsidy?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken: async () => ({ status: 'unavailable' }),
      webSearch,
    });
    expect(result.status).toBe(503);
    expect(result.body.status).toBe('unavailable');
    expect(webSearch).not.toHaveBeenCalled();
  });

  it('calls webSearch only after a verified learner identity', async () => {
    const webSearch = vi.fn(async () => ({
      webCitations: [{ title: 'OECD note', url: 'https://example.org/oecd' }],
    }));
    const verifyAccessToken = vi.fn(async (accessToken: string) => ({
      status: 'ok' as const,
      userId: 'user_1',
      accessToken,
    }));
    const result = await handleWebResearchRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { question: 'What is a subsidy?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      verifyAccessToken,
      webSearch,
    });
    expect(result.status).toBe(200);
    expect(verifyAccessToken).toHaveBeenCalledWith('learner-jwt');
    expect(webSearch).toHaveBeenCalledTimes(1);
  });

  it('does not hydrate sources or call the router for a forged grounded-chat bearer', async () => {
    const routerExecute = vi.fn();
    const webSearch = vi.fn();
    const getSelectedVersions = vi.fn();
    const repositoryForToken = vi.fn(() => ({ getSelectedVersions }));
    const result = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: `Bearer ${FORGED_BEARER}`,
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: async () => ({ status: 'auth_required' }),
      repositoryForToken,
      routerExecute,
      webSearch,
    });
    expect(result.status).toBe(401);
    expect(result.body.status).toBe('auth_required');
    expect(repositoryForToken).not.toHaveBeenCalled();
    expect(getSelectedVersions).not.toHaveBeenCalled();
    expect(routerExecute).not.toHaveBeenCalled();
    expect(webSearch).not.toHaveBeenCalled();
  });

  it('reuses the verified learner identity for grounded chat before hydration', async () => {
    const routerExecute = vi.fn(async () => ({
      value: {
        groundingStatus: 'fully_grounded',
        answer: 'Solar subsidies reduce macroeconomic risk [Source: Macroeconomics, §b_001].',
        citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_001' }],
        webCitations: [],
      },
    }));
    const repositoryForToken = vi.fn((accessToken: string) => {
      expect(accessToken).toBe('learner-jwt');
      return {
        getSelectedVersions: vi.fn(async () => ({
          status: 'ok' as const,
          items: [{ version: selected, record }],
        })),
      };
    });
    const verifyAccessToken = vi.fn(async (accessToken: string) => ({
      status: 'ok' as const,
      userId: 'u1',
      accessToken,
    }));

    const result = await handleGroundedChatRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken,
      repositoryForToken,
      routerExecute,
    });

    expect(verifyAccessToken).toHaveBeenCalledWith('learner-jwt');
    expect(verifyAccessToken.mock.invocationCallOrder[0]).toBeLessThan(repositoryForToken.mock.invocationCallOrder[0]);
    expect(result.status).toBe(200);
    expect(routerExecute).toHaveBeenCalledTimes(1);
  });
});
