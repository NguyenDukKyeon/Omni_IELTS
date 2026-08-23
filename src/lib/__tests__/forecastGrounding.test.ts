import { describe, expect, it } from 'vitest';
import { normalizeForecastGroundingPayload } from '../forecastGrounding';

const source = { title: 'Direct recall report', url: 'https://example.org/ielts-report' };

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

  it('downgrades unsupported real-exam claims to forecast without invented dates or frequency', () => {
    const response = normalizeForecastGroundingPayload({
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
    });

    expect(response.forecastItems[0]).toMatchObject({
      evidenceType: 'forecast',
      trendStatus: 'quarter_forecast',
      examDate: 'Dự báo · cập nhật 23/08/2026',
      citations: [],
    });
    expect(response.forecastItems[0].frequencyScore).toBeUndefined();
  });

  it('rejects malformed or empty model output instead of returning synthetic items', () => {
    expect(() => normalizeForecastGroundingPayload({
      raw: { summaryOverviewVi: 'No usable items', forecastItems: [] },
      groundingSources: [],
      searchQueries: [],
      retrievedAt: '2026-08-23T08:00:00.000Z',
    })).toThrowError(/NO_RESULTS/);
  });
});
