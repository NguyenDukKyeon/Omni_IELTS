import { describe, expect, it, vi } from 'vitest';
import { requestGroqGroundedForecast } from '../groqGrounding';

const modelPayload = {
  summaryOverviewVi: 'Một recall có nguồn trực tiếp.',
  detectedTrends: ['Education'],
  forecastItems: [{
    id: 'education-recall',
    title: 'University funding',
    skill: 'writing_task2',
    council: 'both_vietnam',
    councilLabel: 'IDP & BC Việt Nam',
    examDate: 'Reported: 20/08/2026',
    topicDomain: 'Education',
    promptStatement: 'Some people believe university education should be free for everyone. Discuss both views.',
    evidenceType: 'reported_recall',
    sourceTitle: 'IELTS recall report',
    sourceUrl: 'https://example.org/ielts-recall',
  }],
};

describe('requestGroqGroundedForecast', () => {
  it('turns Groq Web Search results into claim-level Forecast citations', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify(modelPayload),
          executed_tools: [{
            type: 'search',
            arguments: JSON.stringify({ query: 'recent IELTS Vietnam recall' }),
            search_results: {
              results: [{
                title: 'IELTS recall report',
                url: 'https://example.org/ielts-recall',
                content: 'A recent user report contained this Writing Task 2 prompt.',
                score: 0.91,
              }],
            },
          }],
        },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await requestGroqGroundedForecast({
      apiKey: 'test-key',
      prompt: 'Search the web and return JSON.',
      originalQuery: 'IELTS Writing Task 2 Vietnam',
      retrievedAt: '2026-08-23T12:00:00.000Z',
      fetchImpl,
    });

    expect(response).toMatchObject({
      status: 'fresh',
      provider: 'groq',
      model: 'groq/compound-mini',
      searchQueries: ['recent IELTS Vietnam recall'],
      forecastItems: [{
        evidenceType: 'reported_recall',
        citations: [{
          claimId: 'education-recall',
          title: 'IELTS recall report',
          url: 'https://example.org/ielts-recall',
        }],
      }],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
    expect(fetchImpl.mock.calls[0][1]?.headers).not.toHaveProperty('Groq-Model-Version');
    const request = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(request).toMatchObject({
      model: 'groq/compound-mini',
      response_format: { type: 'json_object' },
      compound_custom: { tools: { enabled_tools: ['web_search'] } },
      search_settings: { country: 'vietnam' },
    });
  });

  it('rejects an answer without executed Web Search sources instead of presenting it as live', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(modelPayload), executed_tools: [] } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await expect(requestGroqGroundedForecast({
      apiKey: 'test-key',
      prompt: 'Search.',
      originalQuery: 'IELTS recall',
      fetchImpl,
    })).rejects.toMatchObject({ code: 'NO_RESULTS' });
  });

  it('can route the same grounded request through the full Compound system', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify(modelPayload),
          executed_tools: [{
            type: 'search',
            arguments: JSON.stringify({ query: 'recent IELTS Vietnam recall' }),
            search_results: {
              results: [{
                title: 'IELTS recall report',
                url: 'https://example.org/ielts-recall',
              }],
            },
          }],
        },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await requestGroqGroundedForecast({
      apiKey: 'test-key',
      model: 'groq/compound',
      prompt: 'Search. Return JSON.',
      originalQuery: 'IELTS recall',
      fetchImpl,
    });

    expect(response.model).toBe('groq/compound');
    const request = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(request.model).toBe('groq/compound');
  });

  it('preserves the provider retry window when the Groq request quota resets soon', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'Rate limit reached. Please try again later.' },
    }), {
      status: 429,
      headers: {
        'retry-after': '180',
        'x-ratelimit-remaining-requests': '0',
      },
    }));

    await expect(requestGroqGroundedForecast({
      apiKey: 'test-key',
      prompt: 'Search.',
      originalQuery: 'IELTS recall',
      fetchImpl,
    })).rejects.toMatchObject({
      code: 'QUOTA_EXCEEDED',
      retryAfterMs: 180_000,
    });
  });

  it('classifies Compound 413 orchestration overflow as retryable provider overload', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'Request Entity Too Large' },
    }), { status: 413 }));

    await expect(requestGroqGroundedForecast({
      apiKey: 'test-key',
      model: 'groq/compound',
      prompt: 'Search.',
      originalQuery: 'IELTS recall',
      fetchImpl,
    })).rejects.toMatchObject({
      status: 413,
      code: 'PROVIDER_OVERLOADED',
    });
  });
});
