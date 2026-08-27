import { describe, expect, it } from 'vitest';
import { examinerDataMessage, parseAgentJobMetadata, redeemGeminiKey, resolveAgentRuntime } from '../livekitSpeakingAgent';
import { parseExamDataMessage } from '../../lib/speakingExamProtocol';

describe('livekit speaking agent helpers', () => {
  it('parses job metadata and rejects embedded API keys', () => {
    expect(parseAgentJobMetadata(JSON.stringify({
      sessionId: 's1',
      credentialId: 'c1',
      voiceId: 'Kore',
    }))).toEqual({ sessionId: 's1', credentialId: 'c1', voiceId: 'Kore' });
    expect(() => parseAgentJobMetadata(JSON.stringify({
      sessionId: 's1',
      credentialId: 'c1',
      apiKey: 'AIzaSyShouldNeverBeHere',
    }))).toThrow(/must not contain provider keys/);
  });

  it('redeems a one-time key over the internal endpoint', async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
      apiKey: 'AIzaSyRedeemedOnce',
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    }), { status: 200 });
    const redeemed = await redeemGeminiKey({
      redeemUrl: 'http://127.0.0.1:3000/api/livekit/credentials/redeem',
      agentSecret: 'agent-secret',
      credentialId: 'c1',
      sessionId: 's1',
      fetchImpl,
    });
    expect(redeemed.apiKey).toBe('AIzaSyRedeemedOnce');
  });

  it('publishes Zod-validated examiner exam_state data messages', () => {
    const payload = examinerDataMessage('part_1', {
      questionIndex: 0,
      question: 'Let us begin. Could you tell me your full name, please?',
    });
    const parsed = parseExamDataMessage(payload);
    expect(parsed).toMatchObject({
      type: 'exam_state',
      state: 'part_1',
      questionIndex: 0,
    });
    expect(JSON.stringify(parsed)).not.toMatch(/AIza/);
  });

  it('points the worker redeem URL at port 3200 when the live canary base URL is used', () => {
    const runtime = resolveAgentRuntime({
      OMNI_CANARY_BASE_URL: 'http://127.0.0.1:3200',
    });
    expect(runtime.redeemUrl).toBe('http://127.0.0.1:3200/api/livekit/credentials/redeem');
    expect(runtime.eventUrl).toBe('http://127.0.0.1:3200/api/livekit/session');
    expect(JSON.stringify(runtime)).not.toMatch(/AIza|geminiApiKey/);
  });

  it('honors PLAYWRIGHT_LIVE_PORT and an explicit redeem URL', () => {
    const fromPort = resolveAgentRuntime({ PLAYWRIGHT_LIVE_PORT: '3200' });
    expect(fromPort.redeemUrl).toBe('http://127.0.0.1:3200/api/livekit/credentials/redeem');

    const explicit = resolveAgentRuntime({
      PORT: '3000',
      PLAYWRIGHT_LIVE_PORT: '3200',
      OMNI_AGENT_REDEEM_URL: 'http://127.0.0.1:3200/api/livekit/credentials/redeem',
    });
    expect(explicit.redeemUrl).toBe('http://127.0.0.1:3200/api/livekit/credentials/redeem');

    const deployed = resolveAgentRuntime({
      OMNI_CANARY_BASE_URL: 'https://beta.example.com',
    });
    expect(deployed.redeemUrl).toBe('https://beta.example.com/api/livekit/credentials/redeem');
  });
});
