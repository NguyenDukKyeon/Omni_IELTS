import { expect, test } from './fixtures';

test('Focus Dock exposes Dashboard and seven canonical modules without legacy gamification', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Điều hướng học tập' });

  await expect(navigation.getByRole('button', { name: 'Dashboard' })).toBeVisible();
  for (const label of [
    'Sources & Library',
    'Vocabulary',
    'Grammar & Strategy',
    'Media Lab',
    'IELTS Practice',
    'IELTS Mock',
    'Review & Progress',
  ]) {
    await expect(navigation.getByRole('button', { name: new RegExp(label) })).toBeVisible();
  }

  await expect(page.getByText('Bento AI')).toHaveCount(0);
  await expect(page.getByText(/Lv\./)).toHaveCount(0);
  await expect(page.getByTitle(/Chuỗi học tập/)).toHaveCount(0);
  await expect(page.locator('#main-viewport-content')).toBeVisible();

  await navigation.getByRole('button', { name: /Review & Progress/ }).click();
  await expect(page.getByRole('heading', { name: 'Ôn lỗi đến hạn' })).toBeVisible();

  await navigation.getByRole('button', { name: /Grammar & Strategy/ }).click();
  await expect(page.getByRole('tab', { name: 'Grammar' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'IELTS Strategy' })).toBeVisible();
});
