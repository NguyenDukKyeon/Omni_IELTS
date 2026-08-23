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
