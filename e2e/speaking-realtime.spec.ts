import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';
import {
  SPEAKING_ROOM_RENDER_THROW_MESSAGE,
  SPEAKING_ROOM_RENDER_THROW_QUERY,
} from '../src/lib/speakingRoomLoadProbe';

const sessionStub = (overrides: Record<string, unknown> = {}) => ({
  id: 'sess-1',
  requestId: 'req-1',
  userId: 'user-1',
  state: 'fallback_turn_based',
  mode: 'turn_based',
  roomName: null,
  livekitUrl: null,
  participantIdentity: 'learner-user-1',
  currentPart: 'part_1',
  questionIndex: 0,
  currentQuestion: 'Let us begin. Could you tell me your full name, please?',
  fallbackReason: 'livekit_unavailable',
  consentStorage: false,
  voiceId: 'Kore',
  createdAt: '2026-08-26T00:00:00.000Z',
  expiresAt: '2026-08-26T00:20:00.000Z',
  lastEventAt: '2026-08-26T00:00:00.000Z',
  ...overrides,
});

async function grantMicrophone(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => new AudioContext().createMediaStreamDestination().stream,
      },
    });
  });
}

async function openSpeakingRoom(
  page: import('@playwright/test').Page,
  options: { onTransition?: (body: { state?: string }) => void } = {},
) {
  await page.route('**/api/tts/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audioBase64: '' }) });
  });
  await page.route('**/api/livekit/session/**', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'POST' && url.includes('/transition')) {
      const body = route.request().postDataJSON() as { state?: string };
      options.onTransition?.(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session: sessionStub({ state: body.state || 'part_1', currentPart: body.state === 'connection_lost' ? 'part_2_preparation' : body.state }) }),
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

async function mockCreateSession(
  page: import('@playwright/test').Page,
  handler: (post: Record<string, unknown>) => { status: number; body: Record<string, unknown> },
) {
  await page.route('**/api/livekit/session', async (route) => {
    const pathname = new URL(route.request().url()).pathname.replace(/\/$/, '');
    if (!pathname.endsWith('/api/livekit/session') || route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const post = (route.request().postDataJSON() || {}) as Record<string, unknown>;
    const result = handler(post);
    await route.fulfill({
      status: result.status,
      contentType: 'application/json',
      body: JSON.stringify(result.body),
    });
  });
}

async function completePart1(page: import('@playwright/test').Page) {
  const answer = page.getByLabel('Transcript câu trả lời');
  for (let index = 0; index < 4; index += 1) {
    await answer.fill(`Answer number ${index + 1} about my hometown and daily habits.`);
    await page.locator('[data-ux-control="end-answer"]').click();
  }
}

async function attachShot(page: import('@playwright/test').Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
}

test('desktop and mobile: unauthenticated learners complete one turn-based answer after fallback', async ({ page }) => {
  await grantMicrophone(page);
  await mockCreateSession(page, () => ({
    status: 200,
    body: {
      session: sessionStub({ fallbackReason: 'unauthenticated', userId: 'anonymous' }),
      token: null,
      livekitUrl: null,
      fallbackReason: 'unauthenticated',
      requestId: 'req-guest',
    },
  }));
  await openSpeakingRoom(page);
  await page.locator('[data-ux-control="consent-storage"]').check();
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  await expect(page.locator('#ai_speaking_realtime_room')).toHaveAttribute('data-ux-state', 'fallback_turn_based');
  await expect(page.getByText(/Đây không phải realtime/)).toBeVisible();
  await page.locator('[data-ux-control="begin-recording"]').click();
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
  await expect(page.locator('[data-ux-control="switch-to-turn-based-from-permission"]')).toBeVisible();
});

test('LiveKit unavailable is an honest turn-based fallback, not fake realtime', async ({ page }) => {
  await grantMicrophone(page);
  await mockCreateSession(page, () => ({
    status: 201,
    body: {
      session: sessionStub(),
      token: null,
      livekitUrl: null,
      fallbackReason: 'livekit_unavailable',
      requestId: 'req-1',
    },
  }));
  await openSpeakingRoom(page);
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  await expect(page.getByText(/Đây không phải realtime/)).toBeVisible();
  await expect(page.locator('#ai_speaking_realtime_room')).toHaveAttribute('data-ux-state', /fallback_turn_based|part_1/);
});

test.describe('quota exhausted recovery', () => {
  test.use({ expectedConsoleErrors: ['status of 429 (Too Many Requests)'] });
  test('quota exhausted and provider unavailable expose unique recovery controls', async ({ page }) => {
  await grantMicrophone(page);
  await mockCreateSession(page, () => ({
    status: 429,
    body: { error: 'rate limited', code: 'LIVEKIT_RATE_LIMITED', fallbackReason: 'quota_exhausted' },
  }));
  await openSpeakingRoom(page);
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  await expect(page.locator('[data-ux-control="switch-to-turn-based-from-quota"]')).toBeVisible();
  await page.locator('[data-ux-control="switch-to-turn-based-from-quota"]').click();
  });
});

test('provider unavailable offers retry-provider and turn-based fallback', async ({ page }) => {
  await grantMicrophone(page);
  let calls = 0;
  await mockCreateSession(page, () => {
    calls += 1;
    if (calls === 1) {
      return {
        status: 201,
        body: {
          session: sessionStub({ state: 'provider_unavailable', fallbackReason: 'provider_unavailable' }),
          token: null,
          livekitUrl: null,
          fallbackReason: 'provider_unavailable',
          requestId: 'req-p',
        },
      };
    }
    return {
      status: 201,
      body: {
        session: sessionStub(),
        token: null,
        livekitUrl: null,
        fallbackReason: 'livekit_unavailable',
        requestId: 'req-p2',
      },
    };
  });
  await openSpeakingRoom(page);
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  await expect(page.locator('[data-ux-control="retry-provider"]')).toBeVisible();
  await expect(page.locator('[data-ux-control="switch-to-turn-based-from-provider"]')).toBeVisible();
  await page.locator('[data-ux-control="retry-provider"]').click();
  await expect(page.getByText(/Đây không phải realtime/)).toBeVisible();
});

test.describe('server failure recovery', () => {
  test.use({ expectedConsoleErrors: ['status of 500 (Internal Server Error)'] });
  test('server failure exposes retry-failed', async ({ page }) => {
    await grantMicrophone(page);
    await mockCreateSession(page, () => ({ status: 500, body: { error: 'boom' } }));
    await openSpeakingRoom(page);
    await page.locator('[data-ux-control="start-realtime-session"]').click();
    await expect(page.locator('[data-ux-control="retry-failed"]')).toBeVisible();
  });
});

test('reconnect keeps Part 2 and actually clicks reconnect after a dropped connection', async ({ page }) => {
  await grantMicrophone(page);
  const resumePosts: unknown[] = [];
  const transitions: string[] = [];
  await mockCreateSession(page, (post) => {
    if (post.resumeSessionId) {
      resumePosts.push(post);
      return {
        status: 201,
        body: {
          session: sessionStub({
            state: 'fallback_turn_based',
            currentPart: 'part_2_preparation',
            questionIndex: 0,
            fallbackReason: 'livekit_unavailable',
          }),
          token: null,
          livekitUrl: null,
          fallbackReason: 'livekit_unavailable',
          requestId: 'req-resume',
        },
      };
    }
    return {
      status: 201,
      body: {
        session: sessionStub({ id: 'sess-live' }),
        token: null,
        livekitUrl: null,
        fallbackReason: 'livekit_unavailable',
        requestId: 'req-1',
      },
    };
  });
  await openSpeakingRoom(page, {
    onTransition: (body) => {
      if (body.state) transitions.push(body.state);
    },
  });
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  await completePart1(page);
  await expect(page.getByText(/Part 2 · 1 phút chuẩn bị/)).toBeVisible();
  await attachShot(page, 'before-disconnect-part-2');
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByRole('heading', { name: /Mất kết nối/ })).toBeVisible();
  await expect(page.locator('[data-ux-control="reconnect"]')).toBeVisible();
  await expect(page.locator('[data-ux-control="resume-interrupted-session"]')).toBeVisible();
  expect(transitions).toContain('connection_lost');
  await attachShot(page, 'connection-lost-part-2');
  await page.locator('[data-ux-control="reconnect"]').click();
  await expect(page.getByText(/Part 2 · 1 phút chuẩn bị/)).toBeVisible();
  expect(resumePosts.length).toBeGreaterThan(0);
  expect((resumePosts[0] as { resumeSessionId?: string }).resumeSessionId).toBe('sess-live');
  await attachShot(page, 'after-reconnect-part-2');
});

test('voice picker sends a safe Gemini live voice id', async ({ page }) => {
  await grantMicrophone(page);
  const posts: Array<Record<string, unknown>> = [];
  await mockCreateSession(page, (post) => {
    posts.push(post);
    return {
      status: 201,
      body: {
        session: sessionStub({ voiceId: 'Puck' }),
        token: null,
        livekitUrl: null,
        fallbackReason: 'livekit_unavailable',
        requestId: 'req-voice',
      },
    };
  });
  await openSpeakingRoom(page);
  const voiceSelect = page.getByLabel('Chọn giọng đọc mặc định');
  const puck = await voiceSelect.locator('option', { hasText: 'Gemini Puck' }).first().getAttribute('value');
  expect(puck).toBeTruthy();
  await voiceSelect.selectOption(puck!);
  await page.locator('[data-ux-control="start-realtime-session"]').click();
  expect(posts[0]?.voiceId).toBe('Puck');
});

test('completing all parts shows a report with unavailable acoustic metrics when there is no audio', async ({ page }) => {
  await grantMicrophone(page);
  await page.route('**/api/speaking/analyze', async (route) => {
    const post = route.request().postDataJSON() as { consentStorage?: boolean; fullAudioBase64?: string };
    expect(post.consentStorage).toBe(true);
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
  await page.locator('[data-ux-control="consent-storage"]').check();
  await page.locator('[data-ux-control="switch-to-turn-based"]').click();
  await expect(page.locator('#ai_speaking_realtime_room')).toHaveAttribute('data-ux-state', 'fallback_turn_based');
  await completePart1(page);
  await expect(page.getByText(/Part 2 · 1 phút chuẩn bị/)).toBeVisible();
  await attachShot(page, 'entered-part-2-prep');
  await page.getByLabel('Transcript câu trả lời').fill('Cue card long turn about a community project.');
  await page.locator('[data-ux-control="end-answer"]').click();
  await expect(page.getByText(/Part 2 · Độc thoại/)).toBeVisible();
  await page.getByLabel('Transcript câu trả lời').fill('I would speak for two minutes about the project.');
  await page.locator('[data-ux-control="end-answer"]').click();
  await expect(page.getByText('Part 3 · Thảo luận sâu')).toBeVisible();
  await attachShot(page, 'entered-part-3');
  for (let index = 0; index < 3; index += 1) {
    await page.getByLabel('Transcript câu trả lời').fill('Young people should take more environmental responsibility.');
    await page.locator('[data-ux-control="end-answer"]').click();
  }
  await expect(page.getByRole('heading', { name: 'Báo cáo Speaking' })).toBeVisible();
  await expect(page.getByText(/unavailable/)).toBeVisible();
  await expect(page.locator('[data-ux-control="restart-exam"]')).toBeVisible();
  await page.locator('[data-ux-control="end-exam"]').isVisible().catch(() => false);
  await page.locator('[data-ux-control="restart-exam"]').click();
  await expect(page.locator('[data-ux-control="start-realtime-session"]')).toBeVisible();
});

test.describe('lazy room render error recovery', () => {
  test.use({
    expectedConsoleErrors: [
      SPEAKING_ROOM_RENDER_THROW_MESSAGE,
      'The above error occurred',
    ],
  });

  test('a render throw after the lazy room loads shows turn-based recovery', async ({ page }) => {
    await page.goto(`/?${SPEAKING_ROOM_RENDER_THROW_QUERY}=1`);
    await navigateToModule(page, 'practice');
    await page.getByRole('button', { name: /IELTS Speaking/ }).click();
    const recovery = page.locator('[data-ux-control="switch-to-turn-based-from-room-error"]');
    await expect(recovery).toBeVisible();
    await expect(page.getByText(/Không tải được phòng realtime/)).toBeVisible();
    await expect(page.getByText(/Đây không phải realtime/)).toBeVisible();
    await expect(page.locator('#ai_speaking_realtime_room')).toHaveCount(0);
    await recovery.click();
    await expect(page.getByText(/Speaking Part 1: Hỏi đáp ngắn/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Luyện Từng Dạng Bài/ })).toBeVisible();
  });
});
