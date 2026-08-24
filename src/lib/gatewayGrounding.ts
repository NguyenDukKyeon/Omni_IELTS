import type { ForecastGroundingResponse } from '../types';
import { AiGatewayError, type AiGatewayClient, type AiGatewayRoute } from './aiGateway';
import { normalizeForecastGroundingPayload } from './forecastGrounding';
import {
  extractGroqForecastEvidence,
  normalizeGroqGroundedCompletion,
  type GroqGroundedModel,
} from './groqGrounding';
import type { ForecastEvidenceBundle } from './forecastEvidence';

type GroundingGatewayClient = Pick<AiGatewayClient, 'lane' | 'generateGemini' | 'chatCompletion'>;

function rawProviderPayload(payload: any): unknown {
  const raw = payload?.extra_fields?.raw_response;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return payload; }
  }
  return raw && typeof raw === 'object' ? raw : payload;
}

function schemaError(route: AiGatewayRoute) {
  return new AiGatewayError({
    category: 'schema_invalid',
    status: 502,
    provider: route.provider,
    model: route.modelAlias,
  });
}

export function shouldUseDirectGroundedProvider(input: {
  hasByok: boolean;
  gatewayEnabled: boolean;
  gatewayHealthy: boolean;
}): boolean {
  return input.hasByok || !input.gatewayEnabled || !input.gatewayHealthy;
}

export function extractGeminiGroundingSources(metadata: any): Array<{
  title: string;
  url: string;
  snippet?: string;
}> {
  const snippetsByChunk = new Map<number, string[]>();
  for (const support of metadata?.groundingSupports || []) {
    const snippet = typeof support?.segment?.text === 'string'
      ? support.segment.text.replace(/\s+/g, ' ').trim()
      : '';
    if (!snippet) continue;
    for (const index of support?.groundingChunkIndices || []) {
      if (!Number.isInteger(index) || index < 0) continue;
      snippetsByChunk.set(index, [...(snippetsByChunk.get(index) || []), snippet]);
    }
  }
  return (metadata?.groundingChunks || []).flatMap((chunk: any, index: number) => {
    const url = chunk?.web?.uri;
    if (!url) return [];
    let fallbackTitle = 'Nguồn tham khảo';
    try { fallbackTitle = new URL(url).hostname; } catch { /* use public fallback */ }
    const snippets = [...new Set(snippetsByChunk.get(index) || [])];
    return [{
      title: chunk?.web?.title || fallbackTitle,
      url,
      snippet: snippets.join(' ').slice(0, 1_200) || undefined,
    }];
  });
}

export async function requestGatewayGroqForecastEvidence(input: {
  client: GroundingGatewayClient;
  route: AiGatewayRoute;
  prompt: string;
  originalQuery: string;
  retrievedAt?: string;
}): Promise<ForecastEvidenceBundle> {
  if (input.route.capability !== 'search' || input.route.provider !== 'groq') {
    throw new AiGatewayError({
      category: 'capability_mismatch',
      status: 400,
      provider: input.route.provider,
      model: input.route.modelAlias,
    });
  }
  const payload = await input.client.chatCompletion(
    input.route,
    [{ role: 'user', content: input.prompt }],
    {},
    { sendBackRawResponse: true },
  );
  return extractGroqForecastEvidence({
    payload: rawProviderPayload(payload),
    model: input.route.model as GroqGroundedModel,
    originalQuery: input.originalQuery,
    retrievedAt: input.retrievedAt,
  });
}

export async function requestGatewayGroundedForecast(input: {
  client: GroundingGatewayClient;
  route: AiGatewayRoute;
  prompt: string;
  originalQuery: string;
  retrievedAt?: string;
}): Promise<ForecastGroundingResponse> {
  if (input.route.capability !== 'search') throw schemaError(input.route);

  if (input.route.provider === 'gemini') {
    const payload = await input.client.generateGemini(input.route, {
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const candidate = payload?.candidates?.[0];
    const text = (candidate?.content?.parts || [])
      .map((part: any) => typeof part?.text === 'string' ? part.text : '')
      .join('')
      .trim();
    if (!text) throw schemaError(input.route);

    let raw: unknown;
    try { raw = JSON.parse(text); } catch { throw schemaError(input.route); }
    const metadata = candidate?.groundingMetadata || {};
    const sources = extractGeminiGroundingSources(metadata);
    const normalized = normalizeForecastGroundingPayload({
      raw,
      groundingSources: [...new Map(sources.map((source: any) => [source.url, source])).values()] as Array<{ title: string; url: string }>,
      searchQueries: metadata.webSearchQueries?.length ? metadata.webSearchQueries : [input.originalQuery],
      retrievedAt: input.retrievedAt,
    });
    return { ...normalized, provider: 'gemini', model: input.route.model };
  }

  if (input.route.provider === 'groq') {
    const payload = await input.client.chatCompletion(
      input.route,
      [{ role: 'user', content: input.prompt }],
      {
        response_format: { type: 'json_object' },
      },
      { sendBackRawResponse: true },
    );
    return normalizeGroqGroundedCompletion({
      payload: rawProviderPayload(payload),
      model: input.route.model as GroqGroundedModel,
      originalQuery: input.originalQuery,
      retrievedAt: input.retrievedAt,
    });
  }

  throw new AiGatewayError({
    category: 'capability_mismatch',
    status: 400,
    provider: input.route.provider,
    model: input.route.modelAlias,
  });
}
