const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = require('docx');

const primaryColor = '0071E3';
const darkColor = '0F172A';
const grayText = '475569';

function createHeaderP(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: 'Arial',
        color: primaryColor,
        size: level === HeadingLevel.HEADING_1 ? 30 : 25
      })
    ]
  });
}

function createBullet(title, description) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    bullet: { level: 0 },
    spacing: { before: 70, after: 70 },
    children: [
      new TextRun({
        text: title + ': ',
        bold: true,
        font: 'Arial',
        color: darkColor,
        size: 22
      }),
      new TextRun({
        text: description,
        font: 'Arial',
        color: grayText,
        size: 22
      })
    ]
  });
}

function createSubheader(text) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 180, after: 90 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: 'Arial',
        color: '1E3A8A',
        size: 24
      })
    ]
  });
}

function createCallout(text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
            borders: {
              right: { style: BorderStyle.SINGLE, size: 24, color: primaryColor },
              left: { style: BorderStyle.NONE },
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE }
            },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text,
                    bold: true,
                    font: 'Arial',
                    color: '1E40AF',
                    size: 23
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

const doc = new Document({
  title: 'دليل مميزات كلينك فلو لفريق التسويق والمبيعات',
  description: 'الدليل المعتمد لمميزات الأطباء والعيادات لتسويق منظومة كلينك فلو',
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 }
        }
      },
      children: [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 80 },
          children: [
            new TextRun({
              text: 'منظومة كلينك فلو (ClinicFlow)',
              bold: true,
              font: 'Arial',
              color: primaryColor,
              size: 38
            })
          ]
        }),
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
          children: [
            new TextRun({
              text: 'الدليل التسويقي الشامل لمميزات الطبيب والعيادة — نسخة إدارة الساس وفريق التسويق',
              font: 'Arial',
              color: grayText,
              size: 23
            })
          ]
        }),

        createCallout('الجملة البيعية المباشرة للأطباء:\n"كلينك فلو هينظملك صالة الانتظار ويمنع طرق الأبواب، هيقضي على غياب المرضى بتذكيرات تلقائية، وهيظبط الخزينة مع السكرتارية بالقرش، ويوريك أرباحك الصافية على موبايلك — والعيادة شغالة حتى لو النت قطع."'),

        createHeaderP('1. مشاكل الأطباء اليومية وكيف تحلها المنظومة (Pain Points)'),
        createBullet('تكدس صالة الانتظار وطرق الأبواب', 'شاشة دور رقمية حية تنهي الفوضى؛ السكرتارية شايفة مين اللي عليه الدور بدون مقاطعة كشف الطبيب.'),
        createBullet('الكرسي الفاضي وتطنيش المواعيد (No-Shows)', 'تذكير ذكي تلقائي قبل الموعد بـ 24 ساعة يطلب تأكيد الحضور أو الاعتذار، مما يخفض الغياب بنسبة 85%.'),
        createBullet('لخبطة الحسابات والدرج بين السكرتارية', 'ميزة تسليم الوردية ومطابقة الكاش والفيزا بالقرش يومياً مع كل تغيير شفت لمنع أي عجز أو تلاعب.'),
        createBullet('فقدان متابعة تاريخ المريض', 'تسجيل فوري لبيانات التشخيص والملاحظات السريرية بلمسة واحدة مع حماية قانونية تامة للعيادة.'),
        createBullet('انقطاع الإنترنت المفاجئ بالعيادة', 'تقنية العمل دون اتصال (Offline Mode)؛ العيادة تستمر في تسجيل المرضى والمواعيد وتتم المزامنة تلقائياً عند عودة النت.'),

        createHeaderP('2. مميزات الطبيب والعيادة بالتفصيل (Feature Matrix)'),
        createSubheader('أولاً: تنظيم صالة الانتظار ويوم العيادة'),
        createBullet('شاشة الدور الحية', 'عرض فوري للمرضى المتواجدين بالعيادة مرتبين حسب أسبقية الحضور ووقت الحجز.'),
        createBullet('كشف فوري سريع (Walk-in)', 'تسجيل المريض الذي حضر فجأة بدون حجز مسبق في ثانيتين فقط بضغطة زر واحدة.'),
        createBullet('قفل الساعات والإجازات', 'إغلاق أي ساعة أو يوم إجازة كامل بضغطة واحدة من الموبايل لمنع الحجز العام خلالها.'),
        createBullet('أجندة مواعيد تفاعلية', 'تقويم كامل لمواعيد الطبيب (كشوفات، استشارات، متابعات) بألوان مميزة لكل نوع زيارة.'),

        createSubheader('ثانياً: حجز المرضى والقضاء على الغياب'),
        createBullet('رابط حجز خاص بالعيادة', 'المريض يحجز برقم موبايله في 30 ثانية بدون تنزيل تطبيقات وبدون كلمة سر.'),
        createBullet('تذكير تلقائي بالمواعيد', 'رسائل آلية للمريض لتأكيد الحضور أو الاعتذار قبل الموعد بـ 24 ساعة.'),
        createBullet('استرجاع الغائبين', 'رسالة اعتذار لطيفة برابط مباشر للمريض الذي تغيب لاختيار موعد بديل فوراً.'),
        createBullet('إدارة وتعديل الحجز ذاتياً', 'المريض يعتذر أو يغير موعده بنفسه أونلاين، فتحجز مكانه مريضاً آخر مبكراً.'),

        createSubheader('ثالثاً: بيانات المرضى والتشخيص'),
        createBullet('بيانات التشخيص بلمسة', 'استعراض تاريخ تشخيصات المريض السابقة وملاحظات الزيارات بنقرة واحدة.'),
        createBullet('حماية قانونية كاملة', 'توثيق التشخيص والمتابعة دون الدخول في التزامات السجلات الطبية المعقدة.'),
        createBullet('استيراد وتصدير إكسيل', 'نقل آلاف المرضى من دفاتر العيادة القديمة بضغطة زر وتنزيل كامل بيانات العيادة في أي وقت.'),
        createBullet('مراسلة واتساب بضغطة زر', 'فتح محادثة واتساب مع المريض فوراً دون الحاجة لتسجيل رقمه على هاتف العيادة.'),

        createSubheader('رابعاً: الخزينة والأمان المالي'),
        createBullet('تسليم وتقفيل الوردية', 'السكرتارية تطابق فلوس الدرج بالقرش (كاش وفيزا) مع كل تغيير شيفت لمنع أي عجز.'),
        createBullet('صافي أرباحك على موبايلك', 'شاشة حصرية للطبيب يتابع منها صافي دخل اليوم وإيراداته لحظة بلحظة ومن أي مكان.'),
        createBullet('فواتير طبية إلكترونية', 'إصدار إيصالات وفواتير مرقمة باسم العيادة والخدمات المقدمة وتتبع المتبقيات.'),
        createBullet('سرية مالية مطلقة', 'صلاحيات صارمة تمنع موظفي الاستقبال من رؤية أرباح الطبيب أو صافي دخل العيادة.'),

        createSubheader('خامساً: مساعد وسكرتير الطبيب'),
        createBullet('فرز المرضى بلمسة', 'استخراج قوائم المرضى حسب نوع الزيارة أو التشخيص للمتابعة السريعة.'),
        createBullet('سكرتير صامت غير متدخل', 'ينجز المهام الإدارية والروتينية بهدوء وبدون أي تدخل في قرارات الطبيب السريرية.'),
        createBullet('رسائل المتابعة', 'تجهيز رسائل رعاية ومتابعة جماعية لمرضاك بضغطة زر واحدة.'),

        createSubheader('سادساً: المعمل والمخزون وحضور الطاقم'),
        createBullet('متابعة المعمل', 'ربط طلبات التحاليل والأشعة بالتشخيص مع إشعار فوري للطبيب فور جاهزية النتيجة.'),
        createBullet('نواقص المخزون', 'تنبيهات فورية ملونة عند اقتراب نفاد البنج أو الخامات الطبية لإعادة طلبها مسبقاً.'),
        createBullet('حضور وانصراف الطاقم', 'تسجيل حضور وانصراف السكرتارية والتمريض بلمسة واحدة ومتابعة ساعات العمل والانضباط.'),

        createSubheader('سابعاً: الاستمرارية والسمعة'),
        createBullet('تقييمات Google Maps (5 نجوم)', 'توجيه المرضى الراضين لتقييم العيادة على خرائط جوجل لرفع الترتيب، والشكاوى تصل للإدارة سراً.'),
        createBullet('متابعة باقات الجلسات', 'تتبع باقات الليزر والتجميل وتنبيه الاستقبال لو انقطع المريض عن جلسته الدورية.'),
        createBullet('شغال بدون إنترنت (Offline Mode)', 'العيادة لا تتوقف؛ تسجيل الكشوفات والانتظار يستمر حتى لو انقطع النت وتتم المزامنة تلقائياً.'),

        createHeaderP('3. باقات الاشتراك والأسعار المقترحة للبيع'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: '0071E3', type: ShadingType.CLEAR },
                  children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'الباقة', bold: true, color: 'FFFFFF', size: 22 })] })]
                }),
                new TableCell({
                  shading: { fill: '0071E3', type: ShadingType.CLEAR },
                  children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'السعر', bold: true, color: 'FFFFFF', size: 22 })] })]
                }),
                new TableCell({
                  shading: { fill: '0071E3', type: ShadingType.CLEAR },
                  children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'الشريحة المستهدفة', bold: true, color: 'FFFFFF', size: 22 })] })]
                }),
                new TableCell({
                  shading: { fill: '0071E3', type: ShadingType.CLEAR },
                  children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'أهم المزايا المشمولة', bold: true, color: 'FFFFFF', size: 22 })] })]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'باقة البداية (Starter)', bold: true, size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '990 ج.م / شهر', bold: true, color: '059669', size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'العيادات الفردية', size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'تنظيم صالة الانتظار وشاشة الدور، حفظ بيانات التشخيص، 500 تذكير شهرياً، إغلاق الخزينة اليومي، دعم واتساب.', size: 19 })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'باقة الاحتراف (Pro) [الأكثر طلباً]', bold: true, color: '0071E3', size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1,990 ج.م / شهر', bold: true, color: '059669', size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'العيادات التخصصية والمزدحمة', size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'حتى 5 أطباء، تذكيرات واتساب غير محدودة، فحص وتقارير تفصيلية، رابط مخصص باسم عيادتك، دعم متقدم.', size: 19 })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'باقة المراكز (Enterprise)', bold: true, size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '3,990 ج.م / شهر', bold: true, color: '059669', size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'المراكز متعددة الفروع', size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'أطباء وفروع متعددة بلا حدود، نقل البيانات القديمة مجاناً، ربط المعامل والمخزون، مدير حساب مخصص.', size: 19 })] })] })
              ]
            })
          ]
        }),

        createHeaderP('4. زوايا الإعلانات المقترحة (Hooks & Ad Copy)'),
        createBullet('زاوية إرهاق الدكتور (صالة الانتظار)', '"كم مرة الباب خبط عليك وسط الكشف وتركيزك اتشتت؟ مع شاشة الانتظار الحية، السكرتيرة شايفة دور كل مريض والممرات منظمة تماماً."'),
        createBullet('زاوية الخسارة المالية (الكرسي الفاضي)', '"المريض لما يحجز وميجيش.. كرسيك بيفضل فاضي وعيادتك بتخسر. تذكيرات كلينك فلو الآلية بتأكد الحضور قبلها بـ 24 ساعة وتخفض الغياب لـ 85%."'),
        createBullet('زاوية أمان الخزينة (تسليم الدرج)', '"الشيفت بيسلم الشيفت.. والفلوس في الدرج مش مظبوطة؟ زرار تسليم الوردية بيقفل حساب الكاش والفيزا بالقرش ويطلعلك صافي أرباحك على موبايلك."'),
        createBullet('زاوية الخوف من التغيير (الدفاتر القديمة)', '"نفسك تنظم عيادتك بس شايل هم دفاتر السنين اللي فاتت؟ ارفع ملف إكسيل بضغطة زر وفريقنا بينقلك كل بياناتك مجاناً خلال فترة التجربة 14 يوماً."'),

        createHeaderP('5. الرد على اعتراضات الأطباء الشائعة (Objection Handling)'),
        createBullet('لو النت قطع في العيادة، هل الشغل هيقف؟', 'نهائياً! المنظومة مجهزة بتقنية Offline Mode، العيادة بتفضل شغالة وتسجل المرضى عادي، وأول ما النت يرجع المزامنة بتتم تلقائياً.'),
        createBullet('هل السكرتارية هتشوف أرباح العيادة الصافية؟', 'مستحيل! صلاحيات وصول صارمة تفصل موظفي الاستقبال عن الخزينة والتقارير المالية والأرباح، السكرتارية بتشوف المواعيد والانتظار فقط.'),
        createBullet('هل هنحتاج نشتري سيرفرات أو أجهزة كمبيوتر مخصصة؟', 'ولا مليم زيادة! النظام سحابي 100% وبيشتغل مباشرة من المتصفح على أي لابتوب، تابلت، أو موبايل.'),
        createBullet('هل بياناتي محبوسة في السيستم لو حبيت أوقف الاشتراك؟', 'بياناتك ملكك بالكامل. بضغطة زر واحدة تقدر تنزل كل بيانات المرضى والمواعيد والفواتير بملفات إكسيل في أي وقت بدون أي شروط.')
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  const outputPath = 'D:\\clinic-flow-source\\ClinicFlow_Features_Marketing.docx';
  fs.writeFileSync(outputPath, buffer);
  console.log('Successfully generated Word document at:', outputPath);
  console.log('File size:', buffer.length, 'bytes');
}).catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
