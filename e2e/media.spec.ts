import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Media Lab switches from Shadowing to an interactive Dictation lesson', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'media');
  await expect(page.getByRole('button', { name: 'Bắt Đầu Nói Theo (Shadowing)' })).toBeVisible();
  await expect(page.getByTitle('Chưa có audio gốc để nghe')).toBeDisabled();

  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Câu 2 / 5')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('Câu 1 / 5')).toBeVisible();

  await page.getByRole('button', { name: /Dictation \(Nghe Chép\)/ }).click();
  await expect(page.getByRole('textbox', { name: 'Type exactly what you hear...' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gợi ý chữ cái đầu' })).toBeVisible();

  await page.getByRole('button', { name: 'Easy' }).click();
  await expect(page.getByText('Gợi ý ký tự đầu:')).toBeVisible();

  await page.getByRole('button', { name: 'Fill' }).click();
  await expect(page.getByText('Điền các từ còn thiếu')).toBeVisible();
  await expect(page.getByLabel(/Điền từ vị trí/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Arrange' }).click();
  await expect(page.getByText(/Đã chọn 0 \/ \d+ từ/)).toBeVisible();
  await page.getByRole('button', { name: /Chọn từ/ }).first().click();
  await expect(page.getByText(/Đã chọn 1 \/ \d+ từ/)).toBeVisible();

  await page.getByRole('button', { name: 'Sentence' }).click();
  await expect(page.getByRole('textbox', { name: 'Type exactly what you hear...' })).toBeVisible();

  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Câu 2 / 5')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByTitle('Chưa có audio gốc để chép chính tả')).toBeDisabled();
  await expect(page.getByText('Đang phát âm thanh câu...')).toHaveCount(0);
});

test('Media lesson resumes the last selected sentence after reload', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'media');
  await expect(page.getByText('Câu 1 / 5')).toBeVisible();

  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Câu 2 / 5')).toBeVisible();

  await page.reload();
  await navigateToModule(page, 'media');
  await expect(page.getByText('Câu 2 / 5')).toBeVisible();
});

test('Dictation answer and score persist after reload', async ({ page }) => {
  const answer = 'The rapid pace of global urbanization poses unprecedented challenges for municipal infrastructure.';
  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /Dictation \(Nghe Chép\)/ }).click();
  await page.getByRole('textbox', { name: 'Type exactly what you hear...' }).fill(answer);
  await page.getByRole('button', { name: 'Kiểm Tra Chính Tả' }).click();
  await expect(page.getByText('Độ khớp từ vựng: 100%')).toBeVisible();

  await page.reload();
  await navigateToModule(page, 'media');
  await expect(page.getByRole('button', { name: /Dictation \(Nghe Chép\)/ })).toHaveAttribute('class', /bg-sky-600/);
  await expect(page.getByRole('textbox', { name: 'Type exactly what you hear...' })).toHaveValue(answer);
  await expect(page.getByText('Độ khớp từ vựng: 100%')).toBeVisible();
});

test('Dictation identifies words the learner added but the transcript does not contain', async ({ page }) => {
  const answerWithExtraWord = 'The rapid pace of global urbanization poses unprecedented challenges for municipal infrastructure today.';
  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /Dictation \(Nghe Chép\)/ }).click();
  await page.getByRole('textbox', { name: 'Type exactly what you hear...' }).fill(answerWithExtraWord);
  await page.getByRole('button', { name: 'Kiểm Tra Chính Tả' }).click();

  await expect(page.getByTitle('Từ thừa').filter({ hasText: 'today.' })).toBeVisible();
});

test('Media library delete control removes a lesson without page errors', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'media');
  const lessonTitle = 'Bài mẫu Shadowing: Urban Planning, Cities and Climate';
  await expect(page.getByText(lessonTitle, { exact: true }).first()).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTitle('Xóa bài luyện này').first().click();

  await expect(page.getByText(lessonTitle, { exact: true })).toHaveCount(0);
});

test('Shadowing and Dictation expose working repeat, wait and full-lesson controls', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'media');

  const shadowRepeat = page.getByRole('button', { name: 'Lặp 2 lần' });
  await shadowRepeat.click();
  await expect(shadowRepeat).toHaveAttribute('aria-pressed', 'true');

  const shadowWait = page.getByRole('button', { name: 'Chờ 0.8 giây giữa các vòng' });
  await shadowWait.click();
  await expect(shadowWait).toHaveAttribute('aria-pressed', 'true');

  const shadowFullLesson = page.getByRole('button', { name: 'Tự chuyển toàn bài' });
  await shadowFullLesson.click();
  await expect(shadowFullLesson).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: /Dictation \(Nghe Chép\)/ }).click();
  const dictationRepeat = page.getByRole('button', { name: 'Lặp 3 lần' });
  await dictationRepeat.click();
  await expect(dictationRepeat).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Chờ 0.8 giây giữa các vòng' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tự chuyển toàn bài' })).toBeVisible();
});

test('Shadowing full-lesson mode continues playing the next sentence', async ({ page }) => {
  await page.addInitScript(() => {
    class FastYouTubePlayer {
      currentTime = 0;
      timer: number | undefined;
      constructor(_host: HTMLElement, options: { events?: { onReady?: (event: { target: FastYouTubePlayer }) => void } }) {
        window.setTimeout(() => options.events?.onReady?.({ target: this }), 20);
      }
      setPlaybackRate() {}
      seekTo(value: number) { this.currentTime = value; }
      playVideo() {
        window.clearInterval(this.timer);
        this.timer = window.setInterval(() => { this.currentTime += 1; }, 10);
      }
      pauseVideo() { window.clearInterval(this.timer); }
      getCurrentTime() { return this.currentTime; }
      destroy() { window.clearInterval(this.timer); }
    }
    (window as any).YT = { Player: FastYouTubePlayer };
    localStorage.setItem('omni_ielts_media_v1', JSON.stringify([{
      id: 'media_full_lesson_fixture',
      title: 'Full lesson playback fixture',
      mediaType: 'youtube',
      mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      youtubeId: 'wr6fQ4KpbRM',
      topic: 'Playback flow',
      level: 'Adaptive',
      durationSeconds: 6,
      currentTimestamp: 0,
      mode: 'shadowing',
      completed: false,
      transcriptSegments: [
        { id: 'full_1', start: 0, end: 0.3, text: 'First sentence.', translation: '', speaker: 'Original audio' },
        { id: 'full_2', start: 0.3, end: 5.3, text: 'Second sentence continues automatically.', translation: '', speaker: 'Original audio' },
      ],
    }]));
  });

  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: 'Tự chuyển toàn bài' }).click();
  await page.getByTitle('Nghe phát âm chuẩn bản xứ').click();

  await expect(page.getByText('Câu 2 / 2')).toBeVisible({ timeout: 1_500 });
  await expect(page.getByText('Đang lắng nghe phát âm bản xứ...')).toBeVisible();
});

test('Shadowing without microphone reports unavailable and never requests a score', async ({ page }) => {
  let evaluationRequests = 0;
  await page.addInitScript(() => {
    (window as any).__speechRecognitionStopped = false;
    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = 'en-US';
      onresult: ((event: unknown) => void) | null = null;
      start() {}
      stop() {
        (window as any).__speechRecognitionStopped = true;
      }
    }
    (window as any).SpeechRecognition = FakeSpeechRecognition;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException('Permission denied', 'NotAllowedError');
        },
      },
    });
  });
  await page.route('**/api/media/evaluate-shadowing', async (route) => {
    evaluationRequests += 1;
    await route.fulfill({ status: 500, body: '{}' });
  });

  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /Bắt Đầu Nói Theo/ }).click();

  await expect(page.getByText(/Điểm phát âm và ngữ điệu đang unavailable/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__speechRecognitionStopped)).toBe(true);
  expect(evaluationRequests).toBe(0);
});

test('Shadowing keeps validated feedback and VAD telemetry after reload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('omni_ielts_media_v1', JSON.stringify([{
      id: 'media_shadowing_feedback_fixture',
      title: 'Persisted shadowing feedback',
      mediaType: 'article_audio',
      mediaUrl: '',
      topic: 'Feedback',
      level: 'Adaptive',
      durationSeconds: 4,
      currentTimestamp: 0,
      mode: 'shadowing',
      completed: false,
      transcriptSegments: [{
        id: 'feedback_1',
        start: 0,
        end: 4,
        text: 'Public transport is important for everyone.',
        translation: '',
        shadowingScore: 82,
        shadowingEvaluation: {
          overallScore: 82,
          fluencyScore: 79,
          intonationScore: 84,
          accuracyScore: 81,
          feedbackVi: 'Nhịp câu khá tự nhiên.',
          acousticStatus: 'measured',
          telemetry: {
            rawWpm: 90,
            articulationRate: 112,
            fillerCount: 0,
            fillerRatePer100Words: 0,
            silentPauses: [{ start: 1.8, end: 2.2, duration: 0.4 }],
            averagePauseDuration: 0.4,
            longPauses: 0,
            speechRatio: 0.8,
            acousticStatus: 'measured',
            vadVersion: 'silero-vad-web-0.0.30',
          },
        },
      }],
    }]));
  });

  await page.goto('/');
  await navigateToModule(page, 'media');
  await expect(page.getByText('VAD đã đo')).toBeVisible();
  await expect(page.getByText('Nhịp câu khá tự nhiên.')).toBeVisible();

  await page.reload();
  await navigateToModule(page, 'media');
  await expect(page.getByText('VAD đã đo')).toBeVisible();
});

test('Dictation full lesson waits for an answer before advancing', async ({ page }) => {
  await page.addInitScript(() => {
    class FastYouTubePlayer {
      currentTime = 0;
      timer: number | undefined;
      constructor(_host: HTMLElement, options: { events?: { onReady?: (event: { target: FastYouTubePlayer }) => void } }) {
        window.setTimeout(() => options.events?.onReady?.({ target: this }), 20);
      }
      setPlaybackRate() {}
      seekTo(value: number) { this.currentTime = value; }
      playVideo() {
        window.clearInterval(this.timer);
        this.timer = window.setInterval(() => { this.currentTime += 1; }, 10);
      }
      pauseVideo() { window.clearInterval(this.timer); }
      getCurrentTime() { return this.currentTime; }
      destroy() { window.clearInterval(this.timer); }
    }
    (window as any).YT = { Player: FastYouTubePlayer };
    localStorage.setItem('omni_ielts_media_v1', JSON.stringify([{
      id: 'media_dictation_full_fixture',
      title: 'Dictation full lesson fixture',
      mediaType: 'youtube',
      mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      youtubeId: 'wr6fQ4KpbRM',
      topic: 'Dictation flow',
      level: 'Adaptive',
      durationSeconds: 5,
      currentTimestamp: 0,
      mode: 'dictation',
      completed: false,
      transcriptSegments: [
        { id: 'dict_1', start: 0, end: 0.3, text: 'First sentence.', translation: '' },
        { id: 'dict_2', start: 0.3, end: 4, text: 'Second sentence.', translation: '' },
      ],
    }]));
  });

  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: 'Tự chuyển toàn bài' }).click();
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  await expect(page.getByText('Câu 1 / 2')).toBeVisible();

  await page.getByRole('textbox', { name: 'Type exactly what you hear...' }).fill('First sentence.');
  await page.getByRole('button', { name: 'Kiểm Tra Chính Tả' }).click();
  await expect(page.getByText('Câu 2 / 2')).toBeVisible({ timeout: 2_000 });
});

test('YouTube sentence looping follows player time instead of a wall-clock guess', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__omniYouTubeSeekCalls = [];
    localStorage.setItem('omni_ielts_media_v1', JSON.stringify([{
      id: 'media_youtube_clock_fixture',
      title: 'YouTube clock fixture',
      mediaType: 'youtube',
      mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM',
      youtubeId: 'wr6fQ4KpbRM',
      topic: 'Playback timing',
      level: 'Adaptive',
      durationSeconds: 20,
      currentTimestamp: 0,
      mode: 'shadowing',
      completed: false,
      transcriptSegments: [
        { id: 'clock_1', start: 0, end: 10, text: 'Timing follows the original player.', translation: '', speaker: 'Original audio' },
      ],
    }]));

    class FastYouTubePlayer {
      currentTime = 0;
      timer: number | undefined;
      constructor(_host: HTMLElement, options: { events?: { onReady?: (event: { target: FastYouTubePlayer }) => void } }) {
        window.setTimeout(() => options.events?.onReady?.({ target: this }), 50);
      }
      setPlaybackRate() {}
      seekTo(value: number) {
        this.currentTime = value;
        (window as any).__omniYouTubeSeekCalls.push(value);
      }
      playVideo() {
        window.clearInterval(this.timer);
        this.timer = window.setInterval(() => { this.currentTime += 1; }, 10);
      }
      pauseVideo() { window.clearInterval(this.timer); }
      getCurrentTime() { return this.currentTime; }
      destroy() { window.clearInterval(this.timer); }
    }
    (window as any).YT = { Player: FastYouTubePlayer };
  });

  await page.goto('/');
  await navigateToModule(page, 'media');
  await expect(page.getByRole('heading', { name: 'YouTube clock fixture' })).toBeVisible();
  await page.getByRole('button', { name: 'Lặp 2 lần' }).click();
  await page.getByTitle('Nghe phát âm chuẩn bản xứ').click();
  await expect.poll(() => page.evaluate(() => (window as any).__omniYouTubeSeekCalls.length))
    .toBe(2);
  await expect.poll(() => page.evaluate(() => (window as any).__omniYouTubeSeekCalls))
    .toEqual([0, 0]);
});

test('Uploaded lesson audio survives reload without storing base64 in localStorage', async ({ page }) => {
  await page.route('**/api/media/transcribe-and-segment', (route) => route.fulfill({
    json: {
      promptVersion: 'media-transcribe-v1',
      segments: [
        { startSec: 0, endSec: 2, speaker: 'Original audio', text: 'Persist the learner owned audio safely.', confidence: 'high' },
      ],
      detectedVocabulary: [],
    },
  }));

  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /AI Audio Transcription/ }).click();
  const wavFixture = Buffer.alloc(44 + 16_000);
  wavFixture.write('RIFF', 0);
  wavFixture.writeUInt32LE(wavFixture.length - 8, 4);
  wavFixture.write('WAVEfmt ', 8);
  wavFixture.writeUInt32LE(16, 16);
  wavFixture.writeUInt16LE(1, 20);
  wavFixture.writeUInt16LE(1, 22);
  wavFixture.writeUInt32LE(8_000, 24);
  wavFixture.writeUInt32LE(16_000, 28);
  wavFixture.writeUInt16LE(2, 32);
  wavFixture.writeUInt16LE(16, 34);
  wavFixture.write('data', 36);
  wavFixture.writeUInt32LE(16_000, 40);
  await page.locator('#audio-file-input').setInputFiles({
    name: 'owned-audio.wav',
    mimeType: 'audio/wav',
    buffer: wavFixture,
  });
  await page.getByRole('button', { name: 'Phiên Âm & Phân Đoạn Timestamp' }).click();
  await page.getByRole('button', { name: 'Vào Phòng Shadowing & Dictation' }).click();

  await expect(page.getByRole('heading', { name: /Bài Luyện Audio/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('omni_ielts_media_v1') || ''))
    .not.toContain('data:audio');
  await expect(page.getByLabel('Original lesson audio')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByRole('region', { name: 'Audio waveform with sentence regions' })).toBeVisible();

  await page.reload();
  await navigateToModule(page, 'media');
  await expect(page.getByRole('heading', { name: /Bài Luyện Audio/ })).toBeVisible();
  await expect(page.getByLabel('Original lesson audio')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByRole('region', { name: 'Audio waveform with sentence regions' })).toBeVisible();
});

test.describe('handled Media provider failure', () => {
  test.use({ expectedConsoleErrors: ['Failed to load resource: the server responded with a status of 503'] });

test('Audio transcription failure is recoverable and never exposes provider internals', async ({ page }) => {
  await page.route('**/api/media/transcribe-and-segment', (route) => route.fulfill({
    status: 503,
    json: { error: 'Command failed: /tmp/provider --secret RESOURCE_EXHAUSTED raw upstream body' },
  }));

  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /AI Audio Transcription/ }).click();
  await page.locator('#audio-file-input').setInputFiles({
    name: 'owned-audio.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from('RIFF safe failure fixture'),
  });
  await page.getByRole('button', { name: 'Phiên Âm & Phân Đoạn Timestamp' }).click();

  await expect(page.getByText(/Quota AI chép lời đã hết/)).toBeVisible();
  await expect(page.getByText(/Command failed|\/tmp\/|--secret|raw upstream body/)).toHaveCount(0);
});
});

test('Media import has no target-band control and transcript edits persist after reload', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'media');

  await page.getByRole('button', { name: /Nhập URL YouTube/ }).first().click();
  await expect(page.getByText('Mục tiêu Band điểm IELTS')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: /Toàn Bộ Transcript/ }).click();
  await page.getByRole('button', { name: 'Chỉnh sửa transcript' }).click();
  const firstSentence = page.getByLabel('Nội dung câu 1');
  await firstSentence.fill('The edited transcript remains available after a reload.');
  await page.getByRole('button', { name: 'Lưu transcript' }).click();
  await expect(page.getByText('Đã lưu phiên bản transcript mới.')).toBeVisible();

  await page.reload();
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /Toàn Bộ Transcript/ }).click();
  await expect(page.getByText(/The edited transcript remains available after a reload/)).toBeVisible();
});

test('YouTube import shows real job phases and never exposes provider commands', async ({ page }) => {
  let statusReads = 0;
  await page.route('**/api/media/capabilities', (route) => route.fulfill({
    json: {
      youtubeImport: { available: true, ytDlp: true, jsRuntime: true, potProvider: false },
      uploadAudio: true,
      uploadCaptions: true,
      pasteTranscript: true,
    },
  }));
  await page.route('**/api/media/youtube/import', (route) => route.fulfill({
    status: 202,
    json: {
      id: 'media_job_e2e',
      phase: 'probing',
      progress: 8,
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T00:00:00.000Z',
      source: 'youtube',
    },
  }));
  await page.route('**/api/media/imports/media_job_e2e', (route) => {
    statusReads += 1;
    if (statusReads === 1) {
      return route.fulfill({ json: {
        id: 'media_job_e2e', phase: 'captions', progress: 28,
        createdAt: '2026-08-24T00:00:00.000Z', updatedAt: '2026-08-24T00:00:01.000Z', source: 'youtube',
      } });
    }
    return route.fulfill({ json: {
      id: 'media_job_e2e', phase: 'ready', progress: 100,
      createdAt: '2026-08-24T00:00:00.000Z', updatedAt: '2026-08-24T00:00:02.000Z', source: 'youtube',
      validation: { coverage: 1, segmentCount: 13, durationSeconds: 39 },
      session: {
        id: 'media_yt_e2e', title: 'Complete YouTube lesson', mediaType: 'youtube',
        mediaUrl: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM', youtubeId: 'wr6fQ4KpbRM',
        channelTitle: 'Fixture channel', topic: 'Academic English', level: 'Adaptive', durationSeconds: 39,
        currentTimestamp: 0,
        transcriptSegments: Array.from({ length: 13 }, (_, index) => ({
          id: `seg_${index + 1}`, start: index * 3, end: (index + 1) * 3,
          text: `Complete sentence ${index + 1}.`, translation: '', speaker: 'Original audio',
        })),
        mode: 'shadowing', completed: false,
        transcriptVersion: { rawSource: 'yt-dlp', normalizerVersion: 'vtt-rolling-v1', importedAt: '2026-08-24T00:00:02.000Z' },
      },
    } });
  });

  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /Nhập URL YouTube/ }).first().click();
  await page.getByLabel('Đường dẫn URL Video YouTube').fill('https://www.youtube.com/watch?v=wr6fQ4KpbRM');
  await page.getByRole('button', { name: 'Tạo Bài Luyện Shadowing & Dictation' }).click();
  await expect(page.getByText('Đang lấy phụ đề tiếng Anh đầy đủ...')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Complete YouTube lesson' })).toBeVisible();
  await expect(page.getByText(/Command failed|\/tmp\/|--print-json/)).toHaveCount(0);
});

test('YouTube bot-check failure offers a safe audio fallback without raw stderr', async ({ page }) => {
  await page.route('**/api/media/capabilities', (route) => route.fulfill({
    json: {
      youtubeImport: { available: true, ytDlp: true, jsRuntime: true, potProvider: false },
      uploadAudio: true,
      uploadCaptions: true,
      pasteTranscript: true,
    },
  }));
  await page.route('**/api/media/youtube/import', (route) => route.fulfill({
    status: 202,
    json: {
      id: 'media_job_failed', phase: 'probing', progress: 8,
      createdAt: '2026-08-24T00:00:00.000Z', updatedAt: '2026-08-24T00:00:00.000Z', source: 'youtube',
    },
  }));
  await page.route('**/api/media/imports/media_job_failed', (route) => route.fulfill({
    json: {
      id: 'media_job_failed', phase: 'failed', progress: 100,
      createdAt: '2026-08-24T00:00:00.000Z', updatedAt: '2026-08-24T00:00:01.000Z', source: 'youtube',
      failure: {
        category: 'provider_blocked', code: 'YOUTUBE_PROVIDER_BLOCKED',
        message: 'YouTube đang chặn kết nối tự động cho video này. Bạn có thể tải lên audio, VTT/SRT hoặc dán transcript để tiếp tục.',
        retryable: false, recoveryAction: 'upload_source', requestId: 'media_safe_e2e',
      },
    },
  }));

  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /Nhập URL YouTube/ }).first().click();
  await page.getByLabel('Đường dẫn URL Video YouTube').fill('https://www.youtube.com/watch?v=wr6fQ4KpbRM');
  await page.getByRole('button', { name: 'Tạo Bài Luyện Shadowing & Dictation' }).click();
  await expect(page.getByText(/YouTube đang chặn kết nối tự động/)).toBeVisible();
  await expect(page.getByText(/Command failed|\/tmp\/|--print-json/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Dùng audio, VTT/SRT hoặc transcript' }).click();
  await expect(page.getByRole('heading', { name: /AI Audio Transcription/ })).toBeVisible();
});

test('Unavailable YouTube capability keeps the upload and transcript fallback actionable', async ({ page }) => {
  await page.route('**/api/media/capabilities', (route) => route.fulfill({
    json: {
      youtubeImport: {
        available: false,
        ytDlp: true,
        jsRuntime: true,
        potProvider: false,
        reason: 'Máy chủ chưa kết nối PO-token provider nên YouTube import tự động đang tạm khóa.',
      },
      uploadAudio: true,
      uploadCaptions: true,
      pasteTranscript: true,
    },
  }));

  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /Nhập URL YouTube/ }).first().click();
  await page.getByRole('button', { name: 'Dùng audio, VTT/SRT hoặc transcript' }).click();
  await expect(page.getByRole('heading', { name: /AI Audio Transcription/ })).toBeVisible();
});

test('Media fallback accepts pasted transcripts without calling a cloud provider', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'media');
  await page.getByRole('button', { name: /AI Audio Transcription/ }).click();
  await page.getByRole('button', { name: 'VTT / SRT / Dán transcript' }).click();
  await page.getByLabel('Dán transcript hoặc nội dung VTT SRT').fill('First learner-owned sentence. Second learner-owned sentence!');
  await page.getByRole('button', { name: 'Tạo bài học từ transcript' }).click();
  await expect(page.getByText('"First learner-owned sentence."', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vào Phòng Shadowing & Dictation' }).click();
  await expect(page.getByRole('heading', { name: /Bài Luyện Transcript/ })).toBeVisible();
});
