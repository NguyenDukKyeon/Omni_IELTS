import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('docs/ux/screenshots');
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  console.log('Checking server health on http://127.0.0.1:3000/api/health...');
  let serverProcess = null;
  const isHealthy = await waitForServer('http://127.0.0.1:3000/api/health', 1500);
  if (!isHealthy) {
    console.log('Starting dev server...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      shell: true,
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    const ready = await waitForServer('http://127.0.0.1:3000/api/health', 35000);
    if (!ready) {
      console.error('Server failed to start in time.');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
  }

  console.log('Server is ready. Launching browser...');
  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await desktopContext.newPage();
  page.setDefaultTimeout(3500);

  async function safeSnap(filename, desc, action) {
    try {
      if (action) await action();
      const targetPath = path.join(outDir, filename);
      await page.waitForTimeout(250);
      await page.screenshot({ path: targetPath, fullPage: false });
      console.log(`[Captured] ${filename} - ${desc}`);
    } catch (e) {
      console.warn(`[Notice] ${filename} (${desc}):`, e.message.split('\n')[0]);
    }
  }

  try {
    // -------------------------------------------------------------
    // DESKTOP: 1. DASHBOARD & GLOBAL MODALS
    // -------------------------------------------------------------
    console.log('\n--- Capturing Dashboard & Modals (1440x900) ---');
    await page.goto('http://127.0.0.1:3000/');
    await page.waitForSelector('#app-header');
    await safeSnap('SCR-001-home-dashboard.png', 'Home Dashboard View');

    // SCR-026: Speed Drill Arena Modal
    await safeSnap('SCR-026-speed-drill-arena-modal.png', 'Speed Drill Arena Modal', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('button:has-text("⚡ Paraphrase")').first().click();
    });

    // SCR-024: Onboarding Quick Placement Modal
    await safeSnap('SCR-024-onboarding-modal.png', 'Onboarding & Quick Placement Wizard', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#header-diagnostic-btn').click();
    });

    // SCR-023: Diagnostic Psychometrician 8-Axis Modal
    await safeSnap('SCR-023-diagnostic-psychometrician-modal.png', 'Diagnostic Psychometrician 8-Axis Modal', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('button:has-text("Chẩn Đoán 8 Trục")').first().click();
    });

    // SCR-021: Mistake Notebook Modal - Analytics
    await safeSnap('SCR-021-A-mistake-analytics.png', 'Mistake Notebook - Analytics Tab', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#header-mistakes-btn').click();
    });

    // Workout Tab
    await safeSnap('SCR-021-B-mistake-workout.png', 'Mistake Notebook - Workout Tab', async () => {
      await page.locator('#tab-mistake-workout').click();
    });

    // Vault Tab
    await safeSnap('SCR-021-C-mistake-vault.png', 'Mistake Notebook - Vault Tab', async () => {
      await page.locator('#tab-mistake-vault').click();
    });

    // Add Tab
    await safeSnap('SCR-021-D-mistake-add-form.png', 'Mistake Notebook - Add Manual Mistake', async () => {
      await page.locator('button:has-text("Thêm Lỗi")').first().click();
    });

    // Error Tagger Modal
    await safeSnap('SCR-022-error-tagger-modal.png', 'Intelligent Error Tagger Modal', async () => {
      await page.locator('button:has-text("AI Error Tagger")').first().click();
    });

    // SCR-027: Floating AI Tutor Drawer
    await safeSnap('SCR-027-floating-ai-tutor-drawer.png', 'Floating AI Tutor Drawer', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#floating-ai-tutor-trigger').click();
    });

    // -------------------------------------------------------------
    // DESKTOP: 2. SOURCES MODULE
    // -------------------------------------------------------------
    console.log('\n--- Capturing Sources Module ---');
    await safeSnap('SCR-002-source-ingestion-single.png', 'Source Ingestion - Single Ingestion', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-sources').click();
    });

    await safeSnap('SCR-002-B-source-ingestion-batch.png', 'Source Ingestion - Batch Mode', async () => {
      await page.locator('#mode-batch-btn').click();
    });

    await safeSnap('SCR-002-C-source-lesson-pack.png', 'Source Ingestion - 4-Skill Lesson Pack', async () => {
      await page.locator('#mode-single-btn').click();
      await page.locator('.lg\\:col-span-8 button').filter({ hasText: 'Gói Bài Học' }).first().click();
    });

    await safeSnap('SCR-002-D-source-extracted-vocab.png', 'Source Ingestion - Extracted Vocab', async () => {
      await page.locator('.lg\\:col-span-8 button').filter({ hasText: 'Từ Vựng' }).first().click();
    });

    await safeSnap('SCR-002-E-source-grammar-summary.png', 'Source Ingestion - Grammar & Summary', async () => {
      await page.locator('.lg\\:col-span-8 button').filter({ hasText: 'Ngữ Pháp' }).first().click();
    });

    await safeSnap('SCR-003-ai-course-designer-modal.png', 'AI Course Designer Modal', async () => {
      await page.locator('button:has-text("AI Course Designer")').first().click();
    });

    // -------------------------------------------------------------
    // DESKTOP: 3. VOCABULARY SRS MODULE
    // -------------------------------------------------------------
    console.log('\n--- Capturing Vocabulary SRS Module ---');
    await safeSnap('SCR-004-A-vocab-flashcard.png', 'Vocabulary SRS - Flashcard Mode', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-vocabulary').click();
    });

    await safeSnap('SCR-004-B-vocab-quiz.png', 'Vocabulary SRS - Multiple Choice Quiz', async () => {
      await page.locator('button:has-text("Trắc Nghiệm")').first().click();
    });

    await safeSnap('SCR-004-C-vocab-dictation.png', 'Vocabulary SRS - Dictation Mode', async () => {
      await page.locator('button:has-text("Chép Chính Tả")').first().click();
    });

    await safeSnap('SCR-004-D-vocab-context.png', 'Vocabulary SRS - Context Gap-Fill', async () => {
      await page.locator('button:has-text("Điền Từ")').first().click();
    });

    await safeSnap('SCR-004-E-vocab-pronunciation.png', 'Vocabulary SRS - Pronunciation Drill', async () => {
      await page.locator('button:has-text("Phát Âm")').first().click();
    });

    await safeSnap('SCR-004-F-vocab-lexicon-manager.png', 'Vocabulary SRS - Lexicon Manager', async () => {
      await page.locator('button:has-text("Kho Từ Vựng")').first().click();
    });

    await safeSnap('SCR-004-G-vocab-curated-decks.png', 'Vocabulary SRS - Curated Decks', async () => {
      await page.locator('button:has-text("Chủ Đề")').first().click();
    });

    await safeSnap('SCR-005-vocab-enricher-modal.png', 'Vocab Enricher Modal', async () => {
      await page.locator('button:has-text("AI Enricher")').first().click();
    });

    // -------------------------------------------------------------
    // DESKTOP: 4. GRAMMAR HUB MODULE
    // -------------------------------------------------------------
    console.log('\n--- Capturing Grammar Hub Module ---');
    await safeSnap('SCR-006-A-grammar-curriculum.png', 'Grammar Hub - Curriculum & Exercises', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-grammar').click();
    });

    await safeSnap('SCR-006-B-grammar-diagnostician.png', 'Grammar Hub - Diagnostician Tab', async () => {
      await page.locator('button:has-text("Chẩn Đoán")').first().click();
    });

    await safeSnap('SCR-007-grammar-curriculum-modal.png', 'Grammar Curriculum Designer Modal', async () => {
      await page.locator('button:has-text("Thiết Kế Lộ Trình")').first().click();
    });

    // -------------------------------------------------------------
    // DESKTOP: 5. MEDIA LAB MODULE
    // -------------------------------------------------------------
    console.log('\n--- Capturing Media Lab Module ---');
    await safeSnap('SCR-008-A-media-shadowing-studio.png', 'Media Lab - Shadowing Studio', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-media').click();
    });

    await safeSnap('SCR-008-B-media-dictation-studio.png', 'Media Lab - Dictation Studio', async () => {
      await page.locator('button:has-text("Dictation")').first().click();
    });

    await safeSnap('SCR-008-C-media-transcript-editor.png', 'Media Lab - Transcript Editor', async () => {
      await page.locator('button:has-text("Toàn Bộ Transcript")').first().click();
    });

    await safeSnap('SCR-008-D-media-vocab-tab.png', 'Media Lab - Vocab Tab', async () => {
      await page.locator('button:has-text("Từ Vựng")').first().click();
    });

    await safeSnap('SCR-009-youtube-import-modal.png', 'YouTube Import Modal', async () => {
      await page.locator('#import-youtube-btn').click();
    });

    await safeSnap('SCR-010-audio-transcribe-modal.png', 'Audio Transcribe Modal', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-media').click();
      await page.locator('#audio-transcribe-btn').click();
    });

    // -------------------------------------------------------------
    // DESKTOP: 6. IELTS PRACTICE MODULE
    // -------------------------------------------------------------
    console.log('\n--- Capturing IELTS Practice Module ---');
    await safeSnap('SCR-011-A-practice-forecast-live.png', 'Practice - Forecast Live Hub', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-practice').click();
    });

    await safeSnap('SCR-011-B-practice-reading-module.png', 'Practice - Reading Module', async () => {
      await page.locator('button:has-text("Reading")').first().click();
    });

    await safeSnap('SCR-011-C-practice-listening-module.png', 'Practice - Listening Module', async () => {
      await page.locator('button:has-text("Listening")').first().click();
    });

    await safeSnap('SCR-011-D-practice-writing-module.png', 'Practice - Writing Module', async () => {
      await page.locator('button:has-text("Writing")').first().click();
    });

    await safeSnap('SCR-025-sentence-stylist-modal.png', 'Sentence Academic Stylist Modal', async () => {
      await page.locator('button:has-text("Nâng Cấp Câu")').first().click();
    });

    await safeSnap('SCR-028-master-mentor-panel-modal.png', 'Master Mentor Panel Modal', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-practice').click();
      await page.locator('button:has-text("Writing")').first().click();
      await page.locator('button:has-text("Hội Đồng Cố Vấn")').first().click();
    });

    await safeSnap('SCR-011-E-practice-speaking-module.png', 'Practice - Speaking Module', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-practice').click();
      await page.locator('button:has-text("Speaking")').first().click();
    });

    await safeSnap('SCR-012-item-writer-modal.png', 'Cambridge Item Writer Modal', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-practice').click();
      await page.locator('button:has-text("Cambridge Item Writer")').first().click();
    });

    await safeSnap('SCR-013-full-grader-modal.png', 'Full 4-Criteria Grader Modal', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-practice').click();
      await page.locator('button:has-text("Giám Khảo Chấm 4 Tiêu Chí")').first().click();
    });

    // -------------------------------------------------------------
    // DESKTOP: 7. MOCK TEST MODULE
    // -------------------------------------------------------------
    console.log('\n--- Capturing Mock Test Module ---');
    await safeSnap('SCR-015-A-mock-test-catalog.png', 'Mock Test - Catalog', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-mock_test').click();
    });

    await safeSnap('SCR-015-C-mock-progress-chart.png', 'Mock Test - Progress Chart', async () => {
      await page.locator('button:has-text("Biểu Đồ")').first().click();
    });

    await safeSnap('SCR-015-D-mock-history.png', 'Mock Test - History', async () => {
      await page.locator('button:has-text("Lịch Sử")').first().click();
    });

    await safeSnap('SCR-017-mock-report-scorecard.png', 'Mock Test - Scorecard Report', async () => {
      await page.locator('button:has-text("Xem Bảng Điểm")').first().click();
    });

    await safeSnap('SCR-018-mock-orchestrator-modal.png', 'Mock Orchestrator Builder Modal', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-mock_test').click();
      await page.locator('button:has-text("Tạo Đề Thi Thử")').first().click();
    });

    // Exam Simulation Fullscreen Mode
    await safeSnap('SCR-016-A-exam-listening-mode.png', 'Exam Simulation - Listening Mode', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-mock_test').click();
      await page.locator('button:has-text("Bắt Đầu Làm Bài")').first().click();
    });

    await safeSnap('SCR-016-B-exam-reading-mode.png', 'Exam Simulation - Reading Mode', async () => {
      await page.locator('button:has-text("Chuyển Sang Reading")').first().click();
    });

    // -------------------------------------------------------------
    // DESKTOP: 8. KNOWLEDGE BASE MODULE
    // -------------------------------------------------------------
    console.log('\n--- Capturing Knowledge Base Module ---');
    await safeSnap('SCR-019-A-knowledge-strategies.png', 'Knowledge Base - Strategies', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#nav-item-knowledge').click();
    });

    await safeSnap('SCR-019-B-knowledge-model-answers.png', 'Knowledge Base - Model Answers', async () => {
      await page.locator('button:has-text("Bài Mẫu")').first().click();
    });

    await safeSnap('SCR-019-C-knowledge-pitfalls.png', 'Knowledge Base - Pitfalls', async () => {
      await page.locator('button:has-text("Bẫy & Lỗi")').first().click();
    });

    await safeSnap('SCR-019-D-knowledge-calculator.png', 'Knowledge Base - Band Calculator', async () => {
      await page.locator('button:has-text("Máy Tính Điểm")').first().click();
    });

    // -------------------------------------------------------------
    // DESKTOP: 9. LEARNER PROFILE MODULE
    // -------------------------------------------------------------
    console.log('\n--- Capturing Profile Module ---');
    await safeSnap('SCR-020-A-profile-settings.png', 'Learner Profile & Settings', async () => {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('#profile-nav-btn').click();
    });

    // -------------------------------------------------------------
    // MOBILE CAPTURES (390x844)
    // -------------------------------------------------------------
    console.log('\n--- Capturing Mobile Screens (390x844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.setDefaultTimeout(3500);

    async function safeSnapMobile(filename, desc, action) {
      try {
        if (action) await action();
        const targetPath = path.join(outDir, filename);
        await mobilePage.waitForTimeout(250);
        await mobilePage.screenshot({ path: targetPath, fullPage: false });
        console.log(`[Captured] ${filename} - ${desc}`);
      } catch (e) {
        console.warn(`[Notice Mobile] ${filename} (${desc}):`, e.message.split('\n')[0]);
      }
    }

    await mobilePage.goto('http://127.0.0.1:3000/');
    await mobilePage.waitForSelector('#app-header');
    await safeSnapMobile('SCR-001-home-dashboard-mobile.png', 'Mobile Home Dashboard');

    await safeSnapMobile('SCR-002-source-ingestion-mobile.png', 'Mobile Sources Ingestion', async () => {
      await mobilePage.locator('#mobile-nav-sources').click();
    });

    await safeSnapMobile('SCR-004-vocab-dashboard-mobile.png', 'Mobile Vocabulary SRS', async () => {
      await mobilePage.locator('#mobile-nav-vocabulary').click();
    });

    await safeSnapMobile('SCR-006-grammar-hub-mobile.png', 'Mobile Grammar Hub', async () => {
      await mobilePage.locator('#mobile-nav-grammar').click();
    });

    await safeSnapMobile('SCR-008-media-lab-mobile.png', 'Mobile Media Lab', async () => {
      await mobilePage.locator('#mobile-nav-media').click();
    });

    await safeSnapMobile('SCR-011-practice-hub-mobile.png', 'Mobile Practice Hub', async () => {
      await mobilePage.locator('#mobile-nav-practice').click();
    });

    await safeSnapMobile('SCR-015-mock-test-mobile.png', 'Mobile Mock Test', async () => {
      await mobilePage.locator('#mobile-nav-mock_test').click();
    });

    await safeSnapMobile('SCR-019-knowledge-hub-mobile.png', 'Mobile Knowledge Hub', async () => {
      await mobilePage.locator('#mobile-nav-knowledge').click();
    });

    await safeSnapMobile('SCR-020-profile-mobile.png', 'Mobile Profile Settings', async () => {
      await mobilePage.locator('#profile-nav-btn').click();
    });

    console.log('\nAll screenshots completed!');
  } catch (err) {
    console.error('Fatal error during capture:', err);
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main();
