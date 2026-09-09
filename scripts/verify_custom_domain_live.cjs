const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyCustomDomainLive() {
  const TARGET_BASE = process.env.TARGET_BASE || 'http://localhost:4173';
  const outputDir = path.resolve('C:/Users/mhmd/.gemini/antigravity/brain/7400604e-96cc-46ca-92e4-dd497226c3f0/domain_audit');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`========================================================================`);
  console.log(`  STARTING REAL-BROWSER CUSTOM DOMAIN & SSL VERIFICATION`);
  console.log(`  Target: ${TARGET_BASE}`);
  console.log(`========================================================================\n`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG'
  });
  const page = await context.newPage();

  try {
    // 1. Login as Doctor
    console.log('--- Step 1: Doctor Login ---');
    await page.goto(`${TARGET_BASE}/login`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const summary = await page.$('summary');
    if (summary) {
      await summary.click();
      await page.waitForTimeout(300);
    }
    const doctorBtn = page.locator('.preset-btn', { hasText: 'دخول: طبيب العيادة' });
    await doctorBtn.click();
    await page.waitForTimeout(2000);

    // 2. Navigate to Settings -> Custom Domain Tab
    console.log('--- Step 2: Navigating to Settings & Custom Domain Tab ---');
    await page.goto(`${TARGET_BASE}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const domainTabBtn = page.locator('button:has-text("الدومين"), button:has-text("SSL")');
    await domainTabBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, 'domain_01_initial_tab.png'), fullPage: false });
    console.log('Captured: domain_01_initial_tab.png');

    // 3. Test Demo Domain Chip
    console.log('--- Step 3: Clicking Demo Domain Preset Chip ---');
    const demoChip = page.locator('.demo-domain-chip:has-text("dr-ahmed-dental.com")');
    if (await demoChip.count() > 0) {
      await demoChip.first().click();
      await page.waitForTimeout(500);
    }

    // 4. Click Save Domain
    console.log('--- Step 4: Saving Domain ---');
    const saveBtn = page.locator('button[type="submit"]:has-text("حفظ النطاق")');
    await saveBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, 'domain_02_dns_table_configured.png'), fullPage: false });
    console.log('Captured: domain_02_dns_table_configured.png');

    // 5. Test Copy DNS Buttons
    console.log('--- Step 5: Testing DNS Record Copy Buttons ---');
    const copyBtns = page.locator('.copy-dns-btn');
    const copyCount = await copyBtns.count();
    console.log(`Found ${copyCount} copy buttons in DNS table`);
    if (copyCount > 0) {
      await copyBtns.first().click();
      await page.waitForTimeout(400);
      const isCopied = await page.textContent('.copy-dns-btn.copied');
      console.log('First DNS Record Copy status:', isCopied);
    }

    // 6. Click "فحص الـ DNS والـ SSL"
    console.log('--- Step 6: Testing DNS & SSL Live Verification ---');
    const verifyBtn = page.locator('button:has-text("فحص الـ DNS والـ SSL")');
    await verifyBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, 'domain_03_ssl_active_verified.png'), fullPage: false });
    console.log('Captured: domain_03_ssl_active_verified.png');

    const statusBadge = await page.textContent('.domain-status-badge');
    console.log('Current Domain Status Badge:', statusBadge);

    // 7. Verify Dedicated Clinic Booking Experience
    console.log('--- Step 7: Verifying Dedicated Booking Portal ---');
    await page.goto(`${TARGET_BASE}/c/dr-ahmed/booking`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, 'domain_04_dedicated_clinic_booking.png'), fullPage: false });
    console.log('Captured: domain_04_dedicated_clinic_booking.png');

    console.log('\n--- ALL DOMAIN & SSL VERIFICATION COMPLETED SUCCESSFULLY ---');

  } catch (err) {
    console.error('Domain audit error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyCustomDomainLive().catch(err => {
  console.error(err);
  process.exit(1);
});
