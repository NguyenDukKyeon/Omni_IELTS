import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Reading Practice submission reveals answer analysis instead of a dead CTA', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'practice');
  await page.getByRole('button', { name: /IELTS Reading 6 dạng/ }).click();
  await expect(page.getByRole('heading', { name: 'Urban Rewilding and Biodiversity Corridors' })).toBeVisible();

  await page.getByRole('button', { name: 'Nộp bài & Xem phân tích bẫy chi tiết' }).click();
  await expect(page.getByText('Đáp án chuẩn:').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Làm lại bài này' })).toBeVisible();
});
