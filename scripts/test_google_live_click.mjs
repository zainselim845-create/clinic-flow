import { chromium } from 'playwright';
import path from 'path';

const TARGET_URL = 'https://clinic-flow-lh3g.vercel.app/login';
const ARTIFACT_DIR = 'C:\\Users\\mhmd\\.gemini\\antigravity\\brain\\71bc271d-356f-4e0e-ae7d-75a99076bc0b';

async function run() {
  console.log(`Verifying Live Google OAuth Click on ${TARGET_URL}...`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
    return chromium.launch({ channel: 'msedge', headless: true });
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-EG'
  });
  const page = await context.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded.');
    await page.waitForTimeout(2000); // Allow Google Identity Services script to initialize

    const googleBtn = page.locator('button.btn-google-login');
    await googleBtn.waitFor({ state: 'visible', timeout: 10000 });

    // Listen for popup
    const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);

    console.log('Clicking Google Sign-In button...');
    await googleBtn.click();

    const popup = await popupPromise;
    if (popup) {
      console.log('Google Popup opened successfully!');
      console.log('Popup URL:', popup.url());
      await popup.waitForLoadState('domcontentloaded');
      await popup.screenshot({ path: path.join(ARTIFACT_DIR, 'google_live_popup.png') });
    } else {
      console.log('Popup not opened or intercepted, checking page state...');
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'google_live_click_result.png') });
    console.log('Verification run completed.');
  } catch (err) {
    console.error('Error during click test:', err);
  } finally {
    await browser.close();
  }
}

run();
