import { describe, expect, it, vi } from 'vitest';
import { handleArtifactJobRequest } from '../sources/artifactTransport.server';
import { SourceRecord, SourceVersion } from '../../types/sources';

const version: SourceVersion = {
  id: 'v1',
  sourceId: 'record-1',
  versionNumber: 1,
  stage: 'normalised',
  contentHash: 'hash-v1',
  plainText: 'Renewable energy lowers long-term risk.',
  blocks: [{ id: 'b1', order: 1, type: 'paragraph', text: 'Renewable energy lowers long-term risk.' }],
  wordCount: 6,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const record: SourceRecord = {
  id: 'record-1',
  userId: 'learner-1',
  title: 'Renewable energy',
  summary: 'Renewable energy lowers long-term risk.',
  type: 'text',
  collectionIds: [],
  tags: [],
  provenance: {
    originType: 'pasted_text',
    retrievalDate: '2026-09-01T00:00:00.000Z',
    rightsState: 'owned_by_learner',
    rawContentHash: 'hash-v1',
    canonicalCitation: 'Renewable energy',
  },
  currentVersionId: 'v2',
  processingState: 'ready',
  lastUsedAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function baseInput(overrides: Record<string, unknown> = {}) {
  const saveArtifactJob = vi.fn(async (job) => job);
  const routerExecute = vi.fn(async () => ({
    value: {
      skill: 'reading',
      targetBand: 7,
      activityTitle: 'Renewable energy reading',
      sourceSpanRef: { sourceId: 'record-1', sourceVersionId: 'v1', blockIds: ['b1'] },
      questionPayload: {
        type: 'true_false_not_given',
        questions: [{ id: 'q1', statement: 'Renewable energy lowers risk.', correctAnswer: 'TRUE' }],
      },
      provenance: record.provenance,
    },
  }));
  const consumeQuota = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));
  const repository = {
    getSelectedVersions: vi.fn(async () => ({ status: 'ok' as const, items: [{ version, record }] })),
    saveArtifactJob,
  };
  return {
    featureEnabled: true,
    authorizationHeader: 'Bearer verified-token',
    body: {
      sourceVersionId: 'v1',
      sourceSpan: { sourceId: 'record-1', sourceVersionId: 'v1', blockIds: ['b1'] },
      destination: 'practice',
      targetBand: 7,
    },
    cloudConfigured: true,
    verifyAccessToken: vi.fn(async () => ({ status: 'ok' as const, userId: 'learner-1', accessToken: 'verified-token' })),
    repositoryForToken: vi.fn(() => repository),
    consumeQuota,
    routerExecute,
    ...overrides,
    __test: { repository, saveArtifactJob, routerExecute, consumeQuota },
  };
}

describe('artifact source integrity before quota and persistence', () => {
  it('rejects a span whose sourceId does not match the RLS-visible record', async () => {
    const input = baseInput();
    input.body = {
      ...input.body,
      sourceSpan: { sourceId: 'unrelated-source', sourceVersionId: 'v1', blockIds: ['b1'] },
    };
    const result = await handleArtifactJobRequest(input);

    expect(result.status).toBe(400);
    expect(input.__test.consumeQuota).not.toHaveBeenCalled();
    expect(input.__test.saveArtifactJob).not.toHaveBeenCalled();
    expect(input.__test.routerExecute).not.toHaveBeenCalled();
  });

  it('rejects a span with an unknown block before queueing or invoking the router', async () => {
    const input = baseInput();
    input.body = {
      ...input.body,
      sourceSpan: { sourceId: 'record-1', sourceVersionId: 'v1', blockIds: ['missing-block'] },
    };
    const result = await handleArtifactJobRequest(input);

    expect(result.status).toBe(400);
    expect(input.__test.consumeQuota).not.toHaveBeenCalled();
    expect(input.__test.saveArtifactJob).not.toHaveBeenCalled();
    expect(input.__test.routerExecute).not.toHaveBeenCalled();
  });

  it('rejects every non-ready source state before quota, job writes, and routing', async () => {
    for (const processingState of ['failed', 'degraded', 'queued', 'processing', 'rejected', 'unavailable', 'handoff_required'] as const) {
      const input = baseInput();
      input.__test.repository.getSelectedVersions.mockResolvedValue({
        status: 'ok' as const,
        items: [{ version, record: { ...record, processingState } }],
      });
      const result = await handleArtifactJobRequest(input);
      expect(result.status).toBeGreaterThanOrEqual(200);
      expect(input.__test.consumeQuota, processingState).not.toHaveBeenCalled();
      expect(input.__test.saveArtifactJob, processingState).not.toHaveBeenCalled();
      expect(input.__test.routerExecute, processingState).not.toHaveBeenCalled();
    }
  });

  it('rejects a selected version whose sourceId does not match its selected record', async () => {
    const input = baseInput();
    input.__test.repository.getSelectedVersions.mockResolvedValue({
      status: 'ok' as const,
      items: [{ version: { ...version, sourceId: 'other-record' }, record }],
    });
    const result = await handleArtifactJobRequest(input);

    expect(result.status).toBe(400);
    expect(input.__test.consumeQuota).not.toHaveBeenCalled();
    expect(input.__test.saveArtifactJob).not.toHaveBeenCalled();
    expect(input.__test.routerExecute).not.toHaveBeenCalled();
  });

  it('allows an RLS-visible historical version that belongs to a ready record', async () => {
    const input = baseInput();
    const result = await handleArtifactJobRequest(input);

    expect(result.status).toBe(200);
    expect(result.body.status).toBe('ready');
    expect(input.__test.consumeQuota).toHaveBeenCalledTimes(1);
    expect(input.__test.saveArtifactJob).toHaveBeenCalledTimes(3);
    expect(input.__test.routerExecute).toHaveBeenCalledTimes(1);
  });

  it('does not expose parser or source internals in a rejected response', async () => {
    const input = baseInput();
    input.__test.repository.getSelectedVersions.mockRejectedValue(new Error('pdfjs internal /tmp/parser.ts:91 Bearer secret'));
    const result = await handleArtifactJobRequest(input);

    const body = JSON.stringify(result.body);
    expect(body).not.toMatch(/pdfjs|internal|\/tmp\/|parser\.ts|Bearer|secret/i);
  });
});
