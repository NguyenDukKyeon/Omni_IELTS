import { expect, test, type Page } from './fixtures';
import { navigateToModule } from './helpers/navigation';

function isMobileProject(projectName: string): boolean {
  return projectName.includes('mobile');
}

// Every UX_CONTROL_CONTRACTS entry is exercised by the desktop/mobile activation tables below.
const SHELL_CONTROL_IDS = [
  'shell.header.home',
  'shell.header.open-review',
  'shell.header.open-account-menu',
  'shell.header.open-tutor',
  'shell.theme.open',
  'shell.theme.system',
  'shell.theme.light',
  'shell.theme.dark',
  'shell.theme.high-contrast',
  'shell.header.open-profile',
  'shell.nav.dashboard',
  'shell.nav.sources',
  'shell.nav.vocabulary',
  'shell.nav.grammar',
  'shell.nav.media',
  'shell.nav.practice',
  'shell.nav.mock',
  'shell.nav.review',
  'shell.nav.collapse',
  'shell.nav.expand',
  'dashboard.coach.primary',
  'dashboard.coach.alternative-1',
  'dashboard.coach.alternative-2',
  'dashboard.coach.plan-manual-module',
  'dashboard.coach.plan-source',
  'dashboard.coach.open-plan-module',
  'dashboard.mobile.open-due-work',
  'dashboard.coach.open-evidence',
  'dashboard.open-latest-practice',
  'dashboard.open-latest-mock',
  'shell.chooser.close',
  'shell.chooser.module-sources',
  'shell.chooser.module-vocabulary',
  'shell.chooser.module-grammar',
  'shell.chooser.module-media',
  'shell.chooser.module-practice',
  'shell.chooser.module-mock',
  'shell.chooser.module-review',
  'shell.evidence.collapse',
  'shell.evidence.expand',
  'shell.evidence.open-due-summary',
  'shell.evidence.open-context',
  'shell.evidence.open-practice',
  'shell.evidence.open-mock',
  'shell.evidence.open-media',
  'shell.evidence.open-resumable-media',
  'shell.grammar.tab-grammar',
  'shell.grammar.tab-strategy',
  'review.open-due-workout',
  'review.open-practice-history',
  'review.open-mock-history',
  'shell.mobile.home',
  'shell.mobile.learn',
  'shell.mobile.practice',
  'shell.mobile.review',
  'shell.mobile.more',
  'shell.mobile.learn.sheet-close',
  'shell.mobile.learn-sources',
  'shell.mobile.learn-vocabulary',
  'shell.mobile.learn-grammar',
  'shell.mobile.learn-media',
  'shell.mobile.practice.sheet-close',
  'shell.mobile.practice-practice',
  'shell.mobile.practice-mock',
  'shell.mobile.more.sheet-close',
  'shell.mobile.more-tutor',
  'shell.mobile.more-profile',
  'shell.mobile.theme-system',
  'shell.mobile.theme-light',
  'shell.mobile.theme-dark',
  'shell.mobile.theme-high-contrast',
] as const;

async function seedValidShellEvidence(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('omni_ielts_practice_v1', JSON.stringify([{
      id: 'e2e-independent-practice',
      skill: 'writing',
      taskType: 'Writing Task 2',
      evidenceClass: 'independent',
      status: 'completed',
      scoreBand: 6.5,
      timestamp: '2026-08-29T10:00:00.000Z',
      durationMinutes: 40,
    }]));
    localStorage.setItem('omni_ielts_mocks_v1', JSON.stringify([{
      id: 'e2e-independent-mock',
      testTitle: 'E2E IELTS-style Mock',
      evidenceClass: 'mock',
      status: 'completed',
      overallBand: 6,
      listeningBand: 6,
      readingBand: 6,
      writingBand: 6,
      speakingBand: 6,
      completedDate: '2026-08-29T11:00:00.000Z',
    }]));
  });
}

async function activate(page: Page, controlId: string) {
  const control = page.locator(`[data-ux-control="${controlId}"]`);
  await expect(control, `${controlId} should be rendered before activation`).toBeVisible();
  await control.click();
}

test('desktop shell controls activate real navigation, disclosure, theme, and recovery transitions', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'Desktop shell activation table');
  expect(new Set(SHELL_CONTROL_IDS).size).toBe(SHELL_CONTROL_IDS.length);
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Điều hướng học tập' });

  await activate(page, 'shell.header.home');
  await activate(page, 'shell.header.open-review');
  await expect(page.locator('#review-progress-view')).toBeVisible();
  await activate(page, 'shell.header.home');
  await activate(page, 'shell.header.open-account-menu');
  await expect(page.getByRole('menu', { name: 'Tài khoản và công cụ' })).toBeVisible();
  await activate(page, 'shell.header.open-tutor');
  await expect(page.locator('#ai-tutor-drawer')).toBeVisible();
  await page.locator('#ai-tutor-close-btn').click();
  await activate(page, 'shell.header.open-account-menu');

  await activate(page, 'shell.theme.open');
  await expect(page.getByRole('menu', { name: 'Chọn giao diện' })).toBeVisible();
  for (const themeControl of [
    'shell.theme.system',
    'shell.theme.light',
    'shell.theme.dark',
    'shell.theme.high-contrast',
  ]) {
    await activate(page, themeControl);
    await expect(page.getByRole('button', { name: 'Giao diện' })).toBeFocused();
    if (themeControl !== 'shell.theme.high-contrast') await activate(page, 'shell.theme.open');
  }

  await activate(page, 'shell.header.open-profile');
  await expect(page.getByRole('heading', { name: 'Nguyễn Minh Anh', exact: true }).first()).toBeVisible();
  await activate(page, 'shell.nav.dashboard');

  const navigationControls = [
    ['shell.nav.dashboard', 'dashboard'],
    ['shell.nav.sources', 'sources'],
    ['shell.nav.vocabulary', 'vocabulary'],
    ['shell.nav.grammar', 'grammar'],
    ['shell.nav.media', 'media'],
    ['shell.nav.practice', 'practice'],
    ['shell.nav.mock', 'mock_test'],
    ['shell.nav.review', 'review_progress'],
  ] as const;
  for (const [controlId, moduleId] of navigationControls) {
    await activate(page, controlId);
    await expect(navigation.locator(`[data-ux-control="${controlId}"]`)).toHaveAttribute('aria-current', 'page');
    if (moduleId !== 'dashboard') await activate(page, 'shell.nav.dashboard');
  }

  await activate(page, 'shell.nav.collapse');
  await expect(navigation.locator('[data-ux-control="shell.nav.expand"]')).toBeVisible();
  await activate(page, 'shell.nav.expand');
  await expect(navigation.locator('[data-ux-control="shell.nav.collapse"]')).toBeVisible();

  await activate(page, 'dashboard.coach.primary');
  await expect(page.locator('#review-progress-view')).toBeVisible();
  await activate(page, 'shell.nav.dashboard');
  await activate(page, 'dashboard.coach.alternative-1');
  await expect(page.getByRole('heading', { name: /Kho Từ Vựng/ }).first()).toBeVisible();
  await activate(page, 'shell.nav.dashboard');
  await activate(page, 'dashboard.coach.alternative-2');
  await expect(page.getByRole('dialog', { name: 'Chọn module học tập' })).toBeVisible();
  await activate(page, 'shell.chooser.close');
  await activate(page, 'dashboard.coach.plan-manual-module');
  await expect(page.getByRole('dialog', { name: 'Chọn module học tập' })).toBeVisible();
  await activate(page, 'shell.chooser.close');
  await activate(page, 'dashboard.coach.open-plan-module');
  await expect(page.getByRole('dialog', { name: 'Chọn module học tập' })).toBeVisible();
  await activate(page, 'shell.chooser.close');
  await activate(page, 'dashboard.coach.plan-source');
  await expect(page.getByRole('heading', { name: /Nguồn Học Liệu/ }).first()).toBeVisible();
  await activate(page, 'shell.nav.dashboard');

  for (const [controlId, moduleId] of [
    ['shell.chooser.module-sources', 'sources'],
    ['shell.chooser.module-vocabulary', 'vocabulary'],
    ['shell.chooser.module-grammar', 'grammar'],
    ['shell.chooser.module-media', 'media'],
    ['shell.chooser.module-practice', 'practice'],
    ['shell.chooser.module-mock', 'mock_test'],
    ['shell.chooser.module-review', 'review_progress'],
  ] as const) {
    await activate(page, 'dashboard.coach.alternative-2');
    await activate(page, controlId);
    await expect(navigation.locator(`[data-ux-control="shell.nav.${moduleId === 'mock_test' ? 'mock' : moduleId === 'review_progress' ? 'review' : moduleId}"]`)).toHaveAttribute('aria-current', 'page');
    await activate(page, 'shell.nav.dashboard');
  }

  await activate(page, 'dashboard.coach.open-evidence');
  await expect(page.locator('.omni-daily-coach__evidence')).toBeVisible();
  await activate(page, 'shell.evidence.open-due-summary');
  await expect(page.locator('#review-progress-view')).toBeVisible();
  await activate(page, 'shell.nav.dashboard');
  await activate(page, 'shell.evidence.open-context');
  await expect(page.locator('#ielts_practice_view')).toBeVisible();
  await activate(page, 'shell.nav.dashboard');
  await activate(page, 'shell.evidence.collapse');
  await expect(page.locator('[data-ux-control="shell.evidence.expand"]')).toBeVisible();
  await activate(page, 'shell.evidence.expand');
  await expect(page.locator('[data-ux-control="shell.evidence.collapse"]')).toBeVisible();

  await activate(page, 'shell.nav.grammar');
  await activate(page, 'shell.grammar.tab-strategy');
  await expect(page.getByRole('tab', { name: 'IELTS Strategy' })).toHaveAttribute('aria-selected', 'true');
  await activate(page, 'shell.grammar.tab-grammar');
  await expect(page.getByRole('tab', { name: 'Grammar' })).toHaveAttribute('aria-selected', 'true');
});

test('desktop shell controls activate valid evidence and review destinations', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'Desktop evidence activation table');
  await seedValidShellEvidence(page);
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Điều hướng học tập' });

  await activate(page, 'dashboard.open-latest-practice');
  await expect(page.locator('#ielts_practice_view')).toBeVisible();
  await activate(page, 'shell.nav.dashboard');
  await activate(page, 'dashboard.open-latest-mock');
  await expect(page.getByRole('heading', { name: /Phòng Thi Thử IELTS-style/ })).toBeVisible();
  await activate(page, 'shell.nav.dashboard');

  await activate(page, 'shell.evidence.open-practice');
  await expect(page.locator('#ielts_practice_view')).toBeVisible();
  await activate(page, 'shell.nav.dashboard');
  await activate(page, 'shell.evidence.open-resumable-media');
  await expect(page.getByRole('heading', { name: /Media Lab/ }).first()).toBeVisible();
  await activate(page, 'shell.evidence.open-media');
  await expect(page.getByRole('heading', { name: /Media Lab/ }).first()).toBeVisible();
  await activate(page, 'shell.nav.dashboard');

  await activate(page, 'shell.nav.review');
  await activate(page, 'review.open-due-workout');
  await expect(page.locator('#unified-mistake-notebook-modal')).toBeVisible();
  await page.locator('#close-mistake-modal-btn').click();
  await activate(page, 'shell.nav.dashboard');

  await activate(page, 'shell.nav.review');
  await activate(page, 'review.open-practice-history');
  await expect(page.locator('#ielts_practice_view')).toBeVisible();
  await activate(page, 'shell.nav.review');
  await activate(page, 'review.open-mock-history');
  await expect(page.getByRole('heading', { name: /Phòng Thi Thử IELTS-style/ })).toBeVisible();
  await activate(page, 'shell.nav.dashboard');

  await page.addInitScript(() => {
    localStorage.setItem('omni_ielts_practice_v1', JSON.stringify([{
      id: 'e2e-unfinished-practice',
      skill: 'reading',
      taskType: 'Reading Passage 1',
      status: 'in_progress',
      evidenceClass: 'assisted',
      timestamp: '2026-08-29T12:00:00.000Z',
    }]));
  });
  await page.reload();
  await expect(page.locator('[data-ux-control="shell.evidence.resume-latest"]')).toHaveCount(0);

  await page.addInitScript(() => {
    localStorage.setItem('omni_ielts_practice_v1', JSON.stringify([]));
  });
  await page.reload();
  await activate(page, 'shell.evidence.open-mock');
  await expect(page.getByRole('heading', { name: /Phòng Thi Thử IELTS-style/ })).toBeVisible();
  await expect(navigation).toBeVisible();
});

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

test('mobile shell controls activate all five destinations, grouped sheets, themes, and recovery', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo.project.name), 'Mobile shell activation table');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Điều hướng di động' });

  await activate(page, 'shell.mobile.home');
  await expect(page.locator('#dashboard-view')).toBeVisible();
  await activate(page, 'dashboard.mobile.open-due-work');
  await expect(page.locator('#review-progress-view')).toBeVisible();
  await activate(page, 'shell.mobile.home');

  await activate(page, 'shell.mobile.learn');
  await expect(page.getByRole('dialog', { name: 'Learn' })).toBeVisible();
  await activate(page, 'shell.mobile.learn.sheet-close');
  await expect(page.getByRole('dialog', { name: 'Learn' })).toHaveCount(0);
  await expect(nav.locator('[data-ux-control="shell.mobile.learn"]')).toBeFocused();

  for (const [controlId, heading] of [
    ['shell.mobile.learn-sources', 'Nguồn Học Liệu (Tạo Bài Học 4 Kỹ Năng)'],
    ['shell.mobile.learn-vocabulary', 'Kho Từ Vựng & Thuật Toán SRS FSRS-6'],
    ['shell.mobile.learn-grammar', 'Ngữ Pháp Trọng Điểm IELTS (Grammar for Band 7.0 - 8.5+)'],
    ['shell.mobile.learn-media', 'Media Lab: Shadowing & Nghe Chép Chính Tả (Dictation)'],
  ] as const) {
    await activate(page, 'shell.mobile.home');
    await activate(page, 'shell.mobile.learn');
    await activate(page, controlId);
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
  }

  await activate(page, 'shell.mobile.home');
  await activate(page, 'shell.mobile.learn');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Learn' })).toHaveCount(0);
  await expect(nav.locator('[data-ux-control="shell.mobile.learn"]')).toBeFocused();

  await activate(page, 'shell.mobile.practice');
  await expect(page.getByRole('dialog', { name: 'Practice' })).toBeVisible();
  await activate(page, 'shell.mobile.practice.sheet-close');
  await activate(page, 'shell.mobile.practice');
  await activate(page, 'shell.mobile.practice-practice');
  await expect(page.getByRole('heading', { name: /Luyện Tập IELTS/ }).first()).toBeVisible();
  await activate(page, 'shell.mobile.home');
  await activate(page, 'shell.mobile.practice');
  await activate(page, 'shell.mobile.practice-mock');
  await expect(page.getByRole('heading', { name: /Phòng Thi Thử IELTS-style/ }).first()).toBeVisible();
  await activate(page, 'shell.mobile.home');
  await activate(page, 'shell.mobile.practice');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Practice' })).toHaveCount(0);
  await expect(nav.locator('[data-ux-control="shell.mobile.practice"]')).toBeFocused();

  await activate(page, 'shell.mobile.review');
  await expect(page.locator('#review-progress-view')).toBeVisible();
  await activate(page, 'shell.mobile.home');

  await activate(page, 'shell.mobile.more');
  await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible();
  await activate(page, 'shell.mobile.more.sheet-close');
  await activate(page, 'shell.mobile.more');
  await activate(page, 'shell.mobile.more-tutor');
  await expect(page.locator('#ai-tutor-drawer')).toBeVisible();
  await page.locator('#ai-tutor-close-btn').click();
  await activate(page, 'shell.mobile.more');
  await activate(page, 'shell.mobile.more-profile');
  await expect(page.getByRole('heading', { name: 'Nguyễn Minh Anh', exact: true }).first()).toBeVisible();
  await activate(page, 'shell.mobile.home');

  await activate(page, 'shell.mobile.more');
  for (const themeControl of [
    'shell.mobile.theme-system',
    'shell.mobile.theme-light',
    'shell.mobile.theme-dark',
    'shell.mobile.theme-high-contrast',
  ]) {
    await activate(page, themeControl);
  }
  await activate(page, 'shell.mobile.more.sheet-close');
  await activate(page, 'shell.mobile.more');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'More' })).toHaveCount(0);
  await expect(nav.locator('[data-ux-control="shell.mobile.more"]')).toBeFocused();
});

test('Focus Dock deterministic layout assertions verify approved desktop and mobile proportions', async ({ page }, testInfo) => {
  const mobile = isMobileProject(testInfo.project.name);
  if (mobile) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('#dashboard-view')).toBeVisible();

    const mobileLayout = await page.evaluate(() => {
      const header = document.getElementById('app-header');
      const headerRect = header?.getBoundingClientRect();
      const actions = document.querySelector('.omni-shell-header__actions');
      const actionsVisible = actions ? getComputedStyle(actions).display !== 'none' : false;
      const primaryCta = document.querySelector('[data-ux-control="dashboard.coach.primary"]');
      const ctaRect = primaryCta?.getBoundingClientRect();
      const bottomNav = document.getElementById('mobile-bottom-nav');
      const navRect = bottomNav?.getBoundingClientRect();
      const main = document.getElementById('main-viewport-content');
      const mainRect = main?.getBoundingClientRect();
      const plan = document.querySelector('.omni-daily-coach__plan');
      const planRowsVisible = Boolean(plan && getComputedStyle(plan).display !== 'none');
      const mobileSignal = document.querySelector('.omni-daily-coach__mobile-signal');
      const mobileDueCard = document.querySelector('.omni-daily-coach__mobile-due');

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        headerHeight: headerRect?.height ?? 0,
        actionsVisible,
        ctaVisibleInViewport: Boolean(ctaRect && ctaRect.top >= 0 && ctaRect.bottom <= window.innerHeight),
        bottomNavVisible: Boolean(navRect && navRect.top < window.innerHeight),
        mainWidth: mainRect?.width ?? 0,
        planRowsVisible,
        hasCompactMobileSignal: Boolean(mobileSignal),
        hasMobileDueCard: Boolean(mobileDueCard),
      };
    });

    expect(mobileLayout.documentWidth).toBeLessThanOrEqual(mobileLayout.viewportWidth + 1);
    expect(mobileLayout.headerHeight).toBeLessThanOrEqual(72);
    expect(mobileLayout.headerHeight).toBeGreaterThanOrEqual(56);
     expect(mobileLayout.actionsVisible).toBe(true);
    expect(mobileLayout.ctaVisibleInViewport).toBe(true);
    expect(mobileLayout.bottomNavVisible).toBe(true);
    expect(mobileLayout.mainWidth).toBeGreaterThan(mobileLayout.viewportWidth * 0.8);
    expect(mobileLayout.planRowsVisible).toBe(false);
    expect(mobileLayout.hasCompactMobileSignal).toBe(true);
    expect(mobileLayout.hasMobileDueCard).toBe(true);
  } else {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('#dashboard-view')).toBeVisible();

    const desktopLayout = await page.evaluate(() => {
      const frame = document.querySelector('.omni-focus-dock__frame');
      const frameRect = frame?.getBoundingClientRect();
      const nav = document.getElementById('desktop-sidebar');
      const navRect = nav?.getBoundingClientRect();
      const dock = document.querySelector('.omni-evidence-dock:not(.is-collapsed)');
      const dockRect = dock?.getBoundingClientRect();
      const main = document.getElementById('main-viewport-content');
      const mainRect = main?.getBoundingClientRect();
      const title = document.querySelector('.omni-daily-coach h2');
      const titleRect = title?.getBoundingClientRect();
      const primaryCta = document.querySelector('[data-ux-control="dashboard.coach.primary"]');
      const ctaRect = primaryCta?.getBoundingClientRect();
      const focusGrid = document.querySelector('.omni-daily-coach__focus-grid');
       const coach = document.querySelector('.omni-daily-coach');
       const coachRect = coach?.getBoundingClientRect();
       const focusMain = document.querySelector('.omni-daily-coach__focus-main');
       const focusSignal = document.querySelector('.omni-daily-coach__focus-signal');
       const signalValue = document.querySelector('.omni-focus-signal__value')?.textContent || '';
       const focusMainRect = focusMain?.getBoundingClientRect();
       const focusSignalRect = focusSignal?.getBoundingClientRect();
       const planRows = Array.from(document.querySelectorAll('.omni-daily-coach__plan-row'));
       const planRowHeight = planRows[0]?.getBoundingClientRect().height ?? 0;
      const emptyCards = document.querySelectorAll('.omni-evidence-dock__empty-card');
      const dueItems = document.querySelectorAll('#system-due .omni-evidence-dock__list-item');
      const dueSummaryAction = document.querySelector('[data-ux-control="shell.evidence.open-due-summary"]');

      const leftMargin = frameRect?.left ?? 0;
      const rightMargin = window.innerWidth - (frameRect?.right ?? window.innerWidth);
      const isCentered = Math.abs(leftMargin - rightMargin) <= 6;
       const titleToCtaDistance = ctaRect && titleRect ? ctaRect.top - titleRect.bottom : 999;
       const hasTwoZoneGrid = Boolean(focusGrid && focusSignal);
       const focusZoneWidth = (focusMainRect?.width ?? 0) + (focusSignalRect?.width ?? 0);

       return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        isCentered,
        navWidth: navRect?.width ?? 0,
        dockWidth: dockRect?.width ?? 0,
         mainWidth: mainRect?.width ?? 0,
         coachWidth: coachRect?.width ?? 0,
        titleToCtaDistance,
         hasTwoZoneGrid,
         signalValue,
         focusMainShare: focusZoneWidth ? (focusMainRect?.width ?? 0) / focusZoneWidth : 0,
         focusSignalShare: focusZoneWidth ? (focusSignalRect?.width ?? 0) / focusZoneWidth : 0,
         planRowHeight,
         planRowsAreButtons: planRows.length === 3 && planRows.every((row) => row.tagName === 'BUTTON'),
         emptyCardCount: emptyCards.length,
         dueItemCount: dueItems.length,
         hasDueSummaryAction: Boolean(dueSummaryAction),
      };
    });

    expect(desktopLayout.documentWidth).toBeLessThanOrEqual(desktopLayout.viewportWidth + 1);
    expect(desktopLayout.isCentered).toBe(true);
    expect(desktopLayout.navWidth).toBeGreaterThanOrEqual(160);
    expect(desktopLayout.navWidth).toBeLessThanOrEqual(185);
    expect(desktopLayout.dockWidth).toBeGreaterThanOrEqual(220);
    expect(desktopLayout.dockWidth).toBeLessThanOrEqual(250);
    expect(desktopLayout.mainWidth).toBeGreaterThanOrEqual(620);
     expect(desktopLayout.coachWidth).toBeGreaterThanOrEqual(560);
     expect(desktopLayout.coachWidth).toBeLessThanOrEqual(660);
     expect(desktopLayout.titleToCtaDistance).toBeLessThan(120);
     expect(desktopLayout.hasTwoZoneGrid).toBe(true);
     expect(desktopLayout.signalValue.length).toBeGreaterThan(0);
     expect(desktopLayout.focusMainShare).toBeGreaterThanOrEqual(0.58);
     expect(desktopLayout.focusMainShare).toBeLessThanOrEqual(0.70);
     expect(desktopLayout.focusSignalShare).toBeGreaterThanOrEqual(0.30);
     expect(desktopLayout.focusSignalShare).toBeLessThanOrEqual(0.42);
     expect(desktopLayout.planRowHeight).toBeLessThanOrEqual(84);
     expect(desktopLayout.planRowHeight).toBeGreaterThanOrEqual(48);
     expect(desktopLayout.planRowsAreButtons).toBe(true);
     expect(desktopLayout.emptyCardCount).toBeLessThanOrEqual(1);
     expect(desktopLayout.dueItemCount).toBe(0);
     expect(desktopLayout.hasDueSummaryAction).toBe(true);
  }
});

test('Focus Dock keeps the canvas dominant across accepted desktop and mobile widths', async ({ page }, testInfo) => {
  const mobile = isMobileProject(testInfo.project.name);
  const widths = mobile ? [360, 390, 430] : [1280, 1440, 1920];
  for (const width of widths) {
    await page.setViewportSize({ width, height: mobile ? 900 : 1080 });
    await page.goto('/');
    const metrics = await page.evaluate(() => {
      const main = document.getElementById('main-viewport-content');
      const nav = document.getElementById('desktop-sidebar');
      const dock = document.querySelector('.omni-evidence-dock:not(.is-collapsed)');
      const mobileNav = document.getElementById('mobile-bottom-nav');
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        mainWidth: main?.getBoundingClientRect().width ?? 0,
        navWidth: nav?.getBoundingClientRect().width ?? 0,
        dockWidth: dock?.getBoundingClientRect().width ?? 0,
        mobileNavWidth: mobileNav?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.mainWidth).toBeGreaterThan(metrics.viewportWidth * (mobile ? 0.8 : 0.45));
    if (mobile) {
      expect(metrics.mobileNavWidth).toBeGreaterThanOrEqual(metrics.viewportWidth - 1);
      await expect(page.getByRole('navigation', { name: 'Điều hướng di động' }).getByRole('button')).toHaveCount(5);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const bottomClearance = await page.evaluate(() => {
        const lastCard = document.querySelector('.omni-dashboard__snapshot article:last-child');
        const mobileNav = document.getElementById('mobile-bottom-nav');
        return {
          contentBottom: lastCard?.getBoundingClientRect().bottom ?? 0,
          navTop: mobileNav?.getBoundingClientRect().top ?? window.innerHeight,
        };
      });
      expect(bottomClearance.contentBottom).toBeLessThanOrEqual(bottomClearance.navTop + 1);
    } else {
      expect(metrics.navWidth).toBeLessThan(metrics.mainWidth);
      expect(metrics.dockWidth).toBeLessThan(metrics.mainWidth);
      await expect(page.getByRole('navigation', { name: 'Điều hướng học tập' })).toBeVisible();
      await expect(page.getByRole('complementary', { name: 'Bằng chứng và việc đến hạn' })).toBeVisible();
    }
  }
});

test('Focus Dock review captures render from the document top with reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (isMobileProject(testInfo.project.name)) {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    await expect(page.locator('#dashboard-view')).toBeVisible();
    await expect(page.locator('#main-viewport-content')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${process.cwd()}/.impeccable/review/focus-dock-mobile.png`,
      fullPage: false,
    });
    return;
  }

  for (const [width, height, fileName] of [
    [1440, 900, 'focus-dock-desktop-1440.png'],
    [1920, 1080, 'focus-dock-desktop-1920.png'],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('#dashboard-view')).toBeVisible();
    await expect(page.locator('#main-viewport-content')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${process.cwd()}/.impeccable/review/${fileName}`,
      fullPage: false,
    });
  }
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

  await page.getByRole('button', { name: 'Mở tài khoản và công cụ' }).click();
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
