export type AiTaskTier = 'instant' | 'balanced' | 'deep' | 'grounded' | 'audio_eval' | 'tts';
export type AiCapability = 'text' | 'search' | 'audio-input' | 'audio-output';

export interface AiTaskProfile {
  tier: AiTaskTier;
  model: string;
  capability: AiCapability;
  thinkingLevel?: 'low' | 'high';
  tools: Array<'googleSearch'>;
  timeoutMs: number;
  fallbacks: string[];
}

export const AI_TASK_PROFILES: Record<AiTaskTier, AiTaskProfile> = {
  instant: { tier: 'instant', model: 'gemini-3.5-flash-lite', capability: 'text', tools: [], timeoutMs: 15_000, fallbacks: [] },
  balanced: { tier: 'balanced', model: 'gemini-3.7-flash', capability: 'text', thinkingLevel: 'low', tools: [], timeoutMs: 45_000, fallbacks: ['gemini-3.5-flash-lite'] },
  deep: { tier: 'deep', model: 'gemini-3.7-flash', capability: 'text', thinkingLevel: 'high', tools: [], timeoutMs: 90_000, fallbacks: ['gemini-3.5-flash-lite'] },
  grounded: { tier: 'grounded', model: 'gemini-3.7-flash', capability: 'search', thinkingLevel: 'low', tools: ['googleSearch'], timeoutMs: 90_000, fallbacks: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'groq/compound-mini', 'groq/compound'] },
  audio_eval: { tier: 'audio_eval', model: 'gemini-3.7-flash', capability: 'audio-input', thinkingLevel: 'high', tools: [], timeoutMs: 120_000, fallbacks: [] },
  tts: { tier: 'tts', model: 'gemini-3.1-flash-tts-preview', capability: 'audio-output', tools: [], timeoutMs: 90_000, fallbacks: [] },
};

export function getFallbackModels(tier: AiTaskTier): string[] {
  return [...AI_TASK_PROFILES[tier].fallbacks];
}
