import { describe, expect, it, vi } from 'vitest';
import { ApiResponseError, classifyApiFailure, retryProviderCall } from '../apiFailure';

describe('classifyApiFailure', () => {
  it.each([
    [{ status: 401, message: 'API key not valid' }, 'auth_invalid', false, 'open_api_settings'],
    [{ status: 429, message: 'quota_exceeded: daily quota exhausted' }, 'quota_exhausted', false, 'open_quota'],
    [{ status: 429, message: 'rate_limit_exceeded: too many requests' }, 'rate_limited', true, 'retry'],
    [{ status: 503, message: 'This model is currently experiencing high demand' }, 'provider_overloaded', true, 'retry'],
    [new Error('AI_TIMEOUT_90000'), 'provider_overloaded', true, 'retry'],
    [new Error('fetch failed: getaddrinfo ENOTFOUND generativelanguage.googleapis.com'), 'network_failed', true, 'retry'],
    [{ code: 'SCHEMA_INVALID', message: 'Forecast payload failed validation' }, 'schema_invalid', true, 'retry'],
  ] as const)('maps provider failures to an actionable public contract', (error, category, retryable, action) => {
    const failure = classifyApiFailure(error, 'forecast');

    expect(failure.category).toBe(category);
    expect(failure.retryable).toBe(retryable);
    expect(failure.action).toBe(action);
    expect(failure.messageVi).not.toMatch(/fetch failed|ENOTFOUND|RESOURCE_EXHAUSTED/i);
    expect(failure.requestId).toMatch(/^forecast_/);
  });

  it('identifies Groq in a fallback authentication failure without exposing its raw response', () => {
    const failure = classifyApiFailure(
      { status: 401, message: 'invalid_api_key: secret rejected' },
      'forecast',
      'groq',
    );

    expect(failure).toMatchObject({
      provider: 'groq',
      category: 'auth_invalid',
      action: 'open_api_settings',
    });
    expect(failure.messageVi).toContain('Groq');
    expect(failure.messageVi).not.toContain('secret rejected');
  });

  it('identifies Gemini Web failures without exposing the bridge response', () => {
    const failure = classifyApiFailure(
      { status: 429, message: 'quota exhausted for temporary-secret' },
      'ai',
      'gemini_web',
    );

    expect(failure).toMatchObject({
      provider: 'gemini_web',
      category: 'quota_exhausted',
      action: 'open_quota',
    });
    expect(failure.messageVi).toContain('Gemini Web');
    expect(failure.messageVi).not.toContain('temporary-secret');
  });

  it.each([
    [{ category: 'gateway_unavailable', status: 503 }, 'gateway_unavailable', true],
    [{ category: 'all_providers_exhausted', status: 503 }, 'all_providers_exhausted', false],
  ] as const)('preserves gateway-specific recovery states', (error, category, retryable) => {
    const failure = classifyApiFailure(error, 'ai', 'bifrost');

    expect(failure).toMatchObject({ provider: 'bifrost', category, retryable });
    expect(failure.messageVi).not.toContain('undefined');
  });

  it('preserves a scrubbed gateway schema category so the grounded router can fall back', () => {
    const failure = classifyApiFailure(
      { category: 'schema_invalid', status: 502, message: 'Nguồn AI trả dữ liệu không đạt schema.' },
      'forecast',
      'gemini',
    );

    expect(failure).toMatchObject({ category: 'schema_invalid', retryable: true, action: 'retry' });
  });
});

describe('retryProviderCall', () => {
  it('retries an overloaded provider and returns the successful value', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ status: 503, message: 'UNAVAILABLE' })
      .mockResolvedValue('ok');

    const result = await retryProviderCall(operation, {
      context: 'forecast',
      maxAttempts: 2,
      baseDelayMs: 0,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry exhausted daily quota', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue({ status: 429, message: 'Daily quota exhausted' });

    await expect(
      retryProviderCall(operation, { context: 'forecast', maxAttempts: 3, baseDelayMs: 0 }),
    ).rejects.toMatchObject({ category: 'quota_exhausted', retryable: false });
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('ApiResponseError', () => {
  it('preserves the actionable failure contract without exposing raw provider text', () => {
    const failure = classifyApiFailure(new Error('fetch failed ENOTFOUND'), 'forecast');
    const error = new ApiResponseError({ error: failure.messageVi, failure }, 503);

    expect(error.message).toBe(failure.messageVi);
    expect(error.failure).toEqual(failure);
    expect(error.status).toBe(503);
    expect(error.message).not.toContain('ENOTFOUND');
  });
});
