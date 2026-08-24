import { describe, expect, it, vi } from 'vitest';
import { getGatewayRoutes } from '../aiGateway';
import {
  requestGatewayGroundedForecast,
  requestGatewayGroqForecastEvidence,
  shouldUseDirectGroundedProvider,
} from '../gatewayGrounding';

const forecastPayload = {
  summaryOverviewVi: 'Một chủ đề có nguồn trực tiếp.',
  detectedTrends: ['Education'],
  forecastItems: [{
    id: 'education-recall',
    title: 'University funding',
    skill: 'writing_task2',
    council: 'both_vietnam',
    councilLabel: 'IDP & BC Việt Nam',
    topicDomain: 'Education',
    promptStatement: 'Some people believe university education should be free for everyone.',
    evidenceType: 'reported_recall',
    sourceTitle: 'IELTS recall report',
    sourceUrl: 'https://example.org/ielts-recall',
  }],
};

describe('requestGatewayGroundedForecast', () => {
  it('uses direct provider credentials when the configured Docker gateway is unhealthy', () => {
    expect(shouldUseDirectGroundedProvider({
      hasByok: false,
      gatewayEnabled: true,
      gatewayHealthy: false,
    })).toBe(true);
    expect(shouldUseDirectGroundedProvider({
      hasByok: false,
      gatewayEnabled: true,
      gatewayHealthy: true,
    })).toBe(false);
    expect(shouldUseDirectGroundedProvider({
      hasByok: true,
      gatewayEnabled: true,
      gatewayHealthy: true,
    })).toBe(true);
  });

  it('extracts Groq search evidence through Bifrost without requiring Forecast JSON content', async () => {
    const client = {
      generateGemini: vi.fn(),
      chatCompletion: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'One useful source was found.' } }],
        extra_fields: {
          raw_response: JSON.stringify({
            choices: [{
              message: {
                content: 'One useful source was found.',
                executed_tools: [{
                  arguments: JSON.stringify({ query: 'recent IELTS Vietnam recall' }),
                  output: 'Title: IELTS recall report\nURL: https://example.org/ielts-recall\nA sourced recall report.',
                }],
              },
            }],
          }),
        },
      }),
    };
    const route = getGatewayRoutes('grounded').find((item) => item.model === 'groq/compound-mini')!;

    const result = await requestGatewayGroqForecastEvidence({
      client: client as any,
      route,
      prompt: 'Find recent IELTS reports.',
      originalQuery: 'IELTS reports',
      retrievedAt: '2026-08-24T12:00:00.000Z',
    });

    expect(result.sources).toEqual([{
      title: 'IELTS recall report',
      url: 'https://example.org/ielts-recall',
      snippet: 'A sourced recall report.',
    }]);
    expect(client.chatCompletion).toHaveBeenCalledWith(
      route,
      expect.any(Array),
      {},
      { sendBackRawResponse: true },
    );
  });

  it('preserves Gemini grounding metadata and claim-level citations through Bifrost', async () => {
    const client = {
      generateGemini: vi.fn().mockResolvedValue({
        candidates: [{
          content: { parts: [{ text: JSON.stringify(forecastPayload) }] },
          groundingMetadata: {
            webSearchQueries: ['IELTS education recall'],
            groundingChunks: [{ web: { title: 'IELTS recall report', uri: 'https://example.org/ielts-recall' } }],
          },
        }],
      }),
      chatCompletion: vi.fn(),
    };

    const result = await requestGatewayGroundedForecast({
      client: client as any,
      route: getGatewayRoutes('grounded')[0],
      prompt: 'Search recent IELTS reports.',
      originalQuery: 'IELTS reports',
      retrievedAt: '2026-08-23T12:00:00.000Z',
    });

    expect(result).toMatchObject({
      status: 'fresh',
      provider: 'gemini',
      forecastItems: [{
        id: 'education-recall',
        citations: [{ url: 'https://example.org/ielts-recall' }],
      }],
    });
    expect(client.generateGemini).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tools: [{ googleSearch: {} }] }),
    );
  });

  it('uses Gemini grounding support text to verify an exact reported prompt', async () => {
    const verifiedPayload = {
      ...forecastPayload,
      forecastItems: [{ ...forecastPayload.forecastItems[0], evidenceType: 'verified_report' }],
    };
    const client = {
      generateGemini: vi.fn().mockResolvedValue({
        candidates: [{
          content: { parts: [{ text: JSON.stringify(verifiedPayload) }] },
          groundingMetadata: {
            webSearchQueries: ['IELTS education recall'],
            groundingChunks: [{ web: { title: 'IELTS recall report', uri: 'https://example.org/ielts-recall' } }],
            groundingSupports: [{
              groundingChunkIndices: [0],
              segment: { text: 'Some people believe university education should be free for everyone.' },
            }],
          },
        }],
      }),
      chatCompletion: vi.fn(),
    };

    const result = await requestGatewayGroundedForecast({
      client: client as any,
      route: getGatewayRoutes('grounded')[0],
      prompt: 'Search recent IELTS reports.',
      originalQuery: 'IELTS reports',
    });

    expect(result.forecastItems[0]).toMatchObject({
      evidenceType: 'verified_report',
      citations: [{
        url: 'https://example.org/ielts-recall',
        snippet: 'Some people believe university education should be free for everyone.',
      }],
    });
  });

  it('preserves Groq Compound executed Web Search sources through Bifrost', async () => {
    const client = {
      generateGemini: vi.fn(),
      chatCompletion: vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(forecastPayload),
            executed_tools: [{
              arguments: JSON.stringify({ query: 'IELTS education recall' }),
              search_results: { results: [{
                title: 'IELTS recall report',
                url: 'https://example.org/ielts-recall',
              }] },
            }],
          },
        }],
      }),
    };
    const route = getGatewayRoutes('grounded').find((item) => item.model === 'groq/compound-mini')!;

    const result = await requestGatewayGroundedForecast({
      client: client as any,
      route,
      prompt: 'Search recent IELTS reports.',
      originalQuery: 'IELTS reports',
    });

    expect(result).toMatchObject({ status: 'fresh', provider: 'groq', model: 'groq/compound-mini' });
    expect(client.chatCompletion).toHaveBeenCalledWith(route, expect.any(Array), {
      response_format: { type: 'json_object' },
    }, { sendBackRawResponse: true });
  });

  it('restores Groq citations from the in-memory Bifrost raw response without exposing it', async () => {
    const client = {
      generateGemini: vi.fn(),
      chatCompletion: vi.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(forecastPayload) } }],
        extra_fields: {
          raw_response: JSON.stringify({
            choices: [{
              message: {
                content: JSON.stringify(forecastPayload),
                executed_tools: [{
                  arguments: JSON.stringify({ query: 'IELTS education recall' }),
                  search_results: { results: [{
                    title: 'IELTS recall report',
                    url: 'https://example.org/ielts-recall',
                  }] },
                }],
              },
            }],
            provider_secret_marker: 'must-not-escape',
          }),
        },
      }),
    };
    const route = getGatewayRoutes('grounded').find((item) => item.model === 'groq/compound-mini')!;

    const result = await requestGatewayGroundedForecast({
      client: client as any,
      route,
      prompt: 'Search recent IELTS reports.',
      originalQuery: 'IELTS reports',
    });

    expect(result).toMatchObject({
      status: 'fresh',
      provider: 'groq',
      forecastItems: [{ citations: [{ url: 'https://example.org/ielts-recall' }] }],
    });
    expect(JSON.stringify(result)).not.toContain('must-not-escape');
  });
});
