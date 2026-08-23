import { z } from 'zod';
import type { ForecastGroundingResponse } from '../types';
import { normalizeForecastGroundingPayload } from './forecastGrounding';

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

export async function requestGroqGroundedForecast(input: {
  apiKey: string;
  model?: GroqGroundedModel;
  prompt: string;
  originalQuery: string;
  retrievedAt?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ForecastGroundingResponse> {
  if (!input.apiKey.trim()) {
    throw providerError('NO_AI_CLIENT: Groq not configured', { code: 'NO_AI_CLIENT' });
  }

  const fetchImpl = input.fetchImpl || fetch;
  const model = input.model || DEFAULT_GROQ_FORECAST_MODEL;
  const response = await fetchImpl(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: input.prompt }],
      response_format: { type: 'json_object' },
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

  const parsedCompletion = GroqCompletionSchema.safeParse(await response.json());
  if (!parsedCompletion.success) {
    throw providerError('SCHEMA_INVALID: Groq completion failed validation', {
      code: 'SCHEMA_INVALID',
      issues: parsedCompletion.error.issues,
    });
  }

  const message = parsedCompletion.data.choices[0].message;
  const tools = message.executed_tools || [];
  const sources = tools.flatMap((tool) => tool.search_results?.results || []);
  if (sources.length === 0) {
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

  let raw: unknown;
  try {
    raw = JSON.parse(message.content);
  } catch {
    throw providerError('SCHEMA_INVALID: Groq returned invalid JSON', { code: 'SCHEMA_INVALID' });
  }

  const normalized = normalizeForecastGroundingPayload({
    raw,
    groundingSources: [...new Map(sources.map((source) => [source.url, {
      title: source.title,
      url: source.url,
    }])).values()],
    searchQueries: searchQueries.length > 0 ? [...new Set(searchQueries)] : [input.originalQuery],
    retrievedAt: input.retrievedAt,
  });

  return {
    ...normalized,
    provider: 'groq',
    model,
  };
}
