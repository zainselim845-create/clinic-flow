const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generateBwPdf() {
  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>قائمة مميزات كلينك فلو - ClinicFlow</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 16mm 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
      background: #FFFFFF;
      color: #000000;
      line-height: 1.5;
      font-size: 9.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      position: relative;
    }
    .page:last-child {
      page-break-after: avoid;
    }

    /* Header */
    .header {
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      font-size: 16pt;
      font-weight: 900;
      color: #000000;
      line-height: 1.2;
    }
    .header p {
      font-size: 8.5pt;
      color: #444444;
      font-weight: 600;
      margin-top: 2px;
    }
    .header-tag {
      font-size: 8.5pt;
      font-weight: 700;
      color: #000000;
      border: 1px solid #000000;
      padding: 4px 10px;
      border-radius: 4px;
      text-align: left;
    }

    .intro-box {
      border: 1px solid #777777;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 8.5pt;
      color: #222222;
      background: #FAFAFA;
      border-radius: 4px;
    }

    /* Stacked Sections */
    .sections-wrapper {
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex-grow: 1;
    }
    .section-block {
      border: 1px solid #000000;
      border-radius: 4px;
      padding: 10px 14px;
      background: #FFFFFF;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #000000;
      border-bottom: 1px solid #CCCCCC;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }

    ul.features-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    ul.features-list li {
      position: relative;
      padding-right: 14px;
      font-size: 8.8pt;
      color: #111111;
      line-height: 1.45;
    }
    ul.features-list li::before {
      content: "-";
      position: absolute;
      right: 2px;
      color: #000000;
      font-weight: 900;
    }
    .feature-title {
      font-weight: 800;
      color: #000000;
    }

    /* Footer */
    .footer {
      border-top: 1px solid #000000;
      padding-top: 6px;
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #444444;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: Sections 1, 2, 3 -->
  <div class="page">
    <div class="header">
      <div>
        <h1>كلينك فلو (ClinicFlow)</h1>
        <p>منظومة إدارة العيادات والمراكز الطبية — الدليل التسويقي والمبيعات</p>
      </div>
      <div class="header-tag">
        دليل المميزات التشغيلية (1 / 2)
      </div>
    </div>

    <div class="intro-box">
      <strong>ملخص المميزات التنفيذية:</strong> دليل الميزات المباشر لفرق المبيعات والتسويق لإعداد العروض التجارية وصفحات الهبوط وحملات الأطباء والمراكز الطبية.
    </div>

    <div class="sections-wrapper">

      <!-- Section 1 -->
      <div class="section-block">
        <h2 class="section-title">1. الحجز وتجربة المريض أونلاين</h2>
        <ul class="features-list">
          <li><span class="feature-title">حجز أونلاين برقم الموبايل فقط:</span> المريض يحجز كشفه في 30 ثانية دون الحاجة لتحميل أي تطبيق أو إنشاء كلمة مرور.</li>
          <li><span class="feature-title">إلغاء وتعديل الموعد أونلاين:</span> إمكانية تعديل وقت الموعد أو إلغائه ذاتياً من الهاتف في أي وقت وبكل سهولة.</li>
          <li><span class="feature-title">تذكرة حجز إلكترونية (كود مرجعي):</span> إصدار تذكرة رقمية رسمية تتضمن بيانات الموعد والعيادة قابلة للطباعة والحفظ.</li>
          <li><span class="feature-title">عرض الرسوم والخدمات مسبقاً:</span> إظهار سعر كل كشف أو خدمة طبية والمدة المقررة بوضوح قبل تأكيد الحجز.</li>
          <li><span class="feature-title">تحديد الحالات الطارئة:</span> خاصية مخصصة للحالات المستعجلة تنبه الاستقبال فوراً وتضع المريض في أولوية الدور.</li>
          <li><span class="feature-title">التعرف التلقائي على المريض السابق:</span> استرجاع بيانات المريض وملفه فور كتابة رقم الهاتف دون تكرار الإدخال.</li>
        </ul>
      </div>

      <!-- Section 2 -->
      <div class="section-block">
        <h2 class="section-title">2. صالة الانتظار وإدارة العيادة اليومية</h2>
        <ul class="features-list">
          <li><span class="feature-title">شاشة انتظار حية:</span> متابعة لحظية لتسجيل الحضور، قائمة صالة الانتظار، والدور الحالي لغرفة الكشف.</li>
          <li><span class="feature-title">تسجيل حضور فوري (Walk-in):</span> إدخال الحالات الواردة دون موعد مسبق بضغطة زر وتوليد ملف طبي لها فوراً.</li>
          <li><span class="feature-title">أجندة مواعيد متكاملة:</span> تقويم زمني مرن يعرض جدول اليوم، الأسبوع، وساعات الفراغ بدقة عالية.</li>
          <li><span class="feature-title">حظر المواعيد وإجازات الطبيب:</span> حظر ساعات محددة أو تسجيل إجازات كاملة للطبيب ومنع الحجز العام خلالها.</li>
        </ul>
      </div>

      <!-- Section 3 -->
      <div class="section-block">
        <h2 class="section-title">3. الخزينة والرقابة المالية ومصروفات العيادة</h2>
        <ul class="features-list">
          <li><span class="feature-title">تسليم وتقفيل الوردية:</span> مطابقة نقدية الخزينة والكاش والمدفوعات الإلكترونية بدقة تامة قبل تبديل الشيفت.</li>
          <li><span class="feature-title">فواتير طبية إلكترونية:</span> إصدار وطباعة فواتير مرقمة ومعتمدة تشمل الخصومات والمبالغ المتبقية والتحصيل.</li>
          <li><span class="feature-title">دفتر المصروفات والنثريات:</span> تسجيل كافة المصروفات التشغيلية (إيجار، مستلزمات، صيانة، مكافآت) لحساب المصروفات.</li>
          <li><span class="feature-title">تقرير صافي الأرباح:</span> متابعة دورية للطبيب لمعرفة صافي أرباح العيادة والإيرادات اليومية في أي وقت.</li>
        </ul>
      </div>

    </div>

    <div class="footer">
      <span>منظومة ClinicFlow — الإدارة الطبية والسريرية المتكاملة</span>
      <span>الصفحة 1 من 2</span>
    </div>
  </div>

  <!-- PAGE 2: Sections 4, 5, 6 -->
  <div class="page">
    <div class="header">
      <div>
        <h1>كلينك فلو (ClinicFlow)</h1>
        <p>منظومة إدارة العيادات والمراكز الطبية — الدليل التسويقي والمبيعات</p>
      </div>
      <div class="header-tag">
        دليل المميزات التشغيلية (2 / 2)
      </div>
    </div>

    <div class="sections-wrapper">

      <!-- Section 4 -->
      <div class="section-block">
        <h2 class="section-title">4. الكشف والملفات الطبية والروشتة</h2>
        <ul class="features-list">
          <li><span class="feature-title">ملف طبي إلكتروني شامل (EMR):</span> سجل تاريخي متكامل يضم الزيارات، التشخيصات السابقة، الأدوية، والأشعة المرفقة.</li>
          <li><span class="feature-title">روشتة إلكترونية للطباعة:</span> كتابة الأدوية والجرعات وطباعة روشتة معتمدة وتحديد ميعاد الاستشارة فورياً.</li>
          <li><span class="feature-title">مخطط أسنان تفاعلي (FDI Chart):</span> رسم توضيحي لـ 32 سناً لعيادات الأسنان لتسجيل الحشوات، الجذور، والزراعة بلمسة واحدة.</li>
          <li><span class="feature-title">مساعد طبي بالذكاء الاصطناعي:</span> نظام أوامر بالصوت والكتابة باللغة العربية للبحث في السجلات وإدارة جدول المواعيد.</li>
          <li><span class="feature-title">كاشف تعارض الأدوية:</span> تنبيه سريري آلي يحذر الطبيب في حال تعارض الدواء الموصوف مع حالة المريض الصحية.</li>
        </ul>
      </div>

      <!-- Section 5 -->
      <div class="section-block">
        <h2 class="section-title">5. التسويق ومضاعفة دخل العيادة (CRM)</h2>
        <ul class="features-list">
          <li><span class="feature-title">تذكير تلقائي بالمواعيد عبر رسائل SMS:</span> رسائل تذكير نصية دورية قبل الموعد للحد من تغيب ونسيان المرضى.</li>
          <li><span class="feature-title">استرجاع المرضى المتغيبين (No-Show):</span> إرسال رسائل SMS سريعة باعتذار ورابط مباشر لإعادة جدولة الموعد فوراً.</li>
          <li><span class="feature-title">توجيه التقييمات الإيجابية لخرائط جوجل:</span> توجيه المرضى الراضين لكتابة تقييماتهم على Google Maps، وإرسال الملاحظات للإدارة سراً.</li>
          <li><span class="feature-title">متابعة باقات الجلسات المتعددة:</span> متابعة باقات التجميل والعلاج الطبيعي وتنبيه الاستقبال حال انقطاع المريض عن استكمال جلساته.</li>
          <li><span class="feature-title">استرجاع الحجوزات غير المكتملة:</span> حفظ أرقام المرضى الذين بدأوا الحجز ولم يكملوه لتسهيل متابعتهم هاتفياً.</li>
          <li><span class="feature-title">مراسلة SMS مباشرة بضغطة واحدة:</span> إرسال رسائل SMS نصية للمريض مباشرة من شاشة النظام دون تعقيد.</li>
        </ul>
      </div>

      <!-- Section 6 -->
      <div class="section-block">
        <h2 class="section-title">6. الأمان والتقنية والعمل دون اتصال</h2>
        <ul class="features-list">
          <li><span class="feature-title">صلاحيات محددة لطاقم العمل:</span> حجب الأرقام المالية وإعدادات العيادة الحساسة عن موظفي الاستقبال وقصرها على الإدارة.</li>
          <li><span class="feature-title">نواقص المخزون والمستلزمات:</span> تنبيه آلي عند اقتراب نفاد المواد الطبية ومستلزمات الفحص لإعادة الطلب مبكراً.</li>
          <li><span class="feature-title">استمرارية العمل دون إنترنت (Offline Mode):</span> استمرار تسجيل المرضى والكشوفات محلياً مع المزامنة التلقائية فور عودة الإنترنت.</li>
          <li><span class="feature-title">محرك بحث سريع شامل (Ctrl + K):</span> نافذة بحث فورية للوصول لأي ملف مريض، حجز، أو فاتورة في أجزاء من الثانية.</li>
        </ul>
      </div>

    </div>

    <div class="footer">
      <span>منظومة ClinicFlow — جميع الحقوق محفوظة © 2026 • https://clinic-flow-lh3g.vercel.app</span>
      <span>الصفحة 2 من 2</span>
    </div>
  </div>

</body>
</html>`;

  fs.writeFileSync('temp_bw.html', htmlContent, 'utf8');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const page = await browser.newPage();
  await page.goto('file:///' + path.resolve('temp_bw.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  
  const pdfPath = path.resolve('ClinicFlow_Features_BW.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '12mm',
      right: '12mm'
    }
  });

  // Overwrite the main PDF as well
  fs.copyFileSync(pdfPath, 'ClinicFlow_Marketing_Features.pdf');

  await browser.close();
  try { fs.unlinkSync('temp_bw.html'); } catch(_) {}
  console.log('B&W Stacked PDF generated successfully at:', pdfPath);
}

generateBwPdf().catch(console.error);
