import { describe, expect, it, vi } from 'vitest';
import { generateTextWithDirectProviderPool } from '../directTextProvider';

describe('generateTextWithDirectProviderPool', () => {
  it('supports the current Groq production text model as a schema-validated route', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"cards":[{"word":"learn"}]}' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await generateTextWithDirectProviderPool({
      contents: 'Return cards.',
      config: { responseMimeType: 'application/json' },
      routes: [{
        provider: 'groq',
        model: 'openai/gpt-oss-120b',
        baseUrl: 'https://api.groq.com/openai/v1',
        keys: [{ alias: 'groq-primary', apiKey: 'groq-secret' }],
      }],
      validateText: (text) => JSON.parse(text).cards.length === 1,
      fetchImpl,
    });

    expect(result).toMatchObject({ provider: 'groq', model: 'openai/gpt-oss-120b' });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('moves to the next key without leaking an exhausted key into telemetry', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'quota exhausted' } }), {
        status: 429,
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"ok":true}' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const onAttempt = vi.fn();

    const result = await generateTextWithDirectProviderPool({
      contents: 'Return JSON.',
      config: { responseMimeType: 'application/json' },
      routes: [{
        provider: 'nvidia_nim',
        model: 'meta/llama-3.3-70b-instruct',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        keys: [
          { alias: 'nvidia-nim-primary', apiKey: 'first-secret' },
          { alias: 'nvidia-nim-2', apiKey: 'second-secret' },
        ],
      }],
      fetchImpl,
      onAttempt,
    });

    expect(result).toMatchObject({
      text: '{"ok":true}',
      provider: 'nvidia_nim',
      keyAlias: 'nvidia-nim-2',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onAttempt).toHaveBeenNthCalledWith(1, expect.objectContaining({
      provider: 'nvidia_nim',
      keyAlias: 'nvidia-nim-primary',
      category: 'quota_exhausted',
    }));
    expect(JSON.stringify(onAttempt.mock.calls)).not.toContain('secret');
  });

  it('falls through to OpenRouter only after the NVIDIA pool is unavailable', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'fallback answer' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await generateTextWithDirectProviderPool({
      contents: [{ role: 'user', parts: [{ text: 'Explain this.' }] }],
      routes: [
        {
          provider: 'nvidia_nim',
          model: 'meta/llama-3.3-70b-instruct',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          keys: [
            { alias: 'nvidia-nim-primary', apiKey: 'nvidia-secret' },
            { alias: 'nvidia-nim-2', apiKey: 'nvidia-secret-2' },
          ],
        },
        {
          provider: 'openrouter',
          model: 'openrouter/free',
          baseUrl: 'https://openrouter.ai/api/v1',
          keys: [{ alias: 'openrouter-primary', apiKey: 'openrouter-secret' }],
        },
      ],
      fetchImpl,
    });

    expect(result.provider).toBe('openrouter');
    expect(fetchImpl.mock.calls[1][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
    const request = JSON.parse(String(fetchImpl.mock.calls[1][1]?.body));
    expect(request.messages).toEqual([{ role: 'user', content: 'Explain this.' }]);
  });

  it('bounds a stalled provider attempt and still reaches the next provider', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'openrouter answer' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await generateTextWithDirectProviderPool({
      contents: 'Explain this.',
      routes: [
        {
          provider: 'nvidia_nim',
          model: 'meta/llama-3.3-70b-instruct',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          keys: [{ alias: 'nvidia-nim-primary', apiKey: 'nvidia-secret' }],
        },
        {
          provider: 'openrouter',
          model: 'openrouter/free',
          baseUrl: 'https://openrouter.ai/api/v1',
          keys: [{ alias: 'openrouter-primary', apiKey: 'openrouter-secret' }],
        },
      ],
      totalTimeoutMs: 1_000,
      perAttemptTimeoutMs: 20,
      fetchImpl,
    });

    expect(result.provider).toBe('openrouter');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('continues to another provider when structured output fails the caller schema', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"cards":[]}' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"cards":[{"word":"learn"}]}' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await generateTextWithDirectProviderPool({
      contents: 'Return cards.',
      routes: [
        {
          provider: 'nvidia_nim',
          model: 'meta/llama-3.3-70b-instruct',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          keys: [{ alias: 'nvidia-nim-primary', apiKey: 'nvidia-secret' }],
        },
        {
          provider: 'openrouter',
          model: 'openrouter/free',
          baseUrl: 'https://openrouter.ai/api/v1',
          keys: [{ alias: 'openrouter-primary', apiKey: 'openrouter-secret' }],
        },
      ],
      validateText: (text) => JSON.parse(text).cards.length === 1,
      fetchImpl,
    });

    expect(result.provider).toBe('openrouter');
  });

  it('returns a scrubbed all-provider failure', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      'upstream body contains private-secret',
      { status: 503 },
    ));

    await expect(generateTextWithDirectProviderPool({
      contents: 'test',
      routes: [{
        provider: 'openrouter',
        model: 'openrouter/free',
        baseUrl: 'https://openrouter.ai/api/v1',
        keys: [{ alias: 'openrouter-primary', apiKey: 'private-secret' }],
      }],
      fetchImpl,
    })).rejects.toMatchObject({ category: 'all_providers_exhausted' });

    try {
      await generateTextWithDirectProviderPool({
        contents: 'test',
        routes: [{
          provider: 'openrouter',
          model: 'openrouter/free',
          baseUrl: 'https://openrouter.ai/api/v1',
          keys: [{ alias: 'openrouter-primary', apiKey: 'private-secret' }],
        }],
        fetchImpl,
      });
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain('private-secret');
      expect(JSON.stringify(error)).not.toContain('upstream body');
    }
  });
});
