import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Vocabulary SRS rating records a real review outcome and XP event', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'vocabulary');
  await expect(page.getByRole('heading', { name: 'unprecedented' })).toBeVisible();

  await page.getByRole('button', { name: /Dễ ợt \(4\)/ }).click();
  await expect(page.getByText(/XP! Ôn tập thẻ từ vựng SRS/)).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const cards = JSON.parse(localStorage.getItem('omni_ielts_vocab_v1') || '[]');
    return cards.find((card: any) => card.word === 'unprecedented')?.fsrs?.version;
  })).toBe('fsrs-6');
});

test('Adaptive vocabulary creates a Foundation topic deck through the real UX flow', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('omni_gemini_api_key', 'test-gemini-byok'));
  await page.route('**/api/vocab/adaptive-topic-decks', (route) => {
    expect(route.request().headers()['x-gemini-api-key']).toBe('test-gemini-byok');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        topicId: 'education',
        tier: 'foundation',
        cards: [{
          word: 'schoolwork',
          phonetic: '/ˈskuːl.wɜːk/',
          pos: 'noun',
          definitionVi: 'bài tập ở trường',
          definitionEn: 'work done as part of school study',
          exampleEn: 'I finish my schoolwork before dinner.',
          exampleVi: 'Tôi hoàn thành bài tập ở trường trước bữa tối.',
          collocations: ['finish schoolwork', 'daily schoolwork'],
          wordFamily: ['school', 'schoolwork'],
          paraphrases: ['school assignments'],
          usageNoteVi: 'Dùng cho bài tập nói chung, không chỉ homework.',
          cefrLevel: 'A2',
        }],
      }),
    });
  });

  await page.goto('/');
  await navigateToModule(page, 'vocabulary');
  await page.getByRole('button', { name: /Bộ từ theo chủ đề/ }).click();
  await expect(page.getByRole('heading', { name: '20 chủ đề thích ứng từ Band 3.0 đến 9.0' })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo deck Education – Foundation' }).click();
  await expect(page.getByRole('heading', { name: 'schoolwork' })).toBeVisible();
});
