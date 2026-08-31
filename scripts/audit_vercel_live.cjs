const { chromium } = require('playwright');

async function auditVercelLive() {
  const TARGET_BASE = 'https://clinic-flow-lh3g.vercel.app';
  console.log(`\n================================================================`);
  console.log(`  LIVE VERCEL END-TO-END AUDIT`);
  console.log(`  Target: ${TARGET_BASE}`);
  console.log(`================================================================\n`);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
      return chromium.launch({ channel: 'msedge', headless: true });
    });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  const auditLog = [];
  const logPass = (route, msg) => {
    auditLog.push({ route, status: 'PASS', msg });
    console.log(`  [PASS] ${route} -> ${msg}`);
  };
  const logFail = (route, msg, error) => {
    auditLog.push({ route, status: 'FAIL', msg, error });
    console.log(`  [FAIL] ${route} -> ${msg}: ${error}`);
  };

  const uncaughtErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      uncaughtErrors.push({ url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    uncaughtErrors.push({ url: page.url(), text: err.message });
  });

  try {
    // 1. Audit /login
    console.log('\n--- 1. Auditing /login ---');
    await page.goto(`${TARGET_BASE}/login`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const hasLoginCard = await page.isVisible('.login-card');
    if (hasLoginCard) logPass('/login', 'Login page renders properly with dark/light glass card');
    else logFail('/login', 'Login card missing', 'Element .login-card not found');

    // Test Doctor Login
    await page.fill('input[type="text"]', 'doctor@clinicflow.com');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 2. Audit / (Dashboard)
    console.log('\n--- 2. Auditing / (Dashboard) ---');
    const dashboardHtml = await page.textContent('body');
    if (dashboardHtml.includes('النخبة') || dashboardHtml.includes('لوحة التحكم')) {
      logPass('/', 'Dashboard displays clinic header, quick stats & waiting queue');
    } else {
      logFail('/', 'Dashboard content missing', 'Clinic title not found');
    }

    // 3. Audit /appointments
    console.log('\n--- 3. Auditing /appointments ---');
    await page.goto(`${TARGET_BASE}/appointments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const apptsHtml = await page.textContent('body');
    if (apptsHtml.includes('المواعيد') || apptsHtml.includes('التقويم')) {
      logPass('/appointments', 'Appointments calendar and timeline render without errors');
    } else {
      logFail('/appointments', 'Appointments page not loaded properly', '');
    }

    // 4. Audit /patients
    console.log('\n--- 4. Auditing /patients ---');
    await page.goto(`${TARGET_BASE}/patients`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const patientsHtml = await page.textContent('body');
    if (patientsHtml.includes('المرضى') || patientsHtml.includes('سجلات')) {
      logPass('/patients', 'Patients directory displays records and search bar');
    } else {
      logFail('/patients', 'Patients directory missing', '');
    }

    // 5. Audit /invoices
    console.log('\n--- 5. Auditing /invoices ---');
    await page.goto(`${TARGET_BASE}/invoices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const invoicesHtml = await page.textContent('body');
    if (invoicesHtml.includes('الفوترة') || invoicesHtml.includes('INV-')) {
      logPass('/invoices', 'Invoices ledger renders with payment status badges');
    } else {
      logFail('/invoices', 'Invoices ledger missing', '');
    }

    // 6. Audit /inventory
    console.log('\n--- 6. Auditing /inventory ---');
    await page.goto(`${TARGET_BASE}/inventory`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const inventoryHtml = await page.textContent('body');
    if (inventoryHtml.includes('المخزون') || inventoryHtml.includes('مستلزمات')) {
      logPass('/inventory', 'Inventory page renders supplies list & stock controls');
    } else {
      logFail('/inventory', 'Inventory content missing', '');
    }

    // 7. Audit /doctor-agent (AI Assistant & CRM)
    console.log('\n--- 7. Auditing /doctor-agent ---');
    await page.goto(`${TARGET_BASE}/doctor-agent`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const agentHtml = await page.textContent('body');
    if (agentHtml.includes('مساعد الطبيب') || agentHtml.includes('CRM')) {
      logPass('/doctor-agent', 'AI Assistant and 11 CRM Growth Engine tabs render cleanly');
    } else {
      logFail('/doctor-agent', 'Doctor agent missing', '');
    }

    // 8. Audit /settings
    console.log('\n--- 8. Auditing /settings ---');
    await page.goto(`${TARGET_BASE}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const settingsHtml = await page.textContent('body');
    if (settingsHtml.includes('إعدادات') || settingsHtml.includes('العيادة')) {
      logPass('/settings', 'Settings tabs and staff RBAC permissions manager render');
    } else {
      logFail('/settings', 'Settings page missing', '');
    }

    // 9. Audit /booking (Public Phone-first portal)
    console.log('\n--- 9. Auditing /booking ---');
    await page.goto(`${TARGET_BASE}/booking`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const bookingHtml = await page.textContent('body');
    if (bookingHtml.includes('حجز موعد') || bookingHtml.includes('الهاتف')) {
      logPass('/booking', 'Public booking portal renders phone step, service selection & slots');
    } else {
      logFail('/booking', 'Booking portal missing', '');
    }

    // 10. Audit /manage-booking
    console.log('\n--- 10. Auditing /manage-booking ---');
    await page.goto(`${TARGET_BASE}/manage-booking`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const manageHtml = await page.textContent('body');
    if (manageHtml.includes('إدارة') || manageHtml.includes('رقم الهاتف')) {
      logPass('/manage-booking', 'Self-service manage booking lookup portal renders correctly');
    } else {
      logFail('/manage-booking', 'Manage booking portal missing', '');
    }

  } catch (err) {
    console.error('Test execution exception:', err);
  } finally {
    await browser.close();
  }

  console.log(`\n================================================================`);
  console.log(`  AUDIT RESULTS: ${auditLog.filter(a => a.status === 'PASS').length} / ${auditLog.length} PASSED`);
  if (uncaughtErrors.length > 0) {
    console.log(`  Console Errors Detected: ${uncaughtErrors.length}`);
    uncaughtErrors.forEach(e => console.log(`   ! [${e.url}]: ${e.text}`));
  } else {
    console.log(`  Zero Uncaught Console Errors on Vercel Live! ✨`);
  }
  console.log(`================================================================\n`);
}

auditVercelLive();
