import { describe, expect, it, vi } from 'vitest';
import type { SourceArtifactJob, SourceRecord, SourceVersion } from '../../types/sources';
import {
  SourceImportRequestSchema,
  handleSourceImportRequest,
} from '../sources/importTransport.server';
import {
  CreateArtifactJobRequestSchema,
  handleArtifactJobRequest,
} from '../sources/artifactTransport.server';

const learner = {
  status: 'ok' as const,
  userId: 'learner-1',
  accessToken: 'verified-jwt',
};

const version: SourceVersion = {
  id: 'version-1',
  sourceId: 'source-1',
  versionNumber: 1,
  stage: 'normalised',
  contentHash: 'hash-1',
  plainText: 'Renewable energy reduces long-term economic risk.',
  blocks: [
    {
      id: 'b_001',
      order: 1,
      type: 'paragraph',
      text: 'Renewable energy reduces long-term economic risk.',
    },
  ],
  wordCount: 7,
  createdAt: '2026-08-31T00:00:00.000Z',
};

const record: SourceRecord = {
  id: 'source-1',
  userId: 'learner-1',
  title: 'Renewable energy',
  summary: 'Renewable energy reduces long-term economic risk.',
  type: 'text',
  collectionIds: [],
  tags: [],
  provenance: {
    originType: 'pasted_text',
    retrievalDate: '2026-08-31T00:00:00.000Z',
    rightsState: 'owned_by_learner',
    rawContentHash: 'hash-1',
    canonicalCitation: 'Renewable energy',
    owningModule: 'sources',
  },
  currentVersionId: version.id,
  processingState: 'ready',
  lastUsedAt: '2026-08-31T00:00:00.000Z',
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

function quota() {
  return { allowed: true, retryAfterSeconds: 0 };
}

function textImportBody() {
  return {
    title: 'Renewable energy',
    type: 'text' as const,
    content: 'Renewable energy reduces long-term economic risk.',
  };
}

describe('C0 source import transport', () => {
  it('rejects malformed or forged request fields before JWT and quota work', async () => {
    const verifyAccessToken = vi.fn(async () => learner);
    const consumeQuota = vi.fn(quota);
    const repositoryForToken = vi.fn();

    const result = await handleSourceImportRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified-jwt',
      body: { ...textImportBody(), content: '', userId: 'attacker' },
      cloudConfigured: true,
      verifyAccessToken,
      repositoryForToken,
      consumeQuota,
    });

    expect(result.status).toBe(400);
    expect(result.body.status).toBe('invalid_request');
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(consumeQuota).not.toHaveBeenCalled();
    expect(repositoryForToken).not.toHaveBeenCalled();
  });

  it('decodes and signature-checks PDF base64 on the server before extraction', async () => {
    const extractDocument = vi.fn(async (input) => {
      expect(input.type).toBe('pdf');
      expect(input.content).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(input.content as Uint8Array)).toContain('%PDF-');
      return { success: true, version };
    });
    const saveRecord = vi.fn(async (saved: SourceRecord) => saved);
    const saveVersion = vi.fn(async (saved: SourceVersion) => saved);
    const updateRecord = vi.fn(async (saved: SourceRecord) => saved);

    const result = await handleSourceImportRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified-jwt',
      body: {
        title: 'PDF source',
        type: 'pdf',
        declaredMimeType: 'application/pdf',
        originalFilename: 'source.pdf',
        contentBase64: Buffer.from('%PDF-1.7\nsource text').toString('base64'),
      },
      cloudConfigured: true,
      verifyAccessToken: async () => learner,
      repositoryForToken: () => ({ saveRecord, saveVersion, updateRecord }),
      consumeQuota: vi.fn(quota),
      extractDocument,
    });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe('ready');
    expect(extractDocument).toHaveBeenCalledTimes(1);
    expect(saveVersion).toHaveBeenCalledTimes(1);
    expect(updateRecord).toHaveBeenCalledWith(expect.objectContaining({ processingState: 'ready' }));
    expect(result.body.sourceRecord).toEqual(expect.objectContaining({ processingState: 'ready' }));
  });

  it('persists a YouTube handoff record without a version or media payload', async () => {
    const saveRecord = vi.fn(async (saved: SourceRecord) => saved);
    const saveVersion = vi.fn();
    const updateRecord = vi.fn(async (saved: SourceRecord) => saved);
    const extractDocument = vi.fn(async () => ({
      success: false as const,
      error: {
        code: 'HANDOFF_REQUIRED',
        userMessageVi: 'Media owns this source.',
        suggestedActionVi: 'Open Media Lab.',
        retryable: false,
        diagnosticId: 'diagnostic-1',
        owningModule: 'media' as const,
      },
    }));

    const result = await handleSourceImportRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified-jwt',
      body: {
        title: 'Lecture',
        type: 'youtube',
        content: 'https://www.youtube.com/watch?v=example',
      },
      cloudConfigured: true,
      verifyAccessToken: async () => learner,
      repositoryForToken: () => ({ saveRecord, saveVersion, updateRecord }),
      consumeQuota: vi.fn(quota),
      extractDocument,
    });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe('handoff_required');
    expect(updateRecord).toHaveBeenCalledWith(expect.objectContaining({
      processingState: 'handoff_required',
      currentVersionId: '',
      provenance: expect.objectContaining({ owningModule: 'media' }),
    }));
    expect(saveVersion).not.toHaveBeenCalled();
    expect(JSON.stringify(result.body)).not.toContain('source text');
  });
});

describe('C0 artifact job transport', () => {
  it('rejects invalid artifact input before verified identity or artifact quota', async () => {
    const verifyAccessToken = vi.fn(async () => learner);
    const consumeQuota = vi.fn(quota);
    const repositoryForToken = vi.fn();

    const result = await handleArtifactJobRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified-jwt',
      body: {
        sourceVersionId: 'version-1',
        destination: ['practice', 'note'],
        targetBand: 7,
        customInstruction: 'x',
      },
      cloudConfigured: true,
      verifyAccessToken,
      repositoryForToken,
      consumeQuota,
      routerExecute: vi.fn(),
    });

    expect(result.status).toBe(400);
    expect(result.body.status).toBe('invalid_request');
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(consumeQuota).not.toHaveBeenCalled();
    expect(repositoryForToken).not.toHaveBeenCalled();
  });

  it('hydrates the exact source version, uses the balanced no-tool router, and persists only the job', async () => {
    const saveArtifactJob = vi.fn(async (job: SourceArtifactJob) => job);
    const routerExecute = vi.fn(async (input) => ({
      value: {
        skill: 'reading',
        targetBand: 7,
        activityTitle: 'Renewable energy reading',
        sourceSpanRef: { sourceId: 'source-1', sourceVersionId: 'version-1', blockIds: ['b_001'] },
        questionPayload: {
          type: 'true_false_not_given',
          questions: [{ id: 'q1', statement: 'Renewable energy reduces risk.', correctAnswer: 'TRUE' }],
        },
        provenance: record.provenance,
      },
      provider: 'test',
      model: 'test',
      received: input,
    }));

    const result = await handleArtifactJobRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified-jwt',
      body: {
        sourceVersionId: 'version-1',
        sourceSpan: { sourceId: 'source-1', sourceVersionId: 'version-1', blockIds: ['b_001'] },
        destination: 'practice',
        targetBand: 7,
        customInstruction: 'Keep the question concise.',
      },
      cloudConfigured: true,
      verifyAccessToken: async () => learner,
      repositoryForToken: () => ({
        getSelectedVersions: async () => ({ status: 'ok' as const, items: [{ version, record }] }),
        saveArtifactJob,
      }),
      consumeQuota: vi.fn((input) => {
        expect(input.bucket).toBe('artifact-generation');
        expect(input.userId).toBe('learner-1');
        return quota();
      }),
      routerExecute,
    });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe('ready');
    expect(result.body.job).toEqual(expect.objectContaining({
      userId: 'learner-1',
      sourceVersionId: 'version-1',
      destination: 'practice',
      state: 'ready',
    }));
    expect(routerExecute).toHaveBeenCalledWith(expect.objectContaining({
      sourceVersionId: 'version-1',
      sourceSpan: { sourceId: 'source-1', sourceVersionId: 'version-1', blockIds: ['b_001'] },
      profile: expect.objectContaining({ tier: 'balanced', capability: 'text' }),
      tools: [],
    }));
    expect(saveArtifactJob.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(result.body)).not.toContain('xpDelta');
    expect(JSON.stringify(result.body)).not.toContain('masteryUpdate');
  });
});

describe('C0 request schemas', () => {
  it('keeps binary imports and artifact jobs exact and bounded', () => {
    expect(SourceImportRequestSchema.safeParse({
      title: 'source',
      type: 'pdf',
      declaredMimeType: 'application/pdf',
      contentBase64: 'not base64',
    }).success).toBe(false);
    expect(CreateArtifactJobRequestSchema.safeParse({
      sourceVersionId: 'version-1',
      destination: 'practice',
      targetBand: 10,
    }).success).toBe(false);
  });
});
