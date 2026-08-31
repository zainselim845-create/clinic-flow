const { chromium } = require('playwright');
const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');

async function runRouteVerification() {
  console.log('📦 Rebuilding latest production bundle...');
  execSync('npm run build', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });

  console.log('🚀 Starting Vite preview server for full route verification...');
  const viteProcess = spawn('npm', ['run', 'preview', '--', '--port', '4173'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    stdio: 'pipe'
  });

  // Wait for server to start
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 4000);
    viteProcess.stdout.on('data', (d) => {
      const out = d.toString();
      if (out.includes('http://localhost:4173') || out.includes('Local:')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  const BASE = 'http://localhost:4173';
  console.log(`🌐 Server running at ${BASE}`);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
      return chromium.launch({ channel: 'msedge', headless: true });
    });
  } catch (e) {
    console.log('Chromium launch fallback to default playwright chromium');
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  const results = [];
  const recordResult = (route, testName, passed, error = null) => {
    results.push({ route, testName, passed, error });
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${route} :: ${testName} ${error ? '-> ' + error : ''}`);
  };

  // Listen to console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  // Clear storage first for clean state
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  console.log('\n--- 1. Testing Doctor Authentication Flow ---');
  await page.fill('input[type="text"]', 'doctor@clinicflow.com');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  recordResult('/login', 'Doctor login redirects to dashboard', currentUrl.endsWith('/') || currentUrl.includes('/#'), currentUrl);

  console.log('\n--- 2. Testing Clinical Dashboard (/) ---');
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const dashboardTitle = await page.textContent('body');
  recordResult('/', 'Dashboard renders clinic info & realistic data', dashboardTitle.includes('النخبة') || dashboardTitle.includes('الشريف'));

  console.log('\n--- 3. Testing Appointments (/appointments) ---');
  await page.goto(`${BASE}/appointments`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const apptsContent = await page.textContent('body');
  recordResult('/appointments', 'Appointments calendar and cards render', apptsContent.includes('المواعيد') || apptsContent.includes('عمر عبد العزيز'));

  console.log('\n--- 4. Testing Patients Directory (/patients) ---');
  await page.goto(`${BASE}/patients`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const patientsContent = await page.textContent('body');
  recordResult('/patients', 'Patients directory renders realistic patient records', patientsContent.includes('المرضى') || patientsContent.includes('عمر عبد العزيز') || patientsContent.includes('سارة محمود'));

  console.log('\n--- 5. Testing Invoices & Billing (/invoices) ---');
  await page.goto(`${BASE}/invoices`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const invoicesContent = await page.textContent('body');
  recordResult('/invoices', 'Invoices ledger renders realistic Egyptian billing', invoicesContent.includes('INV-') || invoicesContent.includes('الفواتير') || invoicesContent.includes('التحصيل'));

  console.log('\n--- 6. Testing Inventory (/inventory) ---');
  await page.goto(`${BASE}/inventory`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const inventoryContent = await page.textContent('body');
  recordResult('/inventory', 'Inventory page renders supplies list', inventoryContent.includes('المخزون') || inventoryContent.includes('مستلزمات'));

  console.log('\n--- 7. Testing Doctor AI Assistant & CRM Hub (/doctor-agent) ---');
  await page.goto(`${BASE}/doctor-agent`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const crmContent = await page.textContent('body');
  recordResult('/doctor-agent', 'Doctor assistant and CRM Hub render properly', crmContent.includes('مساعد الطبيب') || crmContent.includes('CRM') || crmContent.includes('تنشيط'));

  console.log('\n--- 8. Testing Clinic Settings & Staff Permissions (/settings) ---');
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const settingsContent = await page.textContent('body');
  recordResult('/settings', 'Settings & Staff permissions render properly', settingsContent.includes('إعدادات') || settingsContent.includes('سارة كمال') || settingsContent.includes('صلاحيات'));

  console.log('\n--- 9. Testing Public Booking Wizard (/booking) ---');
  await page.goto(`${BASE}/booking`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const bookingContent = await page.textContent('body');
  recordResult('/booking', 'Public booking portal renders booking slots', bookingContent.includes('حجز') || bookingContent.includes('الهاتف'));

  console.log('\n--- 10. Testing Public Manage Booking (/manage-booking) ---');
  await page.goto(`${BASE}/manage-booking`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const manageBookingContent = await page.textContent('body');
  recordResult('/manage-booking', 'Self-service manage booking renders lookup form', manageBookingContent.includes('إدارة الحجز') || manageBookingContent.includes('رقم الهاتف'));

  console.log('\n--- 11. Testing Staff Permissions Access Control ---');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.removeItem('clinicflow_auth_user');
    localStorage.removeItem('clinicflow_role');
  });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Login as Staff (Mariam - permissions: appointments, patients, sms)
  await page.fill('input[type="text"]', 'mariam@clinic.com');
  await page.fill('input[type="password"]', '123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Check if trying to access /settings redirects to dashboard /
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const staffSettingsUrl = page.url();
  const isSettingsBlocked = staffSettingsUrl === `${BASE}/` || staffSettingsUrl.endsWith('/');
  recordResult('/settings [Staff]', 'Staff cannot access doctor-only settings route (redirected)', isSettingsBlocked, staffSettingsUrl);

  // Check if trying to access /doctor-agent redirects to dashboard /
  await page.goto(`${BASE}/doctor-agent`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const staffAgentUrl = page.url();
  const isAgentBlocked = staffAgentUrl === `${BASE}/` || staffAgentUrl.endsWith('/');
  recordResult('/doctor-agent [Staff]', 'Staff cannot access doctor-only AI assistant route (redirected)', isAgentBlocked, staffAgentUrl);

  // Check if staff can access /appointments (allowed)
  await page.goto(`${BASE}/appointments`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const staffApptsUrl = page.url();
  recordResult('/appointments [Staff]', 'Staff with permission can access /appointments', staffApptsUrl.includes('/appointments'), staffApptsUrl);

  console.log('\n================================================================');
  console.log(`  VERIFICATION SUMMARY: ${results.filter(r => r.passed).length} / ${results.length} PASSED`);
  if (consoleErrors.length > 0) {
    console.log(`  Console Errors Encountered: ${consoleErrors.length}`);
    consoleErrors.forEach(err => console.log('   ! ', err));
  } else {
    console.log('  Zero Console Errors! ✨');
  }
  console.log('================================================================\n');

  await browser.close();
  viteProcess.kill();
  process.exit(results.every(r => r.passed) ? 0 : 1);
}

runRouteVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
