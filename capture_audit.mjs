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
  await page.waitForTimeout(1000);

  // Dashboard
  await page.screenshot({ path: path.join(outDir, 'audit_1_dashboard.png'), fullPage: true });
  console.log('✓ Dashboard captured');

  // Appointments
  await page.goto('https://clinic-flow-lh3g.vercel.app/appointments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'audit_2_appointments.png'), fullPage: true });
  console.log('✓ Appointments captured');

  // Patients
  await page.goto('https://clinic-flow-lh3g.vercel.app/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'audit_3_patients.png'), fullPage: true });
  console.log('✓ Patients captured');

  // Doctor Agent & CRM Hub
  await page.goto('https://clinic-flow-lh3g.vercel.app/doctor-agent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'audit_4_crm.png'), fullPage: true });
  console.log('✓ CRM Hub captured');

  // Booking
  await page.goto('https://clinic-flow-lh3g.vercel.app/booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'audit_5_booking.png'), fullPage: true });
  console.log('✓ Booking captured');

  await browser.close();
  console.log('Audit screenshots complete!');
}

auditPages().catch(console.error);
