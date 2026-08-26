import { describe, expect, it } from 'vitest';
import { OneTimeCredentialStore } from '../oneTimeCredentialStore';
import {
  LivekitSessionQuotaError,
  LivekitSessionService,
  type LivekitInfrastructure,
} from '../livekitSessionService';

const KEY = 'AIzaSySessionServiceSecret9999';

function infra(configured: boolean, dispatchFails = false): LivekitInfrastructure {
  return {
    isConfigured: () => configured,
    mint: async ({ roomName }) => ({
      token: 'lk.jwt.token',
      roomName,
      livekitUrl: 'wss://omni.livekit.cloud',
    }),
    dispatchAgent: async () => {
      if (dispatchFails) throw new Error('agent down');
    },
  };
}

describe('livekit session service', () => {
  it('falls back to turn-based when LiveKit is not configured', async () => {
    const credentials = new OneTimeCredentialStore(() => 1_000);
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials,
      infrastructure: infra(false),
      env: { GEMINI_API_KEY: KEY },
    });
    const created = await service.create({ userId: 'user-1', consentStorage: false, geminiApiKey: KEY });
    expect(created.session.state).toBe('fallback_turn_based');
    expect(created.fallbackReason).toBe('livekit_unavailable');
    expect(created.token).toBeNull();
    expect(JSON.stringify(created)).not.toContain(KEY);
  });

  it('mints a realtime session without putting the API key in the public session', async () => {
    const credentials = new OneTimeCredentialStore(() => 1_000);
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials,
      infrastructure: infra(true),
      env: { GEMINI_API_KEY: KEY },
    });
    const created = await service.create({ userId: 'user-1', consentStorage: true, geminiApiKey: KEY });
    expect(created.session.mode).toBe('realtime');
    expect(created.token).toBe('lk.jwt.token');
    expect(JSON.stringify(created.session)).not.toContain(KEY);
    const publicCredential = credentials.peek(created.credentialId!);
    expect(JSON.stringify(publicCredential)).not.toContain(KEY);
  });

  it('enforces max concurrent sessions and create rate limits', async () => {
    const credentials = new OneTimeCredentialStore(() => 1_000);
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials,
      infrastructure: infra(true),
      env: { GEMINI_API_KEY: KEY },
    });
    await service.create({ userId: 'user-1', consentStorage: false, geminiApiKey: KEY });
    await expect(service.create({ userId: 'user-1', consentStorage: false, geminiApiKey: KEY }))
      .rejects.toBeInstanceOf(LivekitSessionQuotaError);

    const fallbackService = new LivekitSessionService({
      now: () => 1_000,
      credentials: new OneTimeCredentialStore(() => 1_000),
      infrastructure: infra(false),
      env: { GEMINI_API_KEY: KEY },
    });
    for (let index = 0; index < 5; index += 1) {
      await fallbackService.create({ userId: 'user-2', consentStorage: false, geminiApiKey: KEY });
    }
    await expect(fallbackService.create({ userId: 'user-2', consentStorage: false, geminiApiKey: KEY }))
      .rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('resumes the interrupted part after connection_lost', async () => {
    const credentials = new OneTimeCredentialStore(() => 1_000);
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials,
      infrastructure: infra(true),
      env: { GEMINI_API_KEY: KEY },
    });
    const created = await service.create({ userId: 'user-1', consentStorage: false, geminiApiKey: KEY });
    service.transition(created.session.id, 'user-1', 'part_1');
    service.transition(created.session.id, 'user-1', 'part_2_preparation');
    const lost = service.markLost(created.session.id, 'user-1');
    expect(lost.state).toBe('connection_lost');
    expect(lost.currentPart).toBe('part_2_preparation');

    const resumed = await service.create({
      userId: 'user-1',
      consentStorage: false,
      geminiApiKey: KEY,
      resumeSessionId: created.session.id,
    });
    expect(resumed.token).toBe('lk.jwt.token');
    expect(resumed.session.state).toBe('part_2_preparation');
    expect(resumed.session.currentPart).toBe('part_2_preparation');
    expect(JSON.stringify(resumed)).not.toContain(KEY);
  });

  it('falls back when the agent cannot be dispatched', async () => {
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials: new OneTimeCredentialStore(() => 1_000),
      infrastructure: infra(true, true),
      env: { GEMINI_API_KEY: KEY },
    });
    const created = await service.create({ userId: 'user-3', consentStorage: false, geminiApiKey: KEY });
    expect(created.session.state).toBe('fallback_turn_based');
    expect(created.fallbackReason).toBe('agent_unavailable');
  });
});
