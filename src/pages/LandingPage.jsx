import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, ShieldCheck, Sparkles, 
  ArrowLeft, CheckCircle2, ChevronDown, 
  Phone, Lock, Activity, DollarSign, Cpu, 
  Clock, Building2, Calendar, Sun, Moon, 
  Menu, X, Mail
} from 'lucide-react';
import { getWhatsAppSupportUrl } from '../utils/utmTracking';
import { safeSetItem } from '../utils/safeStorage';
import './LandingPage.css';

const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'باقة البداية (Starter)',
    badge: 'للعيادات الفردية',
    price: '990',
    currency: 'ج.م / شهرياً',
    description: 'تنظيم صالة الانتظار والروشتات وإنهاء الفوضى الدفترية تماماً.',
    features: [
      'تنظيم صالة الانتظار — شاشة دور رقمية تنهي التكدس وإزعاج السكرتارية',
      'روشتة إلكترونية بباركود وسجل مرضي EMR — مع 500 تذكير واتساب وSMS شهرياً',
      'إغلاق الخزينة اليومي — حساب فوري للإيراد مع دعم فني مباشر عبر واتساب'
    ],
    highlight: false,
    cta: 'ابدأ تنظيم عيادتك مجاناً'
  },
  {
    id: 'pro',
    name: 'باقة الاحتراف (Pro)',
    badge: 'الأكثر طلباً للعيادات التخصصية',
    price: '1,990',
    currency: 'ج.م / شهرياً',
    description: 'القضاء على غياب المرضى، وتصفية حسابات الأطباء الشركاء تلقائياً.',
    features: [
      'حتى 5 أطباء مع استقبال غير محدود — وتذكيرات واتساب غير محدودة لمنع الغياب',
      'فحص التعارضات الدوائية بالذكاء الاصطناعي — مع مخطط أسنان وسجلات تخصصية',
      'حساب تلقائي لنسب الأطباء الشركاء — ودومين مستقل بالكامل باسم عيادتك'
    ],
    highlight: true,
    cta: 'شغّل باقة الاحتراف الآن'
  },
  {
    id: 'enterprise',
    name: 'باقة المراكز والمستشفيات (Enterprise)',
    badge: 'للمجمعات والمراكز متعددة الفروع',
    price: '3,990',
    currency: 'ج.م / شهرياً',
    description: 'ربط الفروع، ونقل السجلات القديمة مجاناً بصلاحيات مشددة.',
    features: [
      'أطباء وفروع متعددة بلا حدود — ونقل كامل لملفاتك الورقية والإكسيل مجاناً',
      'صلاحيات صارمة تفصل الطبي عن المالي — مع ذكاء اصطناعي لبروتوكولات المركز',
      'ربط مع التأمين وبوابات الدفع — مع مدير حساب طبي مخصص واتفاقية SLA 99.99%'
    ],
    highlight: false,
    cta: 'احجز استشارة للمركز الطبي'
  }
];

const FAQ_ITEMS = [
  {
    q: 'هل بيانات مرضاي وسجلاتي الطبية في أمان تام؟',
    a: 'نعم، 100%. النظام مطبق عليه معايير تشفير بنكية (AES-256) وعزل تام لقواعد البيانات (Multi-Tenant Isolation). لا يمكن لأي عيادة أخرى أو طرف ثالث الاطلاع على سجلاتك أو أسرار مرضاك.'
  },
  {
    q: 'هل أقدر أصدر بياناتي لو حبيت أوقف الاشتراك في أي وقت؟',
    a: 'بياناتك ملكك بالكامل. بضغطة زر واحدة يمكنك تحميل كل سجلات المرضى، المواعيد، والفواتير بملفات Excel و CSV جاهزة بدون أي قيود أو شروط جزائية.'
  },
  {
    q: 'عيادتنا تعمل بالدفاتر والورق، كيف سننقل السجلات القديمة؟',
    a: 'المنظومة تحتوي على أداة استيراد إكسيل ذكية تنقل آلاف المرضى في ثوانٍ. كما يقدم فريق الدعم الفني خدمة المساعدة في نقل السجلات والتهيئة المبدئية مجاناً.'
  },
  {
    q: 'إذا انقطع الإنترنت فجأة في العيادة، هل يتوقف العمل؟',
    a: 'لا، المنظومة تعمل بتقنية PWA وتحفظ البيانات محلياً على جهازك. يمكنك متابعة الكشف وتسجيل الملاحظات واستعراض قائمة الانتظار، وتتم المزامنة تلقائياً بمجرد عودة الاتصال.'
  },
  {
    q: 'هل يرى موظف الاستقبال أو التمريض أرباح العيادة أو تفاصيل الكشف؟',
    a: 'إطلاقاً. النظام يعتمد صلاحيات دقيقة (RBAC). الاستقبال يرى صالة الانتظار والمواعيد فقط، بينما الروشتات، التشخيصات، ودخل الخزينة محجوبة ومخصصة للطبيب والمدير المالي.'
  },
  {
    q: 'كيف تساعد المنظومة في القضاء على غياب المرضى عن مواعيدهم (No-Shows)؟',
    a: 'النظام يرسل رسائل تذكير آلية لطيفة عبر الواتساب وSMS قبل الموعد بـ 24 ساعة برابط مباشر لتأكيد الحضور أو الاعتذار، مما يتيح للعيادة استغلال الوقت الشاغر فوراً.'
  },
  {
    q: 'هل نحتاج لشراء أجهزة حاسوب باهظة أو سيرفر خاص؟',
    a: 'نهائياً. كلينيك فلو سحابي بالكامل ويعمل مباشرة من المتصفح على أي لابتوب، جهاز كمبيوتر مكتبي، تابلت، أو حتى من هاتفك الذكي.'
  },
  {
    q: 'هل توجد عقود سنوية إلزامية أو شروط جزائية عند الإلغاء؟',
    a: 'لا توجد أي التزامات معقدة. الاشتراكات شهرية أو سنوية بمرونة تامة وبدون أي رسوم خفية. يمكنك إلغاء الاشتراك في أي وقت تشاء.'
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [faqOpen, setFaqOpen] = useState({ 0: true });
  const [expandAllFaqs, setExpandAllFaqs] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dark Mode Toggle for Landing Page
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  const toggleLandingTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', nextTheme);
    safeSetItem('clinicflow_theme', nextTheme);
  };

  // Newsletter Signup State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('idle');
  const [newsletterError, setNewsletterError] = useState('');

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail || !/^\S+@\S+\.\S+$/.test(newsletterEmail)) {
      setNewsletterError('يرجى إدخال عنوان بريد إلكتروني صالح.');
      setNewsletterStatus('error');
      return;
    }
    setNewsletterStatus('loading');
    setNewsletterError('');
    setTimeout(() => {
      setNewsletterStatus('success');
      setNewsletterEmail('');
    }, 700);
  };

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleAllFaqs = () => {
    if (expandAllFaqs) {
      setFaqOpen({});
      setExpandAllFaqs(false);
    } else {
      const allOpen = {};
      FAQ_ITEMS.forEach((_, idx) => { allOpen[idx] = true; });
      setFaqOpen(allOpen);
      setExpandAllFaqs(true);
    }
  };

  // SEO: Inject FAQPage JSON-LD structured data for Google rich results
  const faqSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  });

  return (
    <div className="clinicflow-landing-container" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
      
      {/* 1. TOP NAVBAR */}
      <header className="landing-navbar">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand" aria-label="الصفحة الرئيسية لكلينيك فلو">
            <div className="brand-logo-badge">
              <Stethoscope size={22} />
            </div>
            <div className="brand-titles">
              <span className="brand-name">كلينيك فلو</span>
              <span className="brand-tag">ClinicFlow • Enterprise Medical SaaS</span>
            </div>
          </Link>

          <nav className="landing-nav-links" aria-label="أقسام الصفحة الرئيسية">
            <a href="#features" className="nav-link">المميزات الأساسية</a>
            <a href="#pricing" className="nav-link">باقات الاشتراك</a>
            <a href="#faq" className="nav-link">الأسئلة الشائعة</a>
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <div className="logged-in-nav-group">
                {(user.role === 'super_admin' || user.isSuperAdmin) ? (
                  <>
                    <button onClick={() => navigate('/super-admin')} className="btn-nav-saas-admin" title="التحكم السحابي للمنصة">
                      <ShieldCheck size={15} />
                      <span>إدارة الساس (SaaS Admin)</span>
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="btn-nav-dashboard">
                      <Building2 size={15} />
                      <span>لوحة العيادات</span>
                    </button>
                  </>
                ) : (
                  <button onClick={() => navigate('/dashboard')} className="btn-nav-dashboard">
                    <span>لوحة تحكم عيادتك</span>
                    <ArrowLeft size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="guest-nav-group">
                <button onClick={() => navigate('/login?portal=clinic')} className="btn-nav-login" title="تسجيل دخول الأطباء وطاقم العيادات">
                  <Building2 size={14} />
                  <span>دخول العيادات</span>
                </button>
                <button onClick={() => navigate('/login?tab=register')} className="btn-nav-register">
                  <Sparkles size={14} />
                  <span>ابدأ تجربتك المجانية</span>
                </button>
              </div>
            )}

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleLandingTheme}
              className="landing-theme-toggle-btn"
              title={isDarkMode ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الداكن'}
              aria-label="تبديل الوضع الليلي"
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="landing-hamburger-btn"
              aria-expanded={isMobileMenuOpen}
              aria-label="قائمة التنقل للموبايل"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="landing-mobile-menu-drawer">
            <nav className="mobile-nav-links">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>المميزات الأساسية</a>
              <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)}>باقات الاشتراك</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)}>الأسئلة الشائعة</a>
            </nav>
            <div className="mobile-nav-actions">
              <button onClick={() => { navigate('/login?portal=clinic'); setIsMobileMenuOpen(false); }} className="btn-hero-secondary">
                <Building2 size={15} />
                <span>دخول العيادات</span>
              </button>
              <button onClick={() => { navigate('/login?tab=register'); setIsMobileMenuOpen(false); }} className="btn-hero-primary">
                <Sparkles size={15} />
                <span>ابدأ تجربتك المجانية</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="landing-hero-section">
        <div className="hero-background-glow"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} className="badge-sparkle-icon" />
            <span>منظومة الإدارة السريرية والتشغيلية للأطباء</span>
          </div>

          <h1 className="hero-headline">
            أنت تركز على فحص المريض — <br />
            <span className="google-hero-focus gradient-text">والمنظومة تدير باقي التفاصيل.</span>
          </h1>

          <p className="hero-subheadline">
            وداعاً لاختفاء الملفات وتكدس صالة الانتظار. استقبل مرضاك بهدوء، اطبع روشتاتك بضغطة زر، واضبط خزينة العيادة يومياً دون دفاتر حسابات.
          </p>

          <div className="hero-objection-bar">
            <span>بدون بطاقة ائتمان — تجربة مجانية 14 يوماً — نقل بياناتك القديمة مجاناً</span>
          </div>

          <div className="hero-cta-group">
            <button onClick={() => navigate('/login?tab=register')} className="btn-hero-primary">
              <Sparkles size={18} />
              <span>ابدأ تنظيم عيادتك مجاناً</span>
              <ArrowLeft size={18} />
            </button>
            <a href="#features" className="btn-hero-secondary" style={{ textDecoration: 'none' }}>
              <span>شاهد كيف تعمل المنظومة</span>
            </a>
          </div>

          <div className="hero-portal-pills-row">
            <span className="pills-label">بوابات الدخول السريع:</span>
            <button onClick={() => navigate('/login?portal=clinic')} className="hero-portal-pill clinic-pill" title="دخول أطباء وموظفي العيادات">
              <Building2 size={13} />
              <span>دخول الأطباء وطاقم العيادة</span>
            </button>
            <span className="pill-dot">•</span>
            <button onClick={() => navigate('/login?portal=admin')} className="hero-portal-pill saas-pill" title="لوحة التحكم السحابية للمدير العام">
              <ShieldCheck size={13} />
              <span>إدارة المنصة (SaaS Admin)</span>
            </button>
          </div>

          <div className="hero-trust-metrics">
            <div className="trust-item">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>تذكير تلقائي عبر واتساب — تقليل غياب المرضى بنسبة 85%</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>روشتة وسجل مرضي EMR — فحص فوري للتعارضات الدوائية</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>تصفية يومية للخزينة — وحساب دقيق لنسب الأطباء دون دفاتر</span>
            </div>
          </div>
        </div>

        {/* HERO INTERACTIVE SHOWCASE PREVIEW (Mini Cockpit) */}
        <div className="hero-showcase-wrapper">
          <div className="showcase-window">
            <div className="showcase-window-bar">
              <div className="window-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="window-url-bar">
                <Lock size={12} className="text-emerald-500" />
                <span>https://dr-ahmed-dental.clinicflow.app/dashboard</span>
              </div>
              <span className="showcase-live-pill">● متصل ومباشر</span>
            </div>

            <div className="showcase-cockpit-preview">
              {/* Card 1: Waiting Room Stream */}
              <div className="cockpit-preview-card">
                <div className="c-card-header">
                  <div className="c-icon-badge blue">
                    <Clock size={16} />
                  </div>
                  <strong>صالة الانتظار الرقمية</strong>
                  <span className="c-count-pill">3 حالات</span>
                </div>
                <div className="c-card-body">
                  <div className="c-patient-row in-exam">
                    <span className="c-row-badge">جاري الفحص</span>
                    <span className="c-row-name">عمر عبد العزيز</span>
                    <span className="c-row-time">منذ 15 د</span>
                  </div>
                  <div className="c-patient-row waiting">
                    <span className="c-row-badge wait">انتظار #1</span>
                    <span className="c-row-name">مينا سمير</span>
                    <span className="c-row-time">05:30 م</span>
                  </div>
                  <div className="c-patient-row waiting">
                    <span className="c-row-badge wait">انتظار #2</span>
                    <span className="c-row-name">ياسمين عادل</span>
                    <span className="c-row-time">06:00 م</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Active Clinical Record */}
              <div className="cockpit-preview-card active-exam-card">
                <div className="c-card-header">
                  <div className="c-icon-badge purple">
                    <Stethoscope size={16} />
                  </div>
                  <strong>الفحص السريري والروشتة</strong>
                  <span className="c-active-pill">غرفة الكشف 1</span>
                </div>
                <div className="c-card-body">
                  <div className="c-diagnosis-box">
                    <span className="c-lbl">التشخيص:</span>
                    <strong>تسوس عميق بالضرس 46 مع التهاب عصب</strong>
                  </div>
                  <div className="c-treatment-tags">
                    <span className="c-tag">علاج جذور روتاري</span>
                    <span className="c-tag">حشو تجميلي</span>
                    <span className="c-tag">طربوش زيركون</span>
                  </div>
                  <div className="c-exam-footer-note">
                    <span>فحص التعارضات الدوائية: آمن 100%</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Financial & Smart Engine */}
              <div className="cockpit-preview-card">
                <div className="c-card-header">
                  <div className="c-icon-badge green">
                    <DollarSign size={16} />
                  </div>
                  <strong>الخزينة وتصفية الإيراد</strong>
                  <span className="c-status-pill-green">مسدد وموثق</span>
                </div>
                <div className="c-card-body">
                  <div className="c-revenue-stat">
                    <span className="c-stat-label">إيراد اليوم المحصل:</span>
                    <strong className="c-stat-amount">2,450 ج.م</strong>
                  </div>
                  <div className="c-stat-progress-bar">
                    <div className="c-stat-progress-fill" style={{ width: '85%' }}></div>
                  </div>
                  <div className="c-meta-notes">
                    <span>تأكيد المواعيد: 18 رسالة</span>
                    <span>نسب الأطباء: محسوبة تلقائياً</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ENTERPRISE SAAS FEATURES GRID */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-pill">المميزات المصممة ليومك الطبي</span>
          <h2 className="section-title">أقل وقت على الإدارة — أعلى وقت مع المريض</h2>
          <p className="section-desc">
            ست أدوات عملية حلت المشاكل اليومية التي تضيع وقت الطبيب وتشتت تركيزه:
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon bg-blue">
              <Clock size={26} />
            </div>
            <h3>صالة انتظار منظمة — بدون تكدس أو إزعاج</h3>
            <p>
              شاشة دور رقمية توضح من في الفحص ومن التالي. تنتهي فوضى الممرات وطرق الأبواب على الطبيب أثناء الكشف.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-emerald">
              <Phone size={26} />
            </div>
            <h3>حضور المواعيد في وقتها — بتذكيرات واتساب الذكية</h3>
            <p>
              رسالة آلية لطيفة تطلب تأكيد الحضور أو الاعتذار قبل الموعد بـ 24 ساعة — لحماية كرسيك من أن يظل شاغراً.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-purple">
              <Activity size={26} />
            </div>
            <h3>روشتة وسجل مرضي EMR — لا تضيع ولا تتلف</h3>
            <p>
              تاريخ المريض وعلاجاته السابقة بلمسة واحدة، مع روشتة مطبوعة بباركود رسمي تمنع أي لبس في الصيدلية.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-cyan">
              <Cpu size={26} />
            </div>
            <h3>فحص التعارضات الدوائية — أمان سريري مضاعف</h3>
            <p>
              محرك ذكاء اصطناعي ينبهك فوراً إذا تعارض الدواء مع حساسية المريض أو علاجاته الحالية — حماية مضاعفة لك ولمريضك.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-amber">
              <DollarSign size={26} />
            </div>
            <h3>تصفية الخزينة يومياً — ونسب الشركاء محسوبة آلياً</h3>
            <p>
              إغلاق فوري للخزينة بنهاية اليوم. تصفية نسب الأطباء الزائرين وحسابات المعامل تتم تلقائياً دون دفاتر حسابات.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-rose">
              <ShieldCheck size={26} />
            </div>
            <h3>خصوصية مطلقة — بيانات مرضاك ملكك وحدك</h3>
            <p>
              صلاحيات صارمة تفصل موظف الاستقبال عن السجلات الطبية. بيانات عيادتك مشفرة ولا يراها أي طرف ثالث.
            </p>
          </div>
        </div>
      </section>

      {/* 4. PRICING SECTION */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <span className="section-pill">باقات الاشتراك والتسعير</span>
          <h2 className="section-title">اختر الباقة المناسبة لحجم عيادتك</h2>
          <p className="section-desc">
            بدون عقود طويلة الأجل — إلغاء في أي وقت — تجربة مجانية 14 يوماً تشمل تدريب طاقمك كاملاً.
          </p>
        </div>

        <div className="pricing-cards-grid">
          {PRICING_PLANS.map(plan => (
            <div key={plan.id} className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`}>
              {plan.highlight && (
                <div className="plan-ribbon">الأكثر طلباً</div>
              )}
              <div className="plan-header">
                <span className="plan-badge">{plan.badge}</span>
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-desc">{plan.description}</p>
                <div className="plan-price-box">
                  <span className="price-num">{plan.price}</span>
                  <span className="price-currency">{plan.currency}</span>
                </div>
              </div>

              <ul className="plan-features-list">
                {plan.features.map((feat, i) => (
                  <li key={i} className="plan-feat-item">
                    <CheckCircle2 size={16} className="feat-check" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="plan-cta">
                <button 
                  onClick={() => {
                    if (plan.id === 'enterprise') {
                      window.open(getWhatsAppSupportUrl('مرحباً، أود الاستفسار عن باقة المراكز والمستشفيات في منصة ClinicFlow'), '_blank');
                    } else {
                      navigate(`/login?tab=register&plan=${plan.id}`);
                    }
                  }} 
                  className={`btn-plan-select ${plan.highlight ? 'primary' : 'outline'}`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DIRECT CLOSE SECTION */}
      <section className="landing-direct-close">
        <div className="direct-close-card">
          <span className="close-pill">قرار اليوم يوفر ساعات كل أسبوع</span>
          <h2 className="close-headline">الطبيب يعالج — والمنظومة تدير.</h2>
          <p className="close-sub">
            وفر أكثر من ساعة يومياً من العمل الإداري والدفاتر، وامنح مرضاك تجربة العيادة الحديثة التي تليق بهم.
          </p>
          <div className="close-objections">
            <span>بدون بطاقة ائتمان</span>
            <span>•</span>
            <span>تشغيل في 3 دقائق</span>
            <span>•</span>
            <span>نقل بياناتك القديمة مجاناً</span>
          </div>
          <div className="close-actions">
            <button onClick={() => navigate('/login?tab=register')} className="btn-hero-primary">
              <Sparkles size={18} />
              <span>ابدأ تنظيم عيادتك مجاناً (14 يوماً)</span>
              <ArrowLeft size={18} />
            </button>
            <a 
              href={getWhatsAppSupportUrl('مرحباً، أود استشارة سريعة حول تشغيل منظومة كلينيك فلو في عيادتي')} 
              target="_blank" 
              rel="noreferrer"
              className="btn-hero-secondary"
              style={{ textDecoration: 'none' }}
            >
              <Phone size={16} />
              <span>تحدث مع استشاري العيادات</span>
            </a>
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section id="faq" className="faq-section">
        <div className="section-header">
          <span className="section-pill">الأسئلة الأكثر شيوعاً</span>
          <h2 className="section-title">إجابات واضحة على كل ما يهمك</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary, #71717A)' }}>
              <Calendar size={14} />
              <span>آخر تحديث: 30 سبتمبر 2026</span>
            </div>
            <button 
              type="button"
              onClick={toggleAllFaqs}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '5px 14px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #CBD5E1',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{expandAllFaqs ? 'طي كافة الأسئلة' : 'توسيع كافة الأسئلة'}</span>
            </button>
          </div>
        </div>

        <div className="faq-accordion">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className={`faq-item ${faqOpen[idx] ? 'open' : ''}`}>
              <button 
                type="button"
                onClick={() => toggleFaq(idx)} 
                className="faq-question"
                aria-expanded={Boolean(faqOpen[idx])}
                aria-controls={`faq-answer-${idx}`}
              >
                <span>{item.q}</span>
                <ChevronDown size={18} className="faq-chevron" />
              </button>
              {faqOpen[idx] && (
                <div className="faq-answer" id={`faq-answer-${idx}`} role="region" aria-label={item.q}>
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. NEWSLETTER SIGNUP */}
      <section className="newsletter-section" style={{ padding: '3.5rem 1.5rem', backgroundColor: isDarkMode ? '#18181B' : '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '4px 14px', borderRadius: '20px', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', fontSize: '0.82rem', fontWeight: 700, marginBottom: '1rem' }}>
            <Mail size={15} />
            <span>مجتمع أطباء كلينيك فلو</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.75rem', color: 'inherit' }}>
            انضم لنخبة الأطباء والاستشاريين في تطوير العيادات
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary, #64748B)', lineHeight: '1.6', margin: '0 0 1.5rem' }}>
            نشاركك أسبوعياً أحدث استراتيجيات إدارة العيادات، تنظيم صالة الانتظار، وطرق القضاء على غياب المرضى بدون أي إزعاج دعائي.
          </p>

          {newsletterStatus === 'success' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '12px 24px', borderRadius: '12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontWeight: 700, fontSize: '0.92rem', animation: 'fadeInUp 0.3s ease' }}>
              <CheckCircle2 size={20} className="text-emerald-600" />
              <span>تم اشتراكك بنجاح! ستصلك رسالة ترحيبية وتحديثاتنا الطبية فور صدورها.</span>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '480px', margin: '0 auto', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="أدخل بريدك الإلكتروني (e.g. doctor@clinic.com)..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  minWidth: '240px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: isDarkMode ? '#27272A' : '#FFFFFF',
                  color: 'inherit'
                }}
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                style={{
                  padding: '12px 22px',
                  borderRadius: '10px',
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {newsletterStatus === 'loading' ? (
                  <span>جاري الاشتراك...</span>
                ) : (
                  <>
                    <span>اشتراك مجاني</span>
                    <ArrowLeft size={16} />
                  </>
                )}
              </button>
            </form>
          )}
          {newsletterError && (
            <p style={{ color: '#EF4444', fontSize: '0.82rem', marginTop: '8px' }}>{newsletterError}</p>
          )}
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand-col">
            <Link to="/" className="landing-brand" aria-label="الصفحة الرئيسية لكلينيك فلو">
              <div className="brand-logo-badge">
                <Stethoscope size={20} className="text-primary-brand" />
              </div>
              <div className="brand-titles">
                <span className="brand-name">كلينيك فلو</span>
                <span className="brand-tag">ClinicFlow SaaS</span>
              </div>
            </Link>
            <p className="footer-about">
              المنظومة السحابية المتكاملة للأطباء الاستشاريين والمراكز الطبية التخصصية. 
              صممت لترسيخ الهدوء السريري، حماية الإيرادات، وتوفير تجربة مريحة للمريض والطبيب.
            </p>
            <div className="footer-badges">
              <span className="compliance-tag">HIPAA Compliant</span>
              <span className="compliance-tag">AES-256 Encryption</span>
              <span className="compliance-tag">99.99% Uptime</span>
            </div>
          </div>

          <div className="footer-links-col">
            <h4>مميزات المنظومة</h4>
            <ul>
              <li><a href="#features">تنظيم صالة الانتظار</a></li>
              <li><a href="#features">محرك منع غياب المرضى</a></li>
              <li><a href="#features">الروشتة والسجل الطبي EMR</a></li>
              <li><a href="#features">الخزينة ونسب الشركاء</a></li>
              <li><a href="#features">فحص التعارضات الدوائية</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>إدارة العيادة</h4>
            <ul>
              <li><Link to="/login?tab=register">تسجيل عيادة جديدة (14 يوماً مجاناً)</Link></li>
              <li><Link to="/login?portal=clinic">تسجيل دخول الأطباء والطاقم</Link></li>
              <li><a href="#pricing">باقات الاشتراك والتسعير</a></li>
              <li><a href={getWhatsAppSupportUrl('مرحباً، أود التواصل مع فريق الدعم الفني لمنظومة ClinicFlow')} target="_blank" rel="noreferrer">الدعم الفني المباشر (واتساب)</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>المنصة والأمان</h4>
            <ul>
              <li><Link to="/login?portal=admin">بوابة إدارة المنصة (Admin)</Link></li>
              <li><a href="#faq">الأسئلة الشائعة والضمانات</a></li>
              <li><a href="#features">معايير عزل وتشفير البيانات</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} جميع الحقوق محفوظة لشركة كلينيك فلو (ClinicFlow Technologies Ltd).</p>
          <p className="footer-dev-tag">Enterprise Multi-Tenant Medical Cloud • Dedicated Clinic Portals.</p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
