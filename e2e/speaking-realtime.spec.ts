import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

async function openSpeakingRoom(page: import('@playwright/test').Page) {
  await page.route('**/api/tts/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fallbackProvider: 'browser', audioBase64: null }),
    });
  });
  await page.route('**/api/livekit/session/**', async (route) => {
    if (route.request().method() === 'POST' && route.request().url().includes('/transition')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session: { id: 'sess-fallback', state: 'part_2_preparation' } }),
      });
      return;
    }
    await route.continue();
  });
  await page.goto('/');
  await navigateToModule(page, 'practice');
  await page.getByRole('button', { name: /IELTS Speaking/ }).click();
  await expect(page.getByRole('heading', { name: /Phòng thi Speaking realtime/ })).toBeVisible();
}

async function mockLivekit(page: import('@playwright/test').Page, body: Record<string, unknown>, status = 201) {
  await page.route('**/api/livekit/session', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      return;
    }
    await route.continue();
  });
}

async function grantMicrophone(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const fakeStream = () => {
      const context = new AudioContext();
      return context.createMediaStreamDestination().stream;
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => fakeStream() },
    });
  });
}

async function attachShot(page: import('@playwright/test').Page, name: string) {
  await test.info().attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

test('desktop and mobile: unauthenticated learners complete one turn-based answer after fallback', async ({ page }) => {
  await grantMicrophone(page);
  await mockLivekit(page, {
    session: {
      id: 'sess-guest',
      requestId: 'req-guest',
      userId: 'anonymous',
      state: 'fallback_turn_based',
      mode: 'turn_based',
      roomName: null,
      livekitUrl: null,
      participantIdentity: 'guest',
      currentPart: 'part_1',
      fallbackReason: 'unauthenticated',
      consentStorage: false,
      voiceId: 'Kore',
      createdAt: '2026-08-26T00:00:00.000Z',
      expiresAt: '2026-08-26T00:20:00.000Z',
      lastEventAt: '2026-08-26T00:00:00.000Z',
    },
    token: null,
    livekitUrl: null,
    fallbackReason: 'unauthenticated',
    requestId: 'req-guest',
  }, 200);

  await openSpeakingRoom(page);
  await attachShot(page, 'idle-before-start');
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  await expect(page.locator('#ai_speaking_realtime_room')).toHaveAttribute('data-ux-state', 'fallback_turn_based');
  await expect(page.getByText(/Đây không phải realtime/)).toBeVisible();
  await attachShot(page, 'fallback-after-unauthenticated');
  await page.getByLabel('Transcript câu trả lời').fill('I live in a small city and I enjoy cycling to work.');
  await page.locator('[data-ux-control="end-answer"]').click();
  await expect(page.getByText(/Part 1 · Hỏi đáp ngắn/)).toBeVisible();
});

test('denying the microphone shows the permission recovery UI', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => { throw new DOMException('denied', 'NotAllowedError'); } },
    });
  });
  await openSpeakingRoom(page);
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  await expect(page.getByRole('heading', { name: 'Microphone bị từ chối' })).toBeVisible();
  await expect(page.locator('[data-ux-control="microphone-permission"]')).toBeVisible();
  await expect(page.locator('[data-ux-control="switch-to-turn-based"]')).toBeVisible();
  await attachShot(page, 'permission-denied');
});

test('LiveKit unavailable is an honest turn-based fallback, not fake realtime', async ({ page }) => {
  await grantMicrophone(page);
  await mockLivekit(page, {
    session: {
      id: 'sess-fallback',
      requestId: 'req-1',
      userId: 'user-1',
      state: 'fallback_turn_based',
      mode: 'turn_based',
      roomName: null,
      livekitUrl: null,
      participantIdentity: 'learner-user-1',
      currentPart: 'part_1',
      fallbackReason: 'livekit_unavailable',
      consentStorage: false,
      voiceId: 'Kore',
      createdAt: '2026-08-26T00:00:00.000Z',
      expiresAt: '2026-08-26T00:20:00.000Z',
      lastEventAt: '2026-08-26T00:00:00.000Z',
    },
    token: null,
    livekitUrl: null,
    fallbackReason: 'livekit_unavailable',
    requestId: 'req-1',
  });
  await openSpeakingRoom(page);
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  await expect(page.getByText(/Đây không phải realtime/)).toBeVisible();
  await expect(page.locator('#ai_speaking_realtime_room')).toHaveAttribute('data-ux-state', 'fallback_turn_based');
  await attachShot(page, 'honest-fallback');
});

test('reconnect keeps the current part after a dropped connection', async ({ page }) => {
  await grantMicrophone(page);
  await openSpeakingRoom(page);
  await page.locator('[data-ux-control="switch-to-turn-based"]').click();
  await expect(page.locator('#ai_speaking_realtime_room')).toHaveAttribute('data-ux-state', 'fallback_turn_based');
  const answer = page.getByLabel('Transcript câu trả lời');
  for (let index = 0; index < 3; index += 1) {
    await answer.fill(`Answer number ${index + 1} about my hometown and daily habits.`);
    await page.locator('[data-ux-control="end-answer"]').click();
  }
  await expect(page.getByText(/Part 2 · 1 phút chuẩn bị/)).toBeVisible();
  await attachShot(page, 'part-2-before-disconnect');
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByRole('heading', { name: /Mất kết nối/ })).toBeVisible();
  await expect(page.locator('[data-ux-control="reconnect"]')).toBeVisible();
  await expect(page.locator('[data-ux-control="resume-interrupted-session"]')).toBeVisible();
  await attachShot(page, 'connection-lost');
  await page.locator('[data-ux-control="resume-interrupted-session"]').click();
  await expect(page.getByText(/Part 2 · 1 phút chuẩn bị/)).toBeVisible();
  await attachShot(page, 'resumed-part-2');
});

test('completing all parts shows a report with unavailable acoustic metrics when there is no audio', async ({ page }) => {
  await grantMicrophone(page);
  await page.route('**/api/speaking/analyze', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Không có audio thật. Pronunciation và pause analytics đang unavailable.',
        code: 'AUDIO_REQUIRED',
        telemetry: {
          rawWpm: 0,
          articulationRate: null,
          fillerCount: 0,
          fillerRatePer100Words: 0,
          silentPauses: null,
          averagePauseDuration: null,
          longPauses: null,
          speechRatio: null,
          acousticStatus: 'unavailable',
          vadVersion: null,
        },
        pronunciation: null,
        overallSpeakingBand: null,
      }),
    });
  });
  await openSpeakingRoom(page);
  await page.locator('[data-ux-control="switch-to-turn-based"]').click();
  await expect(page.locator('#ai_speaking_realtime_room')).toHaveAttribute('data-ux-state', 'fallback_turn_based');
  const answer = page.getByLabel('Transcript câu trả lời');
  for (let index = 0; index < 3; index += 1) {
    await answer.fill(`Answer number ${index + 1} about my hometown and daily habits.`);
    await page.locator('[data-ux-control="end-answer"]').click();
  }
  await expect(page.getByText(/Part 2 · 1 phút chuẩn bị/)).toBeVisible();
  await attachShot(page, 'entered-part-2');
  await answer.fill('Cue card long turn about a community project.');
  await page.locator('[data-ux-control="end-answer"]').click();
  await expect(page.getByText(/Part 2 · Độc thoại/)).toBeVisible();
  await answer.fill('I would speak for two minutes about the project.');
  await page.locator('[data-ux-control="end-answer"]').click();
  await expect(page.getByText('Part 3 · Thảo luận sâu')).toBeVisible();
  await attachShot(page, 'entered-part-3');
  await answer.fill('Young people should take more environmental responsibility.');
  await page.locator('[data-ux-control="end-answer"]').click();
  await expect(page.getByRole('heading', { name: 'Báo cáo Speaking' })).toBeVisible();
  await expect(page.getByText(/unavailable/)).toBeVisible();
  await expect(page.locator('#ai_speaking_realtime_room')).toHaveAttribute('data-ux-state', 'completed');
  await attachShot(page, 'completed-report');
});
