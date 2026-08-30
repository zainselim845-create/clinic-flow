import { chromium } from 'playwright';
import path from 'path';

const outDir = 'C:\\Users\\mhmd\\.gemini\\antigravity\\brain\\62893a20-cb7d-4951-bc6a-dfc3f35c715a';

async function auditPages() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG'
  });

  console.log('1. Logging in...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/login', { waitUntil: 'networkidle' });
  await page.fill('#identifier', 'doctor@clinicflow.com');
  await page.fill('#password', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('https://clinic-flow-lh3g.vercel.app/');
  await page.waitForSelector('.dashboard-top-hero', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Dashboard
  await page.screenshot({ path: path.join(outDir, 'audit_1_dashboard.png') });
  console.log('✓ Dashboard captured');

  // Appointments
  await page.goto('https://clinic-flow-lh3g.vercel.app/appointments', { waitUntil: 'networkidle' });
  await page.waitForSelector('.appointments-page', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'audit_2_appointments.png') });
  console.log('✓ Appointments captured');

  // Patients
  await page.goto('https://clinic-flow-lh3g.vercel.app/patients', { waitUntil: 'networkidle' });
  await page.waitForSelector('.patients-page', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'audit_3_patients.png') });
  console.log('✓ Patients captured');

  // Doctor Agent & CRM Hub
  await page.goto('https://clinic-flow-lh3g.vercel.app/doctor-agent', { waitUntil: 'networkidle' });
  await page.waitForSelector('.crm-marketing-hub, .doctor-assistant-page', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'audit_4_crm.png') });
  console.log('✓ CRM Hub captured');

  // Booking
  await page.goto('https://clinic-flow-lh3g.vercel.app/booking', { waitUntil: 'networkidle' });
  await page.waitForSelector('.nebras-booking-page', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'audit_5_booking.png') });
  console.log('✓ Booking captured');

  await browser.close();
  console.log('ALL AUDIT SCREENSHOTS READY!');
}

auditPages().catch(console.error);
