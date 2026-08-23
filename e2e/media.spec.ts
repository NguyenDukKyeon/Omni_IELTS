import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Media Lab switches from Shadowing to an interactive Dictation lesson', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'media');
  await expect(page.getByRole('button', { name: 'Bắt Đầu Nói Theo (Shadowing)' })).toBeVisible();

  await page.getByRole('button', { name: /Dictation \(Nghe Chép\)/ }).click();
  await expect(page.getByRole('textbox', { name: 'Type exactly what you hear...' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gợi ý chữ cái đầu' })).toBeVisible();
});
