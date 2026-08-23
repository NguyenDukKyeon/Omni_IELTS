import { expect, test } from './fixtures';

test('Dashboard recommended vocabulary action opens the actual SRS lesson', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Chào Nguyễn Minh Anh/ })).toBeVisible();

  await page.getByRole('button', { name: 'Ôn tập từ vựng ngay' }).click();
  await expect(page.getByRole('heading', { name: /Kho Từ Vựng & Thuật Toán SRS/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'unprecedented' })).toBeVisible();
});
