import { chromium } from 'playwright';
import path from 'path';

const TARGET_URL = process.env.TEST_URL || 'https://clinic-flow-lh3g.vercel.app/login';
const ARTIFACT_DIR = 'C:\\Users\\mhmd\\.gemini\\antigravity\\brain\\71bc271d-356f-4e0e-ae7d-75a99076bc0b';

async function run() {
  console.log(`Starting Google Auth Verification on ${TARGET_URL}...`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
    return chromium.launch({ channel: 'msedge', headless: true });
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-EG'
  });
  const page = await context.newPage();

  try {
    // 1. Navigate to login page
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Navigated to login page.');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'google_verify_login_screen.png') });

    // 2. Click Google Login button
    const googleBtn = page.locator('button.btn-google-login');
    await googleBtn.waitFor({ state: 'visible', timeout: 10000 });
    await googleBtn.click();
    console.log('Clicked Google Sign-In button.');

    // 3. Modal should appear
    const modal = page.locator('.google-picker-card.google-oauth-modal');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Google Auth Modal opened.');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'google_verify_modal_tab1.png') });

    // 4. Switch to Direct Email Tab (Tab 2)
    const directEmailTab = page.locator('.google-tab-btn', { hasText: 'دخول فوري بحسابك' });
    await directEmailTab.click();
    console.log('Switched to Direct Email Tab.');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'google_verify_modal_tab2.png') });

    // 5. Fill Real Google Account form
    await page.fill('#real-google-email', 'dr.mohamed.attar@gmail.com');
    await page.fill('#real-google-name', 'د. محمد زكي العطار');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'google_verify_modal_filled.png') });

    // 6. Submit direct login
    const submitBtn = page.locator('button.btn-save-google');
    await submitBtn.click();
    console.log('Submitted real Google account login.');

    // 7. Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('Redirected to dashboard successfully!');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'google_verify_dashboard_logged_in.png') });

    console.log('Verification PASSED with 100% success!');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
