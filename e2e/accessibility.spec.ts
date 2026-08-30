import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

const modules = [
  'dashboard',
  'sources',
  'vocabulary',
  'grammar',
  'media',
  'practice',
  'mock_test',
  'review_progress',
  'profile',
] as const;

test('public beta module entry screens have no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
  });
  const auditFailures: string[] = [];

  for (const module of modules) {
    await navigateToModule(page, module);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
    for (const violation of blocking) {
      const targets = violation.id === 'color-contrast'
        ? ` [${violation.nodes.map((node) => {
            const contrast = node.any.find(({ id }) => id === 'color-contrast')?.data as { fgColor?: string; bgColor?: string } | undefined;
            return `${node.target.join(' ')} ${contrast?.fgColor || '?'} on ${contrast?.bgColor || '?'}`;
          }).join('; ')}]`
        : ` [${violation.nodes.flatMap(({ target }) => target).join(', ')}]`;
      auditFailures.push(`${module}: ${violation.id} (${violation.nodes.length} nodes) — ${violation.help}${targets}`);
    }
  }

  expect(auditFailures).toEqual([]);
});

test('Focus Dock keyboard traversal reaches header, navigation, Daily Coach, and evidence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Desktop keyboard traversal order');
  await page.goto('/');
  await page.locator('[data-ux-control="shell.header.home"]').focus();
  const traversal: string[] = [];

  for (let step = 0; step < 60; step += 1) {
    const controlId = await page.evaluate(() => document.activeElement?.getAttribute('data-ux-control') || '');
    if (controlId && !traversal.includes(controlId)) traversal.push(controlId);
    if (controlId === 'shell.evidence.collapse') break;
    await page.keyboard.press('Tab');
  }

  expect(traversal.indexOf('shell.header.home')).toBeGreaterThanOrEqual(0);
  expect(traversal.indexOf('shell.nav.dashboard')).toBeGreaterThan(traversal.indexOf('shell.header.home'));
  expect(traversal.indexOf('dashboard.coach.primary')).toBeGreaterThan(traversal.indexOf('shell.nav.dashboard'));
  expect(traversal.indexOf('shell.evidence.collapse')).toBeGreaterThan(traversal.indexOf('dashboard.coach.primary'));
});

test('Focus Dock preserves responsive overflow and reduced-motion semantics at desktop zoom width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Desktop responsive contract');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
    window.scrollTo(0, 0);
  });

  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    mainHidden: getComputedStyle(document.getElementById('main-viewport-content')!).display === 'none',
    transition: getComputedStyle(document.querySelector('.omni-daily-coach__cta')!).transitionDuration,
  }));

  expect(metrics.overflow).toBe(false);
  expect(metrics.mainHidden).toBe(false);
  expect(metrics.transition).toMatch(/0s|1e-05s|0\.01ms/);
});

test('System, Light, Dark, High Contrast, offline copy, and evidence status retain semantics', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Desktop theme and connectivity contract');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.locator('[data-ux-control="shell.header.open-account-menu"]').click();
  await page.locator('[data-ux-control="shell.theme.open"]').click();
  await page.locator('[data-ux-control="shell.theme.light"]').click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.locator('[data-ux-control="shell.theme.open"]').click();
  await page.locator('[data-ux-control="shell.theme.dark"]').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.locator('[data-ux-control="shell.theme.open"]').click();
  await page.locator('[data-ux-control="shell.theme.high-contrast"]').click();
  await expect(page.locator('html')).toHaveClass(/high-contrast/);
  await page.locator('[data-ux-control="shell.theme.open"]').click();
  await page.locator('[data-ux-control="shell.theme.system"]').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    window.dispatchEvent(new Event('offline'));
  });
  const offlineStatus = page.getByRole('status').filter({ hasText: 'Ngoại tuyến' });
  await expect(offlineStatus).toHaveCount(1);
  await page.waitForTimeout(250);
  await expect(offlineStatus).toHaveCount(1);

  const dueSummary = page.locator('#system-due');
  await expect(dueSummary).toContainText('Đến hạn');
  await expect(dueSummary.locator('[data-ux-control="shell.evidence.open-due-summary"]')).toBeVisible();
});

test('Mobile sheets trap focus, make the background inert, and restore Escape focus', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile sheet contract');
  await page.goto('/');
  const learnTrigger = page.locator('[data-ux-control="shell.mobile.learn"]');
  await learnTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Learn' })).toBeVisible();
  await expect(page.locator('.omni-focus-dock__body')).toHaveAttribute('inert', '');

  const sheetButtons = page.getByRole('dialog', { name: 'Learn' }).getByRole('button');
  await sheetButtons.last().focus();
  await page.keyboard.press('Tab');
  await expect(sheetButtons.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Learn' })).toHaveCount(0);
  await expect(learnTrigger).toBeFocused();
});

test('Mock Exam hides shell chrome and exit restores it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Desktop exam shell contract');
  await page.goto('/');
  await page.locator('[data-ux-control="shell.nav.mock"]').click();
  await page.getByRole('button', { name: /Bắt đầu Vào Phòng Thi/ }).first().click();
  await expect(page.getByRole('navigation', { name: 'Điều hướng học tập' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Bằng chứng và việc đến hạn' })).toHaveCount(0);

  await page.getByTitle('Thoát phòng thi').click();
  await page.getByRole('button', { name: 'Thoát phòng thi', exact: true }).last().click();
  await expect(page.getByRole('navigation', { name: 'Điều hướng học tập' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Bằng chứng và việc đến hạn' })).toBeVisible();
});
