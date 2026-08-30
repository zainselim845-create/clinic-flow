export const CLINIC_SPECIALTIES = [
  {
    id: 'general_dentistry',
    name: 'طب وجراحة الفم والأسنان العام',
    category: 'dental',
    description: 'كشف تشخيصي، حشوات تجميلية، علاج عصب، تركيبات وتنظيف جير',
    defaultServices: [
      { id: 'srv-1', name: 'كشف وفحص تشخيصي شامل للأسنان', price: '300 ج.م', duration: 30, description: 'فحص شامل للفم والأسنان واللثة مع خطة العلاج' },
      { id: 'srv-2', name: 'جلسة تنظيف وتلميع وإزالة جير الأسنان', price: '400 ج.م', duration: 30, description: 'تنظيف عميق بجهاز الألتراسونيك وإزالة التصبغات' },
      { id: 'srv-3', name: 'حشو تجميلي كومبوزيت ليزر', price: '500 ج.م', duration: 30, description: 'ترميم السن بحشوة ضوئية مطابقة للون الطبيعي' },
      { id: 'srv-4', name: 'علاج جذور وعصب السن (RCT)', price: '900 ج.م', duration: 45, description: 'تنظيف وحشو القنوات العصبية بأحدث الأجهزة' },
      { id: 'srv-5', name: 'طربوش / تاج زيركون تجميلي عالي الدقة', price: '1800 ج.م', duration: 45, description: 'تاج زيركون الماني لحماية السن وتجميل المظهر' },
      { id: 'srv-6', name: 'خلع ضرس عادي أو مخلخل', price: '400 ج.م', duration: 25, description: 'خلع آمن ومريح مع تخدير موضعي' },
      { id: 'srv-7', name: 'تبييض أسنان احترافي بالعيادة (Laser/LED)', price: '2000 ج.م', duration: 45, description: 'تفتيح درجات لون الأسنان بجلسة واحدة فورية' }
    ]
  },
  {
    id: 'orthodontics',
    name: 'تقويم الأسنان والفكين (Orthodontics)',
    category: 'dental',
    description: 'تقويم ثابت، شفاف، وتعديل إطباق الفكين للأطفال والبالغين',
    defaultServices: [
      { id: 'srv-ortho-1', name: 'استشارة وفحص تقويم الأسنان والفكين', price: '350 ج.م', duration: 30, description: 'دراسة قياسات الفكين وتحديد الخطة التقويمية' },
      { id: 'srv-ortho-2', name: 'جلسة شد ومتابعة تقويم دورية', price: '300 ج.م', duration: 20, description: 'تغيير الأسلاك والربطات المطاطية ومتابعة الحركة' },
      { id: 'srv-ortho-3', name: 'تركيب جهاز تقويم معدني كامل', price: '6000 ج.م', duration: 60, description: 'تركيب حاصرات التقويم للفكين العلوي والسفلي' },
      { id: 'srv-ortho-4', name: 'تركيب مثبت تقويم دائم أو متحرك (Retainer)', price: '900 ج.م', duration: 30, description: 'تثبيت النتائج بعد انتهاء مرحلة التقويم' }
    ]
  },
  {
    id: 'implantology',
    name: 'زراعة الأسنان وجراحة الوجه والفكين',
    category: 'dental',
    description: 'زراعة الأسنان، رفع الجيوب الفكية، وخلع ضروس العقل الجراحية',
    defaultServices: [
      { id: 'srv-imp-1', name: 'فحص وتخطيط زراعة الأسنان الموجهة', price: '400 ج.م', duration: 30, description: 'مراجعة الأشعة المقطعية CBCT والتخطيط الجراحي' },
      { id: 'srv-imp-2', name: 'زراعة سن ألماني/سويسري عالي الجودة', price: '7500 ج.م', duration: 45, description: 'غرس وتثبيت الزرعة التيتانيوم جراحياً' },
      { id: 'srv-imp-3', name: 'خلع ضرس عقل جراحي مدفون', price: '1200 ج.م', duration: 40, description: 'جراحة خلع دقيقة للضرس المنحشر أو العظمي' },
      { id: 'srv-imp-4', name: 'زراعة عظم وتطعيم الفك', price: '3000 ج.م', duration: 45, description: 'ترميم ودعم عظام الفك قبل أو أثناء الزراعة' }
    ]
  },
  {
    id: 'endodontics',
    name: 'علاج جذور وعصب الأسنان (Endodontics)',
    category: 'dental',
    description: 'علاج العصب بالميكروسكوب وإعادة علاج الحالات المعقدة',
    defaultServices: [
      { id: 'srv-endo-1', name: 'كشف وفحص عصب الأسنان وتشخيص الألم', price: '350 ج.م', duration: 30, description: 'اختبار حيوية العصب وأشعة تشخيصية متخصصة' },
      { id: 'srv-endo-2', name: 'علاج عصب ضرس متعدد القنوات روتاري', price: '1200 ج.م', duration: 45, description: 'تنظيف وتطهير وحشو القنوات العصبية بالكامل' },
      { id: 'srv-endo-3', name: 'إعادة علاج عصب سابق معقد (Retreatment)', price: '1500 ج.م', duration: 60, description: 'إزالة الحشو القديم وعلاج الالتهاب الذروي' }
    ]
  },
  {
    id: 'prosthodontics',
    name: 'تركيبات وتجميل الأسنان والفينير (Prosthodontics)',
    category: 'dental',
    description: 'فينير، ابتسامة هوليوود، وجسور الأسنان الثابتة والمتحركة',
    defaultServices: [
      { id: 'srv-pros-1', name: 'كشف وتصميم الابتسامة (Smile Design)', price: '500 ج.م', duration: 40, description: 'تصوير احترافي وتخطيط تجميلي للأسنان واللثة' },
      { id: 'srv-pros-2', name: 'عدسة فينير E-max تجميلية للسن الواحد', price: '2500 ج.م', duration: 45, description: 'عدسة خزفية فائقة الدقة والشفافية' },
      { id: 'srv-pros-3', name: 'طربوش زيركون الماني عالي الصلابة', price: '2000 ج.م', duration: 45, description: 'تاج زيركون كامل مخصص للضروس والأسنان' }
    ]
  },
  {
    id: 'pedodontics',
    name: 'طب أسنان الأطفال (Pedodontics)',
    category: 'dental',
    description: 'عناية خاصة بأسنان الأطفال، وقاية، وتعديل سلوك',
    defaultServices: [
      { id: 'srv-ped-1', name: 'كشف أسنان أطفال وتهيئة نفسية', price: '250 ج.م', duration: 30, description: 'فحص لطيف بدون خوف لتقييم صحة الفم' },
      { id: 'srv-ped-2', name: 'جلسة تطبيق الفلورايد الوقائي', price: '300 ج.م', duration: 20, description: 'حماية الأسنان اللبنية من التسوس' },
      { id: 'srv-ped-3', name: 'طربوش ستانلس ستيل للأطفال (Crown)', price: '550 ج.م', duration: 30, description: 'حماية الضرس اللبني المعالج' },
      { id: 'srv-ped-4', name: 'حافظ مسافة لأسنان الأطفال', price: '700 ج.م', duration: 30, description: 'الحفاظ على مكان الضرس الدائم عند الخلع المبكر' }
    ]
  },
  {
    id: 'internal_medicine',
    name: 'الطب الباطني والجهاز الهضمي',
    category: 'medical',
    description: 'أمراض باطنة، ضغط وسكر، كبد وجهاز هضمي',
    defaultServices: [
      { id: 'srv-int-1', name: 'كشف واستشارة باطنة عامة', price: '300 ج.م', duration: 30, description: 'فحص سريري ومراجعة التحاليل والفحوصات' },
      { id: 'srv-int-2', name: 'متابعة ضغط وسكر وأمراض مزمنة', price: '200 ج.م', duration: 20, description: 'متابعة دورية وتعديل الجرعات الدوائية' },
      { id: 'srv-int-3', name: 'رسم قلب وتخطيط دوري', price: '250 ج.م', duration: 20, description: 'تخطيط كهربائية القلب والاطمئنان' }
    ]
  },
  {
    id: 'dermatology',
    name: 'الجلدية والتجميل والليزر',
    category: 'medical',
    description: 'علاج الأمراض الجلدية، العناية بالبشرة، والليزر',
    defaultServices: [
      { id: 'srv-derm-1', name: 'كشف جلدية وفحص دقيق للبشرة', price: '300 ج.م', duration: 30, description: 'تشخيص الحبوب، التصبغات، والأمراض الجلدية' },
      { id: 'srv-derm-2', name: 'جلسة تنظيف عميق وتقشير للبشرة', price: '600 ج.م', duration: 40, description: 'تنظيف وتقشير علاجي وتجديد نضارة الوجه' }
    ]
  }
];
