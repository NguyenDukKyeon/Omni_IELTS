import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const playwrightPort = Number(process.env.PLAYWRIGHT_PORT || 3100);
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: path.join(os.tmpdir(), 'omni-ielts-playwright-results'),
  reporter: [['list']],
  use: {
    baseURL: playwrightBaseUrl,
    trace: 'on',
    screenshot: 'on',
    video: 'off',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: `${playwrightBaseUrl}/api/health`,
    env: { ...process.env, PORT: String(playwrightPort), DISABLE_HMR: 'true' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
