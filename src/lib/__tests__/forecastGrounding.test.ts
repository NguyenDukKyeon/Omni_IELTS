import { describe, expect, it } from 'vitest';
import { normalizeForecastGroundingPayload } from '../forecastGrounding';

const source = {
  title: 'Direct recall report',
  url: 'https://example.org/ielts-report',
  snippet: 'Some people believe governments should fund university education. Discuss both views. Thi thật: 18/08/2026',
};

describe('normalizeForecastGroundingPayload', () => {
  it('keeps verified_report only when the item has a directly matching grounded source', () => {
    const response = normalizeForecastGroundingPayload({
      raw: {
        summaryOverviewVi: 'Xu hướng có nguồn.',
        detectedTrends: ['Education'],
        forecastItems: [{
          id: 'w2-education',
          title: 'Education funding',
          skill: 'writing_task2',
          council: 'both_vietnam',
          councilLabel: 'IDP & BC Việt Nam',
          examDate: 'Thi thật: 18/08/2026',
          topicDomain: 'Education',
          subCategory: 'Discussion',
          promptStatement: 'Some people believe governments should fund university education. Discuss both views.',
          evidenceType: 'verified_report',
          sourceTitle: source.title,
          sourceUrl: source.url,
          frequencyScore: 92,
        }],
      },
      groundingSources: [source],
      searchQueries: ['IELTS education report'],
      retrievedAt: '2026-08-23T08:00:00.000Z',
    });

    expect(response.status).toBe('fresh');
    expect(response.forecastItems[0]).toMatchObject({
      evidenceType: 'verified_report',
      examDate: 'Thi thật: 18/08/2026',
      enrichmentStatus: 'not_requested',
      citations: [{ claimId: 'w2-education', title: source.title, url: source.url }],
    });
    expect(response.forecastItems[0].band8ModelAnswer).toBeUndefined();
    expect(response.forecastItems[0].topicVocabularyC1C2).toBeUndefined();
    expect(response.forecastItems[0].frequencyScore).toBeUndefined();
  });

  it('rejects unsupported real-exam claims instead of exposing an uncited forecast item', () => {
    expect(() => normalizeForecastGroundingPayload({
      raw: {
        summaryOverviewVi: 'Một dự báo luyện tập.',
        forecastItems: [{
          id: 'unsupported',
          title: 'Unsupported claim',
          skill: 'speaking_part2',
          council: 'idp_vietnam',
          councilLabel: 'IDP Việt Nam',
          examDate: 'Thi thật: 22/08/2026',
          topicDomain: 'Technology',
          promptStatement: 'Describe a useful technology.',
          evidenceType: 'verified_report',
          sourceTitle: 'Unmatched source',
          sourceUrl: 'https://unsupported.example/item',
          frequencyScore: 99,
        }],
      },
      groundingSources: [source],
      searchQueries: [],
      retrievedAt: '2026-08-23T08:00:00.000Z',
    })).toThrowError(/NO_RESULTS/);
  });

  it('downgrades a verified label when the source snippet does not support the exact prompt', () => {
    const response = normalizeForecastGroundingPayload({
      raw: {
        summaryOverviewVi: 'Nguồn chỉ hỗ trợ chủ đề chung.',
        forecastItems: [{
          id: 'unsupported-exact-claim',
          title: 'Education funding',
          skill: 'writing_task2',
          council: 'both_vietnam',
          councilLabel: 'IDP & BC Việt Nam',
          examDate: 'Thi thật: 18/08/2026',
          topicDomain: 'Education',
          promptStatement: 'Universities should replace all teachers with artificial intelligence. Discuss both views.',
          evidenceType: 'verified_report',
          sourceUrl: source.url,
        }],
      },
      groundingSources: [source],
      searchQueries: ['IELTS education report'],
      retrievedAt: '2026-08-23T08:00:00.000Z',
    });

    expect(response.forecastItems[0]).toMatchObject({
      evidenceType: 'reported_recall',
      trendStatus: 'quarter_forecast',
      trendBadge: 'Recall có nguồn tham chiếu',
    });
  });

  it('rejects malformed or empty model output instead of returning synthetic items', () => {
    expect(() => normalizeForecastGroundingPayload({
      raw: { summaryOverviewVi: 'No usable items', forecastItems: [] },
      groundingSources: [],
      searchQueries: [],
      retrievedAt: '2026-08-23T08:00:00.000Z',
    })).toThrowError(/NO_RESULTS/);
  });

  it('rejects a model-generated forecast when the grounded provider returned no sources', () => {
    expect(() => normalizeForecastGroundingPayload({
      raw: {
        summaryOverviewVi: 'Model output without provider evidence.',
        forecastItems: [{
          id: 'unsourced-model-output',
          title: 'Unsourced model output',
          skill: 'writing_task2',
          council: 'both_vietnam',
          councilLabel: 'IDP & BC Việt Nam',
          topicDomain: 'Education',
          promptStatement: 'Some people believe university education should be free for everyone.',
          evidenceType: 'forecast',
        }],
      },
      groundingSources: [],
      searchQueries: ['recent IELTS question'],
      retrievedAt: '2026-08-23T08:00:00.000Z',
    })).toThrowError(/NO_RESULTS/);
  });
});
