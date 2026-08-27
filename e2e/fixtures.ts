import { expect, test as base } from '@playwright/test';

type UxProofFixtures = {
  expectedConsoleErrors: string[];
};

export const test = base.extend<UxProofFixtures>({
  expectedConsoleErrors: [[], { option: true }],
  page: async ({ page, expectedConsoleErrors }, use) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => {
      const rendered = `pageerror: ${error.message}`;
      if (!expectedConsoleErrors.some((expected) => rendered.includes(expected))) {
        runtimeErrors.push(rendered);
      }
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const location = message.location();
        const rendered = `console: ${message.text()} (${location.url || 'unknown URL'}:${location.lineNumber || 0})`;
        if (!expectedConsoleErrors.some((expected) => rendered.includes(expected))) {
          runtimeErrors.push(rendered);
        }
      }
    });

    await use(page);
    expect(runtimeErrors, 'The tested UX flow must not emit uncaught page or console errors').toEqual([]);
  },
});

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
