import { expect, test } from './fixtures';

test('Daily Coach primary action follows seeded due-mistake evidence', async ({ page }) => {
  await page.goto('/');
  const coach = page.getByRole('region', { name: 'Daily Coach' });

  await expect(coach.getByRole('button', { name: 'Ôn lỗi đến hạn' })).toBeVisible();
  await expect(coach.getByRole('button', { name: 'Tự chọn module' })).toBeVisible();
  await expect(coach.getByText(/đến lịch ôn/)).toBeVisible();
  await expect(coach.locator('[data-ux-control="dashboard.coach.alternative-1"]')).toBeVisible();
  await expect(coach.locator('[data-ux-control="dashboard.coach.alternative-2"]')).toBeVisible();

  await coach.getByRole('button', { name: 'Ôn lỗi đến hạn' }).click();
  await expect(page.getByRole('heading', { name: 'Ôn lỗi đến hạn' })).toBeVisible();
});
