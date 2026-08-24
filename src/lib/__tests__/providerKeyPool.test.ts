import { describe, expect, it } from 'vitest';
import { getProviderApiKeyPool } from '../providerKeyPool';

describe('getProviderApiKeyPool', () => {
  it('returns configured keys in stable order with scrubbed aliases', () => {
    expect(getProviderApiKeyPool({
      GROQ_API_KEY: '  primary-secret  ',
      GROQ_API_KEY_2: 'second-secret',
      GROQ_API_KEY_3: 'third-secret',
    }, 'GROQ_API_KEY')).toEqual([
      { alias: 'groq-primary', apiKey: 'primary-secret' },
      { alias: 'groq-2', apiKey: 'second-secret' },
      { alias: 'groq-3', apiKey: 'third-secret' },
    ]);
  });

  it('drops empty and duplicate secrets without exposing them in aliases', () => {
    expect(getProviderApiKeyPool({
      OPENROUTER_API_KEY: 'same-secret',
      OPENROUTER_API_KEY_2: ' ',
      OPENROUTER_API_KEY_3: 'same-secret',
    }, 'OPENROUTER_API_KEY')).toEqual([
      { alias: 'openrouter-primary', apiKey: 'same-secret' },
    ]);
  });

  it('uses only the request key when BYOK is present', () => {
    expect(getProviderApiKeyPool({
      GROQ_API_KEY: 'server-secret',
      GROQ_API_KEY_2: 'server-secret-2',
    }, 'GROQ_API_KEY', 'learner-secret')).toEqual([
      { alias: 'groq-byok', apiKey: 'learner-secret' },
    ]);
  });
});
