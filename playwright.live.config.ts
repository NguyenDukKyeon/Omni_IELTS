import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const playwrightLivePort = Number(process.env.PLAYWRIGHT_LIVE_PORT || 3200);
const externalLiveBaseUrl = process.env.PLAYWRIGHT_LIVE_BASE_URL?.trim().replace(/\/$/, '');
const playwrightLiveBaseUrl = externalLiveBaseUrl || `http://127.0.0.1:${playwrightLivePort}`;

export default defineConfig({
  testDir: './e2e-live',
  timeout: 90_000,
  expect: { timeout: 60_000 },
  workers: 1,
  outputDir: path.join(os.tmpdir(), 'omni-ielts-playwright-live-results'),
  reporter: [['list']],
  use: {
    baseURL: playwrightLiveBaseUrl,
    trace: 'on',
    screenshot: 'on',
    video: 'off',
  },
  projects: [{ name: 'live-provider-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalLiveBaseUrl ? undefined : {
    command: 'npm run dev',
    url: `${playwrightLiveBaseUrl}/api/health`,
    env: {
      ...process.env,
      PORT: String(playwrightLivePort),
      DISABLE_HMR: 'true',
      YT_DLP_POT_PROVIDER_URL: process.env.PLAYWRIGHT_YT_DLP_POT_PROVIDER_URL || 'http://127.0.0.1:4416',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
