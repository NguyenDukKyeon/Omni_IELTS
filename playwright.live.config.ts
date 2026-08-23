import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: './e2e-live',
  timeout: 90_000,
  expect: { timeout: 60_000 },
  workers: 1,
  outputDir: path.join(os.tmpdir(), 'omni-ielts-playwright-live-results'),
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'off',
  },
  projects: [{ name: 'live-provider-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
