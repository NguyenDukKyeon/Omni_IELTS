import type { ForecastGroundingResponse } from '../types';
import { normalizeForecastGroundingPayload } from './forecastGrounding';

export type ForecastEvidenceProvider = 'groq' | 'brave';

export interface ForecastEvidenceSource {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
}

export interface ForecastEvidenceBundle {
  provider: ForecastEvidenceProvider;
  model: string;
  originalQuery: string;
  searchQueries: string[];
  retrievedAt: string;
  sources: ForecastEvidenceSource[];
}

const FORECAST_PROVIDER_PRIORITY = {
  gemini: 0,
  groq: 1,
  brave: 2,
} as const;

export function orderForecastProviderAttempts<
  T extends { provider: keyof typeof FORECAST_PROVIDER_PRIORITY },
>(attempts: T[]): T[] {
  return attempts
    .map((attempt, index) => ({ attempt, index }))
    .sort((left, right) => (
      FORECAST_PROVIDER_PRIORITY[left.attempt.provider]
      - FORECAST_PROVIDER_PRIORITY[right.attempt.provider]
      || left.index - right.index
    ))
    .map(({ attempt }) => attempt);
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 0
    || parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

export function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const unwrappedHostname = hostname.replace(/^\[|\]$/g, '');
    const privateIpv6 = unwrappedHostname === '::'
      || unwrappedHostname === '::1'
      || /^(?:fc|fd|fe8|fe9|fea|feb)/.test(unwrappedHostname);
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && !url.username
      && !url.password
      && hostname !== 'localhost'
      && !privateIpv6
      && !hostname.endsWith('.local')
      && !isPrivateIpv4(hostname);
  } catch {
    return false;
  }
}

export function buildForecastSynthesisPrompt(evidence: ForecastEvidenceBundle): string {
  const compactSources = evidence.sources.map((source, index) => ({
    sourceId: `source-${index + 1}`,
    title: source.title,
    url: source.url,
    snippet: source.snippet,
    publishedAt: source.publishedAt,
  }));
  return `Create a compact IELTS Forecast Live Hub response. Use only the evidence bundle below; do not browse, invent sources, dates, frequency scores, exam claims, model answers, vocabulary lists, or PEEL outlines.
Every forecast item must select one sourceId from the bundle. Never write or reconstruct a URL. Use verified_report only when the snippet explicitly supports the exact prompt and date, reported_recall for sourced recall reports, and forecast for preparation material or predictions.
Return exactly one JSON object with this schema:
{
  "summaryOverviewVi": "Vietnamese evidence-aware summary",
  "detectedTrends": ["short trend"],
  "forecastItems": [{
    "id": "stable-slug",
    "title": "short title",
    "skill": "writing_task1|writing_task2|speaking_part1|speaking_part2|speaking_part3",
    "council": "idp_vietnam|bc_vietnam|both_vietnam|idp_global|bc_global",
    "councilLabel": "human label",
    "examDate": "only when explicitly supported",
    "topicDomain": "topic",
    "subCategory": "question type",
    "promptStatement": "reported question or clearly labelled practice/forecast prompt",
    "cueCardPoints": ["optional cue point"],
    "evidenceType": "verified_report|reported_recall|forecast",
    "sourceId": "source-1"
  }]
}
Evidence bundle:
${JSON.stringify({
    query: evidence.originalQuery,
    retrievedAt: evidence.retrievedAt,
    sources: compactSources,
  })}`;
}

export async function synthesizeForecastFromEvidence(input: {
  evidence: ForecastEvidenceBundle;
  generate: (prompt: string) => Promise<string>;
}): Promise<ForecastGroundingResponse> {
  const text = await input.generate(buildForecastSynthesisPrompt(input.evidence));
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw Object.assign(new Error('SCHEMA_INVALID: Forecast synthesis returned invalid JSON'), { code: 'SCHEMA_INVALID' });
  }
  const sourceById = new Map(input.evidence.sources.map((source, index) => [`source-${index + 1}`, source]));
  const sourceByUrl = new Map(input.evidence.sources.map((source) => [source.url, source]));
  const rawRecord = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const forecastItems = Array.isArray(rawRecord.forecastItems)
    ? rawRecord.forecastItems.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const itemRecord = item as Record<string, unknown>;
        const selectedById = typeof itemRecord.sourceId === 'string'
          ? sourceById.get(itemRecord.sourceId)
          : undefined;
        const selectedByUrl = typeof itemRecord.sourceUrl === 'string'
          ? sourceByUrl.get(itemRecord.sourceUrl)
          : undefined;
        const selected = selectedById || selectedByUrl;
        return {
          ...itemRecord,
          sourceTitle: selected?.title,
          sourceUrl: selected?.url,
        };
      })
    : rawRecord.forecastItems;
  const normalized = normalizeForecastGroundingPayload({
    raw: { ...rawRecord, forecastItems },
    groundingSources: input.evidence.sources,
    searchQueries: input.evidence.searchQueries,
    retrievedAt: input.evidence.retrievedAt,
  });
  return {
    ...normalized,
    provider: input.evidence.provider,
    model: input.evidence.model,
  };
}
