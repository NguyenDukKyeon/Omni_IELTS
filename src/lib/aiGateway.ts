import { AI_TASK_PROFILES, type AiCapability, type AiTaskTier } from './aiTaskProfiles';
import { getConfiguredWebBridgeSessionStatus, type WebBridgeSessionStatus } from './webBridgeSession';

export type AiGatewayProvider = 'gemini' | 'gemini_web' | 'groq' | 'nvidia_nim' | 'openrouter';
export type AiGatewayLane = 'bifrost' | 'web_bridge';
export type WebBridgeKind = 'gemini-web2api' | 'webai-to-api';
export type AiCostClass = 'free' | 'metered' | 'paid';
export type AiGatewayTransport = 'gemini-native' | 'openai';

export interface AiGatewayRoute {
  provider: AiGatewayProvider;
  model: string;
  modelAlias: string;
  gatewayModel: string;
  capability: AiCapability;
  costClass: AiCostClass;
  transport: AiGatewayTransport;
  timeoutMs: number;
}

export interface AiGatewayClient {
  readonly lane: AiGatewayLane;
  generateGemini(route: AiGatewayRoute, body: Record<string, unknown>): Promise<any>;
  chatCompletion(
    route: AiGatewayRoute,
    messages: Array<{ role: string; content: string }>,
    options?: Record<string, unknown>,
    requestOptions?: AiGatewayRequestOptions,
  ): Promise<any>;
  health(): Promise<boolean>;
}

export type AiGatewayFailureCategory =
  | 'auth_missing'
  | 'auth_invalid'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'provider_overloaded'
  | 'network_failed'
  | 'gateway_unavailable'
  | 'all_providers_exhausted'
  | 'capability_mismatch'
  | 'zero_cost_violation'
  | 'schema_invalid'
  | 'no_results'
  | 'unknown';

export interface AiGatewayAttempt {
  lane: AiGatewayLane;
  provider: AiGatewayProvider;
  model: string;
  capability: AiCapability;
  keyAlias: string;
  latencyMs: number;
  failureCategory?: AiGatewayFailureCategory;
  circuitState: 'closed' | 'open' | 'half_open';
  retryAfterMs?: number;
  requestId: string;
}

type FetchLike = typeof fetch;

export interface AiGatewayRequestOptions {
  sendBackRawResponse?: boolean;
}

export interface AiGatewayCapabilities {
  enabled: boolean;
  gatewayBaseUrlConfigured: boolean;
  virtualKeyConfigured: boolean;
  quotaScope: 'google_cloud_project';
  quotaNoteVi: string;
  providers: Array<{
    provider: AiGatewayProvider;
    capabilities: AiCapability[];
    keys: Array<{ alias: string; configured: boolean }>;
  }>;
  lanes: Array<{
    lane: AiGatewayLane;
    enabled: boolean;
    mode: 'public' | 'canary' | 'disabled';
    status: 'ready' | 'auth_missing' | WebBridgeSessionStatus;
    capabilities: AiCapability[];
    baseUrlConfigured: boolean;
    credentialsConfigured: boolean;
  }>;
}

const WEB_BRIDGE_FALLBACK_CATEGORIES = new Set<AiGatewayFailureCategory>([
  'quota_exhausted',
  'rate_limited',
  'all_providers_exhausted',
  'gateway_unavailable',
  'network_failed',
  'provider_overloaded',
]);

function constantTimeStringEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const comparisonLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < comparisonLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

export function isWebBridgeCanaryAuthorized(
  candidate: string | undefined,
  env: Record<string, string | undefined>,
): boolean {
  const configuredKey = env.WEB_AI_BRIDGE_API_KEY?.trim();
  return env.WEB_AI_BRIDGE_ENABLED === 'true'
    && Boolean(env.WEB_AI_BRIDGE_BASE_URL?.trim())
    && Boolean(configuredKey)
    && Boolean(candidate)
    && constantTimeStringEqual(candidate || '', configuredKey || '');
}

export function shouldUseWebBridgeFallback(input: {
  enabled: boolean;
  capability: AiCapability;
  category: AiGatewayFailureCategory;
}): boolean {
  return input.enabled
    && input.capability === 'text'
    && WEB_BRIDGE_FALLBACK_CATEGORIES.has(input.category);
}

export async function executeWithWebBridgeFallback<T>(input: {
  capability: AiCapability;
  enabled: boolean;
  primary: () => Promise<T>;
  secondary: () => Promise<T>;
}): Promise<{
  value: T;
  lane: AiGatewayLane;
  primaryFailure?: AiGatewayFailureCategory;
}> {
  try {
    return { value: await input.primary(), lane: 'bifrost' };
  } catch (error) {
    const category = gatewayFailureCategory(error);
    if (!shouldUseWebBridgeFallback({
      enabled: input.enabled,
      capability: input.capability,
      category,
    })) {
      throw error;
    }
    return {
      value: await input.secondary(),
      lane: 'web_bridge',
      primaryFailure: category,
    };
  }
}

export class AiGatewayError extends Error {
  readonly category: AiGatewayFailureCategory;
  readonly status: number;
  readonly provider?: AiGatewayProvider;
  readonly model?: string;
  readonly requestId: string;
  readonly retryAfterMs?: number;

  constructor(input: {
    category: AiGatewayFailureCategory;
    status: number;
    provider?: AiGatewayProvider;
    model?: string;
    requestId?: string;
    retryAfterMs?: number;
  }) {
    super(publicGatewayMessage(input.category));
    this.name = 'AiGatewayError';
    this.category = input.category;
    this.status = input.status;
    this.provider = input.provider;
    this.model = input.model;
    this.requestId = input.requestId || createRequestId();
    this.retryAfterMs = input.retryAfterMs;
  }
}

function geminiRoute(
  model: string,
  capability: AiCapability,
  modelAlias?: string,
  timeoutMs = 45_000,
): AiGatewayRoute {
  return {
    provider: 'gemini',
    model,
    modelAlias: modelAlias || `gemini-${capability}`,
    gatewayModel: model,
    capability,
    costClass: 'free',
    transport: 'gemini-native',
    timeoutMs,
  };
}

function openAiRoute(
  provider: Exclude<AiGatewayProvider, 'gemini'>,
  model: string,
  capability: AiCapability,
  modelAlias?: string,
  timeoutMs = 45_000,
  costClass: AiCostClass = 'free',
): AiGatewayRoute {
  return {
    provider,
    model,
    modelAlias: modelAlias || `${provider}-${capability}`,
    gatewayModel: `${provider}/${model}`,
    capability,
    costClass,
    transport: 'openai',
    timeoutMs,
  };
}

export function getGatewayRoutes(tier: AiTaskTier): AiGatewayRoute[] {
  const profile = AI_TASK_PROFILES[tier];
  return [
    {
      provider: profile.provider,
      model: profile.model,
      modelAlias: profile.modelAlias,
      capability: profile.capability,
      costClass: profile.costClass,
    },
    ...profile.fallbackChain,
  ].map((route) => route.provider === 'gemini'
    ? geminiRoute(route.model, route.capability, route.modelAlias, profile.timeoutMs)
    : openAiRoute(route.provider, route.model, route.capability, route.modelAlias, profile.timeoutMs, route.costClass));
}

export function describeGatewayCapabilities(
  env: Record<string, string | undefined>,
): AiGatewayCapabilities {
  const has = (name: string) => Boolean(env[name]?.trim());
  const gatewayBaseUrlConfigured = has('AI_GATEWAY_BASE_URL');
  const virtualKeyConfigured = has('BIFROST_VIRTUAL_KEY');
  const bifrostEnabled = env.AI_GATEWAY_ENABLED?.trim().toLowerCase() === 'true'
    && gatewayBaseUrlConfigured
    && virtualKeyConfigured;
  const webBridgeBaseUrlConfigured = has('WEB_AI_BRIDGE_BASE_URL');
  const webBridgeCredentialsConfigured = has('WEB_AI_BRIDGE_API_KEY');
  const webBridgeSessionStatus = getConfiguredWebBridgeSessionStatus(env);
  const bridgeKind = env.WEB_AI_BRIDGE_KIND?.trim().toLowerCase();
  const webBridgeKindSupported = bridgeKind === 'gemini-web2api' || bridgeKind === 'webai-to-api';
  const webBridgeRequested = env.WEB_AI_BRIDGE_ENABLED?.trim().toLowerCase() === 'true';
  const webBridgeEnabled = webBridgeRequested
    && webBridgeKindSupported
    && webBridgeBaseUrlConfigured
    && webBridgeCredentialsConfigured
    && webBridgeSessionStatus !== 'login_required';
  return {
    enabled: bifrostEnabled,
    gatewayBaseUrlConfigured,
    virtualKeyConfigured,
    quotaScope: 'google_cloud_project',
    quotaNoteVi: 'Quota Gemini được Google tính theo Google Cloud project; nhiều key cùng project không làm tăng quota.',
    providers: [
      {
        provider: 'gemini',
        capabilities: ['text', 'search', 'audio-input', 'audio-output'],
        keys: [
          { alias: 'gemini-project-primary', configured: has('GEMINI_API_KEY') },
          { alias: 'gemini-project-2', configured: has('GEMINI_API_KEY_2') },
          { alias: 'gemini-project-3', configured: has('GEMINI_API_KEY_3') },
          { alias: 'gemini-project-4', configured: has('GEMINI_API_KEY_4') },
        ],
      },
      {
        provider: 'groq',
        capabilities: ['text', 'search'],
        keys: [
          { alias: 'groq-primary', configured: has('GROQ_API_KEY') },
          { alias: 'groq-2', configured: has('GROQ_API_KEY_2') },
          { alias: 'groq-3', configured: has('GROQ_API_KEY_3') },
        ],
      },
      {
        provider: 'nvidia_nim',
        capabilities: ['text'],
        keys: [
          { alias: 'nvidia-nim-primary', configured: has('NVIDIA_NIM_API_KEY') },
          { alias: 'nvidia-nim-2', configured: has('NVIDIA_NIM_API_KEY_2') },
          { alias: 'nvidia-nim-3', configured: has('NVIDIA_NIM_API_KEY_3') },
        ],
      },
      {
        provider: 'openrouter',
        capabilities: ['text'],
        keys: [
          { alias: 'openrouter-primary', configured: has('OPENROUTER_API_KEY') },
          { alias: 'openrouter-2', configured: has('OPENROUTER_API_KEY_2') },
          { alias: 'openrouter-3', configured: has('OPENROUTER_API_KEY_3') },
        ],
      },
    ],
    lanes: [
      {
        lane: 'bifrost',
        enabled: bifrostEnabled,
        mode: 'public',
        status: bifrostEnabled
          ? 'ready'
          : env.AI_GATEWAY_ENABLED?.trim().toLowerCase() === 'true' ? 'auth_missing' : 'disabled',
        capabilities: ['text', 'search', 'audio-input', 'audio-output'],
        baseUrlConfigured: gatewayBaseUrlConfigured,
        credentialsConfigured: virtualKeyConfigured,
      },
      {
        lane: 'web_bridge',
        enabled: webBridgeEnabled,
        mode: 'canary',
        status: webBridgeEnabled
          ? 'unavailable'
          : webBridgeSessionStatus === 'login_required'
            ? 'login_required'
            : webBridgeRequested ? 'auth_missing' : 'disabled',
        capabilities: ['text'],
        baseUrlConfigured: webBridgeBaseUrlConfigured,
        credentialsConfigured: webBridgeCredentialsConfigured,
      },
    ],
  };
}

export function assertZeroCostRoute(route: AiGatewayRoute): void {
  const isAllowedOpenRouter = route.provider !== 'openrouter' || route.model === 'openrouter/free';
  if (route.costClass !== 'free' || !isAllowedOpenRouter) {
    throw new AiGatewayError({
      category: 'zero_cost_violation',
      status: 400,
      provider: route.provider,
      model: route.modelAlias,
    });
  }
}

function publicGatewayMessage(category: AiGatewayFailureCategory): string {
  const messages: Record<AiGatewayFailureCategory, string> = {
    auth_missing: 'AI Gateway chưa được cấu hình.',
    auth_invalid: 'AI Gateway từ chối thông tin xác thực.',
    rate_limited: 'Nguồn AI đang giới hạn lượt gọi. Hãy thử lại sau.',
    quota_exhausted: 'Nguồn AI miễn phí đã hết quota.',
    provider_overloaded: 'Nguồn AI đang quá tải tạm thời.',
    network_failed: 'Không thể kết nối tới AI Gateway.',
    gateway_unavailable: 'AI Gateway hiện không khả dụng.',
    all_providers_exhausted: 'Tất cả nguồn AI miễn phí phù hợp hiện không khả dụng.',
    capability_mismatch: 'Model không hỗ trợ năng lực cần thiết.',
    zero_cost_violation: 'Route này không đáp ứng chính sách chi phí đã phê duyệt.',
    schema_invalid: 'Nguồn AI trả dữ liệu không đạt schema.',
    no_results: 'Nguồn tìm kiếm chưa trả kết quả có thể kiểm chứng.',
    unknown: 'Tác vụ AI chưa thể hoàn tất.',
  };
  return messages[category];
}

export function extractGeminiResponseText(payload: any): string {
  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((part: any) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim();
}

function stringifyGeminiContents(contents: unknown): string {
  if (typeof contents === 'string') return contents;
  if (!Array.isArray(contents)) return JSON.stringify(contents ?? '');
  return contents.map((content: any) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content?.parts)) {
      return content.parts.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('\n');
    }
    return typeof content?.text === 'string' ? content.text : '';
  }).filter(Boolean).join('\n');
}

export function buildGeminiGatewayRequestBody(contents: unknown, config: Record<string, any> = {}) {
  const {
    systemInstruction,
    tools,
    responseMimeType,
    responseSchema,
    thinkingConfig,
    temperature,
    topP,
    topK,
    __omniTaskTier: _omniTaskTier,
    ...rest
  } = config;
  const normalizedContents = typeof contents === 'string'
    ? [{ role: 'user', parts: [{ text: contents }] }]
    : contents;
  const generationConfig = {
    ...(responseMimeType ? { responseMimeType } : {}),
    ...(responseSchema ? { responseSchema } : {}),
    ...(thinkingConfig ? { thinkingConfig } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
    ...(topP !== undefined ? { topP } : {}),
    ...(topK !== undefined ? { topK } : {}),
    ...rest,
  };
  return {
    contents: normalizedContents,
    ...(systemInstruction ? { systemInstruction } : {}),
    ...(tools ? { tools } : {}),
    ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
  };
}

function inferGeminiCapability(input: { model: string; contents: unknown; config?: Record<string, any> }): AiCapability {
  if (input.model.toLowerCase().includes('tts') || input.config?.responseModalities?.includes?.('AUDIO')) {
    return 'audio-output';
  }
  if (input.config?.tools?.some?.((tool: any) => tool?.googleSearch)) return 'search';
  const serializedContents = JSON.stringify(input.contents || '').toLowerCase();
  if (serializedContents.includes('inlinedata') && serializedContents.includes('audio/')) return 'audio-input';
  return 'text';
}

export function createGeminiGatewayFacade(input: {
  getClient: () => Promise<Pick<AiGatewayClient, 'lane' | 'generateGemini' | 'chatCompletion'> | null>;
  recordAttempt?: (attempt: AiGatewayAttempt) => void;
  maxRequestDurationMs?: number;
}) {
  return {
    __omniGatewayFacade: true,
    models: {
      generateContent: async (request: {
        model: string;
        contents: unknown;
        config?: Record<string, any>;
      }) => {
        const client = await input.getClient();
        if (!client) throw new AiGatewayError({ category: 'gateway_unavailable', status: 503 });
        const capability = inferGeminiCapability(request);
        const requestedTier = request.config?.__omniTaskTier;
        const textTier: Extract<AiTaskTier, 'instant' | 'balanced' | 'deep'> = capability === 'text'
          && (requestedTier === 'instant' || requestedTier === 'balanced' || requestedTier === 'deep')
          ? requestedTier
          : 'balanced';
        const profileTimeoutMs = AI_TASK_PROFILES[textTier].timeoutMs;
        const officialLaneBudgetMs = input.maxRequestDurationMs && input.maxRequestDurationMs > 0
          ? Math.min(profileTimeoutMs, input.maxRequestDurationMs)
          : profileTimeoutMs;
        const route = geminiRoute(
          request.model,
          capability,
          `gemini-pool-${capability}`,
          officialLaneBudgetMs,
        );
        const startedAt = Date.now();
        try {
          const payload = await client.generateGemini(
            route,
            buildGeminiGatewayRequestBody(request.contents, request.config),
          );
          const text = extractGeminiResponseText(payload);
          if (!text) {
            throw new AiGatewayError({
              category: 'schema_invalid',
              status: 502,
              provider: 'gemini',
              model: route.modelAlias,
            });
          }
          if (request.config?.responseMimeType === 'application/json') {
            try {
              JSON.parse(text);
            } catch {
              throw new AiGatewayError({
                category: 'schema_invalid',
                status: 502,
                provider: 'gemini',
                model: route.modelAlias,
              });
            }
          }
          input.recordAttempt?.({
            lane: client.lane,
            provider: 'gemini',
            model: route.modelAlias,
            capability: route.capability,
            keyAlias: safeKeyAliasForLane(client.lane),
            latencyMs: Date.now() - startedAt,
            circuitState: 'closed',
            requestId: createRequestId(),
          });
          return { ...payload, text };
        } catch (error) {
          const failureCategory = gatewayFailureCategory(error);
          input.recordAttempt?.({
            lane: client.lane,
            provider: 'gemini',
            model: route.modelAlias,
            capability: route.capability,
            keyAlias: safeKeyAliasForLane(client.lane),
            latencyMs: Date.now() - startedAt,
            failureCategory,
            circuitState: circuitStateForFailure(failureCategory),
            retryAfterMs: error && typeof error === 'object' && 'retryAfterMs' in error
              ? Number((error as { retryAfterMs?: number }).retryAfterMs) || undefined
              : undefined,
            requestId: error && typeof error === 'object' && 'requestId' in error
              ? String((error as { requestId?: string }).requestId || createRequestId())
              : createRequestId(),
          });
          if (capability === 'text') {
            const remainingBudgetMs = Math.max(0, officialLaneBudgetMs - (Date.now() - startedAt));
            const fallback = await generateTextWithGateway({
              tier: textTier,
              contents: request.contents,
              config: request.config,
              client,
              onAttempt: input.recordAttempt,
              skipProviders: client.lane === 'web_bridge'
                ? ['gemini', 'groq', 'nvidia_nim', 'openrouter']
                : ['gemini'],
              totalTimeoutMs: input.maxRequestDurationMs ? remainingBudgetMs : undefined,
            });
            return {
              candidates: [{ content: { role: 'model', parts: [{ text: fallback.text }] } }],
              text: fallback.text,
            };
          }
          throw error;
        }
      },
    },
  };
}

function openAiMessages(contents: unknown, config: Record<string, any> = {}) {
  const messages: Array<{ role: string; content: string }> = [];
  if (config.systemInstruction) {
    messages.push({
      role: 'system',
      content: typeof config.systemInstruction === 'string'
        ? config.systemInstruction
        : stringifyGeminiContents([config.systemInstruction]),
    });
  }
  messages.push({ role: 'user', content: stringifyGeminiContents(contents) });
  return messages;
}

function gatewayFailureCategory(error: unknown): AiGatewayFailureCategory {
  if (error && typeof error === 'object' && 'category' in error) {
    return String((error as { category?: string }).category || 'unknown') as AiGatewayFailureCategory;
  }
  return 'unknown';
}

function circuitStateForFailure(category: AiGatewayFailureCategory): AiGatewayAttempt['circuitState'] {
  return category === 'quota_exhausted' || category === 'rate_limited' ? 'open' : 'closed';
}

function safeKeyAliasForLane(lane: AiGatewayLane): string {
  if (lane === 'web_bridge') return 'web-bridge-local';
  return 'bifrost-managed';
}

export async function generateTextWithGateway(input: {
  tier: Extract<AiTaskTier, 'instant' | 'balanced' | 'deep'>;
  contents: unknown;
  config?: Record<string, any>;
  client: Pick<AiGatewayClient, 'lane' | 'generateGemini' | 'chatCompletion'>;
  validateText?: (text: string) => boolean;
  onAttempt?: (attempt: AiGatewayAttempt) => void;
  skipProviders?: AiGatewayProvider[];
  totalTimeoutMs?: number;
}): Promise<{ text: string; provider: AiGatewayProvider; model: string }> {
  const skipped = new Set(input.skipProviders || []);
  const routes = getGatewayRoutes(input.tier).filter((route) => !skipped.has(route.provider));
  const deadline = input.totalTimeoutMs === undefined
    ? null
    : Date.now() + Math.max(0, input.totalTimeoutMs);

  for (const configuredRoute of routes) {
    const remainingMs = deadline === null ? null : deadline - Date.now();
    if (remainingMs !== null && remainingMs <= 0) break;
    const route = remainingMs === null
      ? configuredRoute
      : { ...configuredRoute, timeoutMs: Math.max(1, Math.min(configuredRoute.timeoutMs, remainingMs)) };
    const startedAt = Date.now();
    try {
      const payload = route.provider === 'gemini'
        ? await input.client.generateGemini(route, buildGeminiGatewayRequestBody(input.contents, input.config))
        : await input.client.chatCompletion(
            route,
            openAiMessages(input.contents, input.config),
            input.config?.responseMimeType === 'application/json'
              ? { response_format: { type: 'json_object' } }
              : {},
          );
      const text = route.provider === 'gemini'
        ? extractGeminiResponseText(payload)
        : String(payload?.choices?.[0]?.message?.content || '').trim();
      if (!text) throw new AiGatewayError({
        category: 'schema_invalid',
        status: 502,
        provider: route.provider,
        model: route.modelAlias,
      });
      const validateText = input.validateText || (input.config?.responseMimeType === 'application/json'
        ? (value: string) => { JSON.parse(value); return true; }
        : undefined);
      if (validateText) {
        let valid = false;
        try { valid = validateText(text); } catch { valid = false; }
        if (!valid) throw new AiGatewayError({
          category: 'schema_invalid',
          status: 502,
          provider: route.provider,
          model: route.modelAlias,
        });
      }
      input.onAttempt?.({
        lane: input.client.lane,
        provider: route.provider,
        model: route.modelAlias,
        capability: route.capability,
        keyAlias: safeKeyAliasForLane(input.client.lane),
        latencyMs: Date.now() - startedAt,
        circuitState: 'closed',
        requestId: createRequestId(),
      });
      return { text, provider: route.provider, model: route.model };
    } catch (error) {
      const failureCategory = gatewayFailureCategory(error);
      input.onAttempt?.({
        lane: input.client.lane,
        provider: route.provider,
        model: route.modelAlias,
        capability: route.capability,
        keyAlias: safeKeyAliasForLane(input.client.lane),
        latencyMs: Date.now() - startedAt,
        failureCategory,
        circuitState: circuitStateForFailure(failureCategory),
        retryAfterMs: error && typeof error === 'object' && 'retryAfterMs' in error
          ? Number((error as { retryAfterMs?: number }).retryAfterMs) || undefined
          : undefined,
        requestId: error && typeof error === 'object' && 'requestId' in error
          ? String((error as { requestId?: string }).requestId || createRequestId())
          : createRequestId(),
      });
    }
  }

  throw new AiGatewayError({ category: 'all_providers_exhausted', status: 503 });
}

function createRequestId(): string {
  return `gateway_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function classifyGatewayResponse(status: number, upstreamBody: string): AiGatewayFailureCategory {
  const normalized = upstreamBody.toLowerCase();
  if (status === 401 || status === 403) return 'auth_invalid';
  if (status === 429 && (normalized.includes('quota') || normalized.includes('resource_exhausted'))) {
    return 'quota_exhausted';
  }
  if (status === 429) return 'rate_limited';
  if (status === 413 || status === 502 || status === 503 || status === 504) return 'provider_overloaded';
  return 'unknown';
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const resetAt = Date.parse(value);
  if (!Number.isFinite(resetAt)) return undefined;
  return Math.max(0, resetAt - Date.now());
}

function requireCapability(route: AiGatewayRoute, allowed: AiCapability[]): void {
  if (!allowed.includes(route.capability)) {
    throw new AiGatewayError({
      category: 'capability_mismatch',
      status: 400,
      provider: route.provider,
      model: route.modelAlias,
    });
  }
}

export class BifrostGatewayClient implements AiGatewayClient {
  readonly lane = 'bifrost' as const;
  private readonly baseUrl: string;
  private readonly virtualKey: string;
  private readonly fetchImpl: FetchLike;

  constructor(input: { baseUrl: string; virtualKey: string; fetchImpl?: FetchLike }) {
    this.baseUrl = normalizeBaseUrl(input.baseUrl);
    this.virtualKey = input.virtualKey.trim();
    this.fetchImpl = input.fetchImpl || fetch;
    if (!this.baseUrl || !this.virtualKey) {
      throw new AiGatewayError({ category: 'auth_missing', status: 503 });
    }
  }

  async generateGemini(
    route: AiGatewayRoute,
    body: Record<string, unknown>,
  ): Promise<any> {
    assertZeroCostRoute(route);
    requireCapability(route, ['text', 'search', 'audio-input', 'audio-output']);
    if (route.transport !== 'gemini-native' || route.provider !== 'gemini') {
      throw new AiGatewayError({
        category: 'capability_mismatch',
        status: 400,
        provider: route.provider,
        model: route.modelAlias,
      });
    }
    return this.requestJson(
      `${this.baseUrl}/genai/v1beta/models/${encodeURIComponent(route.gatewayModel)}:generateContent`,
      route,
      body,
    );
  }

  async chatCompletion(
    route: AiGatewayRoute,
    messages: Array<{ role: string; content: string }>,
    options: Record<string, unknown> = {},
    requestOptions: AiGatewayRequestOptions = {},
  ): Promise<any> {
    assertZeroCostRoute(route);
    requireCapability(route, ['text', 'search']);
    if (route.transport !== 'openai') {
      throw new AiGatewayError({
        category: 'capability_mismatch',
        status: 400,
        provider: route.provider,
        model: route.modelAlias,
      });
    }
    return this.requestJson(
      `${this.baseUrl}/v1/chat/completions`,
      route,
      {
        ...options,
        model: route.gatewayModel,
        messages,
      },
      requestOptions.sendBackRawResponse
        ? { 'x-bf-send-back-raw-response': 'true' }
        : {},
    );
  }

  async health(): Promise<boolean> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'x-bf-vk': this.virtualKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async requestJson(
    url: string,
    route: AiGatewayRoute,
    body: Record<string, unknown>,
    requestHeaders: Record<string, string> = {},
  ): Promise<any> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-bf-vk': this.virtualKey,
          ...requestHeaders,
        },
        signal: AbortSignal.timeout(route.timeoutMs),
        body: JSON.stringify(body),
      });
    } catch (error) {
      const timedOut = error instanceof Error
        && (error.name === 'AbortError' || error.name === 'TimeoutError');
      throw new AiGatewayError({
        category: timedOut ? 'provider_overloaded' : 'gateway_unavailable',
        status: timedOut ? 504 : 503,
        provider: route.provider,
        model: route.modelAlias,
      });
    }

    if (!response.ok) {
      let upstreamBody = '';
      try {
        upstreamBody = await response.text();
      } catch {
        // The upstream body is deliberately discarded either way.
      }
      throw new AiGatewayError({
        category: classifyGatewayResponse(response.status, upstreamBody),
        status: response.status,
        provider: route.provider,
        model: route.modelAlias,
        retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
      });
    }

    try {
      return await response.json();
    } catch {
      throw new AiGatewayError({
        category: 'schema_invalid',
        status: 502,
        provider: route.provider,
        model: route.modelAlias,
      });
    }
  }
}

function normalizeWebBridgeText(rawText: unknown, structured: boolean): string {
  const text = String(rawText || '').trim();
  if (!text) {
    throw new AiGatewayError({ category: 'schema_invalid', status: 502, provider: 'gemini_web' });
  }
  if (!structured) return text;

  const fenced = text.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i);
  const normalized = (fenced ? fenced[1] : text).trim();
  try {
    JSON.parse(normalized);
  } catch {
    throw new AiGatewayError({ category: 'schema_invalid', status: 502, provider: 'gemini_web' });
  }
  return normalized;
}

export class WebBridgeGatewayClient implements AiGatewayClient {
  readonly lane = 'web_bridge' as const;
  readonly kind: WebBridgeKind;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: FetchLike;

  constructor(input: {
    baseUrl: string;
    apiKey: string;
    model?: string;
    kind: WebBridgeKind;
    fetchImpl?: FetchLike;
  }) {
    this.baseUrl = normalizeBaseUrl(input.baseUrl);
    this.apiKey = input.apiKey.trim();
    this.model = input.model?.trim() || 'gemini-3.1-pro';
    this.kind = input.kind;
    this.fetchImpl = input.fetchImpl || fetch;
    if (!this.baseUrl || !this.apiKey || !this.model) {
      throw new AiGatewayError({ category: 'auth_missing', status: 503, provider: 'gemini_web' });
    }
  }

  async generateGemini(route: AiGatewayRoute, body: Record<string, unknown>): Promise<any> {
    assertZeroCostRoute(route);
    requireCapability(route, ['text']);
    const generationConfig = body.generationConfig && typeof body.generationConfig === 'object'
      ? body.generationConfig as Record<string, unknown>
      : {};
    const structured = generationConfig.responseMimeType === 'application/json';
    const messages = openAiMessages(body.contents, {
      systemInstruction: body.systemInstruction,
    });
    if (structured) {
      const schema = generationConfig.responseSchema;
      messages.unshift({
        role: 'system',
        content: `Return exactly one valid JSON value with no Markdown or trailing prose.${schema ? ` JSON schema: ${JSON.stringify(schema)}` : ''}`,
      });
    }

    const payload = await this.requestJson(route, {
      model: this.model,
      messages,
      reasoning_effort: route.modelAlias === AI_TASK_PROFILES.deep.modelAlias ? 'high' : 'standard',
      stream: false,
    });
    const text = normalizeWebBridgeText(payload?.choices?.[0]?.message?.content, structured);
    const bridgeMetadata = {
      authenticated: payload?.omni?.authenticated === true,
      resolvedModel: String(payload?.omni?.resolved_model || ''),
      thinkingMode: String(payload?.omni?.thinking_mode || ''),
      attemptedModels: Array.isArray(payload?.omni?.attempted_models)
        ? payload.omni.attempted_models.map((model: unknown) => String(model))
        : [],
    };
    const validModelChain = bridgeMetadata.attemptedModels[0] === 'gemini-flash'
      && ['gemini-flash', 'gemini-pro'].includes(bridgeMetadata.resolvedModel);
    const extendedThinkingRequired = route.modelAlias === AI_TASK_PROFILES.deep.modelAlias;
    if (
      !bridgeMetadata.authenticated
      || !validModelChain
      || (extendedThinkingRequired && bridgeMetadata.thinkingMode !== 'extended')
    ) {
      throw new AiGatewayError({ category: 'auth_invalid', status: 401, provider: 'gemini_web' });
    }
    return {
      candidates: [{ content: { role: 'model', parts: [{ text }] } }],
      text,
      bridgeMetadata,
    };
  }

  async chatCompletion(
    route: AiGatewayRoute,
    messages: Array<{ role: string; content: string }>,
    options: Record<string, unknown> = {},
  ): Promise<any> {
    assertZeroCostRoute(route);
    requireCapability(route, ['text']);
    const structured = (options.response_format as { type?: string } | undefined)?.type === 'json_object';
    const requestMessages = structured
      ? [{ role: 'system', content: 'Return exactly one valid JSON value with no Markdown or trailing prose.' }, ...messages]
      : messages;
    const payload = await this.requestJson(route, {
      ...options,
      model: this.model,
      messages: requestMessages,
      stream: false,
    });
    const text = normalizeWebBridgeText(payload?.choices?.[0]?.message?.content, structured);
    return {
      ...payload,
      choices: [{
        ...(payload?.choices?.[0] || {}),
        message: { ...(payload?.choices?.[0]?.message || {}), content: text },
      }],
    };
  }

  async health(): Promise<boolean> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async requestJson(route: AiGatewayRoute, body: Record<string, unknown>): Promise<any> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(route.timeoutMs),
        body: JSON.stringify(body),
      });
    } catch (error) {
      const timedOut = error instanceof Error
        && (error.name === 'AbortError' || error.name === 'TimeoutError');
      throw new AiGatewayError({
        category: timedOut ? 'provider_overloaded' : 'gateway_unavailable',
        status: timedOut ? 504 : 503,
        provider: 'gemini_web',
        model: this.model,
      });
    }
    if (!response.ok) {
      let upstreamBody = '';
      try { upstreamBody = await response.text(); } catch { /* discard provider body */ }
      throw new AiGatewayError({
        category: classifyGatewayResponse(response.status, upstreamBody),
        status: response.status,
        provider: 'gemini_web',
        model: this.model,
        retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
      });
    }
    try {
      return await response.json();
    } catch {
      throw new AiGatewayError({
        category: 'schema_invalid',
        status: 502,
        provider: 'gemini_web',
        model: this.model,
      });
    }
  }
}
