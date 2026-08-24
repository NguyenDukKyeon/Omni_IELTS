import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('Profile stores Gemini and Groq BYOK only for the current browser session', async ({ page }) => {
  await page.goto('/');
  await navigateToModule(page, 'profile');
  await page.getByRole('textbox', { name: 'Dán Gemini API key' }).fill('test-gemini-session-key-not-real');
  await page.getByRole('button', { name: 'Lưu Gemini' }).click();
  await page.getByRole('textbox', { name: 'Dán Groq API key' }).fill('test-groq-session-key-not-real');
  await page.getByRole('button', { name: 'Lưu Groq' }).click();

  await expect(page.getByText(/Đã lưu Groq API key trong tab hiện tại/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('omni_gemini_api_key'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('omni_groq_api_key'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('omni_gemini_api_key'))).toBe('test-gemini-session-key-not-real');
  expect(await page.evaluate(() => sessionStorage.getItem('omni_groq_api_key'))).toBe('test-groq-session-key-not-real');
});

test('Profile shows the server-managed gateway pool with safe aliases only', async ({ page }) => {
  await page.route('**/api/ai/capabilities', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      enabled: true,
      quotaScope: 'google_cloud_project',
      quotaNoteVi: 'Quota Gemini được tính theo Google Cloud project.',
      providers: [
        { provider: 'gemini', capabilities: ['text', 'search'], keys: [
          { alias: 'gemini-project-primary', configured: true },
          { alias: 'gemini-project-2', configured: true },
        ] },
        { provider: 'groq', capabilities: ['search'], keys: [{ alias: 'groq-primary', configured: true }] },
      ],
    }),
  }));
  await page.route('**/api/ai/health', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'healthy', checkedAt: '2026-08-23T12:00:00.000Z' }),
  }));

  await page.goto('/');
  await navigateToModule(page, 'profile');

  await expect(page.getByRole('heading', { name: 'API Gateway Pool' })).toBeVisible();
  await expect(page.getByText('Gateway khỏe')).toBeVisible();
  await expect(page.getByText('gemini-project-primary')).toBeVisible();
  await expect(page.getByText('groq-primary')).toBeVisible();
  await expect(page.getByText(/Quota Gemini được tính theo Google Cloud project/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/sk-or-v1-|nvapi-|AQ\./);
});
