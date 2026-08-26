import { describe, expect, it } from 'vitest';
import { CredentialUnavailableError, OneTimeCredentialStore } from '../oneTimeCredentialStore';

describe('one-time provider credential store', () => {
  it('redeems a credential exactly once', () => {
    const store = new OneTimeCredentialStore(() => 1_000);
    const issued = store.issue({ sessionId: 'session-1', secret: 'AIzaSyOnlyOnceSecretKey999' });
    const first = store.redeem(issued.id, 'session-1');
    expect(first.apiKey).toBe('AIzaSyOnlyOnceSecretKey999');
    expect(() => store.redeem(issued.id, 'session-1')).toThrow(CredentialUnavailableError);
  });

  it('rejects expired credentials', () => {
    let now = 1_000;
    const store = new OneTimeCredentialStore(() => now, 50);
    const issued = store.issue({ sessionId: 'session-1', secret: 'AIzaSyExpiredSecretKey0001' });
    now = 2_000;
    expect(() => store.redeem(issued.id, 'session-1')).toThrow(/expired/);
  });

  it('never serializes the raw key', () => {
    const store = new OneTimeCredentialStore(() => 1_000);
    store.issue({ sessionId: 'session-1', secret: 'AIzaSyHiddenFromSnapshot888' });
    expect(JSON.stringify(store.serializePublic())).not.toContain('AIzaSyHiddenFromSnapshot888');
  });
});
