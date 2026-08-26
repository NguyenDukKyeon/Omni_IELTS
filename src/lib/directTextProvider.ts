import { classifyApiFailure } from './apiFailure';
import type { ProviderApiKeyCandidate } from './providerKeyPool';

type DirectTextProvider = 'groq' | 'nvidia_nim' | 'openrouter';

export interface DirectTextRoute {
  provider: DirectTextProvider;
  model: string;
  baseUrl: string;
  keys: ProviderApiKeyCandidate[];
}

export function computeDirectAttemptTimeoutMs(
  totalTimeoutMs: number,
  routes: DirectTextRoute[],
): number {
  const candidateCount = Math.max(1, routes.reduce((sum, route) => sum + route.keys.length, 0));
  return Math.min(25_000, Math.max(5_000, Math.floor(totalTimeoutMs / candidateCount)));
}

type DirectTextAttempt = {
  provider: DirectTextProvider;
  model: string;
  keyAlias: string;
  category?: string;
  latencyMs: number;
};

function textFromPart(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text;
  if (Array.isArray(record.parts)) return record.parts.map(textFromPart).filter(Boolean).join('\n');
  return '';
}

function buildMessages(contents: unknown, config: Record<string, unknown> = {}) {
  const messages: Array<{ role: string; content: string }> = [];
  if (config.systemInstruction) {
    messages.push({ role: 'system', content: textFromPart(config.systemInstruction) || String(config.systemInstruction) });
  }
  if (config.responseMimeType === 'application/json' && config.responseSchema) {
    messages.push({
      role: 'system',
      content: `Return exactly one JSON object matching this response schema. Do not add keys that are not declared by the schema.\n${JSON.stringify(config.responseSchema)}`,
    });
  }
  if (Array.isArray(contents)) {
    const roleMessages = contents.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const record = entry as Record<string, unknown>;
      const content = textFromPart(record);
      if (!content) return [];
      return [{ role: record.role === 'model' ? 'assistant' : 'user', content }];
    });
    if (roleMessages.length) return [...messages, ...roleMessages];
  }
  const content = textFromPart(contents)
    || (typeof contents === 'string' ? contents : JSON.stringify(contents));
  messages.push({ role: 'user', content });
  return messages;
}

function allProvidersExhausted() {
  return Object.assign(new Error('ALL_PROVIDERS_EXHAUSTED'), {
    category: 'all_providers_exhausted',
    status: 503,
  });
}

export async function generateTextWithDirectProviderPool(input: {
  contents: unknown;
  config?: Record<string, unknown>;
  routes: DirectTextRoute[];
  fetchImpl?: typeof fetch;
  totalTimeoutMs?: number;
  perAttemptTimeoutMs?: number;
  validateText?: (text: string) => boolean;
  onAttempt?: (attempt: DirectTextAttempt) => void;
}): Promise<{
  text: string;
  provider: DirectTextProvider;
  model: string;
  keyAlias: string;
}> {
  const fetchImpl = input.fetchImpl || fetch;
  const messages = buildMessages(input.contents, input.config);
  const deadline = Date.now() + (input.totalTimeoutMs || 45_000);

  const maxPoolSize = Math.max(0, ...input.routes.map((route) => route.keys.length));
  const attempts = Array.from({ length: maxPoolSize }, (_, keyIndex) =>
    input.routes.flatMap((route) => route.keys[keyIndex]
      ? [{ route, candidate: route.keys[keyIndex] }]
      : []),
  ).flat();
  const unavailableProviders = new Set<DirectTextProvider>();

  for (const { route, candidate } of attempts) {
      if (unavailableProviders.has(route.provider)) continue;
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        Math.max(1, Math.min(input.perAttemptTimeoutMs || 7_500, remainingMs)),
      );
      try {
        const response = await fetchImpl(`${route.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${candidate.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: route.model,
            messages,
            ...(input.config?.responseMimeType === 'application/json'
              ? { response_format: { type: 'json_object' } }
              : {}),
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const upstreamBody = await response.text();
          const failure = classifyApiFailure(
            { status: response.status, message: upstreamBody },
            'ai',
            route.provider,
          );
          input.onAttempt?.({
            provider: route.provider,
            model: route.model,
            keyAlias: candidate.alias,
            category: failure.category,
            latencyMs: Date.now() - startedAt,
          });
          // Rate limits, overloads and timeouts can be key-specific. Keep rotating
          // through the configured key pool; only skip a provider when its shared
          // network endpoint is unreachable.
          if (failure.category === 'network_failed') {
            unavailableProviders.add(route.provider);
          }
          continue;
        }
        const payload = await response.json() as any;
        const text = String(payload?.choices?.[0]?.message?.content || '').trim();
        let valid = Boolean(text);
        if (valid && input.validateText) {
          try {
            valid = input.validateText(text);
          } catch {
            valid = false;
          }
        }
        if (!valid) {
          input.onAttempt?.({
            provider: route.provider,
            model: route.model,
            keyAlias: candidate.alias,
            category: 'schema_invalid',
            latencyMs: Date.now() - startedAt,
          });
          continue;
        }
        input.onAttempt?.({
          provider: route.provider,
          model: route.model,
          keyAlias: candidate.alias,
          latencyMs: Date.now() - startedAt,
        });
        return { text, provider: route.provider, model: route.model, keyAlias: candidate.alias };
      } catch (error) {
        const timedOut = error instanceof DOMException && error.name === 'AbortError';
        const failure = timedOut
          ? classifyApiFailure({ status: 503, message: 'provider request timeout' }, 'ai', route.provider)
          : classifyApiFailure(error, 'ai', route.provider);
        input.onAttempt?.({
          provider: route.provider,
          model: route.model,
          keyAlias: candidate.alias,
          category: failure.category,
          latencyMs: Date.now() - startedAt,
        });
        if (failure.category === 'network_failed') {
          unavailableProviders.add(route.provider);
        }
      } finally {
        clearTimeout(timeout);
      }
  }

  throw allProvidersExhausted();
}
