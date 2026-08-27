import { randomUUID } from 'node:crypto';
import type { OneTimeProviderCredential } from './speakingRealtimeTypes';
import { assertNoSecretLeak, collectSecretValues } from './secretRedaction';

export const DEFAULT_CREDENTIAL_TTL_MS = 60_000;

interface StoredCredential {
  public: OneTimeProviderCredential;
  secret: string;
}

export class OneTimeCredentialStore {
  private readonly records = new Map<string, StoredCredential>();

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly ttlMs = DEFAULT_CREDENTIAL_TTL_MS,
  ) {}

  issue(input: { sessionId: string; secret: string; provider?: 'gemini' }): OneTimeProviderCredential {
    this.purgeExpired();
    const created = this.now();
    const id = randomUUID();
    const record: StoredCredential = {
      secret: input.secret,
      public: {
        id,
        provider: input.provider ?? 'gemini',
        sessionId: input.sessionId,
        createdAt: new Date(created).toISOString(),
        expiresAt: new Date(created + this.ttlMs).toISOString(),
        redeemedAt: null,
        status: 'pending',
      },
    };
    this.records.set(id, record);
    return { ...record.public };
  }

  peek(id: string): OneTimeProviderCredential | null {
    this.purgeExpired();
    const record = this.records.get(id);
    return record ? { ...record.public } : null;
  }

  redeem(id: string, sessionId: string): { apiKey: string; credential: OneTimeProviderCredential } {
    this.purgeExpired();
    const record = this.records.get(id);
    if (!record) {
      throw new CredentialUnavailableError('expired');
    }
    if (record.public.sessionId !== sessionId) {
      throw new CredentialUnavailableError('session_mismatch');
    }
    if (record.public.status !== 'pending') {
      throw new CredentialUnavailableError(record.public.status === 'redeemed' ? 'already_redeemed' : record.public.status);
    }
    const redeemedAt = new Date(this.now()).toISOString();
    record.public = {
      ...record.public,
      redeemedAt,
      status: 'redeemed',
    };
    const apiKey = record.secret;
    record.secret = '';
    this.records.delete(id);
    return { apiKey, credential: { ...record.public } };
  }

  destroy(id: string): void {
    this.records.delete(id);
  }

  destroyForSession(sessionId: string): void {
    for (const [id, record] of this.records) {
      if (record.public.sessionId === sessionId) this.records.delete(id);
    }
  }

  serializePublic(): OneTimeProviderCredential[] {
    this.purgeExpired();
    const snapshot = [...this.records.values()].map((record) => ({ ...record.public }));
    const secrets = collectSecretValues(...[...this.records.values()].map((record) => record.secret));
    assertNoSecretLeak(snapshot, secrets, 'credential-store');
    return snapshot;
  }

  private purgeExpired(): void {
    const now = this.now();
    for (const [id, record] of this.records) {
      if (Date.parse(record.public.expiresAt) <= now) {
        this.records.delete(id);
      }
    }
  }
}

export class CredentialUnavailableError extends Error {
  readonly code: 'expired' | 'already_redeemed' | 'session_mismatch' | 'destroyed';

  constructor(code: CredentialUnavailableError['code']) {
    super(`One-time provider credential is ${code.replaceAll('_', ' ')}`);
    this.name = 'CredentialUnavailableError';
    this.code = code;
  }
}
