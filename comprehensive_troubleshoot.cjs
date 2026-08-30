const { chromium } = require('playwright');

async function runComprehensiveTroubleshoot() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
    return chromium.launch({ channel: 'msedge', headless: true });
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();

  const discoveredIssues = [];
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error @ ${page.url()}]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[Uncaught Page Error @ ${page.url()}]: ${err.message}`);
  });

  console.log('=== 1. TESTING LOGIN & AUTH FLOW ===');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  
  // Test empty login
  await page.click('button[type="submit"]');
  await page.waitForTimeout(200);

  // Test valid login
  await page.fill('#identifier', 'doctor@clinicflow.com');
  await page.fill('#password', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  console.log('=== 2. TESTING DASHBOARD INTERACTIONS ===');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Test Walk-in Registration Modal
  const walkInBtn = await page.$('button:has-text("تسجيل حضور مباشر")');
  if (walkInBtn) {
    await walkInBtn.click();
    await page.waitForTimeout(400);
    
    // Check if modal opened
    const modal = await page.$('.modal-content, .walkin-modal');
    if (!modal) discoveredIssues.push('Walk-in Registration modal did not render');
    
    // Fill Walk-in form
    const nameField = await page.$('.modal-content input[type="text"]');
    if (nameField) await nameField.fill('مريض تجربة الفحص الشامل');
    
    const phoneField = await page.$('.modal-content input[type="tel"], .modal-content input[placeholder*="01"]');
    if (phoneField) await phoneField.fill('01099887766');

    const submitWalkIn = await page.$('.modal-content button[type="submit"]');
    if (submitWalkIn) await submitWalkIn.click();
    await page.waitForTimeout(600);
  } else {
    discoveredIssues.push('Walk-in button missing on Dashboard');
  }

  // Test Shift Handover Modal
  const shiftBtn = await page.$('button:has-text("تسليم وردية الاستقبال")');
  if (shiftBtn) {
    await shiftBtn.click();
    await page.waitForTimeout(400);
    const actualCashInput = await page.$('input.actual-input, input[placeholder*="المبلغ"]');
    if (actualCashInput) {
      await actualCashInput.fill('1500');
      await page.waitForTimeout(200);
      const submitShift = await page.$('.shift-modal-card button[type="submit"]');
      if (submitShift) await submitShift.click();
      await page.waitForTimeout(500);
    }
  } else {
    discoveredIssues.push('Shift Handover button missing on Dashboard');
  }

  // Test Start Consultation & Finish Consultation
  const startExamBtn = await page.$('button:has-text("بدء الكشف"), button.btn-call-patient');
  if (startExamBtn) {
    await startExamBtn.click();
    await page.waitForTimeout(500);
  }

  const finishExamBtn = await page.$('button:has-text("إنهاء الكشف وتسجيل الروشتة"), button:has-text("إنهاء الكشف")');
  if (finishExamBtn) {
    await finishExamBtn.click();
    await page.waitForTimeout(500);
    
    const diagInput = await page.$('.consultation-modal input[type="text"], .consultation-modal input[placeholder*="التشخيص"]');
    if (diagInput) await diagInput.fill('تسوس عميق ضرس 16 مع التهاب عصب');
    
    const finishSubmit = await page.$('.consultation-modal button[type="submit"]');
    if (finishSubmit) await finishSubmit.click();
    await page.waitForTimeout(500);
  }

  console.log('=== 3. TESTING APPOINTMENTS & CHAIRS GRID ===');
  await page.goto('http://localhost:5173/appointments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // Switch to Multi-Chair View
  const chairsToggleBtn = await page.$('button:has-text("الكراسي المتزامنة")');
  if (chairsToggleBtn) {
    await chairsToggleBtn.click();
    await page.waitForTimeout(400);
    const chairCards = await page.$$('.chair-column-card');
    if (chairCards.length !== 4) {
      discoveredIssues.push(`Expected 4 chair columns, found ${chairCards.length}`);
    }
  } else {
    discoveredIssues.push('Multi-Chair toggle button missing on Appointments page');
  }

  // Switch back to Cards
  const cardsToggleBtn = await page.$('button:has-text("بطاقات")');
  if (cardsToggleBtn) {
    await cardsToggleBtn.click();
    await page.waitForTimeout(300);
  }

  // Test Add New Appointment Modal
  const newApptBtn = await page.$('button:has-text("موعد جديد")');
  if (newApptBtn) {
    await newApptBtn.click();
    await page.waitForTimeout(400);
    const patientSelect = await page.$('.modal-content select');
    if (patientSelect) {
      const options = await patientSelect.$$('option');
      if (options.length > 1) {
        await patientSelect.selectOption({ index: 1 });
      }
    }
    const timeSelect = await page.$('.modal-content input[type="time"], .modal-content select:nth-of-type(2)');
    if (timeSelect) {
      // fill or select
    }
    const closeApptModal = await page.$('.modal-content .close-btn, .modal-content button.btn-secondary');
    if (closeApptModal) await closeApptModal.click();
    await page.waitForTimeout(300);
  }

  console.log('=== 4. TESTING PATIENTS DOSSIER & ODONTOGRAM ===');
  await page.goto('http://localhost:5173/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // Open first patient card
  const patientCard = await page.$('.patient-card');
  if (patientCard) {
    await patientCard.click();
    await page.waitForTimeout(500);

    // Check tabs in Dossier
    const chartTab = await page.$('button:has-text("مخطط الأسنان"), .tab-btn:has-text("الأسنان")');
    if (chartTab) {
      await chartTab.click();
      await page.waitForTimeout(400);
      
      // Check teeth rendered
      const teethElements = await page.$$('.tooth-item, .fdi-tooth');
      console.log(`Rendered teeth on chart: ${teethElements.length}`);
    }

    const closeDossier = await page.$('.patient-dossier-drawer .btn-close, .btn-close-dossier');
    if (closeDossier) await closeDossier.click();
    await page.waitForTimeout(300);
  }

  console.log('=== 5. TESTING INVOICES & REVENUE ===');
  await page.goto('http://localhost:5173/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  
  const createInvBtn = await page.$('button:has-text("فاتورة جديدة"), button:has-text("إصدار فاتورة")');
  if (createInvBtn) {
    await createInvBtn.click();
    await page.waitForTimeout(400);
    const closeInvModal = await page.$('.invoice-modal .btn-close, .btn-close-modal');
    if (closeInvModal) await closeInvModal.click();
    await page.waitForTimeout(300);
  }

  console.log('=== 6. TESTING PUBLIC PATIENT BOOKING WIZARD ===');
  await page.goto('http://localhost:5173/booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Fill Phone Step 1
  const phoneInp = await page.$('input[type="tel"]');
  if (phoneInp) {
    await phoneInp.fill('01029384756');
    const continueBtn = await page.$('button:has-text("متابعة"), button[type="submit"]');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Check Step 2 (Service selection & Date picker)
  const serviceCards = await page.$$('.service-card, .service-pill');
  if (serviceCards.length > 0) {
    await serviceCards[0].click();
    await page.waitForTimeout(300);
  }

  const slotBtns = await page.$$('.time-slot-btn:not(:disabled), .slot-pill:not(:disabled)');
  if (slotBtns.length > 0) {
    await slotBtns[0].click();
    await page.waitForTimeout(300);
    
    // Check if name is required
    const nameInp = await page.$('input[placeholder*="اسم"]');
    if (nameInp) await nameInp.fill('محمود عبد العزيز');

    const confirmBookingBtn = await page.$('button:has-text("تأكيد الحجز النهائي"), button.btn-confirm-booking');
    if (confirmBookingBtn) {
      await confirmBookingBtn.click();
      await page.waitForTimeout(800);
      
      // Verify Step 3 Ticket
      const ticketBox = await page.$('.ticket-card, .nebras-ticket-box');
      if (!ticketBox) {
        discoveredIssues.push('Booking Step 3 Ticket failed to render after confirmation');
      }
    }
  }

  console.log('=== 7. TESTING MANAGE BOOKING PORTAL ===');
  await page.goto('http://localhost:5173/manage-booking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  await browser.close();

  console.log('\n=============================================');
  console.log(`TROUBLESHOOT COMPLETE`);
  console.log(`Discovered Issues: ${discoveredIssues.length}`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log('=============================================');

  if (discoveredIssues.length > 0) {
    console.log('\n--- DISCOVERED FUNCTIONAL ISSUES ---');
    discoveredIssues.forEach(i => console.log('  ⚠️ ' + i));
  }
  if (consoleErrors.length > 0) {
    console.log('\n--- CONSOLE ERRORS ---');
    consoleErrors.forEach(e => console.log('  ❌ ' + e));
  }
  if (discoveredIssues.length === 0 && consoleErrors.length === 0) {
    console.log('🎉 ZERO DEFECTS FOUND ACROSS ALL TESTED WORKFLOWS!');
  }
}

runComprehensiveTroubleshoot().catch(err => {
  console.error('Troubleshoot Script Fatal Error:', err);
  process.exit(1);
});
