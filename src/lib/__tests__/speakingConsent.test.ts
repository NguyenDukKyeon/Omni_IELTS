import { describe, expect, it } from 'vitest';
import { SpeakingArtifactStore, decideSpeakingArtifactWrite } from '../speakingConsent';

describe('speaking consent', () => {
  it('does not persist transcript or telemetry when consent is false', () => {
    expect(decideSpeakingArtifactWrite(false)).toEqual({ allowed: false, reason: 'revoked' });
    const store = new SpeakingArtifactStore(() => 1);
    const written = store.write({
      sessionId: 's1',
      userId: 'u1',
      kind: 'transcript',
      payload: { text: 'I live in Hanoi' },
      consent: false,
    });
    expect(written).toBeNull();
    expect(store.list('s1')).toHaveLength(0);
  });

  it('persists telemetry only after consent and never stores raw audio', () => {
    const store = new SpeakingArtifactStore(() => 1);
    expect(store.write({
      sessionId: 's1',
      userId: 'u1',
      kind: 'telemetry',
      payload: { rawWpm: 110, acousticStatus: 'measured' },
      consent: true,
    })).toMatchObject({ kind: 'telemetry' });
    expect(() => store.write({
      sessionId: 's1',
      userId: 'u1',
      kind: 'transcript',
      payload: { fullAudioBase64: 'AAAA' },
      consent: true,
    })).toThrow(/Raw microphone audio/);
  });
});
