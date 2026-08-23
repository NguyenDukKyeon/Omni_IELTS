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
