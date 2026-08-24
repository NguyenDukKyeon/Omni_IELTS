export type AiTaskTier = 'instant' | 'balanced' | 'deep' | 'grounded' | 'audio_eval' | 'tts';
export type AiCapability = 'text' | 'search' | 'audio-input' | 'audio-output';
export type AiTaskProvider = 'gemini' | 'groq' | 'nvidia_nim' | 'openrouter';
export type AiTaskCostClass = 'free' | 'metered' | 'paid';

export interface AiTaskFallback {
  provider: AiTaskProvider;
  model: string;
  modelAlias: string;
  capability: AiCapability;
  costClass: AiTaskCostClass;
}

export interface AiTaskProfile {
  tier: AiTaskTier;
  provider: AiTaskProvider;
  model: string;
  modelAlias: string;
  capability: AiCapability;
  costClass: AiTaskCostClass;
  thinkingLevel?: 'low' | 'high';
  tools: Array<'googleSearch'>;
  timeoutMs: number;
  fallbacks: string[];
  fallbackChain: AiTaskFallback[];
}

const fallback = (
  provider: AiTaskProvider,
  model: string,
  capability: AiCapability,
  costClass: AiTaskCostClass = 'free',
): AiTaskFallback => ({
  provider,
  model,
  modelAlias: `${provider}-${model.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`,
  capability,
  costClass,
});

const textGatewayFallbacks = [
  fallback('nvidia_nim', 'meta/llama-3.3-70b-instruct', 'text'),
  fallback('openrouter', 'openrouter/free', 'text'),
];

const geminiProfile = (
  tier: AiTaskTier,
  model: string,
  capability: AiCapability,
  options: Partial<Omit<AiTaskProfile, 'tier' | 'provider' | 'model' | 'modelAlias' | 'capability' | 'costClass'>> = {},
): AiTaskProfile => ({
  tier,
  provider: 'gemini',
  model,
  modelAlias: `${tier}-primary`,
  capability,
  costClass: 'free',
  tools: [],
  timeoutMs: 45_000,
  fallbacks: [],
  fallbackChain: [],
  ...options,
});

export const AI_TASK_PROFILES: Record<AiTaskTier, AiTaskProfile> = {
  instant: geminiProfile('instant', 'gemini-3.5-flash-lite', 'text', {
    timeoutMs: 15_000,
    fallbackChain: textGatewayFallbacks,
  }),
  balanced: geminiProfile('balanced', 'gemini-3.7-flash', 'text', {
    thinkingLevel: 'low',
    fallbacks: ['gemini-3.5-flash-lite'],
    fallbackChain: [fallback('gemini', 'gemini-3.5-flash-lite', 'text'), ...textGatewayFallbacks],
  }),
  deep: geminiProfile('deep', 'gemini-3.7-flash', 'text', {
    thinkingLevel: 'high',
    timeoutMs: 90_000,
    fallbacks: ['gemini-3.5-flash-lite'],
    fallbackChain: [fallback('gemini', 'gemini-3.5-flash-lite', 'text'), ...textGatewayFallbacks],
  }),
  grounded: geminiProfile('grounded', 'gemini-3.7-flash', 'search', {
    thinkingLevel: 'low',
    tools: ['googleSearch'],
    timeoutMs: 25_000,
    fallbacks: ['groq/compound-mini', 'groq/compound'],
    fallbackChain: [
      fallback('groq', 'groq/compound-mini', 'search'),
      fallback('groq', 'groq/compound', 'search'),
    ],
  }),
  audio_eval: geminiProfile('audio_eval', 'gemini-3.7-flash', 'audio-input', {
    thinkingLevel: 'high',
    timeoutMs: 120_000,
  }),
  tts: geminiProfile('tts', 'gemini-3.1-flash-tts-preview', 'audio-output', {
    timeoutMs: 90_000,
  }),
};

export function getFallbackModels(tier: AiTaskTier): string[] {
  return [...AI_TASK_PROFILES[tier].fallbacks];
}
