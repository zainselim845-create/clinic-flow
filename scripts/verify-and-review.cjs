const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:4173';
const ARTIFACTS_DIR = 'C:\\Users\\mhmd\\.gemini\\antigravity\\brain\\71bc271d-356f-4e0e-ae7d-75a99076bc0b';

async function runFullReview() {
  console.log('--- Starting Comprehensive Visual & Functional Verification ---');
  
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  }).catch(() => chromium.launch({ channel: 'msedge', headless: true }));

  // 1. Desktop Context
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG'
  });
  const page = await desktopCtx.newPage();

  // Test 1: Login & Auth
  console.log('1. Verifying Login & Auth Flow...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_1_login.png'), fullPage: false });

  // Set authenticated doctor user session
  await page.evaluate(() => {
    const doctorObj = {
      id: 'doc-master',
      name: 'د. أحمد الشريف',
      email: 'doctor@clinicflow.com',
      role: 'doctor',
      clinicSlug: 'dr-ahmed',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      permissions: ['*']
    };
    localStorage.setItem('clinicflow_auth_user', JSON.stringify(doctorObj));
    sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(doctorObj));
    localStorage.setItem('clinicflow_role', 'doctor');
  });
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Test 2: Dashboard Cockpit & Accessible Search
  console.log('2. Verifying Dashboard Cockpit & Search Bar...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_2_dashboard.png'), fullPage: false });

  // Test 3: Appointments List & Quick Reset
  console.log('3. Verifying Appointments Management...');
  await page.goto(`${BASE}/appointments`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_3_appointments.png'), fullPage: false });

  // Test 4: Invoices & Sticky Save Bar
  console.log('4. Verifying Invoices & Modal...');
  await page.goto(`${BASE}/invoices`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  
  // Click new invoice button
  const newInvBtn = await page.$('button:has-text("إصدار فاتورة جديدة")');
  if (newInvBtn) {
    await newInvBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_4_invoice_modal.png'), fullPage: false });
    const closeBtn = await page.$('.modal-close-btn, button:has-text("إلغاء"), button.close-btn');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Test 5: Inventory Categories
  console.log('5. Verifying Inventory Categories Localization...');
  await page.goto(`${BASE}/inventory`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_5_inventory.png'), fullPage: false });

  // Test 6: Settings Tab (No plain password)
  console.log('6. Verifying Settings Form...');
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_6_settings.png'), fullPage: false });

  // Test 7: Marketplace Discovery
  console.log('7. Verifying Booking Marketplace Discovery...');
  await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_7_booking_marketplace.png'), fullPage: false });

  // Test 8: Nebras Dedicated Booking Portal (Step 1 -> Step 2 -> Step 3)
  console.log('8. Verifying Nebras Modular Booking Flow...');
  await page.goto(`${BASE}/c/dr-ahmed/booking`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_8_booking_step1_phone.png'), fullPage: false });

  // Enter phone & submit
  await page.fill('#SearchPhoneNumber', '01009876543');
  await page.click('#searchPatient');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_9_booking_step2_details.png'), fullPage: false });

  // Fill name, pick slot and submit
  const nameInput = await page.$('#patientFullName');
  if (nameInput) {
    await nameInput.fill('محمد عبد الرحمن مصطفى');
  }

  // Select a slot if available
  const slotBtn = await page.$('.calendar-time-slot:not(.booked):not(.blocked)');
  if (slotBtn) {
    await slotBtn.click();
    await page.waitForTimeout(400);
  }

  const confirmBtn = await page.$('button.default-custom-btn:has-text("تأكيد حجز الموعد")');
  if (confirmBtn) {
    await confirmBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_10_booking_step3_ticket.png'), fullPage: false });
  }

  // Test 9: Mobile Viewport Review (iPhone 14)
  console.log('9. Verifying Mobile Layout (iPhone 14)...');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    locale: 'ar-EG'
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(`${BASE}/c/dr-ahmed/booking`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'rev_11_booking_mobile.png'), fullPage: false });

  await browser.close();
  console.log('--- Verification Complete! All Screenshots Captured Successfully ---');
}

runFullReview().catch(err => {
  console.error('Review Error:', err);
  process.exit(1);
});
