import { expect, test, type Page } from './fixtures';
import { navigateToModule } from './helpers/navigation';

const freshResponse = {
  status: 'fresh',
  forecastItems: [{
    id: 'live-education-2026',
    title: 'Education funding discussion',
    skill: 'writing_task2',
    council: 'both_vietnam',
    councilLabel: 'IDP & BC Việt Nam',
    examDate: 'Thi thật: 18/08/2026',
    topicDomain: 'Education',
    subCategory: 'Discussion',
    promptStatement: 'Some people believe governments should fund university education. Discuss both views.',
    trendStatus: 'recent_real_exam',
    trendBadge: 'Báo cáo đã xác minh nguồn trực tiếp',
    evidenceType: 'verified_report',
    groundingSourceTitle: 'Direct IELTS report',
    groundingSourceUrl: 'https://example.org/direct-ielts-report',
    citations: [{ claimId: 'live-education-2026', title: 'Direct IELTS report', url: 'https://example.org/direct-ielts-report' }],
    enrichmentStatus: 'not_requested',
  }],
  searchQueries: ['IELTS education report'],
  groundingSources: [{ title: 'Direct IELTS report', url: 'https://example.org/direct-ielts-report' }],
  lastUpdated: '2026-08-23T08:00:00.000Z',
  summaryOverviewVi: 'Một báo cáo có nguồn trực tiếp.',
  stale: false,
};

async function openLiveHub(page: Page) {
  await page.goto('/');
  await navigateToModule(page, 'practice');
  await expect(page.getByRole('heading', { name: 'IELTS Real Exam & Forecast Live Hub' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('omni_forecast_snapshot_v1');
    localStorage.removeItem('omni_pending_mock_build');
    sessionStorage.clear();
  });
});

async function loadFreshItem(page: Page) {
  await page.route('**/api/forecast/refresh', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(freshResponse),
  }));
  await openLiveHub(page);
  await page.getByRole('button', { name: 'Làm mới đề thi thật' }).click();
  await expect(page.getByRole('heading', { name: 'Education funding discussion' })).toBeVisible();
}

test('Live Hub refresh renders grounded items and restores the verified snapshot after reload', async ({ page }) => {
  await page.route('**/api/forecast/refresh', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(freshResponse),
  }));
  await openLiveHub(page);

  await page.getByRole('button', { name: 'Làm mới đề thi thật' }).click();
  await expect(page.getByRole('heading', { name: 'Education funding discussion' })).toBeVisible();
  await expect(page.getByText('Một báo cáo có nguồn trực tiếp.')).toBeVisible();
  await expect(page.getByText(/Cập nhật trực tiếp:/)).toBeVisible();

  await page.reload();
  await navigateToModule(page, 'practice');
  await expect(page.getByRole('heading', { name: 'Education funding discussion' })).toBeVisible();
  await expect(page.getByText(/Snapshot đã lưu:/)).toBeVisible();
});

test('Live Hub identifies a successful Groq fallback after Gemini daily quota is exhausted', async ({ page }) => {
  await page.route('**/api/forecast/refresh', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...freshResponse,
      provider: 'groq',
      model: 'groq/compound-mini',
      fallbackReason: 'quota_exhausted',
    }),
  }));
  await openLiveHub(page);

  await page.getByRole('button', { name: 'Làm mới đề thi thật' }).click();

  await expect(page.getByText('Groq Web Search Live')).toBeVisible();
  await expect(page.getByText('Gemini hết quota ngày; dữ liệu này được tra cứu bằng Groq.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Education funding discussion' })).toBeVisible();
});

test('Live Hub creates a provenance-bearing Practice artifact before opening the skill lesson', async ({ page }) => {
  let practiceRequest: any;
  await page.route('**/api/live-hub/items/live-education-2026/practice', async route => {
    practiceRequest = await route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        artifact: {
          id: 'practice_artifact_e2e',
          kind: 'derived_practice',
          skill: 'writing_task2',
          prompt: freshResponse.forecastItems[0].promptStatement,
          provenance: {
            sourceItemId: 'live-education-2026',
            evidenceType: 'verified_report',
            sourceUrl: 'https://example.org/direct-ielts-report',
            retrievedAt: freshResponse.lastUpdated,
          },
        },
      }),
    });
  });
  await loadFreshItem(page);

  await page.getByRole('button', { name: 'Luyện riêng kỹ năng này' }).click();

  expect(practiceRequest.item.id).toBe('live-education-2026');
  expect(practiceRequest.item.groundingSourceUrl).toBe('https://example.org/direct-ielts-report');
  await expect(page.getByText(freshResponse.forecastItems[0].promptStatement)).toBeVisible();
  const artifact = await page.evaluate(() => JSON.parse(sessionStorage.getItem('omni_pending_practice_artifact') || 'null'));
  expect(artifact).toMatchObject({ id: 'practice_artifact_e2e', provenance: { sourceItemId: 'live-education-2026' } });
});

test('Live Hub creates a real MockBuild and opens the orchestrator with the required source section', async ({ page }) => {
  let mockRequest: any;
  await page.route('**/api/live-hub/items/live-education-2026/mock', async route => {
    mockRequest = await route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        artifact: {
          id: 'mock_artifact_e2e',
          kind: 'derived_mock_section',
          skill: 'writing_task2',
          provenance: { sourceItemId: 'live-education-2026', sourceUrl: 'https://example.org/direct-ielts-report' },
        },
        mockBuild: { id: 'mock_build_live_hub_e2e', status: 'draft', skillStates: { listening: 'pending', reading: 'pending', writing: 'pending', speaking: 'pending' } },
      }),
    });
  });
  await loadFreshItem(page);

  await page.getByRole('button', { name: 'Tạo Full Mock từ nguồn này' }).click();

  expect(mockRequest.item.id).toBe('live-education-2026');
  await expect(page.getByRole('heading', { name: 'Mock Test Orchestrator & Assembler' })).toBeVisible();
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('omni_pending_mock_build') || 'null'));
  expect(pending).toMatchObject({
    id: 'mock_build_live_hub_e2e',
    params: {
      sourceItem: { id: 'live-education-2026' },
      sourceArtifactId: 'mock_artifact_e2e',
      provenance: { sourceItemId: 'live-education-2026' },
    },
    skillData: {},
  });
});

test.describe('expected provider failures', () => {
  test.use({ expectedConsoleErrors: ['/api/forecast/refresh'] });

test('Live Hub exposes an actionable quota error without raw provider text', async ({ page }) => {
  await page.route('**/api/forecast/refresh', route => route.fulfill({
    status: 429,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'unavailable',
      error: 'Quota Gemini của API key đã hết. Hãy kiểm tra hạn mức hoặc dùng API key khác.',
      failure: {
        category: 'quota_exhausted',
        httpStatus: 429,
        retryable: false,
        requestId: 'forecast_e2e_quota',
        messageVi: 'Quota Gemini của API key đã hết. Hãy kiểm tra hạn mức hoặc dùng API key khác.',
        action: 'open_quota',
      },
    }),
  }));
  await openLiveHub(page);

  await page.getByRole('button', { name: 'Làm mới đề thi thật' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Quota Gemini của API key đã hết');
  await expect(alert).toContainText('Mã yêu cầu: forecast_e2e_quota');
  await expect(page.getByRole('link', { name: 'Kiểm tra quota Gemini' })).toBeVisible();
  await expect(alert).not.toContainText(/fetch failed|RESOURCE_EXHAUSTED|ENOTFOUND/i);
});

test('Live Hub converts a browser network failure into a retryable Vietnamese state', async ({ page }) => {
  await page.route('**/api/forecast/refresh', route => route.abort('failed'));
  await openLiveHub(page);

  await page.getByRole('button', { name: 'Làm mới đề thi thật' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Không thể kết nối tới Gemini');
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  await expect(alert).not.toContainText(/failed to fetch|fetch failed/i);
});

test('Live Hub distinguishes an exhausted free provider pool from a single Gemini key', async ({ page }) => {
  await page.route('**/api/forecast/refresh', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'unavailable',
      error: 'Tất cả nguồn AI miễn phí phù hợp hiện đã hết quota hoặc không khả dụng.',
      failure: {
        provider: 'bifrost',
        category: 'all_providers_exhausted',
        httpStatus: 503,
        retryable: false,
        requestId: 'forecast_e2e_pool',
        messageVi: 'Tất cả nguồn AI miễn phí phù hợp hiện đã hết quota hoặc không khả dụng.',
        action: 'open_quota',
      },
    }),
  }));
  await openLiveHub(page);

  await page.getByRole('button', { name: 'Làm mới đề thi thật' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Tất cả nguồn AI miễn phí');
  await expect(page.getByRole('button', { name: 'Kiểm tra API Gateway Pool' })).toBeVisible();
  await expect(alert).not.toContainText(/fetch failed|Bifrost|upstream/i);
});
});
