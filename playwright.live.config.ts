import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';
import { resolveLiveCanaryTarget } from './src/lib/liveCanaryConfig';

const liveTarget = resolveLiveCanaryTarget(process.env);

export default defineConfig({
  testDir: './e2e-live',
  timeout: 90_000,
  expect: { timeout: 60_000 },
  workers: 1,
  outputDir: path.join(os.tmpdir(), 'omni-ielts-playwright-live-results'),
  reporter: [['list']],
  use: {
    baseURL: liveTarget.baseURL,
    trace: 'on',
    screenshot: 'on',
    video: 'off',
  },
  projects: [{ name: 'live-provider-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: liveTarget.startsLocalServer ? {
    command: 'npm run dev',
    url: `${liveTarget.baseURL}/api/health`,
    env: {
      ...process.env,
      PORT: String(liveTarget.port),
      DISABLE_HMR: 'true',
      LIVE_HUB_RECEIPT_SECRET: process.env.LIVE_HUB_RECEIPT_SECRET || 'omni-live-canary-receipt-secret',
      YT_DLP_POT_PROVIDER_URL: process.env.PLAYWRIGHT_YT_DLP_POT_PROVIDER_URL || 'http://127.0.0.1:4416',
    },
    reuseExistingServer: true,
    timeout: 60_000,
  } : undefined,
});
