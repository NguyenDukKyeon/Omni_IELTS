import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Media Lab switches from Shadowing to an interactive Dictation lesson', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'media');
  await expect(page.getByRole('button', { name: 'Bắt Đầu Nói Theo (Shadowing)' })).toBeVisible();

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
  await expect(page.getByText('Đang phát âm thanh câu...')).toBeVisible();
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
