import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const outDir = path.join(process.cwd(), 'ui-density-audit');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function captureScreens() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
    return chromium.launch({ channel: 'msedge', headless: true });
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Login
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '01-login.png'), fullPage: false });

  // Login as doctor
  await page.fill('#identifier', 'doctor@clinicflow.com');
  await page.fill('#password', 'admin');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1000);

  // 2. Dashboard Cockpit
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '02-dashboard.png'), fullPage: false });

  // 3. Appointments - Card View
  await page.goto(BASE_URL + '/appointments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '03-appointments-cards.png'), fullPage: false });

  // 4. Appointments - Multi-Chair Grid View
  const chairBtn = await page.$('button:has-text("الكراسي المتزامنة")');
  if (chairBtn) {
    await chairBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '04-appointments-chairs.png'), fullPage: false });
  }

  // 5. Patients Directory
  await page.goto(BASE_URL + '/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '05-patients.png'), fullPage: false });

  // 6. Invoices
  await page.goto(BASE_URL + '/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '06-invoices.png'), fullPage: false });

  // 7. Inventory
  await page.goto(BASE_URL + '/inventory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '07-inventory.png'), fullPage: false });

  // 8. Doctor AI Agent
  await page.goto(BASE_URL + '/doctor-agent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '08-doctor-agent.png'), fullPage: false });

  // 9. Public Booking
  await page.goto(BASE_URL + '/booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '09-booking.png'), fullPage: false });

  await browser.close();
  console.log('✅ Captured 9 UI density screenshots in ./ui-density-audit/');
}

captureScreens().catch(console.error);
