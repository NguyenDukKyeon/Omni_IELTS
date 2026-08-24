import { expect, test } from '@playwright/test';
import { navigateToModule } from '../e2e/helpers/navigation';

test('a real text provider preserves a Live Hub source, builds all skills and opens the exam room', async ({ page, request }) => {
  // A zero-cost provider may legitimately consume the full staged retry budget
  // (up to three validated attempts per skill). Keep waiting on the real ready
  // state instead of replacing the provider with a fixture or a fixed sleep.
  test.setTimeout(900_000);
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const sourceItem = {
    id: 'live-canary-writing-source',
    title: 'Live canary education prompt',
    skill: 'writing_task2',
    council: 'international',
    councilLabel: 'International forecast canary',
    examDate: 'Forecast canary; not a reported exam',
    topicDomain: 'Education',
    subCategory: 'Discussion Essay',
    promptStatement: 'Some people believe university education should be free for everyone, while others disagree. Discuss both views and give your opinion.',
    trendStatus: 'quarter_forecast',
    trendBadge: 'Forecast canary',
    evidenceType: 'forecast',
    groundingSourceTitle: 'Canary fixture metadata',
    groundingSourceUrl: 'https://example.org/omni-live-canary',
    citations: [],
  };
  const createResponse = await request.post(`/api/live-hub/items/${sourceItem.id}/mock`, {
    data: { item: sourceItem, targetBand: 7, retrievedAt: new Date().toISOString() },
  });
  const created = await createResponse.json();
  expect(createResponse.ok(), JSON.stringify(created)).toBe(true);

  await page.goto('/');
  await page.evaluate(({ created, sourceItem }) => {
    sessionStorage.setItem('omni_pending_mock_source', JSON.stringify(sourceItem));
    localStorage.setItem('omni_pending_mock_build', JSON.stringify({
      id: created.mockBuild.id,
      createdAt: created.mockBuild.createdAt,
      params: {
        targetBand: 7,
        sourceItem,
        sourceArtifactId: created.artifact.id,
        provenance: created.artifact.provenance,
      },
      skillData: {},
      sourceArtifactId: created.artifact.id,
    }));
  }, { created, sourceItem });
  await navigateToModule(page, 'mock_test');
  await page.getByRole('button', { name: /Mở Mock Test Orchestrator/ }).click();
  await page.getByRole('button', { name: 'Lắp Ráp Bộ Đề 4 Kỹ Năng (Orchestrator)', exact: true }).click();

  const successHeading = page.getByText('Bộ Đề Đã Lắp Ráp Thành Công');
  const failureHeading = page.getByText('Lỗi lắp ráp đề thi');
  const outcome = await Promise.race([
    successHeading.waitFor({ state: 'visible', timeout: 840_000 }).then(() => 'ready' as const),
    failureHeading.waitFor({ state: 'visible', timeout: 840_000 }).then(() => 'failed' as const),
  ]);
  if (outcome === 'failed') {
    const failurePanel = failureHeading.locator('..');
    throw new Error(`Mock live provider failed: ${(await failurePanel.textContent())?.trim() || 'unknown failure'}`);
  }
  await page.getByRole('button', { name: /Vào Phòng Thi Thử Ngay/ }).click();

  await expect(page.getByText(/Listening Test — Section 1/i)).toBeVisible();
  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('omni_active_mock_build') || 'null'));
  expect(snapshot?.mockBuildId).toMatch(/^mock_build_/);
  expect(snapshot?.attemptId).toContain(snapshot.mockBuildId);
  expect(snapshot?.package?.listening?.sections?.flatMap((section: any) => section.questions)).toHaveLength(40);
  expect(snapshot?.package?.reading?.passages?.flatMap((passage: any) => passage.questions)).toHaveLength(40);
  expect(snapshot?.package?.writing?.task1?.prompt).toBeTruthy();
  expect(snapshot?.package?.writing?.task2?.prompt).toBe(sourceItem.promptStatement);
  expect(snapshot?.package?.provenance).toMatchObject({
    sourceItemId: sourceItem.id,
    sourceArtifactId: created.artifact.id,
  });
  expect(snapshot?.package?.speaking?.part1?.questions?.length).toBeGreaterThan(0);
  expect(snapshot?.package?.speaking?.part2?.cueCard?.prompt).toBeTruthy();
  expect(snapshot?.package?.speaking?.part3?.questions?.length).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
