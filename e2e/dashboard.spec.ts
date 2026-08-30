import { expect, test } from './fixtures';

function isMobileProject(projectName: string): boolean {
  return projectName.includes('mobile');
}

test('Daily Coach primary action follows seeded due-mistake evidence', async ({ page }, testInfo) => {
  await page.goto('/');
  const coach = page.getByRole('region', { name: 'Daily Coach' });

  await expect(coach.getByRole('button', { name: 'Ôn lỗi đến hạn' })).toBeVisible();
  await expect(coach.getByText(/đến lịch ôn/)).toBeVisible();
  await expect(coach.locator('[data-ux-control="dashboard.coach.alternative-2"]')).toBeVisible();

  if (isMobileProject(testInfo.project.name)) {
    await expect(coach.locator('[data-ux-control="dashboard.coach.alternative-1"]')).not.toBeVisible();
    await expect(coach.locator('[data-ux-control="dashboard.coach.plan-manual-module"]')).not.toBeVisible();
    await expect(coach.locator('[data-ux-control="dashboard.mobile.open-due-work"]')).toBeVisible();
  } else {
    await expect(coach.getByRole('button', { name: /Tự chọn module/ })).toBeVisible();
    await expect(coach.locator('[data-ux-control="dashboard.coach.alternative-1"]')).toBeVisible();
  }

  await coach.getByRole('button', { name: 'Ôn lỗi đến hạn' }).click();
  await expect(page.getByRole('heading', { name: 'Ôn lỗi đến hạn' })).toBeVisible();
});

test('Daily Coach manual module choice opens a chooser and navigates', async ({ page }, testInfo) => {
  await page.goto('/');
  const coach = page.getByRole('region', { name: 'Daily Coach' });
  const chooserButton = coach.locator('[data-ux-control="dashboard.coach.alternative-2"]');
  await expect(chooserButton).toBeVisible();
  await chooserButton.click();

  const dialog = page.getByRole('dialog', { name: 'Chọn module học tập' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Sources & Library' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Review & Progress' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Vocabulary' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'unprecedented' })).toBeVisible();

  if (!isMobileProject(testInfo.project.name)) {
    await page.getByRole('navigation', { name: 'Điều hướng học tập' }).getByRole('button', { name: 'Dashboard' }).click();
  } else {
    await page.getByRole('navigation', { name: 'Điều hướng di động' }).getByRole('button', { name: 'Home' }).click();
  }

  await page.getByRole('region', { name: 'Daily Coach' }).locator('[data-ux-control="dashboard.coach.alternative-2"]').click();
  await expect(page.getByRole('dialog', { name: 'Chọn module học tập' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Chọn module học tập' })).toHaveCount(0);
  await expect(chooserButton).toBeFocused();
});
