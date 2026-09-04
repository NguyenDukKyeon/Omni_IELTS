import { describe, expect, it, vi } from 'vitest';
import { createArtifactJob } from '../sources/artifactJobMachine';
import {
  CreateArtifactJobRequestSchema,
  handleArtifactJobRequest,
} from '../sources/artifactTransport.server';
import {
  handleSourceImportRequest,
} from '../sources/importTransport.server';
import { createSourcesQuotaConsumer, parseSourcesQuotaEnv } from '../sources/quota.server';

const validPdfEnvelope = {
  title: 'PDF source',
  type: 'pdf' as const,
  declaredMimeType: 'application/pdf',
  contentBase64: Buffer.from('%PDF-1.7\nfixture').toString('base64'),
};

describe('Batch C correction transport hardening', () => {
  it('authenticates before binary decoding, hashing, extraction, or quota work', async () => {
    const verifyAccessToken = vi.fn(async () => ({ status: 'auth_required' as const }));
    const consumeQuota = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));
    const extractDocument = vi.fn();
    const repositoryForToken = vi.fn();

    const result = await handleSourceImportRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer forged',
      body: { ...validPdfEnvelope, contentBase64: Buffer.from('not a pdf').toString('base64') },
      cloudConfigured: true,
      verifyAccessToken,
      consumeQuota,
      extractDocument,
      repositoryForToken,
    });

    expect(result.status).toBe(401);
    expect(verifyAccessToken).toHaveBeenCalledWith('forged');
    expect(consumeQuota).not.toHaveBeenCalled();
    expect(extractDocument).not.toHaveBeenCalled();
    expect(repositoryForToken).not.toHaveBeenCalled();
  });

  it('does not consume quota for a semantically invalid authenticated binary', async () => {
    const verifyAccessToken = vi.fn(async () => ({
      status: 'ok' as const,
      userId: 'learner-1',
      accessToken: 'verified',
    }));
    const consumeQuota = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));
    const repositoryForToken = vi.fn();

    const result = await handleSourceImportRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified',
      body: { ...validPdfEnvelope, contentBase64: Buffer.from('not a pdf').toString('base64') },
      cloudConfigured: true,
      verifyAccessToken,
      consumeQuota,
      repositoryForToken,
    });

    expect(result.status).toBe(400);
    expect(verifyAccessToken).toHaveBeenCalledTimes(1);
    expect(consumeQuota).not.toHaveBeenCalled();
    expect(repositoryForToken).not.toHaveBeenCalled();
  });

  it('accepts only the 3.0 to 9.0 half-band target range', () => {
    for (const value of [3, 7.5, 9]) {
      expect(CreateArtifactJobRequestSchema.safeParse({
        sourceVersionId: 'version-1',
        destination: 'practice',
        targetBand: value,
      }).success).toBe(true);
    }
    for (const value of [2.5, 7.25, 9.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(CreateArtifactJobRequestSchema.safeParse({
        sourceVersionId: 'version-1',
        destination: 'practice',
        targetBand: value,
      }).success).toBe(false);
    }
    expect(() => createArtifactJob({
      id: 'job-1',
      userId: 'learner-1',
      sourceVersionId: 'version-1',
      destination: 'practice',
      targetBand: 2.5,
    })).toThrow('invalid_artifact_job_input');
  });

  it('keeps source-import and artifact-generation quota defaults and windows independent', () => {
    expect(parseSourcesQuotaEnv({})).toEqual({
      groundedChat: { limit: 20, windowMs: 3_600_000 },
      webResearch: { limit: 10, windowMs: 3_600_000 },
      sourceImport: { limit: 30, windowMs: 3_600_000 },
      artifactGeneration: { limit: 10, windowMs: 3_600_000 },
    });

    const consumer = createSourcesQuotaConsumer({
      groundedChat: { limit: 20, windowMs: 60_000 },
      webResearch: { limit: 10, windowMs: 60_000 },
      sourceImport: { limit: 1, windowMs: 60_000 },
      artifactGeneration: { limit: 2, windowMs: 60_000 },
    });
    expect(consumer({ bucket: 'source-import', userId: 'learner-1' }).allowed).toBe(true);
    expect(consumer({ bucket: 'source-import', userId: 'learner-1' }).allowed).toBe(false);
    expect(consumer({ bucket: 'artifact-generation', userId: 'learner-1' }).allowed).toBe(true);
    expect(consumer({ bucket: 'artifact-generation', userId: 'learner-1' }).allowed).toBe(true);
    expect(consumer({ bucket: 'artifact-generation', userId: 'learner-1' }).allowed).toBe(false);
  });

  it('rejects invalid artifact targets before authentication and quota', async () => {
    const verifyAccessToken = vi.fn();
    const consumeQuota = vi.fn();
    const result = await handleArtifactJobRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer learner',
      body: { sourceVersionId: 'version-1', destination: 'practice', targetBand: 7.25 },
      cloudConfigured: true,
      verifyAccessToken,
      consumeQuota,
      repositoryForToken: vi.fn(),
      routerExecute: vi.fn(),
    });

    expect(result.status).toBe(400);
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(consumeQuota).not.toHaveBeenCalled();
  });
});
