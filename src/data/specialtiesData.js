export const CLINIC_SPECIALTIES = [
  // ==========================================
  // 1. تخصصات طب وجراحة الأسنان (Dental)
  // ==========================================
  {
    id: 'general_dentistry',
    name: 'طب وجراحة الفم والأسنان العام',
    category: 'dental',
    iconName: 'Smile',
    badge: 'شامل',
    description: 'كشف تشخيصي، حشوات تجميلية، علاج عصب، تركيبات وتنظيف جير',
    defaultServices: [
      { id: 'srv-gen-1', name: 'كشف وفحص تشخيصي شامل للأسنان', price: '300 ج.م', duration: 30, description: 'فحص سريري كامل للأسنان واللثة مع خطة علاجية' },
      { id: 'srv-gen-2', name: 'جلسة تنظيف وتلميع وإزالة جير الأسنان', price: '400 ج.م', duration: 30, description: 'إزالة الرواسب الجيرية بالألتراسونيك وتلميع الأسنان' },
      { id: 'srv-gen-3', name: 'حشو تجميلي ضوئي كومبوزيت ليزر', price: '500 ج.م', duration: 30, description: 'ترميم السن بحشوة مطابقة للون الطبيعي تماماً' },
      { id: 'srv-gen-4', name: 'علاج جذور وعصب السن (RCT)', price: '900 ج.م', duration: 45, description: 'سحب العصب وتطهير وحشو القنوات العصبية' },
      { id: 'srv-gen-5', name: 'طربوش / تاج زيركون تجميلي عالي الدقة', price: '1800 ج.م', duration: 45, description: 'تاج زيركون الماني عالي الصلابة والجمالية' },
      { id: 'srv-gen-6', name: 'خلع ضرس عادي أو مخلخل بدون ألم', price: '400 ج.م', duration: 25, description: 'خلع جراحي بسيط مع تخدير موضعي آمن' },
      { id: 'srv-gen-7', name: 'تبييض أسنان احترافي بالعيادة (Laser/LED)', price: '2000 ج.م', duration: 45, description: 'تفتيح ناصع للأسنان بجلسة واحدة فورية' }
    ],
    defaultVisitTypes: [
      { name: 'كشف وتشخيص أسنان', value: 0, color: '#3b82f6' },
      { name: 'جلسة علاج عصب / حشو', value: 0, color: '#10b981' },
      { name: 'بروفة تركيبات / مقاسات', value: 0, color: '#8b5cf6' },
      { name: 'طوارئ ألم أسنان حاد', value: 0, color: '#ef4444' }
    ]
  },
  {
    id: 'orthodontics',
    name: 'تقويم الأسنان والفكين (Orthodontics)',
    category: 'dental',
    iconName: 'Activity',
    badge: 'تخصصي',
    description: 'تقويم ثابت ومتحرك، شفاف، وضبط إطباق الفكين للأطفال والبالغين',
    defaultServices: [
      { id: 'srv-ortho-1', name: 'استشارة وفحص تقويم الأسنان والفكين', price: '350 ج.م', duration: 30, description: 'دراسة قياسات الفكين والصور الشعاعية لتحديد الخطة' },
      { id: 'srv-ortho-2', name: 'جلسة شد وضبط تقويم دورية (شهري)', price: '300 ج.م', duration: 20, description: 'تغيير الأسلاك والربطات المطاطية ومتابعة تقدم الحركة' },
      { id: 'srv-ortho-3', name: 'تركيب جهاز تقويم معدني كامل للفكين', price: '6000 ج.م', duration: 60, description: 'تثبيت الحاصرات التقويمية على الأسنان بدقة' },
      { id: 'srv-ortho-4', name: 'تركيب مثبت تقويم نهائي (Retainer)', price: '900 ج.م', duration: 30, description: 'مثبت شفاف أو سلكي دائم لمنع انتكاس الأسنان' }
    ],
    defaultVisitTypes: [
      { name: 'استشارة تقويم أولية', value: 0, color: '#3b82f6' },
      { name: 'جلسة شد تقويم شهرية', value: 0, color: '#10b981' },
      { name: 'تركيب جهاز جديد', value: 0, color: '#8b5cf6' },
      { name: 'طوارئ سلك / حاصرة مكسورة', value: 0, color: '#ef4444' }
    ]
  },
  {
    id: 'implantology',
    name: 'زراعة الأسنان وجراحة الوجه والفكين',
    category: 'dental',
    iconName: 'ShieldCheck',
    badge: 'جراحي',
    description: 'زراعة الغرسات التيتانيوم، رفع الجيوب، وتطعيم العظام',
    defaultServices: [
      { id: 'srv-imp-1', name: 'فحص وتخطيط زراعة موجهة مع CBCT', price: '400 ج.م', duration: 30, description: 'دراسة كثافة العظم والتخطيط الجراحي الرقمي' },
      { id: 'srv-imp-2', name: 'زراعة غرسة سن تيتانيوم ألماني/سويسري', price: '7500 ج.م', duration: 45, description: 'تثبيت الزرعة جراحياً مع ضمان مدى الحياة' },
      { id: 'srv-imp-3', name: 'خلع ضرس عقل جراحي مدفون بالعظم', price: '1200 ج.م', duration: 40, description: 'جراحة خلع دقيقة للضرس المنحشر' },
      { id: 'srv-imp-4', name: 'زراعة وتطعيم عظم الفك التجميلي', price: '3000 ج.م', duration: 45, description: 'بناء دعامة عظمية قبل أو مع الزراعة' }
    ],
    defaultVisitTypes: [
      { name: 'كشف وتخطيط زراعة', value: 0, color: '#3b82f6' },
      { name: 'جلسة جراحة زراعة / خلع', value: 0, color: '#ef4444' },
      { name: 'فك غرز ومتابعة التئام', value: 0, color: '#10b981' },
      { name: 'أخذ مقاسات التركيبة النهائية', value: 0, color: '#8b5cf6' }
    ]
  },
  {
    id: 'endodontics',
    name: 'علاج جذور وعصب الأسنان المجهري',
    category: 'dental',
    iconName: 'Crosshair',
    badge: 'مجهري',
    description: 'علاج العصب تحت الميكروسكوب وإعادة علاج القنوات المسدودة',
    defaultServices: [
      { id: 'srv-endo-1', name: 'تشخيص ألم العصب واختبار الحيوية', price: '350 ج.م', duration: 30, description: 'فحص مجهري لتحديد مصدر الألم الحاد' },
      { id: 'srv-endo-2', name: 'علاج عصب مجهري روتاري لضرس متعدد القنوات', price: '1200 ج.م', duration: 45, description: 'تنظيف وتطهير وحشو القنوات العصبية المعقدة' },
      { id: 'srv-endo-3', name: 'إعادة علاج عصب سابق معقد (Retreatment)', price: '1500 ج.م', duration: 60, description: 'إزالة الحشو القديم وإعادة بناء السن' }
    ],
    defaultVisitTypes: [
      { name: 'كشف وتشخيص ألم عصب', value: 0, color: '#3b82f6' },
      { name: 'جلسة روتاري وتنظيف قنوات', value: 0, color: '#10b981' },
      { name: 'جلسة حشو عصب نهائي', value: 0, color: '#8b5cf6' },
      { name: 'طوارئ تسكين خراج وألم شديد', value: 0, color: '#ef4444' }
    ]
  },
  {
    id: 'prosthodontics',
    name: 'تركيبات وتجميل الأسنان وهوليوود سمايل',
    category: 'dental',
    iconName: 'Sparkles',
    badge: 'تجميلي',
    description: 'عدسات فينير، إيماكس، تصميم الابتسامة الرقمي والجسور',
    defaultServices: [
      { id: 'srv-pros-1', name: 'جلسة تصميم الابتسامة الرقمية (Smile Design)', price: '500 ج.م', duration: 40, description: 'تصوير فوتوغرافي وتخطيط هندسي لابتسامة متناسقة' },
      { id: 'srv-pros-2', name: 'عدسة فينير E-max خزفية تجميلية للسن الواحد', price: '2500 ج.م', duration: 45, description: 'عدسة سيراميك فائقة الشفافية والجمال' },
      { id: 'srv-pros-3', name: 'طربوش زيركون الماني للضروس الخلفية', price: '2000 ج.م', duration: 45, description: 'تاج زيركون كامل مخصص لتحمل قوى المضغ' }
    ],
    defaultVisitTypes: [
      { name: 'استشارة وتصميم الابتسامة', value: 0, color: '#3b82f6' },
      { name: 'جلسة تحضير وبرد ومقاسات', value: 0, color: '#10b981' },
      { name: 'بروفة نهائية وتثبيت الفينير', value: 0, color: '#8b5cf6' }
    ]
  },
  {
    id: 'pedodontics',
    name: 'طب أسنان الأطفال (Pedodontics)',
    category: 'dental',
    iconName: 'Heart',
    badge: 'أطفال',
    description: 'عناية وقائية وعلاجية خاصة بأسنان الأطفال بأسلوب نفسي ودود',
    defaultServices: [
      { id: 'srv-ped-1', name: 'كشف أسنان أطفال وتهيئة نفسية ودودة', price: '250 ج.م', duration: 30, description: 'فحص ممتع لكسر حاجز الخوف لدى الطفل' },
      { id: 'srv-ped-2', name: 'جلسة تطبيق الفلورايد الوقائي المركز', price: '300 ج.م', duration: 20, description: 'تقوية مينا الأسنان اللبنية وحمايتها من التسوس' },
      { id: 'srv-ped-3', name: 'حشو عصب أطفال وبتر لبي (Pulpotomy)', price: '450 ج.م', duration: 30, description: 'علاج عصب الأسنان اللبنية دون ألم' },
      { id: 'srv-ped-4', name: 'طربوش ستانلس ستيل لحماية الضرس اللبني', price: '550 ج.م', duration: 30, description: 'تاج مخصص للأطفال للحفاظ على السن حتى التبديل' }
    ],
    defaultVisitTypes: [
      { name: 'كشف وتهيئة طفل', value: 0, color: '#3b82f6' },
      { name: 'جلسة علاج وحشو لبني', value: 0, color: '#10b981' },
      { name: 'جلسة فلورايد ووقاية', value: 0, color: '#8b5cf6' }
    ]
  },

  // ==========================================
  // 2. تخصصات الطب البشري العام (Medical)
  // ==========================================
  {
    id: 'internal_medicine',
    name: 'الطب الباطني والجهاز الهضمي والكبد',
    category: 'medical',
    iconName: 'Stethoscope',
    badge: 'باطنة',
    description: 'أمراض باطنة عامة، ارتفاع ضغط الدم، السكري، والجهاز الهضمي',
    defaultServices: [
      { id: 'srv-int-1', name: 'كشف واستشارة باطنة تخصصية شاملة', price: '300 ج.م', duration: 30, description: 'فحص سريري ومراجعة شاملة للأعراض والتحاليل' },
      { id: 'srv-int-2', name: 'متابعة ضغط وسكر وأمراض مزمنة', price: '200 ج.م', duration: 20, description: 'ضبط جرعات الأدوية والاطمئنان على المؤشرات الحيوية' },
      { id: 'srv-int-3', name: 'فحص سونار بالموجات فوق الصوتية للبطن والحوض', price: '450 ج.م', duration: 30, description: 'فحص الكبد، الكلى، المرارة، والبنكرياس بالسونار' }
    ],
    defaultVisitTypes: [
      { name: 'كشف باطنة أول مرة', value: 0, color: '#3b82f6' },
      { name: 'استشارة ومتابعة تحاليل', value: 0, color: '#10b981' },
      { name: 'فحص سونار بطن', value: 0, color: '#8b5cf6' },
      { name: 'طوارئ ارتفاع ضغط / سكر', value: 0, color: '#ef4444' }
    ]
  },
  {
    id: 'dermatology',
    name: 'الجلدية والتناسلية والتجميل والليزر',
    category: 'medical',
    iconName: 'Sparkles',
    badge: 'جلدية',
    description: 'علاج الأمراض الجلدية، حب الشباب، تساقط الشعر، وإجراءات الليزر',
    defaultServices: [
      { id: 'srv-derm-1', name: 'كشف جلدية وفحص دقيق بالديرموسكوب', price: '350 ج.م', duration: 30, description: 'تشخيص الأمراض الجلدية والشعر والأظافر' },
      { id: 'srv-derm-2', name: 'جلسة تنظيف عميق وهيدرافيشل للبشرة', price: '600 ج.م', duration: 45, description: 'تنظيف مسام وتقشير وتغذية مصل للبشرة' },
      { id: 'srv-derm-3', name: 'حقن بوتوكس / فيلر تجميلي علاجي', price: '2000 ج.م', duration: 30, description: 'إزالة التجاعيد وتنسيق ملامح الوجه' }
    ],
    defaultVisitTypes: [
      { name: 'كشف جلدية', value: 0, color: '#3b82f6' },
      { name: 'جلسة ليزر / فراكشنال', value: 0, color: '#8b5cf6' },
      { name: 'جلسة حقن ميزو / بوتوكس', value: 0, color: '#10b981' },
      { name: 'متابعة واستشارة', value: 0, color: '#06b6d4' }
    ]
  },
  {
    id: 'pediatrics',
    name: 'طب الأطفال وحديثي الولادة',
    category: 'medical',
    iconName: 'Heart',
    badge: 'أطفال',
    description: 'متابعة نمو الطفل، التطعيمات، حساسية الصدر، وأمراض الأطفال',
    defaultServices: [
      { id: 'srv-pedia-1', name: 'كشف أطفال عام وفحص علامات النمو', price: '250 ج.م', duration: 25, description: 'قياس الوزن والطول ومحيط الرأس ومراجعة التطور الحركي' },
      { id: 'srv-pedia-2', name: 'استشارة ومتابعة رضاعة وتغذية علاجية', price: '150 ج.م', duration: 20, description: 'برامج غذائية مخصصة لحديثي الولادة والرضع' },
      { id: 'srv-pedia-3', name: 'جلسة استنشاق نيبولايزر لحساسية الصدر', price: '100 ج.م', duration: 20, description: 'توسيع الشعب الهوائية وتسكين أزمات الربو' }
    ],
    defaultVisitTypes: [
      { name: 'كشف أطفال أول مرة', value: 0, color: '#3b82f6' },
      { name: 'متابعة دورية وتطعيمات', value: 0, color: '#10b981' },
      { name: 'طوارئ حرارة ونزلة معوية', value: 0, color: '#ef4444' }
    ]
  },
  {
    id: 'orthopedics',
    name: 'جراحة العظام والمفاصل والعمود الفقري',
    category: 'medical',
    iconName: 'Shield',
    badge: 'عظام',
    description: 'علاج آلام المفاصل والخشونة، الغضروف، والكسور وإصابات الملاعب',
    defaultServices: [
      { id: 'srv-ortho-med-1', name: 'كشف واستشارة جراحة عظام ومفاصل', price: '350 ج.م', duration: 30, description: 'فحص ميكانيكي للمفاصل والأربطة ومراجعة الأشعة السينية' },
      { id: 'srv-ortho-med-2', name: 'حقن مفصل الركبة الموضعي (هيالورونيك / بلازما)', price: '1200 ج.م', duration: 30, description: 'حقن علاجي لخشونة الركبة وتجديد السائل الزلالي' },
      { id: 'srv-ortho-med-3', name: 'تجبير وتثبيت كسر جبيرة خفيفة', price: '500 ج.م', duration: 30, description: 'تثبيت آمن وسريع للكسور والالتواءات' }
    ],
    defaultVisitTypes: [
      { name: 'كشف عظام أول مرة', value: 0, color: '#3b82f6' },
      { name: 'جلسة حقن مفصل', value: 0, color: '#8b5cf6' },
      { name: 'متابعة والتئام كسور', value: 0, color: '#10b981' },
      { name: 'طوارئ كدمات وكسور', value: 0, color: '#ef4444' }
    ]
  },
  {
    id: 'ophthalmology',
    name: 'طب وجراحة العيون والليزر',
    category: 'medical',
    iconName: 'Eye',
    badge: 'عيون',
    description: 'فحص قاع العين، قياس النظر، المياه البيضاء، وتصحيح الإبصار',
    defaultServices: [
      { id: 'srv-eye-1', name: 'كشف عيون متكامل وقياس حدة الإبصار', price: '300 ج.م', duration: 30, description: 'فحص القرنية، ضغط العين، وتحديد مقاس النظارة بالكمبيوتر' },
      { id: 'srv-eye-2', name: 'فحص قاع العين والشبكية بالمصباح الشقي', price: '400 ج.م', duration: 25, description: 'فحص شبكية العين لمريض السكر وتأثير الضغط' }
    ],
    defaultVisitTypes: [
      { name: 'كشف عيون وقياس نظر', value: 0, color: '#3b82f6' },
      { name: 'فحص قاع عين', value: 0, color: '#8b5cf6' },
      { name: 'متابعة بعد عملية', value: 0, color: '#10b981' }
    ]
  },
  {
    id: 'obstetrics_gynecology',
    name: 'النساء والتوليد ورعاية الحوامل وعلاج العقم',
    category: 'medical',
    iconName: 'Heart',
    badge: 'نساء وتوليد',
    description: 'متابعة الحمل بالسونار، تأخر الإنجاب، والولادة الطبيعية والقيصرية',
    defaultServices: [
      { id: 'srv-ob-1', name: 'كشف واستشارة نساء وتوليد تخصصية', price: '350 ج.م', duration: 30, description: 'فحص سريري واستشارة شاملة لصحة المرأة' },
      { id: 'srv-ob-2', name: 'فحص سونار دوبلر ملون 4D للجنين', price: '600 ج.م', duration: 35, description: 'متابعة نمو الجنين وتشريح الأعضاء والتغذية الدموية' }
    ],
    defaultVisitTypes: [
      { name: 'متابعة حمل دورية', value: 0, color: '#3b82f6' },
      { name: 'كشف نساء وتأخر إنجاب', value: 0, color: '#8b5cf6' },
      { name: 'طوارئ آلام ولادة ونزيف', value: 0, color: '#ef4444' }
    ]
  }
];
