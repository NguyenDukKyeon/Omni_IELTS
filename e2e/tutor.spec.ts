import { expect, test } from './fixtures';

test('AI Tutor sends a learner question and renders the structured response', async ({ page }) => {
  await page.route('**/api/tutor/respond', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      reply: 'Hãy ưu tiên luyện Task Response bằng cách viết một thesis statement rõ ràng.',
      suggestedFollowUps: ['Cho tôi một ví dụ'],
      researchMode: false,
    }),
  }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Open AI Tutor' }).click();
  const input = page.getByRole('textbox', { name: /Hỏi về/ });
  await input.fill('Tôi nên cải thiện Writing như thế nào?');
  await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
  await expect(page.getByText(/ưu tiên luyện Task Response/)).toBeVisible();
});
