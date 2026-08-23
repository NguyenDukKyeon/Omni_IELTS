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
  await page.evaluate(() => localStorage.removeItem('omni_forecast_snapshot_v1'));
});

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

  await expect(page.getByText('Groq Web Search fallback')).toBeVisible();
  await expect(page.getByText('Gemini hết quota ngày; dữ liệu này được tra cứu bằng Groq.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Education funding discussion' })).toBeVisible();
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
});
