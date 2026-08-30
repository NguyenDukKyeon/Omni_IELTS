import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function run() {
  const root = process.cwd();
  const mockPath = path.join(root, '.impeccable/mocks/approved/focus-dock-app-shell.png');
  const desktop1440Path = path.join(root, '.impeccable/review/focus-dock-desktop-1440.png');
  const desktop1920Path = path.join(root, '.impeccable/review/focus-dock-desktop-1920.png');
  const mobilePath = path.join(root, '.impeccable/review/focus-dock-mobile.png');
  const outputPath = path.join(root, '.impeccable/review/focus-dock-comparison.png');

  const mockData = 'data:image/png;base64,' + fs.readFileSync(mockPath).toString('base64');
  const d1440Data = 'data:image/png;base64,' + fs.readFileSync(desktop1440Path).toString('base64');
  const d1920Data = 'data:image/png;base64,' + fs.readFileSync(desktop1920Path).toString('base64');
  const mobileData = 'data:image/png;base64,' + fs.readFileSync(mobilePath).toString('base64');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #f5f7fa;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #111827;
    padding: 32px;
    width: 3280px;
  }
  .header { margin-bottom: 24px; }
  .header h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: #111827; }
  .header p { font-size: 14px; color: #526071; margin-top: 4px; }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    align-items: start;
  }
  .card {
    background: #ffffff;
    border: 1px solid #dce3ea;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  }
  .card-title {
    font-size: 13px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #111827;
    margin-bottom: 2px;
  }
  .card-sub {
    font-size: 12px;
    color: #526071;
    margin-bottom: 14px;
  }
  .desktop-stage {
    height: 900px;
    overflow: hidden;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    background: #f5f7fa;
    border-radius: 8px;
  }
  .desktop-stage img {
    display: block;
    height: 900px;
    width: auto;
    max-width: none;
    border-radius: 8px;
    border: 1px solid #dce3ea;
  }
  .mobile-stage {
    display: flex;
    justify-content: center;
    background: #f5f7fa;
    border-radius: 8px;
    padding: 12px;
  }
  .mobile-card img {
    width: 412px;
    height: auto;
    margin: 0 auto;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>OMNI Focus Dock · Visual reference comparison (Pass 4)</h1>
    <p>Approved reference against deterministic build captures. Regional surfaces, dashboard composition, and mobile density are reviewed at the same interaction state.</p>
  </div>
  <div class="grid">
    <div style="display: flex; flex-direction: column; gap: 28px;">
      <div class="card">
        <div class="card-title">APPROVED REFERENCE</div>
        <div class="card-sub">Focus Dock App Shell · Product Owner spatial authority</div>
        <div class="desktop-stage"><img src="${mockData}" alt="Approved Reference" /></div>
      </div>
      <div class="card">
        <div class="card-title">BUILD · DESKTOP 1920 × 1080</div>
        <div class="card-sub">Centered bounded frame · document top</div>
        <div class="desktop-stage"><img src="${d1920Data}" alt="Desktop 1920 Build" /></div>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 28px;">
      <div class="card">
        <div class="card-title">BUILD · DESKTOP 1440 × 900</div>
        <div class="card-sub">Reduced motion · document top</div>
        <div class="desktop-stage"><img src="${d1440Data}" alt="Desktop 1440 Build" /></div>
      </div>
      <div class="card mobile-card">
        <div class="card-title">BUILD · PIXEL 7 MOBILE</div>
        <div class="card-sub">Reduced motion · 5 destinations · document top</div>
        <div class="mobile-stage"><img src="${mobileData}" alt="Pixel 7 Mobile Build" /></div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2400, height: 2000 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
  console.log('Successfully generated comparison at:', outputPath);
}

run().catch(console.error);
