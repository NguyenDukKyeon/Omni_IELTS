import { z } from 'zod';
import type { ForecastGroundingResponse } from '../types';
import { normalizeForecastGroundingPayload } from './forecastGrounding';
import { isPublicHttpUrl, type ForecastEvidenceBundle, type ForecastEvidenceSource } from './forecastEvidence';

export type GroqGroundedModel = 'groq/compound-mini' | 'groq/compound';
const DEFAULT_GROQ_FORECAST_MODEL: GroqGroundedModel = 'groq/compound-mini';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SearchResultSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  content: z.string().optional(),
  score: z.number().optional(),
});

const ExecutedToolSchema = z.object({
  arguments: z.string().optional(),
  output: z.string().optional(),
  search_results: z.object({ results: z.array(SearchResultSchema) }).optional(),
}).passthrough();

const GroqCompletionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().min(1),
      executed_tools: z.array(ExecutedToolSchema).optional(),
    }),
  })).min(1),
});

function providerError(message: string, values: Record<string, unknown>) {
  return Object.assign(new Error(message), values);
}

function sourcesFromToolOutput(output: string): ForecastEvidenceSource[] {
  const lines = output.split(/\r?\n/);
  const sources: ForecastEvidenceSource[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const urlMatch = lines[index].match(/^\s*URL:\s*(https?:\/\/\S+)\s*$/i);
    if (!urlMatch || !isPublicHttpUrl(urlMatch[1])) continue;
    const titleLine = lines.slice(0, index).reverse().find((line) => /^\s*Title:\s*.+/i.test(line));
    const nextBoundary = lines.findIndex((line, candidateIndex) => candidateIndex > index && /^\s*(?:Title|URL):\s*/i.test(line));
    const snippetEnd = nextBoundary > index ? nextBoundary : lines.length;
    const snippet = lines.slice(index + 1, snippetEnd).join(' ').replace(/\s+/g, ' ').trim();
    sources.push({
      title: titleLine?.replace(/^\s*Title:\s*/i, '').trim() || new URL(urlMatch[1]).hostname,
      url: urlMatch[1],
      snippet: snippet || undefined,
    });
  }
  return sources;
}

export function extractGroqForecastEvidence(input: {
  payload: unknown;
  model: GroqGroundedModel;
  originalQuery: string;
  retrievedAt?: string;
}): ForecastEvidenceBundle {
  const parsedCompletion = GroqCompletionSchema.safeParse(input.payload);
  if (!parsedCompletion.success) {
    throw providerError('SCHEMA_INVALID: Groq completion failed validation', {
      code: 'SCHEMA_INVALID',
      issues: parsedCompletion.error.issues,
    });
  }
  const tools = parsedCompletion.data.choices[0].message.executed_tools || [];
  const sources = tools.flatMap((tool) => [
    ...(tool.search_results?.results || []).flatMap((source) => isPublicHttpUrl(source.url) ? [{
      title: source.title,
      url: source.url,
      snippet: source.content,
    }] : []),
    ...(tool.output ? sourcesFromToolOutput(tool.output) : []),
  ]);
  const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()];
  if (uniqueSources.length === 0) {
    throw providerError('NO_RESULTS: Groq did not execute Web Search or return sources', { code: 'NO_RESULTS' });
  }
  const searchQueries = tools.flatMap((tool) => {
    if (!tool.arguments) return [];
    try {
      const args = JSON.parse(tool.arguments);
      return typeof args.query === 'string' && args.query.trim() ? [args.query.trim()] : [];
    } catch {
      return [];
    }
  });
  return {
    provider: 'groq',
    model: input.model,
    originalQuery: input.originalQuery,
    searchQueries: searchQueries.length ? [...new Set(searchQueries)] : [input.originalQuery],
    retrievedAt: input.retrievedAt || new Date().toISOString(),
    sources: uniqueSources,
  };
}

export function normalizeGroqGroundedCompletion(input: {
  payload: unknown;
  model: GroqGroundedModel;
  originalQuery: string;
  retrievedAt?: string;
}): ForecastGroundingResponse {
  const parsedCompletion = GroqCompletionSchema.safeParse(input.payload);
  if (!parsedCompletion.success) {
    throw providerError('SCHEMA_INVALID: Groq completion failed validation', {
      code: 'SCHEMA_INVALID',
      issues: parsedCompletion.error.issues,
    });
  }

  const message = parsedCompletion.data.choices[0].message;
  const evidence = extractGroqForecastEvidence(input);

  let raw: unknown;
  try {
    raw = JSON.parse(message.content);
  } catch {
    throw providerError('SCHEMA_INVALID: Groq returned invalid JSON', { code: 'SCHEMA_INVALID' });
  }

  const normalized = normalizeForecastGroundingPayload({
    raw,
    groundingSources: evidence.sources,
    searchQueries: evidence.searchQueries,
    retrievedAt: evidence.retrievedAt,
  });

  return {
    ...normalized,
    provider: 'groq',
    model: input.model,
  };
}

export async function requestGroqGroundedForecast(input: {
  apiKey: string;
  model?: GroqGroundedModel;
  prompt: string;
  originalQuery: string;
  retrievedAt?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ForecastGroundingResponse> {
  const model = input.model || DEFAULT_GROQ_FORECAST_MODEL;
  const payload = await requestGroqCompletion({ ...input, model, structured: true });
  return normalizeGroqGroundedCompletion({
    payload,
    model,
    originalQuery: input.originalQuery,
    retrievedAt: input.retrievedAt,
  });
}

export async function requestGroqForecastEvidence(input: {
  apiKey: string;
  model?: GroqGroundedModel;
  prompt: string;
  originalQuery: string;
  retrievedAt?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ForecastEvidenceBundle> {
  const model = input.model || DEFAULT_GROQ_FORECAST_MODEL;
  const payload = await requestGroqCompletion({ ...input, model, structured: false });
  return extractGroqForecastEvidence({
    payload,
    model,
    originalQuery: input.originalQuery,
    retrievedAt: input.retrievedAt,
  });
}

async function requestGroqCompletion(input: {
  apiKey: string;
  model: GroqGroundedModel;
  prompt: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  structured: boolean;
}): Promise<unknown> {
  if (!input.apiKey.trim()) {
    throw providerError('NO_AI_CLIENT: Groq not configured', { code: 'NO_AI_CLIENT' });
  }

  const fetchImpl = input.fetchImpl || fetch;
  const response = await fetchImpl(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      messages: [{ role: 'user', content: input.prompt }],
      ...(input.structured ? { response_format: { type: 'json_object' } } : {}),
      compound_custom: { tools: { enabled_tools: ['web_search'] } },
      search_settings: { country: 'vietnam' },
    }),
    signal: input.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    const retryAfterSeconds = Number(response.headers.get('retry-after') || 0);
    const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.ceil(retryAfterSeconds * 1000)
      : undefined;
    if (response.status === 413) {
      throw providerError('PROVIDER_OVERLOADED: Groq Compound context overflow', {
        status: response.status,
        code: 'PROVIDER_OVERLOADED',
      });
    }
    const dailyQuotaExhausted = response.status === 429
      && response.headers.get('x-ratelimit-remaining-requests') === '0';
    throw providerError(
      `${dailyQuotaExhausted ? 'Daily quota exhausted. ' : ''}${body || response.statusText}`,
      {
        status: response.status,
        code: dailyQuotaExhausted ? 'QUOTA_EXCEEDED' : undefined,
        retryAfterMs,
      },
    );
  }

  return response.json();
}
