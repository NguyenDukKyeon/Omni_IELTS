import { describe, expect, it } from 'vitest';
import { examinerDataMessage, parseAgentJobMetadata, redeemGeminiKey } from '../livekitSpeakingAgent';
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
});
