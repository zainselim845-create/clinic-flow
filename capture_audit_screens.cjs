const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capture() {
  const outDir = path.resolve(__dirname, 'ux-audit-2026-08-30-clinicflow', 'assets');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
    return chromium.launch({ channel: 'msedge', headless: true });
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  console.log('Capturing Screen 6: Doctor Login');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '06-doctor-login.png') });

  console.log('Capturing Screen 7: Dashboard Executive Cockpit');
  await page.fill('#identifier', 'doctor@clinicflow.com');
  await page.fill('#password', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '07-dashboard-cockpit.png') });

  console.log('Capturing Screen 8: Patients Records & Dossier');
  await page.goto('http://localhost:5173/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '08-patients-directory.png') });

  await browser.close();
  console.log('ALL SCREENS CAPTURED SUCCESSFULLY!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
