import { describe, expect, it, vi } from 'vitest';
import { handleSourceImportRequest } from '../sources/importTransport.server';

describe('source import semantic validation before quota and persistence', () => {
  it('does not consume quota or save an invalid binary extraction', async () => {
    const consumeQuota = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));
    const saveRecord = vi.fn(async (record) => record);
    const extractDocument = vi.fn(async () => ({
      success: false as const,
      error: {
        code: 'RESOURCE_LIMIT_EXCEEDED',
        userMessageVi: 'safe',
        suggestedActionVi: 'safe',
        retryable: false,
        diagnosticId: 'diagnostic-resource-limit',
      },
    }));
    const body = {
      title: 'Oversized PDF',
      type: 'pdf' as const,
      declaredMimeType: 'application/pdf',
      contentBase64: Buffer.from('%PDF-1.7\nfixture').toString('base64'),
    };

    const result = await handleSourceImportRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified-token',
      body,
      cloudConfigured: true,
      verifyAccessToken: vi.fn(async () => ({
        status: 'ok' as const,
        userId: 'learner-1',
        accessToken: 'verified-token',
      })),
      repositoryForToken: vi.fn(() => ({
        saveRecord,
        saveVersion: vi.fn(),
        updateRecord: vi.fn(async (record) => record),
      })),
      consumeQuota,
      extractDocument,
    });

    expect(result.status).toBe(422);
    expect(result.body.code).toBe('RESOURCE_LIMIT_EXCEEDED');
    expect(extractDocument).toHaveBeenCalledTimes(1);
    expect(consumeQuota).not.toHaveBeenCalled();
    expect(saveRecord).not.toHaveBeenCalled();
  });
});
