import { expect, test } from '@playwright/test';

const livekitReady = Boolean(
  process.env.LIVEKIT_URL?.trim()
  && process.env.LIVEKIT_API_KEY?.trim()
  && process.env.LIVEKIT_API_SECRET?.trim()
  && process.env.OMNI_SPEAKING_CANARY_TOKEN?.trim(),
);

test.describe('live speaking canary', () => {
  test.skip(!livekitReady, 'Dedicated test:speaking:live script fails closed when LiveKit credentials are missing. Duplex Examiner -> Learner -> Examiner proof lives in scripts/livekit-speaking-canary.mjs so Media/Forecast/Mock/Vocabulary live tests keep running.');

  test('mints a real LiveKit room token without leaking Gemini keys', async ({ request }) => {
    const canary = process.env.OMNI_SPEAKING_CANARY_TOKEN!.trim();
    const response = await request.post('/api/livekit/session', {
      headers: { authorization: `Bearer ${canary}` },
      data: { consentStorage: false },
    });
    const body = await response.json();
    expect(response.status(), JSON.stringify(body)).toBe(201);
    expect(JSON.stringify(body)).not.toMatch(/AIza[0-9A-Za-z_-]{8,}/);
    if (body.fallbackReason === 'quota_exhausted' || body.session?.state === 'quota_exhausted') {
      throw new Error('Live speaking canary hit provider quota. This is a real failure, not a skip.');
    }
    expect(body.token).toBeTruthy();
    expect(body.livekitUrl).toBeTruthy();
    expect(body.session.mode).toBe('realtime');
  });
});
