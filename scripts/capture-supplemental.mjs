import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('docs/ux/screenshots');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);

  async function snap(filename, desc) {
    const targetPath = path.join(outDir, filename);
    await page.waitForTimeout(300);
    await page.screenshot({ path: targetPath, fullPage: false });
    console.log(`[Captured] ${filename} - ${desc}`);
  }

  try {
    // 1. Vocab sub-modes & Enricher
    await page.goto('http://127.0.0.1:3000/');
    await page.locator('#nav-item-vocabulary').click();
    await page.waitForTimeout(300);

    // Dictation
    const dictBtn = page.locator('button').filter({ hasText: /Nghe Chép|Dictation/i }).first();
    if (await dictBtn.isVisible()) {
      await dictBtn.click();
      await snap('SCR-004-C-vocab-dictation.png', 'Vocabulary SRS - Dictation Mode');
    }

    // Lexicon Manager
    const lexBtn = page.locator('button').filter({ hasText: /Kho Từ Vựng|Bảng|Lexicon/i }).first();
    if (await lexBtn.isVisible()) {
      await lexBtn.click();
      await snap('SCR-004-F-vocab-lexicon-manager.png', 'Vocabulary SRS - Lexicon Manager');
    }

    // AI Enricher Modal
    const enricherBtn = page.locator('button').filter({ hasText: /Enricher|Làm Giàu/i }).first();
    if (await enricherBtn.isVisible()) {
      await enricherBtn.click();
      await snap('SCR-005-vocab-enricher-modal.png', 'Vocab Enricher Modal');
    }

    // 2. Grammar Curriculum Modal
    await page.goto('http://127.0.0.1:3000/');
    await page.locator('#nav-item-grammar').click();
    await page.waitForTimeout(300);
    const grmModalBtn = page.locator('button').filter({ hasText: /Lộ Trình|Curriculum/i }).first();
    if (await grmModalBtn.isVisible()) {
      await grmModalBtn.click();
      await snap('SCR-007-grammar-curriculum-modal.png', 'Grammar Curriculum Designer Modal');
    }

    // 3. Media YouTube Modal
    await page.goto('http://127.0.0.1:3000/');
    await page.locator('#nav-item-media').click();
    await page.waitForTimeout(300);
    const ytBtn = page.locator('button').filter({ hasText: /YouTube/i }).first();
    if (await ytBtn.isVisible()) {
      await ytBtn.click();
      await snap('SCR-009-youtube-import-modal.png', 'YouTube Import Modal');
    }

    // 4. Writing Mentor Panel Modal
    await page.goto('http://127.0.0.1:3000/');
    await page.locator('#nav-item-practice').click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: /Writing/i }).first().click();
    await page.waitForTimeout(300);
    const mentorBtn = page.locator('button').filter({ hasText: /Cố Vấn|Mentor/i }).first();
    if (await mentorBtn.isVisible()) {
      await mentorBtn.click();
      await snap('SCR-028-master-mentor-panel-modal.png', 'Master Mentor Panel Modal');
    }

    // 5. Mock Test Tabs & Fullscreen
    await page.goto('http://127.0.0.1:3000/');
    await page.locator('#nav-item-mock_test').click();
    await page.waitForTimeout(300);

    const progTab = page.locator('button').filter({ hasText: /Tiến Bộ|Progress/i }).first();
    if (await progTab.isVisible()) {
      await progTab.click();
      await snap('SCR-015-C-mock-progress-chart.png', 'Mock Test - Progress Chart');
    }

    const orchBtn = page.locator('button').filter({ hasText: /Tuỳ Chỉnh|Orchestrator|Tạo Đề/i }).first();
    if (await orchBtn.isVisible()) {
      await orchBtn.click();
      await snap('SCR-018-mock-orchestrator-modal.png', 'Mock Orchestrator Builder Modal');
    }

    // Exam Fullscreen Mode
    await page.goto('http://127.0.0.1:3000/');
    await page.locator('#nav-item-mock_test').click();
    await page.waitForTimeout(300);
    const startExamBtn = page.locator('button').filter({ hasText: /Bắt Đầu|Thi Thử|Làm Bài/i }).first();
    if (await startExamBtn.isVisible()) {
      await startExamBtn.click();
      await page.waitForTimeout(400);
      await snap('SCR-016-A-exam-listening-mode.png', 'Exam Simulation - Listening Mode');

      const nextSkillBtn = page.locator('button').filter({ hasText: /Reading|Tiếp Theo/i }).first();
      if (await nextSkillBtn.isVisible()) {
        await nextSkillBtn.click();
        await snap('SCR-016-B-exam-reading-mode.png', 'Exam Simulation - Reading Mode');
      }
    }

    console.log('Supplemental captures complete!');
  } catch (err) {
    console.error('Supplemental capture error:', err);
  } finally {
    await browser.close();
  }
}

main();
