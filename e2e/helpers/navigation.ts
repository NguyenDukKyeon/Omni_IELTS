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
  | 'profile';

export async function navigateToModule(page: Page, module: NavigableModule) {
  if (module === 'profile') {
    await page.locator('#profile-nav-btn').click();
    return;
  }

  const mobileControl = page.locator(`#mobile-nav-${module}`);
  if (await mobileControl.isVisible()) {
    await mobileControl.click();
    return;
  }

  await page.locator(`#nav-item-${module}`).click();
}
