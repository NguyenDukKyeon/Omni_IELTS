import { describe, expect, it, vi } from 'vitest';
import * as aiGatewayModule from '../aiGateway';
import {
  BifrostGatewayClient,
  WebBridgeGatewayClient,
  assertZeroCostRoute,
  createGeminiGatewayFacade,
  describeGatewayCapabilities,
  executeWithWebBridgeFallback,
  generateTextWithGateway,
  getGatewayRoutes,
  isWebBridgeCanaryAuthorized,
} from '../aiGateway';

describe('AI gateway capability routing', () => {
  it('authorizes the private canary only with the exact local bridge key', () => {
    const env = {
      WEB_AI_BRIDGE_ENABLED: 'true',
      WEB_AI_BRIDGE_BASE_URL: 'http://gemini-web2api:8081/v1',
      WEB_AI_BRIDGE_API_KEY: 'private-local-key',
    };

    expect(isWebBridgeCanaryAuthorized('private-local-key', env)).toBe(true);
    expect(isWebBridgeCanaryAuthorized('wrong-key', env)).toBe(false);
    expect(isWebBridgeCanaryAuthorized(undefined, env)).toBe(false);
    expect(isWebBridgeCanaryAuthorized('private-local-key', { ...env, WEB_AI_BRIDGE_ENABLED: 'false' })).toBe(false);
  });

  it('runs the web bridge only after the official lane reports a recoverable text failure', async () => {
    const secondary = vi.fn().mockResolvedValue({ answer: 'from-web-bridge' });
    const result = await executeWithWebBridgeFallback({
      capability: 'text',
      enabled: true,
      primary: vi.fn().mockRejectedValue({ category: 'all_providers_exhausted', status: 503 }),
      secondary,
    });

    expect(result).toEqual({
      value: { answer: 'from-web-bridge' },
      lane: 'web_bridge',
      primaryFailure: 'all_providers_exhausted',
    });
    expect(secondary).toHaveBeenCalledOnce();
  });

  it('does not call the web bridge when the official lane succeeds', async () => {
    const secondary = vi.fn();
    const result = await executeWithWebBridgeFallback({
      capability: 'text',
      enabled: true,
      primary: vi.fn().mockResolvedValue({ answer: 'official' }),
      secondary,
    });

    expect(result).toEqual({ value: { answer: 'official' }, lane: 'bifrost' });
    expect(secondary).not.toHaveBeenCalled();
  });

  it('keeps grounded work on free search-capable providers only', () => {
    const routes = getGatewayRoutes('grounded');

    expect(routes.map(({ provider, model }) => ({ provider, model }))).toEqual([
      { provider: 'gemini', model: 'gemini-3.7-flash' },
      { provider: 'groq', model: 'groq/compound-mini' },
      { provider: 'groq', model: 'groq/compound' },
    ]);
    expect(routes.every((route) => route.timeoutMs <= 25_000)).toBe(true);
    expect(routes.every((route) => route.capability === 'search')).toBe(true);
    expect(routes.every((route) => route.costClass === 'free')).toBe(true);
    expect(routes.find((route) => route.provider === 'groq')?.gatewayModel).toBe('groq/groq/compound-mini');
    expect(routes.some((route) => route.provider === 'openrouter')).toBe(false);
    expect(routes.some((route) => route.provider === 'nvidia_nim')).toBe(false);
  });

  it('falls back from Gemini text to NVIDIA NIM and OpenRouter without Kira', () => {
    const routes = getGatewayRoutes('balanced');

    expect(JSON.stringify(routes)).not.toContain('"kira"');
    expect(routes.at(-2)).toMatchObject({
      provider: 'nvidia_nim',
      model: 'meta/llama-3.3-70b-instruct',
      capability: 'text',
      costClass: 'free',
    });
    expect(routes.at(-1)).toMatchObject({
      provider: 'openrouter',
      model: 'openrouter/free',
      gatewayModel: 'openrouter/openrouter/free',
      capability: 'text',
      costClass: 'free',
    });
  });

  it('allows the free OpenRouter route but rejects paid models', () => {
    expect(() => assertZeroCostRoute({
      provider: 'openrouter',
      model: 'openrouter/free',
      modelAlias: 'openrouter-free',
      gatewayModel: 'openrouter/openrouter/free',
      capability: 'text',
      costClass: 'free',
      transport: 'openai',
      timeoutMs: 1_000,
    })).not.toThrow();

    expect(() => assertZeroCostRoute({
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4',
      modelAlias: 'paid-model',
      gatewayModel: 'openrouter/anthropic/claude-sonnet-4',
      capability: 'text',
      costClass: 'paid',
      transport: 'openai',
      timeoutMs: 1_000,
    })).toThrow(/chi phí/i);
  });

  it('never falls back from audio capabilities to text providers', () => {
    expect(getGatewayRoutes('audio_eval').every((route) => route.provider === 'gemini')).toBe(true);
    expect(getGatewayRoutes('tts').every((route) => route.provider === 'gemini')).toBe(true);
  });

  it('describes configured key aliases without claiming same-project keys multiply quota', () => {
    const capabilities = describeGatewayCapabilities({
      AI_GATEWAY_ENABLED: 'true',
      AI_GATEWAY_BASE_URL: 'http://bifrost:8080',
      BIFROST_VIRTUAL_KEY: 'secret-virtual-key',
      GEMINI_API_KEY: 'secret-gemini-1',
      GEMINI_API_KEY_2: 'secret-gemini-2',
      GROQ_API_KEY: 'secret-groq',
      WEB_AI_BRIDGE_ENABLED: 'true',
      WEB_AI_BRIDGE_KIND: 'gemini-web2api',
      WEB_AI_BRIDGE_BASE_URL: 'http://gemini-web2api:8081/v1',
      WEB_AI_BRIDGE_API_KEY: 'secret-web-bridge',
      WEB_AI_BRIDGE_MODEL: 'gemini-3.6-flash',
    });

    expect(capabilities).toMatchObject({
      enabled: true,
      quotaScope: 'google_cloud_project',
      gatewayBaseUrlConfigured: true,
      virtualKeyConfigured: true,
    });
    expect(capabilities.quotaNoteVi).toMatch(/project/i);
    expect((capabilities as any).lanes).toEqual([
      expect.objectContaining({ lane: 'bifrost', enabled: true, mode: 'public' }),
      expect.objectContaining({
        lane: 'web_bridge',
        enabled: true,
        mode: 'canary',
        status: 'ready',
        capabilities: ['text'],
      }),
    ]);
    expect(capabilities.providers.find((provider) => provider.provider === 'gemini')?.keys)
      .toEqual([
        { alias: 'gemini-project-primary', configured: true },
        { alias: 'gemini-project-2', configured: true },
        { alias: 'gemini-project-3', configured: false },
        { alias: 'gemini-project-4', configured: false },
      ]);
    expect(JSON.stringify(capabilities.providers)).not.toContain('"kira"');
    expect(JSON.stringify(capabilities)).not.toContain('secret-');
  });

  it('reports an enabled web bridge without local credentials as auth_missing', () => {
    const capabilities = describeGatewayCapabilities({
      WEB_AI_BRIDGE_ENABLED: 'true',
      WEB_AI_BRIDGE_KIND: 'gemini-web2api',
      WEB_AI_BRIDGE_BASE_URL: 'http://gemini-web2api:8081/v1',
    });

    expect(capabilities.lanes.find((lane) => lane.lane === 'web_bridge')).toMatchObject({
      enabled: false,
      mode: 'canary',
      status: 'auth_missing',
      credentialsConfigured: false,
    });
  });
});

describe('Bifrost gateway client', () => {
  it('uses the native Gemini route with Google Search and a virtual key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: '{"forecastItems":[]}' }] },
        groundingMetadata: { webSearchQueries: ['IELTS August 2026'] },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new BifrostGatewayClient({
      baseUrl: 'http://bifrost:8080',
      virtualKey: 'virtual-key-must-not-leak',
      fetchImpl,
    });
    const route = getGatewayRoutes('grounded')[0];

    const response = await client.generateGemini(route, {
      contents: [{ role: 'user', parts: [{ text: 'Find cited IELTS reports' }] }],
      tools: [{ googleSearch: {} }],
    });

    expect(response.candidates[0].groundingMetadata.webSearchQueries).toEqual(['IELTS August 2026']);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://bifrost:8080/genai/v1beta/models/gemini-3.7-flash:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-bf-vk': 'virtual-key-must-not-leak' }),
      }),
    );
    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ tools: [{ googleSearch: {} }] });
  });

  it('rejects a capability mismatch before sending a request', async () => {
    const fetchImpl = vi.fn();
    const client = new BifrostGatewayClient({
      baseUrl: 'http://bifrost:8080',
      virtualKey: 'test-key',
      fetchImpl,
    });
    const textRoute = getGatewayRoutes('balanced').find((route) => route.provider === 'nvidia_nim')!;

    await expect(client.generateGemini(textRoute, { contents: [] }))
      .rejects.toMatchObject({ category: 'capability_mismatch' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('scrubs gateway secrets and raw provider bodies from failures', async () => {
    const secret = 'virtual-key-must-not-leak';
    const providerBody = `upstream rejected ${secret} learner-private-prompt`;
    const fetchImpl = vi.fn().mockResolvedValue(new Response(providerBody, {
      status: 429,
      headers: { 'retry-after': '120' },
    }));
    const client = new BifrostGatewayClient({
      baseUrl: 'http://bifrost:8080',
      virtualKey: secret,
      fetchImpl,
    });
    const route = getGatewayRoutes('balanced').find((item) => item.provider === 'nvidia_nim')!;

    let thrown: unknown;
    try {
      await client.chatCompletion(route, [{ role: 'user', content: 'learner-private-prompt' }]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ category: 'rate_limited', status: 429, retryAfterMs: 120_000 });
    expect(JSON.stringify(thrown)).not.toContain(secret);
    expect(JSON.stringify(thrown)).not.toContain(providerBody);
    expect(JSON.stringify(thrown)).not.toContain('learner-private-prompt');
  });

  it('requests an in-memory raw response without enabling raw persistence', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{}' } }],
      extra_fields: { raw_response: '{"choices":[]}' },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new BifrostGatewayClient({
      baseUrl: 'http://bifrost:8080',
      virtualKey: 'test-key',
      fetchImpl,
    });
    const route = getGatewayRoutes('grounded').find((item) => item.provider === 'groq')!;

    await client.chatCompletion(
      route,
      [{ role: 'user', content: 'Find cited evidence' }],
      { response_format: { type: 'json_object' } },
      { sendBackRawResponse: true },
    );

    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(request.headers).toMatchObject({
      'x-bf-send-back-raw-response': 'true',
    });
    expect(request.headers).not.toHaveProperty('x-bf-store-raw-request-response');
  });

  it('classifies an oversized provider context as recoverable overload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"error":{"code":"request_too_large"}}', {
      status: 413,
      headers: { 'content-type': 'application/json' },
    }));
    const client = new BifrostGatewayClient({
      baseUrl: 'http://bifrost:8080',
      virtualKey: 'test-key',
      fetchImpl,
    });
    const route = getGatewayRoutes('grounded').find((item) => item.provider === 'groq')!;

    await expect(client.chatCompletion(route, [{ role: 'user', content: 'Find evidence' }]))
      .rejects.toMatchObject({ category: 'provider_overloaded', status: 413 });
  });
});

describe('Web Bridge private fallback client', () => {
  it('enables fallback only for recoverable text failures', () => {
    const shouldFallback = (aiGatewayModule as any).shouldUseWebBridgeFallback;
    expect(shouldFallback).toBeTypeOf('function');

    for (const category of [
      'quota_exhausted',
      'rate_limited',
      'all_providers_exhausted',
      'gateway_unavailable',
      'network_failed',
      'provider_overloaded',
    ]) {
      expect(shouldFallback({ enabled: true, capability: 'text', category })).toBe(true);
    }
    expect(shouldFallback({ enabled: false, capability: 'text', category: 'quota_exhausted' })).toBe(false);
    expect(shouldFallback({ enabled: true, capability: 'search', category: 'quota_exhausted' })).toBe(false);
    expect(shouldFallback({ enabled: true, capability: 'audio-input', category: 'quota_exhausted' })).toBe(false);
    expect(shouldFallback({ enabled: true, capability: 'text', category: 'schema_invalid' })).toBe(false);
  });

  it('converts a structured text request to the local OpenAI-compatible endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '```json\n{"cards":[]}\n```' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new WebBridgeGatewayClient({
      baseUrl: 'http://127.0.0.1:18081/v1',
      apiKey: 'local-bridge-secret',
      model: 'gemini-3.6-flash',
      kind: 'gemini-web2api',
      fetchImpl,
    });

    const response = await client.generateGemini(getGatewayRoutes('deep')[0], {
      contents: [{ role: 'user', parts: [{ text: 'Create cards' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties: { cards: { type: 'ARRAY' } } },
      },
    });

    expect(response.candidates[0].content.parts[0].text).toBe('{"cards":[]}');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://127.0.0.1:18081/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer local-bridge-secret' }),
      }),
    );
    const body = JSON.parse(String((fetchImpl.mock.calls[0][1] as RequestInit).body));
    expect(body.model).toBe('gemini-3.6-flash');
    expect(body.messages.at(-1).content).toContain('Create cards');
    expect(JSON.stringify(body.messages)).toContain('valid JSON');
  });

  it('rejects fenced JSON with trailing prose instead of accepting a partial artifact', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '```json\n{"cards":[]}\n```\nDone' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new WebBridgeGatewayClient({
      baseUrl: 'http://127.0.0.1:18081/v1',
      apiKey: 'local-key',
      kind: 'gemini-web2api',
      fetchImpl,
    });

    await expect(client.generateGemini(getGatewayRoutes('deep')[0], {
      contents: [{ role: 'user', parts: [{ text: 'Create cards' }] }],
      generationConfig: { responseMimeType: 'application/json' },
    })).rejects.toMatchObject({ category: 'schema_invalid' });
  });

  it('rejects search and audio before sending learner data to Gemini Web', async () => {
    const fetchImpl = vi.fn();
    const client = new WebBridgeGatewayClient({
      baseUrl: 'http://127.0.0.1:18081/v1',
      apiKey: 'local-key',
      kind: 'gemini-web2api',
      fetchImpl,
    });

    await expect(client.generateGemini(getGatewayRoutes('grounded')[0], {
      contents: [{ role: 'user', parts: [{ text: 'private search' }] }],
    })).rejects.toMatchObject({ category: 'capability_mismatch' });
    await expect(client.generateGemini(getGatewayRoutes('audio_eval')[0], {
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/webm', data: 'private-audio' } }] }],
    })).rejects.toMatchObject({ category: 'capability_mismatch' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('generateTextWithGateway', () => {
  it('moves from exhausted Gemini routes to NVIDIA NIM for text work', async () => {
    const onAttempt = vi.fn();
    const client = {
      lane: 'bifrost' as const,
      generateGemini: vi.fn()
        .mockRejectedValue({ category: 'quota_exhausted', status: 429, requestId: 'gemini-1' })
        .mockRejectedValue({ category: 'quota_exhausted', status: 429, requestId: 'gemini-2' }),
      chatCompletion: vi.fn().mockResolvedValue({ choices: [{ message: { content: '{"reply":"ok"}' } }] }),
    };

    const result = await generateTextWithGateway({
      tier: 'balanced',
      contents: 'hello',
      config: { responseMimeType: 'application/json' },
      client: client as any,
      validateText: (text) => JSON.parse(text).reply === 'ok',
      onAttempt,
    });

    expect(result).toMatchObject({
      text: '{"reply":"ok"}',
      provider: 'nvidia_nim',
      model: 'meta/llama-3.3-70b-instruct',
    });
    expect(client.generateGemini).toHaveBeenCalledTimes(2);
    expect(client.chatCompletion).toHaveBeenCalledOnce();
    expect(onAttempt.mock.calls.flat().join(' ')).not.toContain('hello');
  });

  it('rejects invalid structured output instead of returning it as real data', async () => {
    const client = {
      lane: 'bifrost' as const,
      generateGemini: vi.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'not-json' }] } }],
      }),
      chatCompletion: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'still-not-json' } }],
      }),
    };

    await expect(generateTextWithGateway({
      tier: 'instant',
      contents: 'private prompt',
      client: client as any,
      validateText: (text) => {
        JSON.parse(text);
        return true;
      },
    })).rejects.toMatchObject({ category: 'all_providers_exhausted' });
  });
});

describe('createGeminiGatewayFacade', () => {
  it('routes existing Gemini SDK callers through the pooled native endpoint', async () => {
    const recordAttempt = vi.fn();
    const client = {
      lane: 'bifrost' as const,
      generateGemini: vi.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'pooled response' }] } }],
      }),
    };
    const facade = createGeminiGatewayFacade({
      getClient: async () => client as any,
      recordAttempt,
    });

    const response = await facade.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'grounded request',
      config: { tools: [{ googleSearch: {} }] },
    });

    expect(response.text).toBe('pooled response');
    expect(client.generateGemini).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'gemini', model: 'gemini-3.7-flash', capability: 'search' }),
      expect.objectContaining({ tools: [{ googleSearch: {} }] }),
    );
    expect(recordAttempt).toHaveBeenCalledWith(expect.objectContaining({
      lane: 'bifrost',
      provider: 'gemini',
      capability: 'search',
      circuitState: 'closed',
      keyAlias: 'bifrost-managed',
    }));
  });

  it('keeps legacy text callers alive with NVIDIA after the Gemini pool is exhausted', async () => {
    const client = {
      lane: 'bifrost' as const,
      generateGemini: vi.fn().mockRejectedValue({ category: 'quota_exhausted', status: 429 }),
      chatCompletion: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'NVIDIA fallback response' } }],
      }),
    };
    const facade = createGeminiGatewayFacade({ getClient: async () => client as any });

    const response = await facade.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'plain text task',
      config: {},
    });

    expect(response.text).toBe('NVIDIA fallback response');
    expect(client.chatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'nvidia_nim' }),
      expect.any(Array),
      expect.any(Object),
    );
  });

  it('rejects malformed primary JSON and continues to a schema-valid fallback', async () => {
    const client = {
      lane: 'bifrost' as const,
      generateGemini: vi.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'not-json' }] } }],
      }),
      chatCompletion: vi.fn().mockResolvedValue({ choices: [{ message: { content: '{"cards":[]}' } }] }),
    };
    const facade = createGeminiGatewayFacade({ getClient: async () => client as any });

    const response = await facade.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'structured task',
      config: { responseMimeType: 'application/json' },
    });

    expect(response.text).toBe('{"cards":[]}');
    expect(client.chatCompletion).toHaveBeenCalledOnce();
    expect(client.chatCompletion.mock.calls.map(([route]) => route.model)).toEqual([
      'meta/llama-3.3-70b-instruct',
    ]);
  });

  it('uses the requested task tier timeout without forwarding internal routing metadata', async () => {
    const client = {
      lane: 'bifrost' as const,
      generateGemini: vi.fn().mockRejectedValue({ category: 'quota_exhausted', status: 429 }),
      chatCompletion: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    };
    const facade = createGeminiGatewayFacade({ getClient: async () => client as any });

    await facade.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'large structured task',
      config: { responseMimeType: 'application/json', __omniTaskTier: 'deep' },
    });

    expect(client.generateGemini).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 90_000 }),
      expect.not.objectContaining({ generationConfig: expect.objectContaining({ __omniTaskTier: expect.anything() }) }),
    );
    expect(client.chatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'nvidia_nim', timeoutMs: 90_000 }),
      expect.any(Array),
      expect.any(Object),
    );
  });

  it('caps the whole official lane before a private bridge fallback is available', async () => {
    const client = {
      lane: 'bifrost' as const,
      generateGemini: vi.fn().mockRejectedValue({ category: 'provider_overloaded', status: 503 }),
      chatCompletion: vi.fn().mockRejectedValue({ category: 'provider_overloaded', status: 503 }),
    };
    const facade = createGeminiGatewayFacade({
      getClient: async () => client as any,
      maxRequestDurationMs: 20_000,
    });

    await expect(facade.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'large structured task',
      config: { responseMimeType: 'application/json', __omniTaskTier: 'deep' },
    })).rejects.toMatchObject({ category: 'all_providers_exhausted' });

    expect(client.generateGemini).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 20_000 }),
      expect.any(Object),
    );
    for (const [route] of client.chatCompletion.mock.calls) {
      expect(route.timeoutMs).toBeGreaterThan(0);
      expect(route.timeoutMs).toBeLessThanOrEqual(20_000);
    }
  });
});
