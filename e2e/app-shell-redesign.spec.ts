import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

function isMobileProject(projectName: string): boolean {
  return projectName.includes('mobile');
}

test('Focus Dock exposes Dashboard and seven canonical modules without legacy gamification', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'Desktop rail is deferred on mobile until Task 7');
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
  await expect(page.getByText(/Bằng chứng Independent/)).toHaveCount(0);
  await expect(page.getByText(/Bằng chứng bài tự làm/)).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Bằng chứng theo kỹ năng' }).getByText('Chưa đủ bằng chứng').first()).toBeVisible();

  await navigation.getByRole('button', { name: /Grammar & Strategy/ }).click();
  await expect(page.getByRole('tab', { name: 'Grammar' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'IELTS Strategy' })).toBeVisible();
});

test('mobile Focus Dock keeps a usable main canvas without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo.project.name), 'Mobile canvas contract');
  await page.goto('/');
  const main = page.locator('#main-viewport-content');
  await expect(main).toBeVisible();

  const metrics = await page.evaluate(() => {
    const canvas = document.getElementById('main-viewport-content');
    const rect = canvas?.getBoundingClientRect();
    return {
      mainWidth: rect?.width ?? 0,
      viewportWidth: window.innerWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  expect(metrics.overflow).toBe(false);
  expect(metrics.mainWidth).toBeGreaterThan(metrics.viewportWidth * 0.8);

  const coach = page.getByRole('region', { name: 'Daily Coach' });
  await expect(coach.getByRole('heading', { name: 'Ôn lỗi đến hạn' })).toBeVisible();
  const cta = coach.locator('[data-ux-control="dashboard.coach.primary"]');
  await expect(cta).toBeVisible();
  await expect(cta).toBeInViewport();
});

test('mobile navigation groups seven modules into five destinations', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo.project.name), 'Mobile destination grouping');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Điều hướng di động' });
  await expect(nav.getByRole('button')).toHaveCount(5);

  const barMetrics = await nav.evaluate((element) => ({
    overflow: element.scrollWidth > element.clientWidth + 1,
    width: element.getBoundingClientRect().width,
  }));
  expect(barMetrics.overflow).toBe(false);

  await nav.getByRole('button', { name: 'Learn' }).click();
  for (const label of ['Sources & Library', 'Vocabulary', 'Grammar & Strategy', 'Media Lab']) {
    await expect(page.getByRole('dialog').getByRole('button', { name: new RegExp(label) })).toBeVisible();
  }

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Learn' })).toBeFocused();

  await nav.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByRole('heading', { name: 'Ôn lỗi đến hạn' })).toBeVisible();

  await nav.getByRole('button', { name: 'Practice' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /IELTS Practice/ })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: /IELTS Mock/ })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng' }).click();

  await nav.getByRole('button', { name: 'More' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'AI Tutor' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Hồ sơ' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('radio', { name: 'Sáng' })).toBeVisible();
});

test('knowledge remains renderable as a hidden compatibility route', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('omni:compat-set-module', { detail: 'knowledge' }));
  });
  await expect(page.locator('#knowledge-module')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Học Kiến Thức & Chiến Thuật Làm Bài IELTS' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng di động' }).getByRole('button', { name: 'Kiến thức' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Điều hướng học tập' }).getByRole('button', { name: 'Kiến thức' })).toHaveCount(0);
});

test('Evidence Dock is module-sensitive, persists collapse, and hides in Mock exam', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'Evidence Dock is deferred on narrow viewports');
  await page.goto('/');
  const dock = page.getByRole('complementary', { name: 'Bằng chứng và việc đến hạn' });
  const navigation = page.getByRole('navigation', { name: 'Điều hướng học tập' });

  await expect(dock).toBeVisible();
  await expect(dock.getByRole('heading', { name: 'Đến hạn', exact: true })).toBeVisible();
  await expect(dock.getByText('Evidence Dock')).toHaveCount(0);
  await expect(dock.locator('[data-ux-control="shell.evidence.resume-latest"]')).toHaveCount(0);

  const missing = dock.locator('#dashboard-context').getByRole('button');
  await expect(missing).toBeVisible();
  await missing.click();
  await expect(page.locator('#ielts_practice_view')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Luyện Tập IELTS/ })).toBeVisible();

  await navigation.getByRole('button', { name: 'Dashboard' }).click();
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

test('Theme menu Escape does not collapse Evidence Dock', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'Evidence Dock is deferred on narrow viewports');
  await page.goto('/');
  const dock = page.getByRole('complementary', { name: 'Bằng chứng và việc đến hạn' });
  await expect(dock.getByRole('button', { name: 'Thu gọn' })).toBeVisible();

  await page.getByRole('button', { name: 'Giao diện' }).click();
  await expect(page.getByRole('menu', { name: 'Chọn giao diện' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Chọn giao diện' })).toHaveCount(0);
  await expect(dock.getByRole('button', { name: 'Thu gọn' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở rộng bằng chứng' })).toHaveCount(0);
});

test('Grammar and Strategy tabs move with arrow keys', async ({ page }, testInfo) => {
  await page.goto('/');
  if (isMobileProject(testInfo.project.name)) {
    await navigateToModule(page, 'grammar');
  } else {
    await page.getByRole('navigation', { name: 'Điều hướng học tập' }).getByRole('button', { name: /Grammar & Strategy/ }).click();
  }

  const grammarTab = page.getByRole('tab', { name: 'Grammar' });
  const strategyTab = page.getByRole('tab', { name: 'IELTS Strategy' });
  await expect(grammarTab).toBeVisible();
  await grammarTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(strategyTab).toHaveAttribute('aria-selected', 'true');
  await expect(strategyTab).toBeFocused();
  await expect(page.locator('#grammar-strategy-panel-strategy')).toBeVisible();
});
