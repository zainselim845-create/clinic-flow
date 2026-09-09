import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, ShieldCheck, Sparkles, Globe, 
  ArrowLeft, CheckCircle2, ChevronDown, 
  Search, MapPin, Phone, Lock, 
  Activity, DollarSign, Cpu, Award, Clock
} from 'lucide-react';
import { matchesSpecialtyFilter } from '../utils/specialtyUtils';
import './LandingPage.css';

const SPECIALTY_OPTIONS = [
  'الكل',
  'طب وجراحة الأسنان',
  'الأمراض الجلدية والتجميل',
  'طب الأطفال وحديثي الولادة',
  'جراحة العظام والمفاصل',
  'طب وجراحة العيون',
  'أمراض الباطنة والقلب'
];

const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'باقة البداية (Starter)',
    badge: 'للعيادات الفردية',
    price: '990',
    currency: 'ج.م / شهرياً',
    description: 'مثالية للأطباء الراغبين في رقمنة عياداتهم وإيقاف الاعتماد على السجلات الورقية.',
    features: [
      'طبيب واحد + موظف استقبال',
      'سب دومين خاص مجاني (yourname.clinicflow.app)',
      'نظام حجز إلكتروني ذكي بالهاتف',
      'سجل طبي إلكتروني EMR أساسي',
      'إشعارات الرسائل القصيرة SMS (500 رسالة/شهر)',
      'فواتير وسندات قبض إلكترونية',
      'دعم فني عبر واتساب'
    ],
    highlight: false,
    cta: 'ابدأ تجربتك المجانية (14 يوماً)'
  },
  {
    id: 'pro',
    name: 'باقة الاحتراف (Pro)',
    badge: 'الأكثر طلباً بين الأطباء والاستشاريين ✨',
    price: '1,990',
    currency: 'ج.م / شهرياً',
    description: 'الخيار الأمثل للعيادات المتوسعة ومراكز الأسنان والجلدية التي تبحث عن أقصى كفاءة.',
    features: [
      'حتى 5 أطباء + طاقم غير محدود',
      'دومين مخصص كامل (yourclinic.com) مع SSL تلقائي',
      'مخطط أسنان تفاعلي وسجل إكلينيكي متقدم',
      'وكيل الذكاء الاصطناعي الطبي (Doctor AI Copilot)',
      'محرك منع غياب المرضى التلقائي (No-Show Engine)',
      'إدارة المخزون والمستهلكات ومعامل التركيبات',
      'رسائل SMS تذكيرية غير محدودة',
      'تقارير مالية وتوزيع أرباح الشركاء'
    ],
    highlight: true,
    cta: 'اختر باقة الاحتراف الآن'
  },
  {
    id: 'enterprise',
    name: 'باقة المراكز والمستشفيات (Enterprise)',
    badge: 'للمجمعات والمراكز الكبرى',
    price: '3,990',
    currency: 'ج.م / شهرياً',
    description: 'حلول مخصصة وشاملة لإدارة الفروع المتعددة والمستشفيات التخصصية.',
    features: [
      'أطباء وفروع غير محدودة',
      'نقل البيانات التاريخية مجاناً (Migration Support)',
      'صلاحيات RBAC بنكية مخصصة لكل قسم وطاقم',
      'وكيل ذكاء اصطناعي مدرب على بروتوكولات المركز',
      'تكامل مخصص مع بوابات الدفع والتأمين الصحي',
      'مدير حساب استشاري مخصص 24/7',
      'اتفاقية مستوى الخدمة SLA بنسبة جاهزية 99.99%'
    ],
    highlight: false,
    cta: 'تواصل مع فريق المبيعات'
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { allTenants } = useTenant();

  const [clinicSearch, setClinicSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('الكل');
  const [faqOpen, setFaqOpen] = useState({ 0: true });

  const filteredClinics = useMemo(() => {
    const list = (allTenants || []).filter(t => t.subscriptionStatus !== 'suspended');
    return list.filter(clinic => {
      const matchSearch = 
        !clinicSearch.trim() ||
        (clinic.name || '').toLowerCase().includes(clinicSearch.toLowerCase()) ||
        (clinic.doctorName || '').toLowerCase().includes(clinicSearch.toLowerCase()) ||
        (clinic.address || '').toLowerCase().includes(clinicSearch.toLowerCase()) ||
        (clinic.specialty || '').toLowerCase().includes(clinicSearch.toLowerCase());

      const matchSpec = matchesSpecialtyFilter(clinic.specialty, selectedSpecialty);

      return matchSearch && matchSpec;
    });
  }, [allTenants, clinicSearch, selectedSpecialty]);

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="clinicflow-landing-container" dir="rtl">
      
      {/* 1. TOP NAVBAR */}
      <header className="landing-navbar">
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => navigate('/')}>
            <div className="brand-logo-badge">
              <Stethoscope size={22} />
            </div>
            <div className="brand-titles">
              <span className="brand-name">كلينيك فلو</span>
              <span className="brand-tag">ClinicFlow • Enterprise Medical SaaS</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            <a href="#features" className="nav-link">المميزات</a>
            <a href="#specialties" className="nav-link">التخصصات</a>
            <a href="#discovery" className="nav-link">دليل العيادات</a>
            <a href="#pricing" className="nav-link">الأسعار</a>
            <a href="#faq" className="nav-link">الأسئلة الشائعة</a>
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="btn-nav-dashboard">
                <span>لوحة التحكم الخاصة بك</span>
                <ArrowLeft size={16} />
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn-nav-login">
                  <span>دخول الطاقم</span>
                </button>
                <button onClick={() => navigate('/login?tab=register')} className="btn-nav-register">
                  <Sparkles size={15} />
                  <span>سجل عيادتك مجاناً</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="landing-hero-section">
        <div className="hero-background-glow"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} className="badge-sparkle-icon" />
            <span>المنظومة السحابية الذكية • إصدار العيادات والمراكز التخصصية</span>
          </div>

          <h1 className="hero-headline">
            منظومة العيادات الذكية، <br />
            <span className="google-hero-focus gradient-text">كما يجب أن تكون.</span>
          </h1>

          <p className="hero-subheadline">
            حل سحابي متكامل يمنح كل طبيب عيادة رقمية راقية بهوية ودومين مستقل، 
            تنظيم دقيق للمواعيد وصالة انتظار لحظية، سجلات طبية سريرية متقدمة، 
            وإدارة مالية واضحة بأعلى معايير الهدوء والاحترافية.
          </p>

          <div className="hero-cta-group">
            <button onClick={() => navigate('/login?tab=register')} className="btn-hero-primary">
              <span>ابدأ تجربتك المجانية (14 يوماً)</span>
              <ArrowLeft size={18} />
            </button>
            <a href="#discovery" className="btn-hero-secondary">
              <Search size={18} />
              <span>ابحث عن عيادتك لحجز موعد</span>
            </a>
          </div>

          <div className="hero-trust-metrics">
            <div className="trust-item">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>سب دومين ودومين مخصص لكل عيادة</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>عزل تام للبيانات 100% بدون أي تداخل</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>جاهزية لخدمة مليون مستخدم بسرعات فائقة</span>
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
                    <span className="c-row-name">عمر عبد العزيز محمود</span>
                    <span className="c-row-time">منذ 15 د</span>
                  </div>
                  <div className="c-patient-row waiting">
                    <span className="c-row-badge wait">انتظار #1</span>
                    <span className="c-row-name">مينا سمير غالي</span>
                    <span className="c-row-time">05:30 م</span>
                  </div>
                  <div className="c-patient-row waiting">
                    <span className="c-row-badge wait">انتظار #2</span>
                    <span className="c-row-name">ياسمين عادل إبراهيم</span>
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
                  <strong>الفحص السريري المباشر</strong>
                  <span className="c-active-pill">غرفة الكشف 1</span>
                </div>
                <div className="c-card-body">
                  <div className="c-diagnosis-box">
                    <span className="c-lbl">التشخيص الطبي:</span>
                    <strong>تسوس عميق بالضرس 46 مع التهاب عصب حاد</strong>
                  </div>
                  <div className="c-treatment-tags">
                    <span className="c-tag">علاج جذور روتاري</span>
                    <span className="c-tag">حشو ليزر تجميلي</span>
                    <span className="c-tag">طربوش زيركون</span>
                  </div>
                  <div className="c-exam-footer-note">
                    <span>🛡️ فحص التعارضات الدوائية: آمن 100%</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Financial & Smart Engine */}
              <div className="cockpit-preview-card">
                <div className="c-card-header">
                  <div className="c-icon-badge green">
                    <DollarSign size={16} />
                  </div>
                  <strong>الخزينة والتحصيل الفوري</strong>
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
                    <span>📱 رسائل SMS التأكيد: 18 مرسلة</span>
                    <span>🔄 استدعاءات المتابعة: 4 مجدولة</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PATIENT CLINIC DISCOVERY & SEARCH DIRECTORY */}
      <section id="discovery" className="discovery-section">
        <div className="section-header">
          <span className="section-pill">دليل العيادات المعتمدة</span>
          <h2 className="section-title">ابحث عن عيادتك أو طبيبك لحجز موعد فوري</h2>
          <p className="section-desc">
            اختر عيادتك المفضلة من بين مئات العيادات المعتمدة على منظومة كلينيك فلو وانتقل مباشرة لصفحة حجزك المستقلة:
          </p>
        </div>

        <div className="discovery-controls">
          <div className="search-input-box">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              id="clinic-search-input"
              name="clinicSearch"
              aria-label="ابحث باسم العيادة، اسم الطبيب، أو التخصص"
              placeholder="ابحث باسم العيادة، اسم الطبيب، التخصص، أو العنوان..."
              value={clinicSearch}
              onChange={(e) => setClinicSearch(e.target.value)}
              className="discovery-input"
            />
            {clinicSearch && (
              <button onClick={() => setClinicSearch('')} className="btn-clear-search">إلغاء</button>
            )}
          </div>

          <div className="specialty-chips">
            {SPECIALTY_OPTIONS.map(spec => (
              <button 
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`spec-chip ${selectedSpecialty === spec ? 'active' : ''}`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* CLINIC CARDS GRID */}
        <div className="clinics-cards-grid">
          {filteredClinics.length > 0 ? (
            filteredClinics.map(clinic => (
              <div key={clinic.id || clinic.slug} className="clinic-card">
                <div className="clinic-card-header">
                  <div className="clinic-avatar">
                    <Stethoscope size={24} />
                  </div>
                  <div className="clinic-meta">
                    <h3 className="clinic-name">{clinic.name}</h3>
                    <span className="clinic-doc">{clinic.doctorName}</span>
                  </div>
                  <span className="clinic-badge-status">معتمدة</span>
                </div>

                <div className="clinic-card-details">
                  <div className="detail-item">
                    <Award size={15} className="detail-icon" />
                    <span>{clinic.specialty || 'عيادة تخصصية'}</span>
                  </div>
                  <div className="detail-item">
                    <MapPin size={15} className="detail-icon" />
                    <span>{clinic.address || 'القاهرة، جمهورية مصر العربية'}</span>
                  </div>
                  <div className="detail-item">
                    <Globe size={15} className="detail-icon" />
                    <span dir="ltr" className="font-mono text-xs text-primary">
                      {clinic.customDomain || `${clinic.slug}.clinicflow.app`}
                    </span>
                  </div>
                </div>

                <div className="clinic-card-footer">
                  <Link to={`/c/${clinic.slug}/booking`} className="btn-book-clinic">
                    <span>احجز موعد بالعيادة</span>
                    <ArrowLeft size={16} />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-clinics-notice">
              <Search size={36} className="text-gray-400" />
              <p>لم يتم العثور على عيادات تطابق البحث "{clinicSearch}".</p>
              <button onClick={() => { setClinicSearch(''); setSelectedSpecialty('الكل'); }} className="btn-reset-filter">
                إعادة ضبط الفلتر
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. ENTERPRISE SAAS FEATURES GRID */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-pill">دليل العيادات المعتمدة</span>
          <h2 className="section-title">كل ما تحتاجه عيادتك في منظومة سحابية واحدة</h2>
          <p className="section-desc">
            صممت المنظومة لتمنحك استقلالية تامة، أماناً بنكياً، وتجربة سلسة لطاقمك ومرضاك:
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon bg-blue">
              <Globe size={26} />
            </div>
            <h3>سب دومين ودومين مخصص (White-Label)</h3>
            <p>
              احصل على نطاق خاص لعيادتك (مثل <code>dr-sara.clinicflow.app</code> أو دومينك المباشر) 
              مع عزل كامل لقواعد البيانات والمواعيد دون أي ظهور للمنصات المنافسة.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-emerald">
              <Phone size={26} />
            </div>
            <h3>حجز فوري برقم الموبايل ومنع الغياب</h3>
            <p>
              حجز إلكتروني في 3 خطوات بسيطة مع التحقق اللحظي عبر رسائل SMS 
              ومحرك ذكي لإعادة جدولة واستدعاء المرضى لتقليل معدل الغياب إلى الصفر.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-purple">
              <Activity size={26} />
            </div>
            <h3>السجل الطبي السريري الذكي (EMR)</h3>
            <p>
              مخطط أسنان تفاعلي ثلاثي الأبعاد، تدوين ملاحظات سريرية، تسجيل التشخيصات، 
              وروشتات إلكترونية مع أرشيف كامل لزيارات كل مريض.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-amber">
              <DollarSign size={26} />
            </div>
            <h3>الخزينة والفوترة وسندات القبض</h3>
            <p>
              إصدار فواتير ضريبية، تحصيلات نقدية وفيزا، تسجيل المصروفات، 
              وتقارير مالية لحظية توضح أرباح العيادة وحسابات الشركاء بدقة.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-cyan">
              <Cpu size={26} />
            </div>
            <h3>وكيل الذكاء الاصطناعي الطبي المتقدم</h3>
            <p>
              مساعد طبي مدرب يساعد الطبيب في كشف التفاعلات الدوائية الخطرة، 
              تلخيص الملفات السريرية، واقتراح خطط العلاج المعتمدة.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-rose">
              <ShieldCheck size={26} />
            </div>
            <h3>صلاحيات دقيقة (RBAC) وأمان HIPAA</h3>
            <p>
              حسابات منفصلة لموظفي الاستقبال، الأطباء المساعدين، والمحاسب، 
              مع حظر الوصول للبيانات الحساسة وتشفير بنكي لكافة السجلات.
            </p>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <span className="section-pill">دليل العيادات المعتمدة</span>
          <h2 className="section-title">اختر الباقة المناسبة لحجم ونمو عيادتك</h2>
          <p className="section-desc">
            جميع الباقات تشمل فترة تجريبية مجانية لمدة 14 يوماً مع تدريب كامل لطاقمك الطبي والإداري.
          </p>
        </div>

        <div className="pricing-cards-grid">
          {PRICING_PLANS.map(plan => (
            <div key={plan.id} className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`}>
              {plan.highlight && (
                <div className="plan-ribbon">الأكثر شعبية</div>
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
                  onClick={() => navigate('/login?tab=register')} 
                  className={`btn-plan-select ${plan.highlight ? 'primary' : 'outline'}`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section id="faq" className="faq-section">
        <div className="section-header">
          <span className="section-pill">دليل العيادات المعتمدة</span>
          <h2 className="section-title">كل ما تود معرفته عن منظومة كلينيك فلو</h2>
        </div>

        <div className="faq-accordion">
          {[
            {
              q: 'كيف يحصل طبيبي أو عيادتي على رابط وسب دومين مستقل؟',
              a: 'بمجرد تسجيل حساب الطبيب والعيادة، يولد النظام تلقائياً سب دومين فريد (مثل dr-sara.clinicflow.app) مع رابط حجز خاص. يمكنك مشاركته مع المرضى أو وضعه على السوشيال ميديا، كما يمكنك ربط دومينك الخاص (مثل yourclinic.com) من لوحة الإعدادات.'
            },
            {
              q: 'هل يمكن لعيادة أخرى أو طبيب آخر رؤية بيانات مرضاي أو مواعيدي؟',
              a: 'مستحيل تماماً. المنظومة مبنية بمعمارية عزل متشددة (Multi-Tenant Isolation) وسياسات أمان مشددة على مستوى كل استعلام، بحيث لا يتمكن أي مستخدم أو طاقم من الاطلاع على أي سجل خارج نطاق عيادته المصرح بها.'
            },
            {
              q: 'هل يمكنني إضافة موظفي الاستقبال ومحاسب العيادة دون إعطائهم صلاحيات الطبيب؟',
              a: 'نعم، المنظومة تدعم نظام الصلاحيات البنكي (RBAC). يمكنك إنشاء حساب لموظف الاستقبال ليرى فقط المواعيد وطابور الانتظار، وحساب للمحاسب ليرى الفواتير والخزينة، مع حظر كامل للإعدادات والسجلات الطبية التخصصية.'
            },
            {
              q: 'ماذا يحدث إذا تأخرت عيادة عن سداد الاشتراك الشهري؟',
              a: 'توفر المنظومة مفتاح إيقاف إداري (Subscription Kill-Switch). عند تعليق الحساب يتم إيقاف دخول العيادة وتجميد رابط الحجز العام مع ظهور إشعار تواصل لتسوية الفاتورة دون فقدان أي سجلات طبية.'
            }
          ].map((item, idx) => (
            <div key={idx} className={`faq-item ${faqOpen[idx] ? 'open' : ''}`}>
              <button onClick={() => toggleFaq(idx)} className="faq-question">
                <span>{item.q}</span>
                <ChevronDown size={18} className="faq-chevron" />
              </button>
              {faqOpen[idx] && (
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="landing-brand">
              <div className="brand-logo-badge">
                <Stethoscope size={20} className="text-primary-brand" />
              </div>
              <div className="brand-titles">
                <span className="brand-name">كلينيك فلو</span>
                <span className="brand-tag">ClinicFlow SaaS</span>
              </div>
            </div>
            <p className="footer-about">
              المنظومة السحابية الرائدة لإدارة العيادات والمراكز الطبية في مصر والشرق الأوسط. 
              معمارية آمنة، عزل تام، وأداء استثنائي.
            </p>
            <div className="footer-badges">
              <span className="compliance-tag">🛡️ HIPAA Compliant</span>
              <span className="compliance-tag">🔒 AES-256 Encryption</span>
              <span className="compliance-tag">⚡ Sub-millisecond Latency</span>
            </div>
          </div>

          <div className="footer-links-col">
            <h4>روابط المنصة</h4>
            <ul>
              <li><a href="#features">المميزات السريرية</a></li>
              <li><a href="#discovery">دليل العيادات</a></li>
              <li><a href="#pricing">باقات الاشتراك</a></li>
              <li><Link to="/booking">بوابة الحجز العامة</Link></li>
              <li><Link to="/super-admin">بورتال تحكم الشركة</Link></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>للأطباء والمراكز</h4>
            <ul>
              <li><Link to="/login?tab=register">تسجيل عيادة جديدة</Link></li>
              <li><Link to="/login">تسجيل دخول الطاقم</Link></li>
              <li><Link to="/manage-booking">بوابة تعديل المواعيد للمرضى</Link></li>
              <li><a href="https://wa.me/201006285031" target="_blank" rel="noreferrer">الدعم الفني المباشر</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} جميع الحقوق محفوظة لشركة كلينيك فلو (ClinicFlow Technologies Ltd).</p>
          <p className="footer-dev-tag">Built with Enterprise Multi-Tenant Architecture & Highest Standards.</p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
