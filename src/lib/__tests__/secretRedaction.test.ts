import { describe, expect, it } from 'vitest';
import { assertNoSecretLeak, redactSecrets, redactText } from '../secretRedaction';

const KEY = 'AIzaSyLeakTestGeminiKey123456';

describe('secret redaction', () => {
  it('strips Gemini-shaped keys from logs and JSON responses', () => {
    const payload = {
      error: `provider failed for ${KEY}`,
      geminiApiKey: KEY,
      session: { id: 'abc', livekitUrl: 'wss://omni.livekit.cloud' },
    };
    const redacted = JSON.stringify(redactSecrets(payload, [KEY]));
    expect(redacted).not.toContain(KEY);
    expect(redacted).toContain('wss://omni.livekit.cloud');
    expect(() => assertNoSecretLeak(redacted, [KEY])).not.toThrow();
  });

  it('fails closed when a key still appears', () => {
    expect(() => assertNoSecretLeak({ token: KEY }, [KEY])).toThrow(/leaked/);
    expect(redactText(`x-gemini-api-key=${KEY}`, [KEY])).not.toContain(KEY);
  });
});
