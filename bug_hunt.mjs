import { chromium } from 'playwright';
import path from 'path';

const outDir = 'C:\\Users\\mhmd\\.gemini\antigravity\\brain\\62893a20-cb7d-4951-bc6a-dfc3f35c715a';

const bugsFound = [];

function recordBug(area, description, details = {}) {
  console.error(`[BUG DISCOVERED in ${area}]: ${description}`, details);
  bugsFound.push({ area, description, details });
}

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG'
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      recordBug('Browser Console', msg.text(), { url: page.url() });
    }
  });

  page.on('pageerror', (err) => {
    recordBug('Uncaught Exception', err.message, { url: page.url(), stack: err.stack });
  });

  console.log('--- STARTING ADVERSARIAL BUG HUNT ---');

  // 1. AUTHENTICATE
  console.log('1. Testing Login & Session...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/login', { waitUntil: 'networkidle' });
  await page.fill('#identifier', 'doctor@clinicflow.com');
  await page.fill('#password', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('https://clinic-flow-lh3g.vercel.app/');
  await page.waitForTimeout(1000);

  // 2. DASHBOARD ADVERSARIAL INTERACTIONS
  console.log('2. Testing Dashboard interactive buttons & modals...');
  
  // Test Walk-in modal with edge-case phone and Arabic digits
  const walkInBtn = await page.$('button:has-text("كشف مباشر"), button:has-text("Walk-in")');
  if (walkInBtn) {
    await walkInBtn.click();
    await page.waitForTimeout(500);
    const nameInput = await page.$('input[placeholder*="اسم"]');
    if (nameInput) await nameInput.fill('مريض اختبار حافة ٠١٠٠٦٢٨٥٠٣١');
    const phoneInput = await page.$('input[placeholder*="01"]');
    if (phoneInput) await phoneInput.fill('٠١٠٠٦٢٨٥٠٣١'); // Arabic digits
    const submitBtn = await page.$('.walk-in-modal button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(800);
  } else {
    recordBug('Dashboard', 'Walk-in button not found on dashboard');
  }

  // Test Expenses Modal
  const expensesBtn = await page.$('button:has-text("المصروفات")');
  if (expensesBtn) {
    await expensesBtn.click();
    await page.waitForTimeout(500);
    // Add expense with decimal/special number
    const titleInput = await page.$('input[placeholder*="وصف"]');
    if (titleInput) await titleInput.fill('فاتورة كهرباء ومياه');
    const amountInput = await page.$('input[type="number"]');
    if (amountInput) await amountInput.fill('450.50');
    const addExpenseSubmit = await page.$('.expenses-modal button[type="submit"]');
    if (addExpenseSubmit) await addExpenseSubmit.click();
    await page.waitForTimeout(600);
    // Close modal
    const closeBtn = await page.$('.expenses-modal button:has-text("إغلاق"), .expenses-modal .btn-close, .modal-backdrop');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Test Patient Recall Modal
  const recallsBtn = await page.$('button:has-text("استدعاء")');
  if (recallsBtn) {
    await recallsBtn.click();
    await page.waitForTimeout(500);
    const closeRecall = await page.$('.modal-backdrop button:has-text("إغلاق"), .modal-backdrop .btn-close');
    if (closeRecall) await closeRecall.click();
    await page.waitForTimeout(500);
  }

  // 3. APPOINTMENTS PAGE ADVERSARIAL TESTS
  console.log('3. Testing Appointments page filter tabs, blockers and creation...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/appointments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Click every filter pill
  const filterPills = await page.$$('.filter-pill, .tab-btn, .view-btn');
  for (const pill of filterPills) {
    try {
      await pill.click();
      await page.waitForTimeout(200);
    } catch (e) {
      recordBug('Appointments', 'Failed clicking filter pill', { error: e.message });
    }
  }

  // Test Blocker Modal
  const blockerBtn = await page.$('button[title*="إغلاق/فتح"], button:has-text("إغلاق المواعيد"), button:has-text("حظر")');
  if (blockerBtn) {
    await blockerBtn.click();
    await page.waitForTimeout(500);
    const reasonInput = await page.$('input[placeholder*="سبب"]');
    if (reasonInput) await reasonInput.fill('مؤتمر طبي جراحي طارئ');
    const addBlockBtn = await page.$('button:has-text("حظر هذا اليوم"), button:has-text("حفظ الحظر")');
    if (addBlockBtn) await addBlockBtn.click();
    await page.waitForTimeout(600);
    const doneBlockerBtn = await page.$('button:has-text("تم الانتهاء"), .btn-close');
    if (doneBlockerBtn) await doneBlockerBtn.click();
    await page.waitForTimeout(500);
  }

  // 4. PATIENTS DIRECTORY ADVERSARIAL TESTS
  console.log('4. Testing Patients Directory search and dossier drawer...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Search with complex query
  const searchBox = await page.$('input[placeholder*="بحث"]');
  if (searchBox) {
    await searchBox.fill('محمد');
    await page.waitForTimeout(300);
    await searchBox.fill('010');
    await page.waitForTimeout(300);
    await searchBox.fill('');
    await page.waitForTimeout(300);
  }

  // Add new patient via Modal
  const addPatientBtn = await page.$('button:has-text("إضافة مريض")');
  if (addPatientBtn) {
    await addPatientBtn.click();
    await page.waitForTimeout(500);
    const pName = await page.$('input[name="name"], .modal-content input[placeholder*="الاسم"]');
    if (pName) await pName.fill('ياسمين عبد العزيز عزمي');
    const pPhone = await page.$('input[name="phone"], .modal-content input[placeholder*="01"]');
    if (pPhone) await pPhone.fill('01155443322');
    const pAge = await page.$('input[name="age"], .modal-content input[placeholder*="العمر"], .modal-content input[type="number"]');
    if (pAge) await pAge.fill('32');
    const pSubmit = await page.$('.modal-content button[type="submit"]');
    if (pSubmit) await pSubmit.click();
    await page.waitForTimeout(800);
  }

  // 5. INVOICES PAGE TESTS
  console.log('5. Testing Invoices creation and payment calculations...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const newInvBtn = await page.$('button:has-text("فاتورة جديدة")');
  if (newInvBtn) {
    await newInvBtn.click();
    await page.waitForTimeout(600);

    // Fill invoice fields
    const invPatient = await page.$('.invoice-modal input[placeholder*="المريض"], .invoice-modal input[placeholder*="الاسم"]');
    if (invPatient) await invPatient.fill('ياسمين عبد العزيز');
    
    // Add item
    const addItemBtn = await page.$('button:has-text("إضافة بند")');
    if (addItemBtn) await addItemBtn.click();

    // Check discount and tax inputs
    const discountInput = await page.$('.invoice-modal input[placeholder*="خصم"], .invoice-modal input[name="discount"]');
    if (discountInput) await discountInput.fill('50');

    const saveInvBtn = await page.$('.invoice-modal button[type="submit"], .invoice-modal button:has-text("حفظ الفاتورة")');
    if (saveInvBtn) await saveInvBtn.click();
    await page.waitForTimeout(800);
  }

  // 6. LABS & INVENTORY & ATTENDANCE
  console.log('6. Testing Labs, Inventory and Attendance...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/labs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  await page.goto('https://clinic-flow-lh3g.vercel.app/inventory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  await page.goto('https://clinic-flow-lh3g.vercel.app/attendance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const checkInBtn = await page.$('button:has-text("تسجيل الحضور")');
  if (checkInBtn) {
    await checkInBtn.click();
    await page.waitForTimeout(500);
  }

  // 7. DOCTOR AI AGENT
  console.log('7. Testing Doctor AI Agent...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/doctor-agent', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const chatInput = await page.$('textarea[placeholder*="اكتب"], input[placeholder*="اكتب"]');
  const sendBtn = await page.$('button:has-text("إرسال"), .btn-send, button:has(.lucide-send)');
  if (chatInput && sendBtn) {
    await chatInput.fill('احظر يوم الخميس القادم');
    await sendBtn.click();
    await page.waitForTimeout(1500);
  }

  // 8. SETTINGS TABS DEEP SWEEP
  console.log('8. Testing Settings Tabs deep sweep...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Click each settings tab:
  const settingsTabs = [
    'الجدول والإجازات',
    'أنواع الزيارات',
    'فريق العمل',
    'بوابات الـ SMS',
    'الذكاء الاصطناعي',
    'السحابة'
  ];

  for (const tabText of settingsTabs) {
    const tabEl = await page.$(`.settings-tab-btn:has-text("${tabText}"), button:has-text("${tabText}")`);
    if (tabEl) {
      await tabEl.click();
      await page.waitForTimeout(600);
    } else {
      recordBug('Settings', `Tab button not found: ${tabText}`);
    }
  }

  // 9. PUBLIC PATIENT BOOKING & CANCEL/RESCHEDULE
  console.log('9. Testing Public Patient Booking end-to-end...');
  await page.goto('https://clinic-flow-lh3g.vercel.app/booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Step 1
  const phoneInput = await page.$('input[placeholder*="01"]');
  if (phoneInput) {
    await phoneInput.fill('01012349988');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
  }

  // Step 2 fill
  const patientNameFld = await page.$('input[placeholder*="الاسم"]');
  if (patientNameFld) await patientNameFld.fill('خالد أحمد السعيد');

  // Select Service
  const serviceOpt = await page.$('.service-card, .service-option, select[name="service"]');
  if (serviceOpt) await serviceOpt.click();

  // Select Slot
  const slotPill = await page.$('.slot-pill:not(.disabled), .time-slot-pill:not(.disabled)');
  if (slotPill) await slotPill.click();

  // Step 3 Submit
  const confirmBtn = await page.$('button:has-text("تأكيد الحجز")');
  if (confirmBtn) {
    await confirmBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: path.join(outDir, 'bug_hunt_final_screen.png') });

  await browser.close();

  console.log('\n=========================================');
  console.log('ADVERSARIAL BUG HUNT FINISHED!');
  console.log(`Total Issues / Discrepancies Discovered: ${bugsFound.length}`);
  console.log(JSON.stringify(bugsFound, null, 2));
  console.log('=========================================');
}

run().catch(console.error);
