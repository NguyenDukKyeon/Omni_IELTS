import { describe, expect, it, vi } from 'vitest';
import {
  buildForecastSynthesisPrompt,
  orderForecastProviderAttempts,
  synthesizeForecastFromEvidence,
  type ForecastEvidenceBundle,
} from '../forecastEvidence';

const evidence: ForecastEvidenceBundle = {
  provider: 'groq',
  model: 'groq/compound-mini',
  originalQuery: 'recent IELTS Writing Task 2 Vietnam',
  searchQueries: ['recent IELTS Writing Task 2 Vietnam'],
  retrievedAt: '2026-08-24T12:00:00.000Z',
  sources: [{
    title: 'IELTS recall report',
    url: 'https://example.org/ielts-recall',
    snippet: 'Candidates reported: Some people believe university education should be free for everyone.',
  }],
};

describe('Forecast evidence synthesis', () => {
  it('keeps Brave behind every Gemini and Groq attempt regardless of transport lane', () => {
    const attempts = orderForecastProviderAttempts([
      { provider: 'brave' as const, id: 'direct-brave' },
      { provider: 'gemini' as const, id: 'gateway-gemini' },
      { provider: 'groq' as const, id: 'gateway-groq' },
      { provider: 'gemini' as const, id: 'byok-gemini' },
      { provider: 'groq' as const, id: 'direct-groq' },
    ]);

    expect(attempts.map((attempt) => attempt.id)).toEqual([
      'gateway-gemini',
      'byok-gemini',
      'gateway-groq',
      'direct-groq',
      'direct-brave',
    ]);
  });

  it('gives the text generator only the verified evidence bundle and preserves deterministic citations', async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify({
      summaryOverviewVi: 'Một recall có nguồn trực tiếp.',
      forecastItems: [{
        id: 'education-recall',
        title: 'University funding',
        skill: 'writing_task2',
        council: 'both_vietnam',
        councilLabel: 'IDP & BC Việt Nam',
        topicDomain: 'Education',
        promptStatement: 'Some people believe university education should be free for everyone.',
        evidenceType: 'reported_recall',
        sourceUrl: 'https://example.org/ielts-recall',
      }],
    }));

    const result = await synthesizeForecastFromEvidence({ evidence, generate });

    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0][0]).toContain('https://example.org/ielts-recall');
    expect(generate.mock.calls[0][0]).toContain('Candidates reported:');
    expect(result).toMatchObject({
      status: 'fresh',
      provider: 'groq',
      model: 'groq/compound-mini',
      forecastItems: [{
        evidenceType: 'reported_recall',
        citations: [{
          claimId: 'education-recall',
          url: 'https://example.org/ielts-recall',
          snippet: 'Candidates reported: Some people believe university education should be free for everyone.',
        }],
      }],
    });
  });

  it('rejects a model citation that is not present in the evidence bundle', async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify({
      summaryOverviewVi: 'Nguồn do model tự thêm.',
      forecastItems: [{
        id: 'invented-source',
        title: 'Invented source',
        skill: 'writing_task2',
        council: 'both_vietnam',
        councilLabel: 'IDP & BC Việt Nam',
        topicDomain: 'Education',
        promptStatement: 'Some people believe university education should be free for everyone.',
        evidenceType: 'verified_report',
        sourceUrl: 'https://invented.example/report',
      }],
    }));

    await expect(synthesizeForecastFromEvidence({ evidence, generate }))
      .rejects.toMatchObject({ code: 'NO_RESULTS' });
  });

  it('maps a model-selected source ID to the exact evidence URL instead of trusting generated URL text', async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify({
      summaryOverviewVi: 'Một bài luyện có nguồn.',
      forecastItems: [{
        id: 'education-practice',
        title: 'University funding',
        skill: 'writing_task2',
        council: 'both_vietnam',
        councilLabel: 'IDP & BC Việt Nam',
        topicDomain: 'Education',
        promptStatement: 'Some people believe university education should be free for everyone.',
        evidenceType: 'forecast',
        sourceId: 'source-1',
        sourceUrl: '[IELTS recall report](not-a-valid-url)',
      }],
    }));

    const result = await synthesizeForecastFromEvidence({ evidence, generate });

    expect(result.forecastItems[0]).toMatchObject({
      groundingSourceUrl: 'https://example.org/ielts-recall',
      citations: [{ url: 'https://example.org/ielts-recall' }],
    });
  });

  it('rejects an unknown model-selected source ID', async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify({
      summaryOverviewVi: 'Nguồn không tồn tại.',
      forecastItems: [{
        id: 'unknown-source',
        title: 'Unknown source',
        skill: 'writing_task2',
        council: 'both_vietnam',
        councilLabel: 'IDP & BC Việt Nam',
        topicDomain: 'Education',
        promptStatement: 'Some people believe university education should be free for everyone.',
        evidenceType: 'forecast',
        sourceId: 'source-999',
      }],
    }));

    await expect(synthesizeForecastFromEvidence({ evidence, generate }))
      .rejects.toMatchObject({ code: 'NO_RESULTS' });
  });

  it('builds a compact synthesis prompt without asking the text model to search the web', () => {
    const prompt = buildForecastSynthesisPrompt(evidence);

    expect(prompt).toContain('Use only the evidence bundle below');
    expect(prompt).toContain('sourceId');
    expect(prompt).not.toContain('copy sourceUrl');
    expect(prompt).not.toMatch(/search the web/i);
    expect(prompt).not.toContain('googleSearch');
  });
});
