import { describe, expect, it } from 'vitest';
import { extractBearerToken, verifyLearnerAccessToken } from '../learnerAuth';

describe('learner auth', () => {
  it('extracts bearer tokens and accepts the speaking canary token', async () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def');
    const identity = await verifyLearnerAccessToken('canary-secret', {
      OMNI_SPEAKING_CANARY_TOKEN: 'canary-secret',
    });
    expect(identity).toEqual({ userId: 'canary-speaker', source: 'canary' });
  });

  it('returns null when unauthenticated', async () => {
    expect(await verifyLearnerAccessToken(undefined, {})).toBeNull();
    expect(await verifyLearnerAccessToken('nope', {
      OMNI_SPEAKING_CANARY_TOKEN: 'other',
    })).toBeNull();
  });

  it('uses injected supabase verification', async () => {
    const identity = await verifyLearnerAccessToken('jwt', {}, async () => ({ id: 'user-42' }));
    expect(identity).toEqual({ userId: 'user-42', source: 'supabase' });
  });
});
