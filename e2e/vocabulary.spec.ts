import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Vocabulary SRS rating records a real review outcome and XP event', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'vocabulary');
  await expect(page.getByRole('heading', { name: 'unprecedented' })).toBeVisible();

  await page.getByRole('button', { name: /Dễ ợt \(4\)/ }).click();
  await expect(page.getByText(/XP! Ôn tập thẻ từ vựng SRS/)).toBeVisible();
});
