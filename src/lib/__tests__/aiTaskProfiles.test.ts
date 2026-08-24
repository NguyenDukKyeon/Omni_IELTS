import { describe, expect, it } from 'vitest';
import { AI_TASK_PROFILES, getFallbackModels } from '../aiTaskProfiles';

describe('AI task profiles', () => {
  it('routes grounded and TTS tasks to capability-specific models', () => {
    expect(AI_TASK_PROFILES.grounded.tools).toContain('googleSearch');
    expect(AI_TASK_PROFILES.tts.model).toBe('gemini-3.1-flash-tts-preview');
    expect(AI_TASK_PROFILES.grounded).toMatchObject({
      provider: 'gemini',
      modelAlias: 'grounded-primary',
      capability: 'search',
      costClass: 'free',
    });
  });

  it('never falls back across incompatible capabilities', () => {
    expect(getFallbackModels('tts')).not.toContain(AI_TASK_PROFILES.instant.model);
    expect(getFallbackModels('grounded')).toEqual([
      'groq/compound-mini',
      'groq/compound',
    ]);
  });

  it('keeps text fallbacks on zero-cost official API routes after removing Kira', () => {
    expect(AI_TASK_PROFILES.balanced.fallbackChain).toHaveLength(3);
    expect(JSON.stringify(AI_TASK_PROFILES.balanced.fallbackChain)).not.toContain('"kira"');
    expect(AI_TASK_PROFILES.balanced.fallbackChain.at(-2)).toMatchObject({
      provider: 'nvidia_nim',
      capability: 'text',
      costClass: 'free',
    });
    expect(AI_TASK_PROFILES.balanced.fallbackChain.at(-1)).toMatchObject({
      provider: 'openrouter',
      model: 'openrouter/free',
      capability: 'text',
      costClass: 'free',
    });
    expect(AI_TASK_PROFILES.tts.fallbackChain.every((route) => route.capability === 'audio-output')).toBe(true);
  });
});
