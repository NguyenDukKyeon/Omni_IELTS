import { describe, expect, it } from 'vitest';
import { AI_TASK_PROFILES, getFallbackModels } from '../aiTaskProfiles';

describe('AI task profiles', () => {
  it('routes grounded and TTS tasks to capability-specific models', () => {
    expect(AI_TASK_PROFILES.grounded.tools).toContain('googleSearch');
    expect(AI_TASK_PROFILES.tts.model).toBe('gemini-3.1-flash-tts-preview');
  });

  it('never falls back across incompatible capabilities', () => {
    expect(getFallbackModels('tts')).not.toContain(AI_TASK_PROFILES.instant.model);
    expect(getFallbackModels('grounded')).toEqual(['gemini-3.5-flash-lite', 'groq/compound-mini']);
  });
});
