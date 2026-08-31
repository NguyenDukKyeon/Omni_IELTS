import { describe, expect, it, vi } from 'vitest';
import {
  buildGroundedContext,
  executeGroundedChat,
  estimatePromptTokens,
  GROUNDED_CHAT_PROMPT_TOKEN_BUDGET,
  GROUNDED_CHAT_QUESTION_MAX_CHARS,
  GroundedChatRequestSchema,
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

const verifiedLearner = async (accessToken: string) => ({
  status: 'ok' as const,
  userId: 'u1',
  accessToken,
});

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
      verifyAccessToken: verifiedLearner,
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
      verifyAccessToken: verifiedLearner,
      repositoryForToken: () => ownedRepo,
      routerExecute,
      webSearch: vi.fn(),
    });
    const missing = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_missing'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: verifiedLearner,
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
      verifyAccessToken: verifiedLearner,
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
      verifyAccessToken: verifiedLearner,
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
      verifyAccessToken: verifiedLearner,
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
      verifyAccessToken: verifiedLearner,
      webSearch,
    });
    expect(unavailable.body.status).toBe('unavailable');
    expect(webSearch).not.toHaveBeenCalled();

    const grounded = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: verifiedLearner,
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
      verifyAccessToken: verifiedLearner,
      repositoryForToken: () => ownedRepo,
      routerExecute,
      webSearch: vi.fn(),
    });
    expect(result.body.status).toBe('unavailable');
    expect(routerExecute).not.toHaveBeenCalled();
  });
});

describe('Selected-span grounding and prompt budget', () => {
  const twoBlockVersion: SourceVersion = {
    ...selected,
    plainText: 'VISIBLE_BLOCK. SECRET_PLAINTEXT_MUST_NOT_LEAK to the model.',
    blocks: [
      { id: 'b_001', order: 1, type: 'paragraph', text: 'VISIBLE_BLOCK.' },
      { id: 'b_002', order: 2, type: 'paragraph', text: 'SECOND_BLOCK.' },
    ],
  };

  it('does not leak full plainText when sourceSpan block IDs are unknown', async () => {
    const routerExecute = vi.fn(async () => ({
      value: {
        groundingStatus: 'fully_grounded',
        answer: 'leaked',
        citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_001' }],
        webCitations: [],
      },
    }));

    const result = await executeGroundedChat({
      selectedVersionIds: ['v_01'],
      question: 'What leaked?',
      versions: [twoBlockVersion],
      records: [record],
      routerExecute,
      sourceSpan: { sourceId: 's_01', sourceVersionId: 'v_01', blockIds: ['b_unknown'] },
    });

    expect(routerExecute).not.toHaveBeenCalled();
    expect(result.groundingStatus).toBe('unsupported_by_sources');
    expect(JSON.stringify(result)).not.toContain('SECRET_PLAINTEXT_MUST_NOT_LEAK');
  });

  it('treats a version without its exact parent record as invalid context', async () => {
    const otherRecord: SourceRecord = {
      ...record,
      id: 's_other',
      title: 'OTHER_TITLE_MUST_NOT_BE_USED',
      provenance: { ...record.provenance, canonicalCitation: 'LEAKED_FALLBACK_CITATION' },
    };
    const orphan: SourceVersion = { ...selected, sourceId: 's_missing' };
    const routerExecute = vi.fn();

    const result = await executeGroundedChat({
      selectedVersionIds: ['v_01'],
      question: 'What do subsidies do?',
      versions: [orphan],
      records: [otherRecord],
      routerExecute,
    });

    expect(routerExecute).not.toHaveBeenCalled();
    expect(result.groundingStatus).toBe('unsupported_by_sources');
    expect(JSON.stringify(result)).not.toContain('OTHER_TITLE_MUST_NOT_BE_USED');
    expect(JSON.stringify(result)).not.toContain('LEAKED_FALLBACK_CITATION');
  });

  it('rejects a span whose sourceId or sourceVersionId is not a selected hydrated pair', async () => {
    const routerExecute = vi.fn();
    const mismatchedSource = await executeGroundedChat({
      selectedVersionIds: ['v_01'],
      question: 'What?',
      versions: [selected],
      records: [record],
      routerExecute,
      sourceSpan: { sourceId: 's_other', sourceVersionId: 'v_01', blockIds: ['b_001'] },
    });
    const mismatchedVersion = await executeGroundedChat({
      selectedVersionIds: ['v_01'],
      question: 'What?',
      versions: [selected],
      records: [record],
      routerExecute,
      sourceSpan: { sourceId: 's_01', sourceVersionId: 'v_other', blockIds: ['b_001'] },
    });

    expect(routerExecute).not.toHaveBeenCalled();
    expect(mismatchedSource.groundingStatus).toBe('unsupported_by_sources');
    expect(mismatchedVersion.groundingStatus).toBe('unsupported_by_sources');
  });

  it('sends only validated span blocks when an explicit span exists', async () => {
    const routerExecute = vi.fn(async ({ prompt }: { prompt: string }) => {
      expect(prompt).toContain('VISIBLE_BLOCK.');
      expect(prompt).toContain('b_001');
      expect(prompt).not.toContain('SECOND_BLOCK.');
      expect(prompt).not.toContain('SECRET_PLAINTEXT_MUST_NOT_LEAK');
      expect(prompt).not.toBe(expect.stringContaining(twoBlockVersion.plainText));
      return {
        value: {
          groundingStatus: 'fully_grounded',
          answer: 'Visible only [Source: Macroeconomics, §b_001].',
          citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_001' }],
          webCitations: [],
        },
      };
    });

    const result = await executeGroundedChat({
      selectedVersionIds: ['v_01'],
      question: 'What is visible?',
      versions: [twoBlockVersion],
      records: [record],
      routerExecute,
      sourceSpan: { sourceId: 's_01', sourceVersionId: 'v_01', blockIds: ['b_001'] },
    });

    expect(routerExecute).toHaveBeenCalledTimes(1);
    expect(result.groundingStatus).toBe('fully_grounded');
  });

  it('restricts citations to the selected span block IDs', () => {
    const parsed = GroundedChatResponseSchema.parse({
      groundingStatus: 'fully_grounded',
      answer: 'Claim [Source: Macroeconomics, §b_002]',
      citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_002' }],
      webCitations: [],
    });
    const result = validateGroundedCitations(
      parsed,
      [twoBlockVersion],
      { sourceId: 's_01', sourceVersionId: 'v_01', blockIds: ['b_001'] },
    );
    expect(result.groundingStatus).toBe('unsupported_by_sources');
    expect(result.citations).toEqual([]);
  });

  it('returns a typed select-smaller-source response instead of truncating or calling AI', async () => {
    const hugeText = 'macroeconomic '.repeat(20_000);
    const hugeVersion: SourceVersion = {
      ...selected,
      plainText: hugeText,
      blocks: [{ id: 'b_001', order: 1, type: 'paragraph', text: hugeText }],
      wordCount: 20_000,
    };
    const routerExecute = vi.fn();
    const repo = {
      getSelectedVersions: vi.fn(async () => ({
        status: 'ok' as const,
        items: [{ version: hugeVersion, record }],
      })),
    };

    const result = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'Summarise.' },
      cloudConfigured: true,
      verifyAccessToken: verifiedLearner,
      repositoryForToken: () => repo,
      routerExecute,
    });

    expect(routerExecute).not.toHaveBeenCalled();
    expect(result.status).toBe(400);
    expect(result.body.status).toBe('select_smaller_source');
    expect(String(result.body.userMessageVi || '')).toMatch(/nguồn|đoạn/i);
    expect(JSON.stringify(result.body)).not.toContain('macroeconomic macroeconomic');
  });
});

function completeProviderPrompt(sourceContext: string, question: string): string {
  return `${sourceContext}\n\nQuestion: ${question}\nReturn JSON only.`;
}

describe('Grounded chat complete-prompt budget and empty-context fail-closed', () => {
  it('documents a bounded question limit on the Zod request schema', () => {
    expect(GROUNDED_CHAT_QUESTION_MAX_CHARS).toBe(8_000);
    expect(GroundedChatRequestSchema.safeParse({
      selectedVersionIds: ['v_01'],
      question: 'What do subsidies do?',
    }).success).toBe(true);
    expect(GroundedChatRequestSchema.safeParse({
      selectedVersionIds: ['v_01'],
      question: 'Q'.repeat(GROUNDED_CHAT_QUESTION_MAX_CHARS + 1),
    }).success).toBe(false);
  });

  it('rejects a 200,000-character question as typed bounded-input without calling the router', async () => {
    const routerExecute = vi.fn();
    const repo = {
      getSelectedVersions: vi.fn(async () => ({
        status: 'ok' as const,
        items: [{ version: selected, record }],
      })),
    };
    const hugeQuestion = 'Q'.repeat(200_000);

    const result = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: hugeQuestion },
      cloudConfigured: true,
      verifyAccessToken: verifiedLearner,
      repositoryForToken: () => repo,
      routerExecute,
    });

    expect(routerExecute).not.toHaveBeenCalled();
    expect(repo.getSelectedVersions).not.toHaveBeenCalled();
    expect(result.status).toBe(400);
    expect(result.body.status).toBe('select_smaller_source');
    expect(result.body.code).toBe('INVALID_INPUT');
    expect(JSON.stringify(result.body)).not.toContain('Q'.repeat(50));
  });

  it('rejects when source context fits but the complete provider prompt exceeds the 32k budget', async () => {
    const question = 'Q'.repeat(4_000);
    const filler = 'm'.repeat(93_000);
    const sizedVersion: SourceVersion = {
      ...selected,
      plainText: filler,
      blocks: [{ id: 'b_001', order: 1, type: 'paragraph', text: filler }],
      wordCount: 93_000,
    };
    const context = buildGroundedContext([{ version: sizedVersion, record }], ['v_01']);
    expect(estimatePromptTokens(context)).toBeLessThanOrEqual(GROUNDED_CHAT_PROMPT_TOKEN_BUDGET);
    expect(estimatePromptTokens(completeProviderPrompt(context, question)))
      .toBeGreaterThan(GROUNDED_CHAT_PROMPT_TOKEN_BUDGET);

    const routerExecute = vi.fn();
    const repo = {
      getSelectedVersions: vi.fn(async () => ({
        status: 'ok' as const,
        items: [{ version: sizedVersion, record }],
      })),
    };

    const result = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question },
      cloudConfigured: true,
      verifyAccessToken: verifiedLearner,
      repositoryForToken: () => repo,
      routerExecute,
    });

    expect(routerExecute).not.toHaveBeenCalled();
    expect(result.status).toBe(400);
    expect(result.body.status).toBe('select_smaller_source');
    expect(JSON.stringify(result.body)).not.toContain('mmm');
  });

  it('returns unsupported_by_sources for non-empty plainText with zero usable blocks and does not call the model', async () => {
    const emptyBlocksVersion: SourceVersion = {
      ...selected,
      plainText: 'Solar subsidies reduce macroeconomic risk. SECRET_PLAINTEXT_MUST_NOT_REACH_THE_MODEL',
      blocks: [],
      wordCount: 7,
    };
    const whitespaceBlocksVersion: SourceVersion = {
      ...selected,
      id: 'v_ws',
      plainText: 'Still has plaintext but no usable blocks.',
      blocks: [{ id: 'b_001', order: 1, type: 'paragraph', text: '   \n\t  ' }],
      wordCount: 8,
    };
    const groundedValue = {
      groundingStatus: 'fully_grounded' as const,
      answer: 'leaked from instructions only',
      citations: [{ sourceVersionId: 'v_01', sourceTitle: 'Macroeconomics', blockId: 'b_001' }],
      webCitations: [],
    };
    const routerExecute = vi.fn(async () => ({ value: groundedValue }));
    const emptyRepo = {
      getSelectedVersions: vi.fn(async () => ({
        status: 'ok' as const,
        items: [{ version: emptyBlocksVersion, record }],
      })),
    };
    const emptyResult = await handleGroundedChatRequest({
      authorizationHeader: 'Bearer learner-jwt',
      body: { selectedVersionIds: ['v_01'], question: 'What do subsidies do?' },
      cloudConfigured: true,
      verifyAccessToken: verifiedLearner,
      repositoryForToken: () => emptyRepo,
      routerExecute,
    });

    const whitespaceResult = await executeGroundedChat({
      selectedVersionIds: ['v_ws'],
      question: 'What do subsidies do?',
      versions: [whitespaceBlocksVersion],
      records: [record],
      routerExecute,
    });

    expect(routerExecute).not.toHaveBeenCalled();
    expect(emptyResult.status).toBe(200);
    expect(emptyResult.body.groundingStatus).toBe('unsupported_by_sources');
    expect(whitespaceResult.groundingStatus).toBe('unsupported_by_sources');
    expect(JSON.stringify(emptyResult.body)).not.toContain('SECRET_PLAINTEXT_MUST_NOT_REACH_THE_MODEL');
    expect(JSON.stringify(whitespaceResult)).not.toContain('Still has plaintext');
  });
});
