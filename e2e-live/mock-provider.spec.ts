import { expect, test } from '@playwright/test';
import { navigateToModule } from '../e2e/helpers/navigation';

test('a real text provider builds all four skills and opens the persisted exam room', async ({ page }) => {
  test.setTimeout(360_000);
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await navigateToModule(page, 'mock_test');
  await page.getByRole('button', { name: /Mở Mock Test Orchestrator/ }).click();
  await page.getByRole('button', { name: 'Lắp Ráp Bộ Đề 4 Kỹ Năng (Orchestrator)', exact: true }).click();

  await expect(page.getByText('Bộ Đề Đã Lắp Ráp Thành Công')).toBeVisible({ timeout: 300_000 });
  await page.getByRole('button', { name: /Vào Phòng Thi Thử Ngay/ }).click();

  await expect(page.getByText(/Listening Test — Section 1/i)).toBeVisible();
  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('omni_active_mock_build') || 'null'));
  expect(snapshot?.mockBuildId).toMatch(/^mock_build_/);
  expect(snapshot?.attemptId).toContain(snapshot.mockBuildId);
  expect(snapshot?.package?.listening?.sections?.flatMap((section: any) => section.questions)).toHaveLength(40);
  expect(snapshot?.package?.reading?.passages?.flatMap((passage: any) => passage.questions)).toHaveLength(40);
  expect(snapshot?.package?.writing?.task1?.prompt).toBeTruthy();
  expect(snapshot?.package?.writing?.task2?.prompt).toBeTruthy();
  expect(snapshot?.package?.speaking?.part1?.questions?.length).toBeGreaterThan(0);
  expect(snapshot?.package?.speaking?.part2?.cueCard?.prompt).toBeTruthy();
  expect(snapshot?.package?.speaking?.part3?.questions?.length).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
