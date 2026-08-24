import { z } from 'zod';
import {
  isPublicHttpUrl,
  type ForecastEvidenceBundle,
  type ForecastEvidenceSource,
} from './forecastEvidence';

const BRAVE_WEB_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

const BraveResponseSchema = z.object({
  query: z.object({ original: z.string().optional() }).optional(),
  web: z.object({
    results: z.array(z.object({
      title: z.string().min(1),
      url: z.string().min(1),
      description: z.string().optional(),
      age: z.string().optional(),
      extra_snippets: z.array(z.string()).optional(),
    })).optional(),
  }).optional(),
});

function providerError(message: string, values: Record<string, unknown>) {
  return Object.assign(new Error(message), values);
}

function compactSnippet(description?: string, extraSnippets: string[] = []) {
  const parts = [description, ...extraSnippets]
    .map((part) => part?.replace(/\s+/g, ' ').trim())
    .filter((part): part is string => Boolean(part));
  return [...new Set(parts)].join(' ').slice(0, 1_200) || undefined;
}

export async function requestBraveForecastEvidence(input: {
  apiKey: string;
  query: string;
  retrievedAt?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ForecastEvidenceBundle> {
  if (!input.apiKey.trim()) {
    throw providerError('NO_AI_CLIENT: Brave Search not configured', { code: 'NO_AI_CLIENT' });
  }
  const url = new URL(BRAVE_WEB_SEARCH_URL);
  url.searchParams.set('q', input.query);
  url.searchParams.set('count', '10');
  url.searchParams.set('country', 'vn');
  url.searchParams.set('search_lang', 'en');
  url.searchParams.set('extra_snippets', 'true');

  let response: Response;
  try {
    response = await (input.fetchImpl || fetch)(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': input.apiKey,
      },
      signal: input.signal,
    });
  } catch {
    throw providerError('NETWORK_FAILED: Brave Search request failed', { code: 'NETWORK_FAILED', status: 503 });
  }
  if (!response.ok) {
    const retryAfterSeconds = Number(response.headers.get('retry-after') || 0);
    throw providerError('Brave Search request failed', {
      status: response.status,
      code: response.status === 429 ? 'QUOTA_EXCEEDED' : undefined,
      retryAfterMs: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.ceil(retryAfterSeconds * 1_000)
        : undefined,
    });
  }

  const parsed = BraveResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw providerError('SCHEMA_INVALID: Brave Search response failed validation', {
      code: 'SCHEMA_INVALID',
      issues: parsed.error.issues,
    });
  }
  const sources: ForecastEvidenceSource[] = (parsed.data.web?.results || []).flatMap((result) => {
    if (!isPublicHttpUrl(result.url)) return [];
    return [{
      title: result.title,
      url: result.url,
      snippet: compactSnippet(result.description, result.extra_snippets),
      publishedAt: result.age,
    }];
  });
  const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()];
  if (uniqueSources.length === 0) {
    throw providerError('NO_RESULTS: Brave Search returned no public web sources', { code: 'NO_RESULTS' });
  }

  return {
    provider: 'brave',
    model: 'brave-web-search',
    originalQuery: input.query,
    searchQueries: [parsed.data.query?.original || input.query],
    retrievedAt: input.retrievedAt || new Date().toISOString(),
    sources: uniqueSources,
  };
}
