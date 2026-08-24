import { expect, test } from '@playwright/test';

test.describe('AI gateway operational API', () => {
  test('reports capabilities using safe aliases and project-scoped quota semantics', async ({ request }) => {
    const response = await request.get('/api/ai/capabilities');
    expect(response.ok()).toBe(true);
    const payload = await response.json();

    expect(payload.quotaScope).toBe('google_cloud_project');
    expect(payload.quotaNoteVi).toMatch(/project/i);
    expect(payload.lanes).toEqual(expect.arrayContaining([
      expect.objectContaining({ lane: 'bifrost', mode: 'public' }),
      expect.objectContaining({ lane: 'web_bridge', mode: 'canary', capabilities: ['text'] }),
    ]));
    expect(payload.providers.find((provider: any) => provider.provider === 'gemini').keys)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ alias: 'gemini-project-primary' }),
        expect.objectContaining({ alias: 'gemini-project-4' }),
      ]));
    expect(JSON.stringify(payload)).not.toMatch(/(?:AIza|AQ\.|sk-or-v1-|nvapi-)[A-Za-z0-9_-]+/);
  });

  test('reports gateway health without exposing upstream bodies or credentials', async ({ request }) => {
    const response = await request.get('/api/ai/health');
    expect(response.ok()).toBe(true);
    const payload = await response.json();

    expect(payload).toMatchObject({
      status: expect.stringMatching(/^(healthy|disabled|unavailable)$/),
      checkedAt: expect.any(String),
      lanes: {
        bifrost: { status: expect.stringMatching(/^(healthy|disabled|unavailable)$/) },
        web_bridge: {
          status: expect.stringMatching(/^(healthy|auth_missing|disabled|unavailable)$/),
          scope: 'private_dev',
          kind: expect.stringMatching(/^(gemini-web2api|webai-to-api)$/),
        },
      },
    });
    expect(payload).not.toHaveProperty('error');
    expect(JSON.stringify(payload)).not.toMatch(/(?:AIza|AQ\.|sk-or-v1-|nvapi-)[A-Za-z0-9_-]+/);
  });

  test('exposes only scrubbed provider attempts in metrics', async ({ request }) => {
    const response = await request.get('/api/ai/metrics');
    expect(response.ok()).toBe(true);
    const payload = await response.json();

    expect(payload).toHaveProperty('tiers');
    expect(payload.lanes).toMatchObject({
      bifrost: { attempts: expect.any(Number), failureCategories: expect.any(Object) },
      web_bridge: { attempts: expect.any(Number), failureCategories: expect.any(Object) },
    });
    expect(payload).toHaveProperty('gatewayAttempts');
    expect(Array.isArray(payload.gatewayAttempts)).toBe(true);
    expect(JSON.stringify(payload)).not.toMatch(/(?:AIza|AQ\.|sk-or-v1-|nvapi-)[A-Za-z0-9_-]+/);
  });

  test('does not expose an internal web bridge generation endpoint', async ({ request }) => {
    const response = await request.post('/api/internal/ai/canary/text', {
      data: { prompt: 'This request must never reach the private bridge.' },
    });
    expect(response.status()).toBe(404);
  });
});
