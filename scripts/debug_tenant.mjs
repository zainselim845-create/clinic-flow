import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ channel: 'msedge', headless: true }));
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://clinic-flow-lh3g.vercel.app/login', { waitUntil: 'networkidle' });
  await page.locator('button.btn-google-options-link').click();
  await page.locator('.google-tab-btn', { hasText: 'دخول فوري بحسابك' }).click();
  await page.fill('#real-google-email', 'test.doctor@gmail.com');
  await page.fill('#real-google-name', 'د. تجربة حقيقية');
  await page.locator('button.btn-save-google').click();
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    return {
      auth_user: JSON.parse(localStorage.getItem('clinicflow_auth_user') || '{}'),
      active_slug: localStorage.getItem('clinicflow_active_tenant_slug'),
      all_tenants: JSON.parse(localStorage.getItem('clinicflow_registered_tenants') || '[]'),
      header_clinic_name: document.querySelector('.doctor-name, .clinic-brand, .clinic-title, .brand-title, .user-name')?.innerText,
      all_localstorage_keys: Object.keys(localStorage)
    };
  });

  console.log('DEBUG DATA:', JSON.stringify(data, null, 2));
  await browser.close();
}

run();
