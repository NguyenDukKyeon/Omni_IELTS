import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluateShadowingAttempt } from '../mediaService';

describe('evaluateShadowingAttempt', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends deterministic duration and VAD speech segments with the real audio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      overallScore: 80,
      fluencyScore: 78,
      intonationScore: 82,
      accuracyScore: 79,
      feedbackVi: 'Tốt',
      acousticStatus: 'measured',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await evaluateShadowingAttempt({
      targetSentence: 'Public transport is important.',
      userTranscript: 'Public transport is important.',
      userAudioBase64: 'data:audio/webm;base64,AAAA',
      topicTitle: 'Transport',
      durationSeconds: 3.4,
      speechSegments: [{ start: 0.2, end: 1.4 }, { start: 1.8, end: 3.1 }],
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      durationSeconds: 3.4,
      speechSegments: [{ start: 0.2, end: 1.4 }, { start: 1.8, end: 3.1 }],
    });
  });

  it('forwards the learner BYOK headers when requesting audio evaluation', async () => {
    const sessionStorage = {
      getItem: vi.fn((key: string) => key === 'omni_gemini_api_key' ? 'learner-gemini-key' : null),
    };
    vi.stubGlobal('window', { sessionStorage });
    vi.stubGlobal('sessionStorage', sessionStorage);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      overallScore: 80,
      fluencyScore: 78,
      intonationScore: 82,
      accuracyScore: 79,
      feedbackVi: 'Tốt',
      acousticStatus: 'measured',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await evaluateShadowingAttempt({
      targetSentence: 'Public transport is important.',
      userAudioBase64: 'data:audio/webm;base64,AAAA',
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-gemini-api-key': 'learner-gemini-key',
    });
  });

  it('rejects an invalid provider score payload instead of displaying it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      overallScore: 999,
      feedbackVi: 'invalid',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    await expect(evaluateShadowingAttempt({
      targetSentence: 'Public transport is important.',
      userAudioBase64: 'data:audio/webm;base64,AAAA',
    })).rejects.toThrow('không đúng định dạng');
  });
});
