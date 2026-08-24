import { z } from 'zod';
import type { ForecastGroundingResponse, RealExamForecastItem } from '../types';

const ForecastSearchItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  skill: z.enum(['writing_task1', 'writing_task2', 'speaking_part1', 'speaking_part2', 'speaking_part3']),
  council: z.enum(['idp_vietnam', 'bc_vietnam', 'both_vietnam', 'idp_global', 'bc_global']),
  councilLabel: z.string().min(1),
  examDate: z.string().min(1).optional(),
  topicDomain: z.string().min(1),
  subCategory: z.string().min(1).optional(),
  promptStatement: z.string().min(12),
  cueCardPoints: z.array(z.string().min(1)).max(8).optional(),
  evidenceType: z.enum(['verified_report', 'reported_recall', 'forecast']),
  sourceTitle: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
});

const ForecastSearchPayloadSchema = z.object({
  summaryOverviewVi: z.string().min(1),
  detectedTrends: z.array(z.string().min(1)).max(12).optional(),
  forecastItems: z.array(ForecastSearchItemSchema).max(8),
});

function datedForecastLabel(retrievedAt: string) {
  const value = new Date(retrievedAt);
  if (Number.isNaN(value.getTime())) return 'Dự báo · chưa xác định ngày cập nhật';
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  return `Dự báo · cập nhật ${day}/${month}/${value.getUTCFullYear()}`;
}

function normalizedEvidenceText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function sourceSupportsExactPrompt(
  source: { snippet?: string } | undefined,
  promptStatement: string,
) {
  if (!source?.snippet) return false;
  const prompt = normalizedEvidenceText(promptStatement);
  const snippet = normalizedEvidenceText(source.snippet);
  return prompt.length >= 12 && snippet.includes(prompt);
}

export function normalizeForecastGroundingPayload(input: {
  raw: unknown;
  groundingSources: Array<{ title: string; url: string; snippet?: string; publishedAt?: string }>;
  searchQueries: string[];
  retrievedAt?: string;
}): ForecastGroundingResponse {
  const parsed = ForecastSearchPayloadSchema.safeParse(input.raw);
  if (!parsed.success) {
    throw Object.assign(new Error('SCHEMA_INVALID: Forecast payload failed validation'), {
      code: 'SCHEMA_INVALID',
      issues: parsed.error.issues,
    });
  }
  if (parsed.data.forecastItems.length === 0) {
    throw Object.assign(new Error('NO_RESULTS: Forecast search returned no usable items'), { code: 'NO_RESULTS' });
  }
  if (input.groundingSources.length === 0) {
    throw Object.assign(new Error('NO_RESULTS: Grounded provider returned no supporting sources'), { code: 'NO_RESULTS' });
  }

  const retrievedAt = input.retrievedAt || new Date().toISOString();
  const sourceByUrl = new Map(input.groundingSources.map((source) => [source.url, source]));
  const forecastItems: RealExamForecastItem[] = parsed.data.forecastItems.flatMap((item) => {
    const supportingSource = item.sourceUrl ? sourceByUrl.get(item.sourceUrl) : undefined;
    if (!supportingSource) return [];
    const isVerified = item.evidenceType === 'verified_report'
      && sourceSupportsExactPrompt(supportingSource, item.promptStatement);
    const isReportedRecall = (item.evidenceType === 'reported_recall' || item.evidenceType === 'verified_report')
      && Boolean(supportingSource)
      && !isVerified;
    const evidenceType = isVerified ? 'verified_report' : isReportedRecall ? 'reported_recall' : 'forecast';
    const sourceSupported = isVerified || item.evidenceType === 'reported_recall';

    return [{
      id: item.id,
      title: item.title,
      skill: item.skill,
      council: item.council,
      councilLabel: item.councilLabel,
      examDate: sourceSupported && item.examDate ? item.examDate : datedForecastLabel(retrievedAt),
      topicDomain: item.topicDomain,
      subCategory: item.subCategory,
      promptStatement: item.promptStatement,
      cueCardPoints: item.cueCardPoints,
      trendStatus: isVerified ? 'recent_real_exam' : 'quarter_forecast',
      trendBadge: isVerified
        ? 'Báo cáo đã xác minh nguồn trực tiếp'
        : isReportedRecall
          ? 'Recall có nguồn tham chiếu'
          : 'Dự báo luyện tập',
      frequencyScore: undefined,
      groundingSourceTitle: supportingSource?.title,
      groundingSourceUrl: supportingSource?.url,
      evidenceType,
      citations: supportingSource
        ? [{
            claimId: item.id,
            title: supportingSource.title,
            url: supportingSource.url,
            snippet: supportingSource.snippet,
          }]
        : [],
      enrichmentStatus: 'not_requested',
    }];
  });
  if (forecastItems.length === 0) {
    throw Object.assign(new Error('NO_RESULTS: Forecast items had no directly matching sources'), { code: 'NO_RESULTS' });
  }

  return {
    status: 'fresh',
    forecastItems,
    searchQueries: input.searchQueries,
    groundingSources: input.groundingSources,
    lastUpdated: retrievedAt,
    summaryOverviewVi: parsed.data.summaryOverviewVi,
    detectedTrends: parsed.data.detectedTrends,
    stale: false,
  };
}
