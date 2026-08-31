import { describe, expect, it, vi } from 'vitest';
import {
  buildGroundedContext,
  executeGroundedChat,
  GroundedChatResponseSchema,
  handleGroundedChatRequest,
  handleWebResearchRequest,
  validateGroundedCitations,
} from '../sources/groundedChat';
import { SourceRecord, SourceVersion } from '../../types/sources';
import { normalizeSourceError } from '../sources/sourceErrors';
import { AI_TASK_PROFILES } from '../aiTaskProfiles';

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

const handoffVersion: SourceVersion = {
  ...selected,
  id: 'v_yt',
  sourceId: 's_yt',
  plainText: '',
  blocks: [],
  wordCount: 0,
};

const handoffRecord: SourceRecord = {
  ...record,
  id: 's_yt',
  title: 'Lecture',
  type: 'youtube',
  currentVersionId: '',
  processingState: 'handoff_required',
  provenance: {
    ...record.provenance,
    originType: 'youtube_import',
    owningModule: 'media',
    rightsState: 'restricted_citation_only',
    canonicalCitation: 'YouTube lecture',
  },
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

describe('Grounded Chat HTTP boundary', () => {
  const ownedRepo = {
    getSelectedVersions: vi.fn(async (ids: readonly string[]) => {
      if (ids.length === 1 && ids[0] === 'v_01') {
        return { status: 'ok' as const, items: [{ version: selected, record }] };
      }
      return { status: 'selection_unavailable' as const };
    }),
  };

  it('returns auth_required and does not call the provider when the bearer JWT is missing', async () => {
    const routerExecute = vi.fn();
    const webSearch = vi.fn();
    const result = await handleGroundedChatRequest({
      authorizationHeader: undefined,
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      repositoryForToken: () => ownedRepo,
      routerExecute,
      webSearch,
    });

    expect(result.status).toBe(401);
    expect(result.body.status).toBe('auth_required');
    expect(result.body.code).toBe('AUTH_REQUIRED');
    expect(routerExecute).not.toHaveBeenCalled();
    expect(webSearch).not.toHaveBeenCalled();
    expect(JSON.stringify(result.body)).not.toMatch(/Bearer|ya29|service.role|plainText/i);
  });

  it('returns a non-disclosing selection failure for unknown or foreign IDs and skips the provider', async () => {
    const routerExecute = vi.fn();
    const foreign = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_foreign'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      repositoryForToken: () => ownedRepo,
      routerExecute,
      webSearch: vi.fn(),
    });
    const missing = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_missing'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      repositoryForToken: () => ownedRepo,
      routerExecute,
      webSearch: vi.fn(),
    });

    expect(foreign.body).toEqual(missing.body);
    expect(foreign.body.status).toBe('selection_unavailable');
    expect(JSON.stringify(foreign.body)).not.toMatch(/foreign|not found|does not exist|v_foreign|another learner/i);
    expect(routerExecute).not.toHaveBeenCalled();
  });

  it('does not call the provider when hydrated context is invalid or handoff-only', async () => {
    const routerExecute = vi.fn();
    const handoffRepo = {
      getSelectedVersions: vi.fn(async () => ({
        status: 'ok' as const,
        items: [{ version: handoffVersion, record: handoffRecord }],
      })),
    };
    const result = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_yt'], question: 'Summarise the lecture.' },
      cloudConfigured: true,
      repositoryForToken: () => handoffRepo,
      routerExecute,
      webSearch: vi.fn(),
    });

    expect(routerExecute).not.toHaveBeenCalled();
    expect(result.body.groundingStatus ?? result.body.status).toMatch(/unsupported_by_sources|selection_unavailable|unavailable/);
  });

  it('executes private-source chat through the balanced profile with empty tools', async () => {
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
    const webSearch = vi.fn();
    const result = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      repositoryForToken: () => ownedRepo,
      routerExecute,
      webSearch,
    });

    expect(result.status).toBe(200);
    expect(result.body.groundingStatus).toBe('fully_grounded');
    expect(webSearch).not.toHaveBeenCalled();
    expect(routerExecute).toHaveBeenCalledTimes(1);
    expect(routerExecute).toHaveBeenCalledWith(expect.objectContaining({
      profile: AI_TASK_PROFILES.balanced,
      tools: [],
    }));
    expect(AI_TASK_PROFILES.balanced.capability).toBe('text');
    expect(AI_TASK_PROFILES.balanced.tools).not.toContain('googleSearch');
  });

  it('keeps web research on a separate authenticated path and does not invent a crawler', async () => {
    const webSearch = vi.fn(async () => ({
      webCitations: [{ title: 'OECD note', url: 'https://example.org/oecd' }],
    }));
    const unauthenticated = await handleWebResearchRequest({
      authorizationHeader: undefined,
      body: { question: 'What is a subsidy?' },
      cloudConfigured: true,
      searchAdapterConfigured: true,
      webSearch,
    });
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.status).toBe('auth_required');
    expect(webSearch).not.toHaveBeenCalled();

    const unavailable = await handleWebResearchRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { question: 'What is a subsidy?' },
      cloudConfigured: true,
      searchAdapterConfigured: false,
      webSearch,
    });
    expect(unavailable.body.status).toBe('unavailable');
    expect(webSearch).not.toHaveBeenCalled();

    const grounded = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      repositoryForToken: () => ownedRepo,
      routerExecute: vi.fn(async () => ({
        value: {
          groundingStatus: 'fully_grounded',
          answer: 'Solar subsidies reduce macroeconomic risk [Source: Macroeconomics, §b_001].',
          citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_001' }],
          webCitations: [],
        },
        provider: 'gemini',
        model: 'gemini-3.7-flash',
      })),
      webSearch,
    });
    expect(webSearch).not.toHaveBeenCalled();
    expect(grounded.body.webCitations).toEqual([]);
  });

  it('returns typed unavailable when Supabase is not configured, without calling the provider', async () => {
    const routerExecute = vi.fn();
    const result = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: false,
      repositoryForToken: () => ownedRepo,
      routerExecute,
      webSearch: vi.fn(),
    });
    expect(result.body.status).toBe('unavailable');
    expect(routerExecute).not.toHaveBeenCalled();
  });
});
