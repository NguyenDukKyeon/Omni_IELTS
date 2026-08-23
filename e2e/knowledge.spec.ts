import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Knowledge tabs replace the strategy catalog with annotated model answers', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'knowledge');
  await expect(page.getByRole('heading', { name: /Tuyệt Kỹ Matching Headings/ }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Bài Mẫu Band 8.5+ Có Chú Thích AI' }).click();
  await expect(page.getByText(/Band 8.5/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Task 1|Task 2|Speaking/ }).first()).toBeVisible();
});
