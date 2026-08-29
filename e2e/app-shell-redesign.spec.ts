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

test('Evidence Dock is module-sensitive, persists collapse, and hides in Mock exam', async ({ page }) => {
  await page.goto('/');
  const dock = page.getByRole('complementary', { name: 'Bằng chứng và việc đến hạn' });
  const navigation = page.getByRole('navigation', { name: 'Điều hướng học tập' });

  await expect(dock).toBeVisible();
  await expect(dock.getByRole('heading', { name: 'Đến hạn', exact: true })).toBeVisible();

  await navigation.getByRole('button', { name: /Vocabulary/ }).click();
  await expect(dock.locator('#vocabulary-context')).toBeVisible();
  await expect(dock.locator('#media-context')).toHaveCount(0);

  await navigation.getByRole('button', { name: /Media Lab/ }).click();
  await expect(dock.locator('#media-context')).toBeVisible();
  await expect(dock.getByText(/Urban Planning/)).toBeVisible();

  await dock.getByRole('button', { name: 'Thu gọn' }).click();
  await expect(page.getByRole('button', { name: 'Mở rộng bằng chứng' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mở rộng bằng chứng' })).toBeVisible();

  await page.getByRole('button', { name: 'Mở rộng bằng chứng' }).click();
  await navigation.getByRole('button', { name: /IELTS Mock/ }).click();
  await page.getByRole('button', { name: /Bắt đầu Vào Phòng Thi/ }).first().click();
  await expect(page.getByRole('complementary', { name: 'Bằng chứng và việc đến hạn' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Điều hướng học tập' })).toHaveCount(0);
});
