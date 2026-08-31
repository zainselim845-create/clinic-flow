const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureAllSections() {
  const TARGET_BASE = 'https://clinic-flow-lh3g.vercel.app';
  console.log(`Starting section-by-section audit on ${TARGET_BASE}...`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
    return chromium.launch({ channel: 'msedge', headless: true });
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  const brainDir = path.resolve(__dirname, '..', '..', '..', 'brain', '62893a20-cb7d-4951-bc6a-dfc3f35c715a');

  // 1. Login
  await page.goto(`${TARGET_BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'doctor@clinicflow.com');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  const sections = [
    { url: '/', name: 'section_1_dashboard.png', desc: 'لوحة التحكم الرئيسية' },
    { url: '/appointments', name: 'section_2_appointments.png', desc: 'المواعيد والتقويم' },
    { url: '/patients', name: 'section_3_patients.png', desc: 'سجلات المرضى' },
    { url: '/invoices', name: 'section_4_invoices.png', desc: 'الفوترة والتحصيل' },
    { url: '/inventory', name: 'section_5_inventory.png', desc: 'المخزون والمستلزمات' },
    { url: '/doctor-agent', name: 'section_6_doctor_agent.png', desc: 'مساعد الطبيب & CRM' },
    { url: '/settings', name: 'section_7_settings.png', desc: 'إعدادات العيادة والصلاحيات' },
    { url: '/booking', name: 'section_8_booking.png', desc: 'بوابة الحجز العامة' },
    { url: '/manage-booking', name: 'section_9_manage_booking.png', desc: 'إدارة الحجز الذاتية' }
  ];

  for (const s of sections) {
    console.log(`Capturing ${s.desc} (${s.url})...`);
    await page.goto(`${TARGET_BASE}${s.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const savePath = path.join(brainDir, s.name);
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`Saved screenshot to ${savePath}`);
  }

  await browser.close();
  console.log('All sections captured successfully!');
}

captureAllSections().catch(console.error);
