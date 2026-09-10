import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'C:\\Users\\mhmd\\.gemini\\antigravity\\brain\\71bc271d-356f-4e0e-ae7d-75a99076bc0b\\real_audit';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runFullAudit() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ channel: 'msedge', headless: true }));
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('--- 1. Login ---');
  await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '01_login.png') });

  await page.fill('#identifier', 'doctor@clinicflow.com');
  await page.fill('#password', 'admin');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1000);

  console.log('--- 2. Dashboard ---');
  await page.goto('http://localhost:4173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '02_dashboard.png') });

  // Test Walk-in modal on dashboard
  console.log('--- 2b. Test WalkIn Modal ---');
  try {
    const walkInBtn = await page.$('button:has-text("تسجيل مريض جديد"), button:has-text("تسجيل حضور مباشر")');
    if (walkInBtn) {
      await walkInBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '02b_walkin_modal.png') });
      const cancelBtn = await page.$('button:has-text("إلغاء"), .close-btn');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    console.error('WalkIn modal error:', e.message);
  }

  console.log('--- 3. Appointments ---');
  await page.goto('http://localhost:4173/appointments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03_appointments.png') });

  // Test Add Appointment Modal
  console.log('--- 3b. Test Add Appointment Modal ---');
  try {
    const addApptBtn = await page.$('button:has-text("موعد جديد")');
    if (addApptBtn) {
      await addApptBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '03b_add_appt_modal.png') });
      const cancelBtn = await page.$('button:has-text("إلغاء"), .close-btn');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    console.error('Add appt modal error:', e.message);
  }

  console.log('--- 4. Patients ---');
  await page.goto('http://localhost:4173/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '04_patients.png') });

  // Test Add Patient Modal
  console.log('--- 4b. Test Add Patient Modal ---');
  try {
    const addPatBtn = await page.$('button:has-text("مريض جديد")');
    if (addPatBtn) {
      await addPatBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '04b_add_patient_modal.png') });
      const cancelBtn = await page.$('button:has-text("إلغاء"), .close-btn');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    console.error('Add patient modal error:', e.message);
  }

  console.log('--- 5. Invoices ---');
  await page.goto('http://localhost:4173/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05_invoices.png') });

  console.log('--- 6. Inventory ---');
  await page.goto('http://localhost:4173/inventory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '06_inventory.png') });

  console.log('--- 7. Labs ---');
  await page.goto('http://localhost:4173/labs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '07_labs.png') });

  console.log('--- 8. Attendance ---');
  await page.goto('http://localhost:4173/attendance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '08_attendance.png') });

  console.log('--- 9. Doctor Assistant ---');
  await page.goto('http://localhost:4173/doctor-agent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '09_doctor_agent.png') });

  console.log('--- 10. Settings ---');
  await page.goto('http://localhost:4173/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '10_settings.png') });

  console.log('--- 11. Booking Portal ---');
  await page.goto('http://localhost:4173/c/dr-ahmed/booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '11_booking.png') });

  console.log('--- 12. Manage Booking ---');
  await page.goto('http://localhost:4173/manage-booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '12_manage_booking.png') });

  console.log('================================================');
  console.log('TOTAL CONSOLE/PAGE ERRORS:', errors.length);
  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
  } else {
    console.log('ZERO ERRORS ENCOUNTERED ACROSS ALL 12 VIEWS!');
  }
  console.log('================================================');

  await browser.close();
}

runFullAudit().catch(console.error);
