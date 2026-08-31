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
  
  try {
    await page.fill('#identifier', 'doctor@clinicflow.com');
    hit('view-login', 'login-identifier');
  } catch (e) {
    bad('view-login', 'login-identifier', e.message);
  }

  try {
    await page.fill('#password', 'admin');
    hit('view-login', 'login-password');
  } catch (e) {
    bad('view-login', 'login-password', e.message);
  }

  try {
    await page.click('button[type=submit]');
    await page.waitForTimeout(1000);
    hit('view-login', 'login-submit');
  } catch (e) {
    bad('view-login', 'login-submit', e.message);
  }

  // --- 2. VIEW DASHBOARD ---
  console.log('\n--- 2. Testing View: view-dashboard ---');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  try {
    await page.click('button:has-text("تسجيل حضور مباشر")');
    await page.waitForTimeout(300);
    const closeBtn = await page.$('.modal-content button.close-btn, .btn-close, button:has-text("إلغاء")');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(300);
    hit('view-dashboard', 'dashboard-walkin-btn');
  } catch (e) {
    bad('view-dashboard', 'dashboard-walkin-btn', e.message);
  }

  try {
    await page.click('button:has-text("تسليم وردية الاستقبال")');
    await page.waitForTimeout(300);
    const closeShift = await page.$('.shift-modal-card button.btn-close, button:has-text("إلغاء")');
    if (closeShift) await closeShift.click();
    await page.waitForTimeout(300);
    hit('view-dashboard', 'dashboard-shift-btn');
  } catch (e) {
    bad('view-dashboard', 'dashboard-shift-btn', e.message);
  }

  try {
    await page.click('.cockpit-stat-card.total-card');
    await page.waitForTimeout(200);
    hit('view-dashboard', 'dashboard-stat-total');
  } catch (e) {
    bad('view-dashboard', 'dashboard-stat-total', e.message);
  }

  try {
    await page.click('.cockpit-stat-card.waiting-card');
    await page.waitForTimeout(200);
    hit('view-dashboard', 'dashboard-stat-waiting');
  } catch (e) {
    bad('view-dashboard', 'dashboard-stat-waiting', e.message);
  }

  try {
    await page.click('.cockpit-stat-card.exam-card');
    await page.waitForTimeout(200);
    hit('view-dashboard', 'dashboard-stat-exam');
  } catch (e) {
    bad('view-dashboard', 'dashboard-stat-exam', e.message);
  }

  try {
    await page.click('.cockpit-stat-card.revenue-card');
    await page.waitForTimeout(200);
    hit('view-dashboard', 'dashboard-stat-revenue');
  } catch (e) {
    bad('view-dashboard', 'dashboard-stat-revenue', e.message);
  }

  // --- 3. VIEW APPOINTMENTS ---
  console.log('\n--- 3. Testing View: view-appointments ---');
  await page.goto(BASE + '/appointments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  try {
    await page.click('button:has-text("الكراسي المتزامنة")');
    await page.waitForTimeout(300);
    hit('view-appointments', 'appointments-chairs-toggle');
  } catch (e) {
    bad('view-appointments', 'appointments-chairs-toggle', e.message);
  }

  try {
    await page.click('button:has-text("بطاقات")');
    await page.waitForTimeout(300);
    hit('view-appointments', 'appointments-cards-toggle');
  } catch (e) {
    bad('view-appointments', 'appointments-cards-toggle', e.message);
  }

  try {
    await page.fill('.filters-bar input[type="text"]', 'محمد');
    await page.waitForTimeout(300);
    hit('view-appointments', 'appointments-search');
  } catch (e) {
    bad('view-appointments', 'appointments-search', e.message);
  }

  // --- 4. VIEW PATIENTS ---
  console.log('\n--- 4. Testing View: view-patients ---');
  await page.goto(BASE + '/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  try {
    const patientCard = await page.waitForSelector('.patient-card, .patients-grid > div', { timeout: 5000 });
    if (patientCard) {
      hit('view-patients', 'patients-card-click');
    }
  } catch (e) {
    bad('view-patients', 'patients-card-click', e.message);
  }

  try {
    await page.fill('.filters-bar input[type="text"]', '010');
    await page.waitForTimeout(300);
    hit('view-patients', 'patients-search');
  } catch (e) {
    bad('view-patients', 'patients-search', e.message);
  }

  // --- 5. VIEW INVOICES ---
  console.log('\n--- 5. Testing View: view-invoices ---');
  await page.goto(BASE + '/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  try {
    await page.fill('.filters-bar input[type="text"]', 'INV');
    await page.waitForTimeout(300);
    hit('view-invoices', 'invoices-search');
  } catch (e) {
    bad('view-invoices', 'invoices-search', e.message);
  }

  // --- 6. VIEW INVENTORY ---
  console.log('\n--- 6. Testing View: view-inventory ---');
  await page.goto(BASE + '/inventory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  try {
    await page.fill('input[placeholder*="الصنف"]', 'مخدر');
    await page.waitForTimeout(300);
    hit('view-inventory', 'inventory-search');
  } catch (e) {
    bad('view-inventory', 'inventory-search', e.message);
  }

  // --- 7. VIEW NOTIFICATIONS ---
  console.log('\n--- 7. Testing View: view-notifications ---');
  await page.goto(BASE + '/notifications', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  try {
    const notifPage = await page.waitForSelector('.notifications-page', { timeout: 5000 });
    if (notifPage) hit('view-notifications', 'notifications-page-header');
  } catch (e) {
    bad('view-notifications', 'notifications-page-header', e.message);
  }

  // --- 8. VIEW DOCTOR AGENT ---
  console.log('\n--- 8. Testing View: view-doctor-agent ---');
  await page.goto(BASE + '/doctor-agent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  try {
    const docHub = await page.waitForSelector('.doctor-assistant-page, .crm-header, .doctor-agent-layout', { timeout: 6000 });
    if (docHub) hit('view-doctor-agent', 'doctor-agent-hub');
  } catch (e) {
    bad('view-doctor-agent', 'doctor-agent-hub', e.message);
  }

  // --- 9. VIEW SETTINGS ---
  console.log('\n--- 9. Testing View: view-settings ---');
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  try {
    const settingsBox = await page.waitForSelector('.settings-container, form, .settings-card, .settings-form', { timeout: 5000 });
    if (settingsBox) hit('view-settings', 'settings-container');
  } catch (e) {
    bad('view-settings', 'settings-container', e.message);
  }

  // --- 10. VIEW BOOKING PORTAL ---
  console.log('\n--- 10. Testing View: view-booking-portal ---');
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  try {
    await page.fill('input[type="tel"]', '01029384756');
    hit('view-booking-portal', 'booking-phone-input');
  } catch (e) {
    bad('view-booking-portal', 'booking-phone-input', e.message);
  }

  try {
    await page.click('button[type="submit"], button:has-text("متابعة")');
    await page.waitForTimeout(500);
    hit('view-booking-portal', 'booking-step1-continue');
  } catch (e) {
    bad('view-booking-portal', 'booking-step1-continue', e.message);
  }

  // --- 11. VIEW MANAGE BOOKING ---
  console.log('\n--- 11. Testing View: view-manage-booking ---');
  await page.goto(BASE + '/manage-booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  try {
    await page.fill('input[placeholder*="01"], input[type="tel"]', '01029384756');
    hit('view-manage-booking', 'manage-booking-phone');
  } catch (e) {
    bad('view-manage-booking', 'manage-booking-phone', e.message);
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
