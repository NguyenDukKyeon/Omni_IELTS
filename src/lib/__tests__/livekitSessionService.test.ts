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

  it('does not mint a resume token unless the server state is connection_lost', async () => {
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials: new OneTimeCredentialStore(() => 1_000),
      infrastructure: infra(true),
      env: { GEMINI_API_KEY: KEY },
    });
    const created = await service.create({ userId: 'user-4', consentStorage: false, geminiApiKey: KEY });
    service.transition(created.session.id, 'user-4', 'part_1');
    const resumed = await service.create({
      userId: 'user-4',
      consentStorage: false,
      geminiApiKey: KEY,
      resumeSessionId: created.session.id,
    });
    expect(resumed.token).toBeNull();
    expect(resumed.session.state).toBe('part_1');
  });

  it('stores the learner-selected Gemini Live voice and rejects unknown ids', async () => {
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials: new OneTimeCredentialStore(() => 1_000),
      infrastructure: infra(true),
      env: { GEMINI_API_KEY: KEY },
    });
    const puck = await service.create({
      userId: 'user-voice-puck',
      consentStorage: false,
      geminiApiKey: KEY,
      voiceId: 'Puck',
    });
    expect(puck.session.voiceId).toBe('Puck');

    const fallbackVoice = new LivekitSessionService({
      now: () => 1_000,
      credentials: new OneTimeCredentialStore(() => 1_000),
      infrastructure: infra(true),
      env: { GEMINI_API_KEY: KEY },
    });
    const unknown = await fallbackVoice.create({
      userId: 'user-voice-bad',
      consentStorage: false,
      geminiApiKey: KEY,
      voiceId: 'NotAGeminiVoice',
    });
    expect(unknown.session.voiceId).toBe('Kore');
  });

  it('applies agent exam_state events as the canonical server state', async () => {
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials: new OneTimeCredentialStore(() => 1_000),
      infrastructure: infra(true),
      env: { GEMINI_API_KEY: KEY },
    });
    const created = await service.create({ userId: 'user-agent', consentStorage: false, geminiApiKey: KEY });
    service.transition(created.session.id, 'user-agent', 'part_1');
    const next = service.applyAgentEvent(created.session.id, {
      type: 'exam_state',
      state: 'part_2_preparation',
      questionIndex: 0,
      question: 'Describe a place in your city.',
    });
    expect(next.state).toBe('part_2_preparation');
    expect(next.currentPart).toBe('part_2_preparation');
    expect(next.currentQuestion).toContain('Describe a place in your city.');
  });

  it('cuts off the provider into honest turn-based fallback and destroys credentials', async () => {
    const credentials = new OneTimeCredentialStore(() => 1_000);
    const deleted: string[] = [];
    const service = new LivekitSessionService({
      now: () => 1_000,
      credentials,
      infrastructure: {
        ...infra(true),
        deleteRoom: async (roomName) => {
          deleted.push(roomName);
        },
      },
      env: { GEMINI_API_KEY: KEY },
    });
    const created = await service.create({ userId: 'user-cut', consentStorage: false, geminiApiKey: KEY });
    expect(created.credentialId).toBeTruthy();
    const cut = service.cutOffProvider(created.session.id, 'user-cut');
    expect(cut.state).toBe('fallback_turn_based');
    expect(cut.fallbackReason).toBe('provider_unavailable');
    expect(cut.mode).toBe('turn_based');
    expect(credentials.peek(created.credentialId!)).toBeNull();
    expect(deleted[0]).toMatch(/^omni-speaking-/);
  });

  it('purges expired create-rate windows so the quota map cannot grow forever', async () => {
    let now = 1_000;
    const service = new LivekitSessionService({
      now: () => now,
      credentials: new OneTimeCredentialStore(() => now),
      infrastructure: infra(false),
      env: { GEMINI_API_KEY: KEY },
    });
    for (let index = 0; index < 5; index += 1) {
      await service.create({ userId: 'user-window', consentStorage: false, geminiApiKey: KEY });
    }
    await expect(service.create({ userId: 'user-window', consentStorage: false, geminiApiKey: KEY }))
      .rejects.toMatchObject({ code: 'rate_limited' });
    now = 1_000 + (10 * 60 * 1000) + 1;
    const later = await service.create({ userId: 'user-window', consentStorage: false, geminiApiKey: KEY });
    expect(later.session.state).toBe('fallback_turn_based');
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
