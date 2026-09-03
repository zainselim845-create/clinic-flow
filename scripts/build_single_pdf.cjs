const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generateSinglePagePdf() {
  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>قائمة مميزات كلينك فلو - ClinicFlow</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 6mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      background: #FFFFFF;
      color: #1E293B;
      line-height: 1.38;
      font-size: 8.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-wrapper {
      max-width: 100%;
      margin: 0 auto;
    }
    
    /* Header */
    .header {
      border-bottom: 2px solid #0071E3;
      padding-bottom: 8px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-badge {
      background: #0071E3;
      color: #FFFFFF;
      font-weight: 900;
      font-size: 15pt;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: -0.5px;
    }
    .brand-title h1 {
      font-size: 15pt;
      font-weight: 900;
      color: #0F172A;
      line-height: 1.1;
    }
    .brand-title p {
      font-size: 8pt;
      color: #64748B;
      font-weight: 600;
    }
    .header-badge {
      background: #EFF6FF;
      color: #0071E3;
      border: 1px solid #BFDBFE;
      padding: 4px 10px;
      border-radius: 14px;
      font-size: 8pt;
      font-weight: 700;
      text-align: left;
    }

    /* Subtitle Banner */
    .intro-banner {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 5px 10px;
      margin-bottom: 10px;
      font-size: 8.2pt;
      color: #475569;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Grid Sections: 2 columns, 3 rows */
    .sections-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .section-card {
      background: #FFFFFF;
      border: 1.2px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px 10px;
      page-break-inside: avoid;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1.5px solid #F1F5F9;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .section-icon {
      font-size: 11pt;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0F172A;
    }
    .section-card.primary { border-top: 3px solid #0071E3; }
    .section-card.success { border-top: 3px solid #0D9488; }
    .section-card.warning { border-top: 3px solid #D97706; }
    .section-card.indigo { border-top: 3px solid #4F46E5; }
    .section-card.rose { border-top: 3px solid #E11D48; }
    .section-card.slate { border-top: 3px solid #334155; }

    ul.features-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    ul.features-list li {
      position: relative;
      padding-right: 12px;
      font-size: 7.8pt;
      color: #334155;
      line-height: 1.35;
    }
    ul.features-list li::before {
      content: "•";
      position: absolute;
      right: 0;
      color: #0071E3;
      font-weight: 900;
      font-size: 10pt;
      line-height: 1;
      top: 0px;
    }
    .feature-name {
      font-weight: 800;
      color: #0F172A;
    }

    /* Footer */
    .footer {
      margin-top: 8px;
      border-top: 1px solid #E2E8F0;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.2pt;
      color: #94A3B8;
      font-weight: 600;
    }
    .footer strong {
      color: #0071E3;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    
    <!-- Header -->
    <div class="header">
      <div class="logo-area">
        <div class="logo-badge">CF</div>
        <div class="brand-title">
          <h1>كلينك فلو (ClinicFlow)</h1>
          <p>منظومة إدارة العيادات والمراكز الطبية الذكية — الإصدار المؤسسي الشامل</p>
        </div>
      </div>
      <div class="header-badge">
        كتيب ميزات المبيعات والتسويق 📢<br>
        <span style="font-size: 6.8pt; color: #64748B;">ClinicFlow Marketing & Sales Cheat Sheet</span>
      </div>
    </div>

    <!-- Intro Banner -->
    <div class="intro-banner">
      <span>💡 <strong>دليل الميزات المباشر:</strong> مخصص لفريق التسويق والمبيعات لكتابة الإعلانات وصفحات الهبوط والبروشورات الموجهة للأطباء.</span>
      <span style="color: #0071E3; font-weight: 700;">جاهز للطباعة والعرض المباشر</span>
    </div>

    <!-- 6 Core Pillars Grid -->
    <div class="sections-container">

      <!-- 1. الحجز وتجربة المريض -->
      <div class="section-card primary">
        <div class="section-header">
          <span class="section-icon">📱</span>
          <h2 class="section-title">1. الحجز وتجربة المريض أونلاين</h2>
        </div>
        <ul class="features-list">
          <li><span class="feature-name">حجز أونلاين برقم الموبايل فقط:</span> المريض يحجز كشفه في 30 ثانية بدون تحميل تطبيق وبدون باسورد.</li>
          <li><span class="feature-name">إلغاء وتعديل الموعد أونلاين:</span> المريض يغير ميعاده أو يلغيه بنفسه من موبايله في أي وقت دون إحراج أو مكالمات.</li>
          <li><span class="feature-name">تذكرة حجز إلكترونية (#CF-XXXX):</span> كود حجز فريد وتذكرة أنيقة قابلة للطباعة والحفظ زي تذاكر الطيران.</li>
          <li><span class="feature-name">عرض الأسعار والخدمات بوضوح:</span> المريض يشوف سعر كل كشف ومدته بوضوح قبل تأكيد الحجز.</li>
          <li><span class="feature-name">تحديد الحالات الطارئة:</span> زرار خاص للحالات المستعجلة يعطي تنبيه فوري للعيادة ويضع المريض بأول الدور.</li>
          <li><span class="feature-name">التعرف التلقائي على المريض القديم:</span> بمجرد كتابة رقم الهاتف، يسترجع السيستم اسمه وملفه فوراً ويرحب بيه.</li>
        </ul>
      </div>

      <!-- 2. صالة الانتظار وإدارة العيادة -->
      <div class="section-card success">
        <div class="section-header">
          <span class="section-icon">🏥</span>
          <h2 class="section-title">2. صالة الانتظار وإدارة العيادة</h2>
        </div>
        <ul class="features-list">
          <li><span class="feature-name">شاشة انتظار حية (Live Queue):</span> شاشة لحظية توري مين وصل، مين في الانتظار، ومين عليه الدور يدخل للطبيب.</li>
          <li><span class="feature-name">تسجيل حضور سريع (Walk-in):</span> لو مريض دخل العيادة فجأة بدون حجز، السكرتيرة تسجله في ثانيتين بضغطة زر.</li>
          <li><span class="feature-name">أجندة مواعيد ذكية:</span> تقويم تفاعلي كامل يعرض مواعيد اليوم، الأسبوع، والشهور القادمة وساعات الفراغ.</li>
          <li><span class="feature-name">قفل المواعيد وإجازات الطبيب:</span> الدكتور يقدر يقفل أي ساعة أو ياخد إجازة يوم كامل بضغطة واحدة لمنع الحجز فيها.</li>
        </ul>
      </div>

      <!-- 3. الخزينة والفلوس -->
      <div class="section-card warning">
        <div class="section-header">
          <span class="section-icon">💰</span>
          <h2 class="section-title">3. الخزينة والرقابة المالية ومصروفات العيادة</h2>
        </div>
        <ul class="features-list">
          <li><span class="feature-name">تسليم وتقفيل الوردية (Shift Handover):</span> السكرتيرة تقفل وتطابق فلوس الدرج (الكاش والفيزا) بالقرش قبل تسليم الشيفت.</li>
          <li><span class="feature-name">فواتير طبية إلكترونية:</span> إصدار فواتير مرقمة ومطبوعة باسم العيادة، مع حساب الخصومات والمدفوع والمتبقي.</li>
          <li><span class="feature-name">دفتر المصروفات والنثريات:</span> تسجيل أي مبالغ تخرج من العيادة (إيجار، صيانة، مستلزمات، بونص موظفين).</li>
          <li><span class="feature-name">تقرير الأرباح الصافية:</span> شاشة حصرية للدكتور يتابع منها صافي دخل العيادة وأرباحه يوم بيوم من موبايله في أي مكان.</li>
        </ul>
      </div>

      <!-- 4. الكشف والملفات الطبية للطبيب -->
      <div class="section-card indigo">
        <div class="section-header">
          <span class="section-icon">🩺</span>
          <h2 class="section-title">4. الكشف والملفات الطبية والروشتة</h2>
        </div>
        <ul class="features-list">
          <li><span class="feature-name">ملف طبي رقمي (EMR):</span> سجل كامل لكل مريض يشمل كشوفاته السابقة، أدويته، وتاريخ زياراته وصور الأشعة.</li>
          <li><span class="feature-name">روشتة إلكترونية بضغطة زر:</span> كتابة التشخيص وطباعة الروشتة بتصميم معتمد وتحديد ميعاد الاستشارة فورياً.</li>
          <li><span class="feature-name">مخطط أسنان تفاعلي (FDI Dental Chart):</span> (لدكاترة الأسنان) رسمة 32 سن بلمسة واحدة تحدد عليها الحشو والخلع والزراعة بألوان واضحة.</li>
          <li><span class="feature-name">مساعد طبي بالذكاء الاصطناعي:</span> دكتور يسأله بالصوت أو الكتابة: "طلعلي مرضى السكر" أو "اقفل الخميس" وينفذ في الأجندة فوراً.</li>
          <li><span class="feature-name">كاشف تعارض الأدوية:</span> تنبيه سريري ذكي يحذر الدكتور لو كتب دواء يتعارض مع حالة المريض الصحية.</li>
        </ul>
      </div>

      <!-- 5. التسويق وزيادة الدخل -->
      <div class="section-card rose">
        <div class="section-header">
          <span class="section-icon">🚀</span>
          <h2 class="section-title">5. التسويق ومضاعفة دخل العيادة (CRM)</h2>
        </div>
        <ul class="features-list">
          <li><span class="feature-name">تذكير تلقائي بالمواعيد عبر رسائل SMS:</span> رسائل تذكير SMS شيك ومخصصة تتبعت للمريض قبل ميعاده علشان ميكسلش أو ينسى.</li>
          <li><span class="feature-name">استرجاع المرضى المتغيبين (No-Show):</span> رسالة SMS سريعة للاعتذار ورابط مباشر للمريض اللي غاب يختار ميعاد بديل فوراً.</li>
          <li><span class="feature-name">فلتر تقييمات Google Maps (5 نجوم):</span> المريض المبسوط السيستم يوجهه تلقائياً لتقييم العيادة على خرائط جوجل، والشكاوى تروح للدكتور سراً.</li>
          <li><span class="feature-name">متابعة باقات الجلسات (Packages):</span> متابعة باقات الليزر والتجميل، وتنبيه لو المريض اتأخر عن جلسته الدورية.</li>
          <li><span class="feature-name">استرجاع الحجوزات التايهة (Leads):</span> لو مريض دخل كتب رقمه ومكملش الحجز، السيستم بيسجله علشان السكرتارية تتابعه.</li>
          <li><span class="feature-name">مراسلة SMS بضغطة واحدة:</span> إرسال رسائل SMS فورية للمريض مباشرة من السيستم بضغطة زر.</li>
        </ul>
      </div>

      <!-- 6. الأمان والتقنية -->
      <div class="section-card slate">
        <div class="section-header">
          <span class="section-icon">🔒</span>
          <h2 class="section-title">6. الأمان والتقنية والعمل دون إنترنت</h2>
        </div>
        <ul class="features-list">
          <li><span class="feature-name">صلاحيات صارمة للسكرتارية:</span> حجب أرباح العيادة الصافية والإعدادات الحساسة عن موظفي الاستقبال.</li>
          <li><span class="feature-name">نواقص المخزون الطبي:</span> تنبيه فوري أول ما البنج أو الخامات أو المستلزمات تقرب تخلص لمنع العجز المفاجئ.</li>
          <li><span class="feature-name">شغال حتى لو النت قطع (Offline Mode):</span> العيادة بتفضل شغالة وتسجل الحالات، وأول ما النت يرجع كل حاجة بتتسجل في السحابة أوتوماتيك.</li>
          <li><span class="feature-name">زرار بحث سريع شامل (Ctrl + K):</span> سرش لحظي يجيب أي مريض، موعد، أو فاتورة في أقل من ثانية.</li>
        </ul>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <span>منظومة <strong>ClinicFlow</strong> — الإصدار المؤسسي للعيادات والمراكز الطبية</span>
      <span>جميع الحقوق محفوظة © 2026 • Live Demo: https://clinic-flow-lh3g.vercel.app</span>
    </div>

  </div>
</body>
</html>`;

  fs.writeFileSync('temp_features_single.html', htmlContent, 'utf8');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const page = await browser.newPage();
  await page.goto('file:///' + path.resolve('temp_features_single.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  
  const pdfPath = path.resolve('ClinicFlow_Marketing_Features.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '6mm',
      bottom: '6mm',
      left: '8mm',
      right: '8mm'
    }
  });

  await browser.close();
  try { fs.unlinkSync('temp_features_single.html'); } catch(_) {}
  try { fs.unlinkSync('scripts/run_generate_pdf.cjs'); } catch(_) {}
  console.log('Single-page PDF generated successfully at:', pdfPath);
}

generateSinglePagePdf().catch(console.error);
