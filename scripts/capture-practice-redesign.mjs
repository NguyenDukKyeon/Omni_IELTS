import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.impeccable/review');
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}
const artifactDir = 'C:/Users/nguye/.gemini/antigravity/brain/30691e51-9638-49b0-b528-bf7463b2130c';

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
  console.log('Checking server on http://127.0.0.1:3000/api/health...');
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
      console.error('Server failed to start.');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
  }

  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1.5,
  });
  const page = await desktopContext.newPage();

  console.log('Navigating to Practice View...');
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForSelector('#app-header');

  await page.click('[data-ux-control="shell.nav.practice"]');
  // Capture Practice Hub Overview
  const hubPath = path.join(outDir, 'izone-practice-hub-desktop.png');
  await page.screenshot({ path: hubPath, fullPage: false });
  console.log('Captured:', hubPath);

  // Click on Reading Skill Card & scroll to passage workspace
  await page.click('button:has-text("Reading")');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const el = document.getElementById('ielts_reading_module');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(400);
  const readingPath = path.join(outDir, 'izone-reading-splitview-desktop.png');
  await page.screenshot({ path: readingPath, fullPage: false });
  console.log('Captured:', readingPath);

  // Click on Listening Skill Card
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
  });
  await page.click('button:has-text("Listening")');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const el = document.getElementById('ielts_listening_module');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(400);
  const listeningPath = path.join(outDir, 'izone-listening-audio-desktop.png');
  await page.screenshot({ path: listeningPath, fullPage: false });
  console.log('Captured:', listeningPath);

  // Click on Writing Skill Card
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
  });
  await page.click('button:has-text("Writing")');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const el = document.getElementById('ielts_writing_module') || document.querySelector('.omni-shell-main > div');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(400);
  const writingPath = path.join(outDir, 'izone-writing-rubrics-desktop.png');
  await page.screenshot({ path: writingPath, fullPage: false });
  console.log('Captured:', writingPath);

  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://127.0.0.1:3000/');
  await mobilePage.waitForTimeout(600);

  await mobilePage.click('[data-ux-control="shell.mobile.practice"]');
  await mobilePage.waitForTimeout(400);
  await mobilePage.click('[data-ux-control="shell.mobile.practice-practice"]');
  await mobilePage.waitForTimeout(600);

  const mobilePath = path.join(outDir, 'izone-practice-hub-mobile.png');
  await mobilePage.screenshot({ path: mobilePath, fullPage: false });
  console.log('Captured:', mobilePath);

  await mobileContext.close();
  await browser.close();

  try {
    copyFileSync(hubPath, path.join(artifactDir, 'izone-practice-hub-desktop.png'));
    copyFileSync(readingPath, path.join(artifactDir, 'izone-reading-splitview-desktop.png'));
    copyFileSync(listeningPath, path.join(artifactDir, 'izone-listening-audio-desktop.png'));
    copyFileSync(writingPath, path.join(artifactDir, 'izone-writing-rubrics-desktop.png'));
    copyFileSync(mobilePath, path.join(artifactDir, 'izone-practice-hub-mobile.png'));
    console.log('Successfully copied screenshots to artifact directory!');
  } catch (err) {
    console.warn('Could not copy to artifactDir:', err.message);
  }

  if (serverProcess) {
    serverProcess.kill();
  }
}

main().catch(console.error);
