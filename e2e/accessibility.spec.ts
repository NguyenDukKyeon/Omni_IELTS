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
