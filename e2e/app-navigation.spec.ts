import { expect, test } from './fixtures';
import { navigateToModule } from './helpers/navigation';

test('global navigation opens every public beta learning module without runtime errors', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/');

  const destinations = [
    ['sources', 'Nguồn Học Liệu (Tạo Bài Học 4 Kỹ Năng)'],
    ['vocabulary', 'Kho Từ Vựng & Thuật Toán SRS FSRS-6'],
    ['grammar', 'Ngữ Pháp Trọng Điểm IELTS (Grammar for Band 7.0 - 8.5+)'],
    ['media', 'Media Lab: Shadowing & Nghe Chép Chính Tả (Dictation)'],
    ['practice', 'Luyện Tập IELTS & Kho Đề Thi Thật Forecast'],
    ['mock_test', 'Phòng Thi Thử IELTS-style (Full Mock Exam)'],
    ['knowledge', 'Học Kiến Thức & Chiến Thuật Làm Bài IELTS'],
    ['profile', 'Nguyễn Minh Anh'],
  ] as const;

  for (const [module, heading] of destinations) {
    await navigateToModule(page, module);
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
  }
  expect(runtimeErrors).toEqual([]);
});
