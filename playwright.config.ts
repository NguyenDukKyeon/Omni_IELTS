import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const playwrightPort = Number(process.env.PLAYWRIGHT_PORT || 3100);
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;
const isSourcesLibraryTask12 = process.env.OMNI_RUN_SOURCES_E2E === 'true'
  || process.argv.some((argument) => /(?:^|[\\/])sources-library\.spec\.ts$/.test(argument));
const forceFreshDeterministicServer = process.env.OMNI_DETERMINISTIC_E2E === 'true';

export default defineConfig({
  testDir: './e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
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
    env: {
      ...process.env,
      PORT: String(playwrightPort),
      OMNI_SOURCES_LIBRARY_V2: isSourcesLibraryTask12 ? 'true' : 'false',
      DISABLE_HMR: 'true',
      LIVE_HUB_RECEIPT_SECRET: process.env.LIVE_HUB_RECEIPT_SECRET || 'omni-e2e-live-hub-receipt-secret',
      ...(isSourcesLibraryTask12 ? {
        OMNI_SOURCES_LIBRARY_V2: 'true',
        VITE_SUPABASE_URL: 'http://127.0.0.1:59999',
        VITE_SUPABASE_ANON_KEY: 'task12-test-anon-key',
      } : {}),
    },
    reuseExistingServer: isSourcesLibraryTask12 || forceFreshDeterministicServer ? false : !process.env.CI,
    timeout: 60_000,
  },
});
