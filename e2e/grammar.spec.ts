import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Grammar exercise selection enables submission and renders evaluated feedback', async ({ page }) => {
  await page.route('**/api/gemini/evaluate-grammar-exercise', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      isCorrect: true,
      score: 100,
      feedbackVi: 'Chính xác: thì quá khứ đơn phù hợp với giai đoạn đã kết thúc.',
      whyExplanation: 'Khoảng 2000–2010 đã kết thúc nên dùng rose.',
      bandBoostTips: 'Giữ thì nhất quán khi mô tả biểu đồ lịch sử.',
    }),
  }));
  await page.goto('/');
  await navigateToModule(page, 'grammar');

  await page.getByRole('button', { name: 'Between 2000 and 2010, the proportion of car owners rose significantly.', exact: true }).click();
  const submit = page.getByRole('button', { name: 'Kiểm Tra Đáp Án' });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText(/Chính xác: thì quá khứ đơn/)).toBeVisible();
  await expect(page.getByText(/Khoảng 2000–2010 đã kết thúc/)).toBeVisible();
});
