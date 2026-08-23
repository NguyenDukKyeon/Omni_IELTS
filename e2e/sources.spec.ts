import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Sources search filters the learner-owned library and restores it when cleared', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'sources');
  const sourceTitle = page.getByRole('heading', { name: 'The Future of Sustainable Urban Mobility' });
  await expect(sourceTitle).toBeVisible();

  const search = page.getByRole('textbox', { name: 'Tìm...' });
  await search.fill('không tồn tại 123');
  await expect(sourceTitle).not.toBeVisible();
  await search.fill('Urban Mobility');
  await expect(sourceTitle).toBeVisible();
});
