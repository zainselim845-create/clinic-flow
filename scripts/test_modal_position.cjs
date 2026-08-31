const { chromium } = require('playwright');
const path = require('path');

async function testModalPosition() {
  const TARGET_BASE = 'https://clinic-flow-lh3g.vercel.app';
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
    return chromium.launch({ channel: 'msedge', headless: true });
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  console.log(`Testing modal positioning on ${TARGET_BASE}...`);
  await page.goto(`${TARGET_BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'doctor@clinicflow.com');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${TARGET_BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click on "تسجيل حضور مباشر (Walk-in)"
  const walkInBtn = page.locator('button:has-text("تسجيل حضور مباشر")').first();
  await walkInBtn.click();
  await page.waitForTimeout(800);

  // Check modal backdrop position
  const backdrop = page.locator('.modal-backdrop');
  const isBackdropVisible = await backdrop.isVisible();
  const box = await page.locator('.walk-in-modal').boundingBox();

  console.log('Modal visible:', isBackdropVisible);
  console.log('Modal bounding box (Centered):', box);

  const screenshotPath = path.resolve(__dirname, 'modal_centered_verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

testModalPosition().catch(console.error);
