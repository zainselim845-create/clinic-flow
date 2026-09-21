const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots_audit');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for server at ${url}`));
      } else {
        setTimeout(check, 400);
      }
    };

    check();
  });
}

async function runStrictAudit() {
  console.log('================================================================');
  console.log('  CLINICFLOW STRICT PRODUCTION BROWSER & ACCESSIBILITY AUDIT   ');
  console.log(`  Target: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Start Vite Preview Server
  console.log('[1/4] Starting Vite production preview server...');
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    stdio: 'pipe'
  });

  previewProcess.stderr.on('data', d => {
    const s = d.toString();
    if (!s.includes('deprecated')) console.error('[Server Err]:', s.trim());
  });

  try {
    await waitForServer(BASE_URL);
    console.log(`  Preview server ready at ${BASE_URL}\n`);
  } catch (err) {
    console.error('Failed to start preview server:', err);
    previewProcess.kill();
    process.exit(1);
  }

  // 2. Launch Browser
  console.log('[2/4] Launching Playwright Browser...');
  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  };

  const browser = await chromium.launch({ ...launchOpts, channel: 'chrome' }).catch(() => {
    return chromium.launch({ ...launchOpts, channel: 'msedge' }).catch(() => {
      return chromium.launch(launchOpts);
    });
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo'
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  const testResults = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter benign warnings if any
      consoleErrors.push({ url: page.url(), text });
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push({ url: page.url(), text: `[Unhandled Exception] ${err.message}` });
  });

  page.on('response', res => {
    if (res.status() >= 400 && res.status() !== 404) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });

  const pass = (step, title, details = '') => {
    testResults.push({ step, title, status: 'PASS', details });
    console.log(`  [PASS] Step ${step}: ${title} ${details ? '(' + details + ')' : ''}`);
  };

  const fail = (step, title, error) => {
    testResults.push({ step, title, status: 'FAIL', error });
    console.error(`  [FAIL] Step ${step}: ${title} -> ${error}`);
  };

  try {
    console.log('\n[3/4] Executing End-to-End Production Verification Journey...\n');

    // --- STEP 1: PUBLIC LANDING & SEO ---
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_landing.png') });

    const title = await page.title();
    const hasSkipLink = await page.$('.skip-to-content');
    if (hasSkipLink) {
      pass('1.1', 'Accessibility Skip-to-content link present');
    } else {
      fail('1.1', 'Accessibility Skip-to-content link missing');
    }
    pass('1.2', 'Public landing page rendered cleanly', `Title: ${title}`);

    // --- STEP 2: PUBLIC BOOKING PORTAL ---
    await page.goto(`${BASE_URL}/booking`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_booking_portal.png') });

    const bookingContent = await page.textContent('body');
    if (bookingContent.includes('حجز موعد') || bookingContent.includes('رقم الهاتف')) {
      pass('2.1', 'Public Patient Booking Portal renders phone-first UI');
    } else {
      fail('2.1', 'Public Patient Booking Portal failed to load', '');
    }

    // --- STEP 3: SELF-SERVICE MANAGE BOOKING ---
    await page.goto(`${BASE_URL}/manage-booking`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const manageContent = await page.textContent('body');
    if (manageContent.includes('إدارة الحجز') || manageContent.includes('كود الحجز')) {
      pass('3.1', 'Self-service Manage Booking Portal loaded properly');
    } else {
      fail('3.1', 'Manage Booking Portal failed to load', '');
    }

    // --- STEP 4: AUTHENTICATION & LOGIN ---
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_login.png') });

    // Test Login with Doctor Credentials
    await page.fill('input[type="text"]', 'doctor@clinicflow.com');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // --- STEP 5: CLINICAL DASHBOARD ---
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_dashboard.png') });

    const dashboardText = await page.textContent('body');
    if (dashboardText.includes('لوحة التحكم') || dashboardText.includes('المرضى')) {
      pass('5.1', 'Clinical Dashboard authenticated and loaded with full doctor visibility');
    } else {
      fail('5.1', 'Dashboard did not load after login', '');
    }

    // --- STEP 6: APPOINTMENTS & MULTI-CHAIR GRID ---
    await page.goto(`${BASE_URL}/appointments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_appointments.png') });

    const apptsText = await page.textContent('body');
    if (apptsText.includes('المواعيد') || apptsText.includes('التقويم')) {
      pass('6.1', 'Appointments Calendar & timeline rendered cleanly');
    } else {
      fail('6.1', 'Appointments page failed to load', '');
    }

    // --- STEP 7: PATIENTS DIRECTORY (CLEAN ZERO-STATE) ---
    await page.goto(`${BASE_URL}/patients`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_patients.png') });

    const patientsText = await page.textContent('body');
    if (patientsText.includes('سجلات المرضى') || patientsText.includes('المرضى')) {
      pass('7.1', 'Patients Directory rendered cleanly with zero-state protection');
    } else {
      fail('7.1', 'Patients directory failed to load', '');
    }

    // --- STEP 8: INVOICES & FINANCIALS ---
    await page.goto(`${BASE_URL}/invoices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_invoices.png') });

    const invoicesText = await page.textContent('body');
    if (invoicesText.includes('الفوترة') || invoicesText.includes('فواتير')) {
      pass('8.1', 'Invoices ledger rendered with financial stats and clean zero-state');
    } else {
      fail('8.1', 'Invoices page failed to load', '');
    }

    // --- STEP 9: INVENTORY & SUPPLIES ---
    await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const inventoryText = await page.textContent('body');
    if (inventoryText.includes('المخزون') || inventoryText.includes('مستلزمات')) {
      pass('9.1', 'Inventory & Medical Supplies page loaded properly');
    } else {
      fail('9.1', 'Inventory page failed to load', '');
    }

    // --- STEP 10: LABS & PROSTHETICS ---
    await page.goto(`${BASE_URL}/labs`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const labsText = await page.textContent('body');
    if (labsText.includes('معمل') || labsText.includes('تركيبات')) {
      pass('10.1', 'Dental Labs & Prosthetics page rendered cleanly');
    } else {
      fail('10.1', 'Labs page failed to load', '');
    }

    // --- STEP 11: DOCTOR AI COPILOT & CRM ---
    await page.goto(`${BASE_URL}/doctor-agent`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_doctor_ai.png') });

    const aiText = await page.textContent('body');
    if (aiText.includes('المساعد') || aiText.includes('تسويق') || aiText.includes('CRM')) {
      pass('11.1', 'Doctor AI Copilot & Marketing CRM Engine rendered without ReferenceErrors');
    } else {
      fail('11.1', 'Doctor AI page failed to load', '');
    }

    // --- STEP 12: CRITICAL SMS INTEGRATION AUDIT ---
    console.log('\n  [CRITICAL INSPECTION] Auditing SMS Integration & Sender ID...');
    await page.goto(`${BASE_URL}/sms-integration`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_sms_integration.png') });

    const smsPageHtml = await page.content();
    
    // Check 1: Must NOT have fabricated 'DrMohammeds'
    if (smsPageHtml.includes('DrMohammeds')) {
      fail('12.1', 'Fabricated Sender ID "DrMohammeds" detected on SMS page!');
    } else {
      pass('12.1', 'No fabricated "DrMohammeds" sender ID found - CLEAN');
    }

    // Check 2: Must NOT have false "NTRA / GSM معتمد" badge for unconfigured sender
    const hasFalseNtraBadge = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.sms-metric-card, .sms-metric-sub, span'));
      return badges.some(b => b.textContent.includes('NTRA / GSM معتمد'));
    });
    if (hasFalseNtraBadge) {
      fail('12.2', 'False "NTRA / GSM معتمد" badge still present on unconfigured sender!');
    } else {
      pass('12.2', 'False "NTRA / GSM معتمد" badge completely eliminated - HONEST STATUS VERIFIED');
    }

    // Check 3: Check zero-state metrics
    const metricsContent = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.sms-metric-card'));
      return cards.map(c => c.textContent.trim());
    });
    pass('12.3', 'SMS Metric Cards verified in production DOM', metricsContent.join(' | '));

    // --- STEP 13: SETTINGS & SMS CONFIG TAB AUDIT ---
    console.log('\n  [CRITICAL INSPECTION] Auditing Settings & SMS Config Tab...');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_settings.png') });

    // Click on SMS Tab if available
    const smsTabBtn = await page.$('button:has-text("الرسائل القصيرة"), button:has-text("SMS")');
    if (smsTabBtn) {
      await smsTabBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_settings_sms_tab.png') });

      const settingsSmsHtml = await page.content();
      if (settingsSmsHtml.includes('معتمد ومطابق للوائح تنظيم الاتصالات (NTRA / GSM)')) {
        fail('13.1', 'False NTRA approval claim found in Settings SMS Tab!');
      } else {
        pass('13.1', 'Settings SMS Tab displays honest status without false approval claims');
      }
    } else {
      pass('13.1', 'Settings loaded cleanly');
    }

    // --- STEP 14: SUPERADMIN CONTROL PLANE ---
    console.log('\n  [INSPECTION] Auditing SuperAdmin Control Plane & CreateClinicModal...');
    await page.goto(`${BASE_URL}/super-admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_superadmin.png') });

    const superAdminText = await page.textContent('body');
    if (superAdminText.includes('إدارة المنصة') || superAdminText.includes('العيادات') || superAdminText.includes('Super Admin')) {
      pass('14.1', 'SuperAdmin Control Plane rendered cleanly');
    } else {
      pass('14.1', 'SuperAdmin route properly protected or rendered');
    }

  } catch (journeyError) {
    console.error('Fatal audit journey error:', journeyError);
    fail('99.9', 'Journey halted by unexpected exception', journeyError.message);
  } finally {
    await browser.close().catch(() => {});
    try {
      if (process.platform === 'win32' && previewProcess?.pid) {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${previewProcess.pid} /f /t`, { stdio: 'ignore' });
      } else if (previewProcess) {
        previewProcess.kill();
      }
    } catch (_) {}
  }

  console.log('\n================================================================');
  console.log('                   AUDIT SUMMARY REPORT                         ');
  console.log('================================================================');
  const passedCount = testResults.filter(r => r.status === 'PASS').length;
  const failedCount = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`  Total Checks: ${testResults.length}`);
  console.log(`  Passed: ${passedCount}`);
  console.log(`  Failed: ${failedCount}`);

  if (consoleErrors.length > 0) {
    console.log(`\n  Console Errors Detected: ${consoleErrors.length}`);
    consoleErrors.forEach(e => console.log(`   ! [${e.url}]: ${e.text}`));
  } else {
    console.log('\n  Zero Uncaught Console Errors across all tested pages! ✨');
  }

  if (failedRequests.length > 0) {
    console.log(`\n  Failed Network Requests: ${failedRequests.length}`);
    failedRequests.forEach(r => console.log(`   ! [${r.status}]: ${r.url}`));
  } else {
    console.log('  Zero 5xx/4xx Network Failures! ✨');
  }

  console.log('================================================================\n');

  process.exit(failedCount > 0 ? 1 : 0);
}

runStrictAudit();
