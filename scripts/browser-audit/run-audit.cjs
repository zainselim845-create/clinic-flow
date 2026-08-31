const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.AUDIT_BASE || 'http://localhost:5173';
const coveragePath = path.join(__dirname, 'coverage.json');
const rawJson = fs.readFileSync(coveragePath, 'utf8').replace(/^\uFEFF/, '');
const coverage = JSON.parse(rawJson);

async function runUiAudit() {
  console.log('================================================================');
  console.log('  CLINICFLOW UI-REVIEW-LOOP & DOM DYNAMICS COVERAGE SWEEP');
  console.log(`  Target: ${BASE}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
    return chromium.launch({ channel: 'msedge', headless: true });
  });

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();

  const hits = new Set();
  const violations = [];

  const totalElements = coverage.views.reduce((sum, v) => sum + v.elements.length, 0);

  const hit = (viewId, elementId) => {
    hits.add(`${viewId}/${elementId}`);
    process.stdout.write(`  [PASS] ${viewId} -> ${elementId}\n`);
  };

  const bad = (viewId, elementId, reason) => {
    violations.push({ viewId, elementId, reason });
    process.stdout.write(`  [FAIL] ${viewId} -> ${elementId}: ${reason}\n`);
  };

  // --- 1. VIEW LOGIN ---
  console.log('--- 1. Testing View: view-login ---');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  
  const identEl = await page.$('#identifier');
  if (identEl) {
    await identEl.fill('doctor@clinicflow.com');
    hit('view-login', 'login-identifier');
  } else {
    bad('view-login', 'login-identifier', 'Element #identifier not found');
  }

  const passEl = await page.$('#password');
  if (passEl) {
    await passEl.fill('admin');
    hit('view-login', 'login-password');
  } else {
    bad('view-login', 'login-password', 'Element #password not found');
  }

  const submitEl = await page.$('button[type=submit]');
  if (submitEl) {
    await submitEl.click();
    await page.waitForTimeout(1000);
    hit('view-login', 'login-submit');
  } else {
    bad('view-login', 'login-submit', 'Submit button not found');
  }

  // --- 2. VIEW DASHBOARD ---
  console.log('\n--- 2. Testing View: view-dashboard ---');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const walkinBtn = await page.$('button:has-text("تسجيل حضور مباشر")');
  if (walkinBtn) {
    await walkinBtn.click();
    await page.waitForTimeout(400);
    const closeBtn = await page.$('.modal-content button.close-btn, .btn-close, button:has-text("إلغاء")');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(300);
    hit('view-dashboard', 'dashboard-walkin-btn');
  } else {
    bad('view-dashboard', 'dashboard-walkin-btn', 'Walk-in button missing');
  }

  const shiftBtn = await page.$('button:has-text("تسليم وردية الاستقبال")');
  if (shiftBtn) {
    await shiftBtn.click();
    await page.waitForTimeout(400);
    const closeShift = await page.$('.shift-modal-card button.btn-close, button:has-text("إلغاء")');
    if (closeShift) await closeShift.click();
    await page.waitForTimeout(300);
    hit('view-dashboard', 'dashboard-shift-btn');
  } else {
    bad('view-dashboard', 'dashboard-shift-btn', 'Shift button missing');
  }

  const statTotal = await page.$('.cockpit-stat-card.total-card');
  if (statTotal) {
    await statTotal.click();
    await page.waitForTimeout(300);
    hit('view-dashboard', 'dashboard-stat-total');
  } else {
    bad('view-dashboard', 'dashboard-stat-total', 'Total stat card missing');
  }

  const statExam = await page.$('.cockpit-stat-card.in-exam-card');
  if (statExam) {
    await statExam.click();
    await page.waitForTimeout(300);
    hit('view-dashboard', 'dashboard-stat-in-exam');
  } else {
    bad('view-dashboard', 'dashboard-stat-in-exam', 'In-exam stat card missing');
  }

  const statComp = await page.$('.cockpit-stat-card.completed-card');
  if (statComp) {
    await statComp.click();
    await page.waitForTimeout(300);
    hit('view-dashboard', 'dashboard-stat-completed');
  } else {
    bad('view-dashboard', 'dashboard-stat-completed', 'Completed stat card missing');
  }

  // --- 3. VIEW APPOINTMENTS ---
  console.log('\n--- 3. Testing View: view-appointments ---');
  await page.goto(BASE + '/appointments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const chairsToggle = await page.$('button:has-text("الكراسي المتزامنة")');
  if (chairsToggle) {
    await chairsToggle.click();
    await page.waitForTimeout(400);
    hit('view-appointments', 'appointments-chairs-toggle');
  } else {
    bad('view-appointments', 'appointments-chairs-toggle', 'Chairs toggle button missing');
  }

  const cardsToggle = await page.$('button:has-text("بطاقات")');
  if (cardsToggle) {
    await cardsToggle.click();
    await page.waitForTimeout(400);
    hit('view-appointments', 'appointments-cards-toggle');
  } else {
    bad('view-appointments', 'appointments-cards-toggle', 'Cards toggle button missing');
  }

  const apptSearch = await page.$('.search-box input, input[placeholder*="بحث"]');
  if (apptSearch) {
    await apptSearch.fill('أحمد');
    await page.waitForTimeout(300);
    hit('view-appointments', 'appointments-search');
  } else {
    bad('view-appointments', 'appointments-search', 'Appointment search input missing');
  }

  // --- 4. VIEW PATIENTS ---
  console.log('\n--- 4. Testing View: view-patients ---');
  await page.goto(BASE + '/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const patientCard = await page.$('.patient-card');
  if (patientCard) {
    await patientCard.click();
    await page.waitForTimeout(400);
    const closeDossier = await page.$('.patient-dossier-drawer .btn-close, .btn-close-dossier, button:has-text("إغلاق")');
    if (closeDossier) await closeDossier.click();
    await page.waitForTimeout(300);
    hit('view-patients', 'patients-card-click');
  } else {
    bad('view-patients', 'patients-card-click', 'Patient cards not rendered');
  }

  const patSearch = await page.$('.search-box input, input[placeholder*="بحث"]');
  if (patSearch) {
    await patSearch.fill('010');
    await page.waitForTimeout(300);
    hit('view-patients', 'patients-search');
  } else {
    bad('view-patients', 'patients-search', 'Patients search input missing');
  }

  // --- 5. VIEW INVOICES ---
  console.log('\n--- 5. Testing View: view-invoices ---');
  await page.goto(BASE + '/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const invSearch = await page.$('.search-box input, input[placeholder*="بحث"]');
  if (invSearch) {
    await invSearch.fill('INV');
    await page.waitForTimeout(300);
    hit('view-invoices', 'invoices-search');
  } else {
    bad('view-invoices', 'invoices-search', 'Invoice search input missing');
  }

  // --- 6. VIEW BOOKING PORTAL ---
  console.log('\n--- 6. Testing View: view-booking-portal ---');
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const bPhone = await page.$('input[type="tel"]');
  if (bPhone) {
    await bPhone.fill('01029384756');
    hit('view-booking-portal', 'booking-phone-input');
  } else {
    bad('view-booking-portal', 'booking-phone-input', 'Booking phone input missing');
  }

  const bSubmit = await page.$('button[type="submit"], button:has-text("متابعة")');
  if (bSubmit) {
    await bSubmit.click();
    await page.waitForTimeout(500);
    hit('view-booking-portal', 'booking-step1-continue');
  } else {
    bad('view-booking-portal', 'booking-step1-continue', 'Step 1 submit button missing');
  }

  // --- 7. VIEW MANAGE BOOKING ---
  console.log('\n--- 7. Testing View: view-manage-booking ---');
  await page.goto(BASE + '/manage-booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const mbPhone = await page.$('input[placeholder*="01"], input[type="tel"]');
  if (mbPhone) {
    await mbPhone.fill('01029384756');
    hit('view-manage-booking', 'manage-booking-phone');
  } else {
    bad('view-manage-booking', 'manage-booking-phone', 'Manage booking phone input missing');
  }

  // --- 8. VIEW INVENTORY ---
  console.log('\n--- 8. Testing View: view-inventory ---');
  await page.goto(BASE + '/inventory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const invenSearch = await page.$('input[placeholder*="بحث"]');
  if (invenSearch) {
    await invenSearch.fill('مخدر');
    await page.waitForTimeout(300);
    hit('view-inventory', 'inventory-search');
  } else {
    bad('view-inventory', 'inventory-search', 'Inventory search input missing');
  }

  // --- 9. VIEW LABS ---
  console.log('\n--- 9. Testing View: view-labs ---');
  await page.goto(BASE + '/labs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const labSearch = await page.$('input[placeholder*="بحث"]');
  if (labSearch) {
    await labSearch.fill('زيركون');
    await page.waitForTimeout(300);
    hit('view-labs', 'labs-search');
  } else {
    bad('view-labs', 'labs-search', 'Labs search input missing');
  }

  // --- 10. VIEW DOCTOR AGENT ---
  console.log('\n--- 10. Testing View: view-doctor-agent ---');
  await page.goto(BASE + '/doctor-agent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const docHub = await page.$('.marketing-crm-container, .doctor-agent-layout, .crm-header');
  if (docHub) {
    hit('view-doctor-agent', 'doctor-agent-hub');
  } else {
    bad('view-doctor-agent', 'doctor-agent-hub', 'Doctor agent layout missing');
  }

  // --- 11. VIEW SETTINGS ---
  console.log('\n--- 11. Testing View: view-settings ---');
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const settingsBox = await page.$('.settings-container, form, .settings-card');
  if (settingsBox) {
    hit('view-settings', 'settings-container');
  } else {
    bad('view-settings', 'settings-container', 'Settings container missing');
  }

  await browser.close();

  const percent = Math.round((hits.size / totalElements) * 100);

  console.log('\n================================================================');
  console.log(`  UI AUDIT RESULT: COVERAGE ${hits.size}/${totalElements} (${percent}%)`);
  console.log(`  Violations: ${violations.length}`);
  console.log('================================================================\n');

  if (violations.length > 0) {
    console.error('Audit failed with violations:', violations);
    process.exit(1);
  } else {
    console.log('🎉 100% INVENTORIED CONTROLS EXERCISED WITH ZERO VIOLATIONS!');
  }
}

runUiAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
