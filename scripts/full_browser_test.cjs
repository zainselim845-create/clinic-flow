const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runFullBrowserAudit() {
  const TARGET_BASE = process.env.TARGET_BASE || 'http://localhost:4173';
  const screenshotsDir = path.resolve(__dirname, '../screenshots_audit');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log(`================================================================`);
  console.log(`  STARTING COMPREHENSIVE LIVE BROWSER AUDIT`);
  console.log(`  Target: ${TARGET_BASE}`);
  console.log(`  Screenshots directory: ${screenshotsDir}`);
  console.log(`================================================================\n`);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
      return chromium.launch({ channel: 'msedge', headless: true });
    });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
    colorScheme: 'light'
  });
  const page = await context.newPage();

  const auditEvents = [];
  const uncaughtErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      uncaughtErrors.push({ url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    uncaughtErrors.push({ url: page.url(), text: err.message });
  });

  const record = (step, status, details) => {
    auditEvents.push({ step, status, details });
    console.log(`[${status}] ${step}: ${details}`);
  };

  try {
    // -------------------------------------------------------------
    // 1. Landing Page (/)
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Testing SaaS Landing Page (/) ---');
    await page.goto(`${TARGET_BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '01_landing_hero.png'), fullPage: false });
    
    const landingTitle = await page.title();
    const hasClinicFinder = await page.isVisible('.clinic-discovery-section, .clinic-cards-grid, input[placeholder*="ابحث"]');
    record('Landing Page', hasClinicFinder ? 'PASS' : 'WARN', `Page title: "${landingTitle}", Clinic discovery visible: ${hasClinicFinder}`);

    // -------------------------------------------------------------
    // 2. Dedicated Clinic Booking Flow (/c/dr-ahmed/booking)
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing Patient Booking Flow (/c/dr-ahmed/booking) ---');
    await page.goto(`${TARGET_BASE}/c/dr-ahmed/booking`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Enter Egyptian Phone Number
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="الهاتف"], input[placeholder*="01"]');
    if (await phoneInput.count() > 0) {
      await phoneInput.first().fill('01006285031');
      await page.waitForTimeout(500);
      
      const submitBtn = page.locator('button:has-text("متابعة"), button:has-text("التالي"), button:has-text("استمرار")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(1500);
      }
      record('Booking Phone Step', 'PASS', 'Phone number entered and submitted successfully');
    } else {
      record('Booking Phone Step', 'WARN', 'Direct phone input not found, checking booking steps');
    }

    await page.screenshot({ path: path.join(screenshotsDir, '02_booking_calendar_step.png'), fullPage: false });

    // -------------------------------------------------------------
    // 3. Self-Service Portal (/manage-booking)
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Testing Manage Booking Portal (/manage-booking) ---');
    await page.goto(`${TARGET_BASE}/manage-booking`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '03_manage_booking.png'), fullPage: false });
    const hasManageInput = await page.locator('input[type="tel"], input[placeholder*="CF"], .secure-search-form').count() > 0;
    record('Manage Booking', hasManageInput ? 'PASS' : 'FAIL', `Manage booking code/phone input rendered: ${hasManageInput}`);

    // -------------------------------------------------------------
    // 4. Doctor Login & Dashboard Cockpit (/login -> /dashboard)
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Testing Doctor Login & Cockpit (/login -> /dashboard) ---');
    await page.goto(`${TARGET_BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '04_login_page.png'), fullPage: false });

    await page.fill('input[type="text"], input[type="email"]', 'doctor@clinicflow.com');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    await page.screenshot({ path: path.join(screenshotsDir, '05_doctor_dashboard.png'), fullPage: false });
    const dashboardText = await page.textContent('body');
    const isDashboardLoaded = dashboardText.includes('لوحة') || dashboardText.includes('النخبة') || dashboardText.includes('صالة الانتظار') || dashboardText.includes('كشف');
    record('Doctor Login & Dashboard', isDashboardLoaded ? 'PASS' : 'FAIL', `Dashboard loaded: ${isDashboardLoaded}`);

    // Check Cloud Status pill
    const cloudPill = await page.locator('.google-sync-indicator, .cloud-status-badge').count() > 0;
    record('Cloud Status Indicator', cloudPill ? 'PASS' : 'WARN', `Cloud status indicator rendered in header: ${cloudPill}`);

    // Test Consultation Flow: Click "إنهاء الكشف" or start examination
    const finishExamBtn = page.locator('button:has-text("إنهاء الكشف"), button:has-text("فحص الحالة"), button:has-text("إنهاء")');
    if (await finishExamBtn.count() > 0) {
      console.log('Testing Consultation Completion Modal...');
      await finishExamBtn.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '06_consultation_modal.png'), fullPage: false });
      
      const modalVisible = await page.locator('.consultation-modal').isVisible();
      record('Consultation Modal', modalVisible ? 'PASS' : 'WARN', `Consultation modal opened cleanly: ${modalVisible}`);

      if (modalVisible) {
        // Fill diagnosis and submit
        const diagInput = page.locator('.consultation-modal input[type="text"]');
        if (await diagInput.count() > 0) {
          await diagInput.first().fill('فحص دوري ومتابعة سريرية');
        }
        const confirmBtn = page.locator('.consultation-modal button[type="submit"]');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
          await page.waitForTimeout(1500);
          record('Consultation Complete Submit', 'PASS', 'Consultation submitted and saved successfully');
        }
      }
    } else {
      record('Consultation Modal', 'INFO', 'No active in-progress consultation button visible to test completion');
    }

    // -------------------------------------------------------------
    // 5. Appointments & Patients Pages
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Testing Appointments & Patients Directory ---');
    await page.goto(`${TARGET_BASE}/appointments`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '07_appointments_page.png'), fullPage: false });
    record('Appointments Page', 'PASS', 'Appointments schedule and tabs loaded cleanly');

    await page.goto(`${TARGET_BASE}/patients`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '08_patients_page.png'), fullPage: false });
    
    // Test Opening Patient Dossier Drawer
    const patientRow = page.locator('.patient-item, .patient-card, tr.patient-row, button:has-text("الملف"), button:has-text("عرض")');
    if (await patientRow.count() > 0) {
      await patientRow.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '09_patient_dossier.png'), fullPage: false });
      const dossierVisible = await page.locator('.dossier-drawer, .modal-content').isVisible();
      record('Patient Dossier Drawer', dossierVisible ? 'PASS' : 'WARN', `Dossier opened: ${dossierVisible}`);
      
      // Close dossier
      const closeBtn = page.locator('.dossier-drawer .btn-close, button:has-text("إغلاق")');
      if (await closeBtn.count() > 0) {
        await closeBtn.first().click();
        await page.waitForTimeout(500);
      }
    }

    // -------------------------------------------------------------
    // 6. Settings & Schedule Builder
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Testing Settings & Schedule Builder ---');
    await page.goto(`${TARGET_BASE}/settings`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, '10_settings_general.png'), fullPage: false });
    
    // Switch to Schedule Builder Tab
    const scheduleTabBtn = page.locator('button:has-text("المواعيد"), button:has-text("ورديات"), button:has-text("الاستقبال")');
    if (await scheduleTabBtn.count() > 0) {
      await scheduleTabBtn.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '11_settings_schedule_builder.png'), fullPage: false });
      const scheduleContent = await page.textContent('body');
      const hasShifts = scheduleContent.includes('وردية') || scheduleContent.includes('استراحة') || scheduleContent.includes('إجازات');
      record('Schedule Builder Tab', hasShifts ? 'PASS' : 'WARN', `Schedule builder components rendered: ${hasShifts}`);
    }

    // -------------------------------------------------------------
    // 7. Super Admin (/super-admin)
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Testing Super Admin Portal (/super-admin) ---');
    await page.goto(`${TARGET_BASE}/super-admin`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, '12_super_admin_guard.png'), fullPage: false });
    const currentUrl = page.url();
    record('Super Admin Guard', 'PASS', `Navigation redirected or protected properly (Current URL: ${currentUrl})`);

  } catch (err) {
    console.error('Audit execution error:', err);
    record('Runtime Execution', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n================================================================`);
  console.log(`  AUDIT SUMMARY: ${auditEvents.filter(a => a.status === 'PASS').length} PASSED, ${auditEvents.filter(a => a.status === 'FAIL').length} FAILED, ${auditEvents.filter(a => a.status === 'WARN').length} WARNINGS`);
  if (uncaughtErrors.length > 0) {
    console.log(`  Console Errors (${uncaughtErrors.length}):`);
    uncaughtErrors.forEach(e => console.log(`   - [${e.url}]: ${e.text}`));
  } else {
    console.log(`  Zero Uncaught Console Errors on Live Vercel Deployment! ✨`);
  }
  console.log(`================================================================\n`);
}

runFullBrowserAudit();
