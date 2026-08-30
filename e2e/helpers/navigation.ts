import type { Page } from '@playwright/test';

type NavigableModule =
  | 'dashboard'
  | 'sources'
  | 'vocabulary'
  | 'grammar'
  | 'media'
  | 'practice'
  | 'mock_test'
  | 'knowledge'
  | 'review_progress'
  | 'profile';

const LEARN_MODULES = new Set(['sources', 'vocabulary', 'grammar', 'media']);
const PRACTICE_MODULES = new Set(['practice', 'mock_test']);

async function isMobileNavVisible(page: Page): Promise<boolean> {
  return page.locator('#mobile-bottom-nav').isVisible();
}

export async function navigateToModule(page: Page, module: NavigableModule) {
  if (module === 'knowledge') {
    await navigateToModule(page, 'grammar');
    await page.getByRole('tab', { name: 'IELTS Strategy' }).click();
    return;
  }

  const mobile = await isMobileNavVisible(page);
  if (!mobile) {
    if (module === 'profile') {
      await page.locator('#profile-nav-btn').click();
      return;
    }
    if (module === 'dashboard') {
      await page.locator('#nav-item-dashboard').click();
      return;
    }
    await page.locator(`#nav-item-${module}`).click();
    return;
  }

  const nav = page.getByRole('navigation', { name: 'Điều hướng di động' });

  if (module === 'dashboard') {
    await nav.getByRole('button', { name: 'Home' }).click();
    return;
  }

  if (module === 'review_progress') {
    await nav.getByRole('button', { name: 'Review' }).click();
    return;
  }

  if (module === 'profile') {
    await nav.getByRole('button', { name: 'More' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hồ sơ' }).click();
    return;
  }

  if (LEARN_MODULES.has(module)) {
    await nav.getByRole('button', { name: 'Learn' }).click();
    const labels: Record<string, string> = {
      sources: 'Sources & Library',
      vocabulary: 'Vocabulary',
      grammar: 'Grammar & Strategy',
      media: 'Media Lab',
    };
    await page.getByRole('dialog').getByRole('button', { name: new RegExp(labels[module]) }).click();
    return;
  }

  if (PRACTICE_MODULES.has(module)) {
    await nav.getByRole('button', { name: 'Practice' }).click();
    const label = module === 'mock_test' ? 'IELTS Mock' : 'IELTS Practice';
    await page.getByRole('dialog').getByRole('button', { name: new RegExp(label) }).click();
  }
}
