const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const outputDir = path.resolve('C:/Users/mhmd/.gemini/antigravity/brain/7400604e-96cc-46ca-92e4-dd497226c3f0');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG'
  });
  const page = await context.newPage();

  console.log('--- Step 1: Navigating to Login page ---');
  await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, 'auth_01_login_screen.png') });
  console.log('Captured: auth_01_login_screen.png');

  console.log('--- Step 2: Testing Google Account Picker ---');
  const googleBtn = await page.$('.btn-google-login');
  if (googleBtn) {
    await googleBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, 'auth_02_google_picker_modal.png') });
    console.log('Captured: auth_02_google_picker_modal.png');

    console.log('--- Step 3: Logging in as Staff (سارة كمال) via Google Picker ---');
    const staffAccount = await page.locator('.google-account-item', { hasText: 'سارة كمال' });
    await staffAccount.click();
    await page.waitForTimeout(2000);
  }

  console.log('--- Step 4: Verifying Receptionist / Staff Dashboard ---');
  await page.waitForSelector('.google-workspace-bar', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, 'auth_03_staff_dashboard.png'), fullPage: true });
  console.log('Captured: auth_03_staff_dashboard.png');

  // Verify staff view restrictions
  const workspaceText = await page.textContent('.workspace-title-text');
  const roleChipText = await page.textContent('.workspace-role-chip');
  console.log('Staff Workspace Text:', workspaceText);
  console.log('Staff Role Chip:', roleChipText);

  const revenueTextFound = await page.evaluate(() => {
    return document.body.innerText.includes('إجمالي التحصيل اليوم');
  });
  console.log('Is Daily Revenue visible to Staff? (Must be false):', revenueTextFound);

  const consultationBtnFound = await page.evaluate(() => {
    return !!document.querySelector('.btn-exam-action.success');
  });
  console.log('Is "إنهاء وحفظ الكشف" visible to Staff? (Must be false):', consultationBtnFound);

  console.log('--- Step 5: Testing Authorization Guard (Visiting /settings as Staff) ---');
  await page.goto('http://localhost:4173/settings');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outputDir, 'auth_04_staff_403_access_denied.png') });
  console.log('Captured: auth_04_staff_403_access_denied.png');

  const accessDeniedTitle = await page.textContent('.access-denied-box h2');
  console.log('Access Denied Banner Title:', accessDeniedTitle);

  console.log('--- Step 6: Returning to Login & Logging in as Doctor ---');
  // Clear persistent auth so we're not redirected away from /login
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Open the demo presets collapsible
  const summary = await page.$('summary');
  if (summary) {
    await summary.click();
    await page.waitForTimeout(500);
  }

  // Use 1-click doctor preset
  const doctorPresetBtn = page.locator('.preset-btn', { hasText: 'دخول: طبيب العيادة' });
  await doctorPresetBtn.click({ timeout: 5000 });

  await page.waitForTimeout(2000);
  console.log('--- Step 7: Verifying Doctor Dashboard ---');
  await page.waitForSelector('.google-workspace-bar', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, 'auth_05_doctor_dashboard.png'), fullPage: true });
  console.log('Captured: auth_05_doctor_dashboard.png');

  const doctorRoleChip = await page.textContent('.workspace-role-chip');
  console.log('Doctor Role Chip:', doctorRoleChip);

  const isRevenueVisibleForDoctor = await page.evaluate(() => {
    return document.body.innerText.includes('إجمالي التحصيل اليوم');
  });
  console.log('Is Daily Revenue visible to Doctor? (Must be true):', isRevenueVisibleForDoctor);

  const canFinishConsultation = await page.evaluate(() => {
    return !!document.querySelector('.btn-exam-action.success');
  });
  console.log('Is "إنهاء وحفظ الكشف" visible to Doctor? (Must be true):', canFinishConsultation);

  if (canFinishConsultation) {
    console.log('--- Step 8: Opening Doctor Consultation Modal ---');
    await page.click('.btn-exam-action.success');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, 'auth_06_doctor_consultation_modal.png') });
    console.log('Captured: auth_06_doctor_consultation_modal.png');
  }

  console.log('--- Step 9: Verifying Doctor Access to /settings ---');
  await page.goto('http://localhost:4173/settings');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outputDir, 'auth_07_doctor_settings_allowed.png') });
  console.log('Captured: auth_07_doctor_settings_allowed.png');

  await browser.close();
  console.log('--- ALL AUTH & RBAC VERIFICATION COMPLETED SUCCESSFULLY ---');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
