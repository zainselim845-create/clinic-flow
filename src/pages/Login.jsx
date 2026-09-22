import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Stethoscope, Eye, EyeOff, Loader2, Shield, AlertTriangle, 
  Building2, Globe, Check, User, Lock, Mail, Phone, 
  Sparkles, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Tabs } from '../components/ui/tabs';
import { triggerGoogleOAuthPopup } from '../services/googleAuthService';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';
import './Login.css';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const REMEMBERED_USER_KEY = 'clinicflow_remembered_identifier';

const CLINIC_SPECIALTIES_LIST = [
  'طب وجراحة الفم والأسنان',
  'الأمراض الجلدية والتجميل والليزر',
  'طب الأطفال وحديثي الولادة',
  'طب وجراحة العيون',
  'أمراض الباطنة والقلب والسكر',
  'جراحة العظام والمفاصل والعمود الفقري',
  'النساء والتوليد وعلاج العقم',
  'الأنف والأذن والحنجرة',
  'العلاج الطبيعي والتأهيل الحركي',
  'المخ والأعصاب والطب النفسي',
  'الجراحة العامة والمناظير',
  'مركز طبي متعدد التخصصات'
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUpDoctorAndClinic, loginWithGoogleProfile, user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  // If someone passes portal=admin or portal=saas to /login, securely redirect to dedicated /superadmin/login
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const portal = params.get('portal');
    if (portal === 'admin' || portal === 'saas') {
      navigate('/superadmin/login', { replace: true });
    }
  }, [location.search, navigate]);

  const [activeTab, setActiveTab] = useState(initialTab); // 'login' | 'register'
  
  // Login Form State
  const [identifier, setIdentifier] = useState(() => safeGetItem(REMEMBERED_USER_KEY, '') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(safeGetItem(REMEMBERED_USER_KEY, '')));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // New Clinic Onboarding Form State
  const [regForm, setRegForm] = useState({
    doctorName: '',
    email: '',
    phone: '',
    password: '',
    clinicName: '',
    specialty: 'طب وجراحة الفم والأسنان',
    address: 'القاهرة، مصر',
    subscriptionTier: 'pro',
    agreeTerms: true
  });
  
  const from = location.state?.from?.pathname || '/dashboard';

  // Calculate Password Strength (0: none, 1: weak, 2: medium, 3: strong)
  const passwordStrength = useMemo(() => {
    const pwd = regForm.password || '';
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd)) score += 1;
    if (pwd.length >= 10 && /[^a-zA-Z0-9]/.test(pwd)) score += 1;
    return Math.min(score, 3);
  }, [regForm.password]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin' || user.isSuperAdmin) {
        navigate('/super-admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, navigate, from]);

  // Lockout countdown timer
  useEffect(() => {
    let interval = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const recordFailedAttempt = (msg) => {
    const nextFailed = failedAttempts + 1;
    setFailedAttempts(nextFailed);
    if (nextFailed >= MAX_FAILED_ATTEMPTS) {
      setLockoutTimer(LOCKOUT_SECONDS);
      setError(`تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم قفل تسجيل الدخول مؤقتاً لمدة ${LOCKOUT_SECONDS} ثانية لحماية أمان الحساب.`);
    } else {
      setError(`${msg || 'بيانات الدخول غير صحيحة. يرجى التحقق وإعادة المحاولة.'} (المحاولة ${nextFailed} من ${MAX_FAILED_ATTEMPTS})`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    if (!identifier.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم / البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await signIn(identifier.trim(), password);
      if (signInError) throw signInError;
      
      // Remember me logic
      if (rememberMe) {
        safeSetItem(REMEMBERED_USER_KEY, identifier.trim());
      } else {
        safeRemoveItem(REMEMBERED_USER_KEY);
      }

      const loggedUser = data?.user;
      if (loggedUser?.role === 'super_admin' || loggedUser?.isSuperAdmin) {
        navigate('/super-admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      recordFailedAttempt(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!regForm.doctorName.trim() || !regForm.clinicName.trim() || !regForm.email.trim() || !regForm.phone.trim() || !regForm.password) {
      setError('يرجى ملء كافة الحقول الإلزامية لتدشين حساب العيادة.');
      return;
    }

    if (regForm.password.length < 6) {
      setError('كلمة المرور يجب أن لا تقل عن 6 خانات لضمان أمان السجلات الطبية.');
      return;
    }

    const cleanPhone = regForm.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('يرجى إدخال رقم هاتف صحيح مكوّن من 11 رقماً.');
      return;
    }

    setIsLoading(true);
    try {
      const formattedDocName = regForm.doctorName.trim().startsWith('د.') 
        ? regForm.doctorName.trim() 
        : `د. ${regForm.doctorName.trim()}`;

      const payload = {
        ...regForm,
        doctorName: formattedDocName,
        email: regForm.email.trim().toLowerCase(),
        phone: cleanPhone,
        subscriptionTier: regForm.subscriptionTier || 'pro'
      };

      const { error: signUpError } = await signUpDoctorAndClinic(payload);
      if (signUpError) throw signUpError;

      setSuccessMessage('تم تأسيس وتدشين حساب عيادتك بنجاح! جاري توجيهك إلى منظومة العيادة...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 900);
    } catch (err) {
      setError(err.message || 'فشل تأسيس العيادة، يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    if (lockoutTimer > 0) return;
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const profile = await triggerGoogleOAuthPopup();
      const res = await loginWithGoogleProfile(profile, 'doctor');
      if (res?.error) throw res.error;
      const loggedUser = res?.data?.user;
      setSuccessMessage(`أهلاً بك يا ${profile.name}! تم تسجيل الدخول بنجاح.`);
      setTimeout(() => {
        if (res?.needsOnboarding || loggedUser?.needsOnboarding) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 500);
    } catch (err) {
      console.warn('Google OAuth login notice:', err?.message || err);
      setError(err?.message || 'تعذر تسجيل الدخول عبر Google. يرجى استخدام البريد الإلكتروني أو الهاتف.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = lockoutTimer > 0;

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        <div className="login-dual-card glass-panel">
          
          {/* Left Column: Brand Hero & Value Proposition */}
          <div className="login-hero-pane">
            <div className="hero-brand-top">
              <div className="brand-logo-badge">
                <Stethoscope size={28} className="brand-logo-icon" />
              </div>
              <div className="brand-titles">
                <span className="brand-name">Clinic<span>Flow</span></span>
                <span className="brand-tagline">السحابة الطبية لإدارة العيادات</span>
              </div>
            </div>

            <div className="hero-headline-block">
              <h2>المنظومة السحابية المعتمدة لإدارة عيادتك الطبية بكل احترافية</h2>
              <p>بيئة عمل سريرية وإدارية متكاملة تضمن أعلى درجات الخصوصية والكفاءة في متابعة المرضى والعمليات اليومية.</p>
            </div>

            <div className="hero-features-list">
              <div className="hero-feature-item">
                <div className="feature-check-icon">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="feature-text">
                  <strong>سجلات طبية سريرية مشفرة</strong>
                  <span>عزل تام ومستقل لبيانات كل مريض وعيادة بأعلى معايير الأمان.</span>
                </div>
              </div>

              <div className="hero-feature-item">
                <div className="feature-check-icon">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="feature-text">
                  <strong>إدارة المواعيد وطوابير الانتظار</strong>
                  <span>تنظيم سلس للكشوفات مع تذكيرات تلقائية عبر الرسائل القصيرة.</span>
                </div>
              </div>

              <div className="hero-feature-item">
                <div className="feature-check-icon">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="feature-text">
                  <strong>فواتير إلكترونية وتقارير فورية</strong>
                  <span>إصدار سندات القبض، متابعة الخزينة، وإحصائيات الإيرادات الدقيقة.</span>
                </div>
              </div>
            </div>

            <div className="hero-footer-trust">
              <Sparkles size={16} className="text-emerald" />
              <span>معتمد وموثوق لأكثر من 1,000 عيادة ومركز طبي متخصص</span>
            </div>
          </div>

          {/* Right Column: Authentication Forms */}
          <div className="login-forms-pane">
            
            <div className="forms-header">
              <h1 className="form-main-title">
                {activeTab === 'login' ? 'مرحباً بك مجدداً دكتور' : 'تأسيس وتدشين حساب عيادة جديدة'}
              </h1>
              <p className="form-subtitle">
                {activeTab === 'login' ? 'أدخل بيانات حسابك للمتابعة إلى لوحة التحكم' : 'ابدأ استخدام المنظومة بدقائق وبدون تعقيد'}
              </p>
            </div>

            {/* Global Error & Lockout Alert */}
            {error && (
              <div 
                role="alert" 
                aria-live="assertive"
                className={`login-alert-box error ${isLocked ? 'locked-shake' : 'shake'}`}
              >
                <AlertTriangle size={18} className="alert-icon" />
                <span>{error}</span>
              </div>
            )}

            {/* Global Success Alert */}
            {successMessage && (
              <div 
                role="status" 
                aria-live="polite"
                className="login-alert-box success"
              >
                <CheckCircle2 size={18} className="alert-icon" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Client Clinics: Tabs between Login and Register */}
            <Tabs.Root 
              value={activeTab} 
              onValueChange={(details) => { 
                setActiveTab(details.value); 
                setError(''); 
                setSuccessMessage(''); 
              }}
              className="auth-tabs-root"
            >
              <Tabs.List className="auth-tabs-header">
                <Tabs.Trigger 
                  value="login"
                  className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                >
                    <span>تسجيل الدخول</span>
                  </Tabs.Trigger>
                  <Tabs.Trigger 
                    value="register"
                    className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                  >
                    <span>إنشاء حساب عيادة جديدة</span>
                  </Tabs.Trigger>
                </Tabs.List>

                {/* 1. DOCTOR / STAFF LOGIN TAB */}
                <Tabs.Content value="login">
                  <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-field-group">
                      <label className="field-label" htmlFor="identifier">
                        <span>البريد الإلكتروني أو رقم الهاتف</span>
                      </label>
                      <div className="field-input-wrapper">
                        <User className="input-icon" size={18} />
                        <input
                          id="identifier"
                          name="identifier"
                          type="text"
                          className="field-input has-icon"
                          placeholder="doctor@clinic.com أو 010XXXXXXXX"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          disabled={isLocked || isLoading}
                          required
                          dir="ltr"
                          autoComplete="username"
                        />
                      </div>
                    </div>

                    <div className="form-field-group">
                      <div className="field-label-row">
                        <label className="field-label" htmlFor="password">كلمة المرور</label>
                        <span className="field-hint-action" title="تواصل مع إدارة العيادة لإعادة تعيين كلمة المرور">
                          نسيت كلمة المرور؟
                        </span>
                      </div>
                      <div className="field-input-wrapper">
                        <Lock className="input-icon" size={18} />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          className="field-input has-icon has-toggle"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLocked || isLoading}
                          required
                          dir="ltr"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          className="btn-toggle-eye"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-options-row">
                      <label className="checkbox-control">
                        <input 
                          type="checkbox" 
                          checked={rememberMe} 
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={isLoading}
                        />
                        <span className="checkbox-label">تذكر بيانات الدخول على هذا الجهاز</span>
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-auth-primary"
                      disabled={isLoading || isLocked || !identifier.trim() || !password}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="btn-spinner" size={20} />
                          <span>جاري تسجيل الدخول...</span>
                        </>
                      ) : isLocked ? (
                        <span>يرجى الانتظار ({lockoutTimer} ثانية)...</span>
                      ) : (
                        <span>تسجيل الدخول إلى العيادة</span>
                      )}
                    </button>

                    {/* Google OAuth Single Sign-On */}
                    <div className="auth-separator">
                      <span>أو المتابعة السحابية عبر Google</span>
                    </div>

                    <button 
                      type="button" 
                      onClick={handleGoogleSignInClick}
                      className="btn-google-sso"
                      disabled={isLoading || isLocked}
                      aria-label="تسجيل الدخول باستخدام حساب Google"
                    >
                      <svg className="google-svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                      </svg>
                      <span>المتابعة باستخدام حساب Google</span>
                    </button>
                  </form>
                </Tabs.Content>

                {/* 2. CLINIC ONBOARDING REGISTRATION TAB */}
                <Tabs.Content value="register">
                  <form onSubmit={handleRegisterSubmit} className="auth-form register-form">
                    
                    <div className="form-fields-grid-2">
                      <div className="form-field-group">
                        <label className="field-label" htmlFor="regDoctorName">اسم الطبيب الكامل *</label>
                        <div className="field-input-wrapper">
                          <User className="input-icon" size={18} />
                          <input 
                            id="regDoctorName"
                            name="doctorName"
                            type="text" 
                            className="field-input has-icon" 
                            placeholder="د. محمد عبد الرحمن"
                            value={regForm.doctorName}
                            onChange={(e) => setRegForm({ ...regForm, doctorName: e.target.value })}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="form-field-group">
                        <label className="field-label" htmlFor="regClinicName">اسم العيادة أو المركز الطبي *</label>
                        <div className="field-input-wrapper">
                          <Building2 className="input-icon" size={18} />
                          <input 
                            id="regClinicName"
                            name="clinicName"
                            type="text" 
                            className="field-input has-icon" 
                            placeholder="عيادة الشروق التخصصية"
                            value={regForm.clinicName}
                            onChange={(e) => setRegForm({ ...regForm, clinicName: e.target.value })}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label" htmlFor="regSpecialty">التخصص السريري للعيادة *</label>
                      <select
                        id="regSpecialty"
                        name="specialty"
                        className="field-input field-select"
                        value={regForm.specialty}
                        onChange={(e) => setRegForm({ ...regForm, specialty: e.target.value })}
                        disabled={isLoading}
                      >
                        {CLINIC_SPECIALTIES_LIST.map((spec) => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-fields-grid-2">
                      <div className="form-field-group">
                        <label className="field-label" htmlFor="regPhone">رقم هاتف الطبيب / العيادة *</label>
                        <div className="field-input-wrapper">
                          <Phone className="input-icon" size={18} />
                          <input 
                            id="regPhone"
                            name="phone"
                            type="tel" 
                            className="field-input has-icon" 
                            placeholder="010XXXXXXXX"
                            dir="ltr"
                            value={regForm.phone}
                            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="form-field-group">
                        <label className="field-label" htmlFor="regEmail">البريد الإلكتروني المهني *</label>
                        <div className="field-input-wrapper">
                          <Mail className="input-icon" size={18} />
                          <input 
                            id="regEmail"
                            name="email"
                            type="email" 
                            className="field-input has-icon" 
                            placeholder="doctor@myclinic.com"
                            dir="ltr"
                            value={regForm.email}
                            onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label" htmlFor="regPassword">كلمة المرور للحساب *</label>
                      <div className="field-input-wrapper">
                        <Lock className="input-icon" size={18} />
                        <input 
                          id="regPassword"
                          name="password"
                          type={showPassword ? "text" : "password"} 
                          className="field-input has-icon has-toggle" 
                          placeholder="لا تقل عن 6 أحرف وأرقام"
                          minLength={6}
                          autoComplete="new-password"
                          dir="ltr"
                          value={regForm.password}
                          onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          className="btn-toggle-eye"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {regForm.password && (
                        <div className="password-meter-wrap">
                          <div className="meter-bars">
                            <span className={`meter-segment ${passwordStrength >= 1 ? 'active weak' : ''}`} />
                            <span className={`meter-segment ${passwordStrength >= 2 ? 'active medium' : ''}`} />
                            <span className={`meter-segment ${passwordStrength >= 3 ? 'active strong' : ''}`} />
                          </div>
                          <span className="meter-label">
                            {passwordStrength === 1 && 'كلمة مرور مقبولة (يفضل إضافة أرقام)'}
                            {passwordStrength === 2 && 'كلمة مرور جيدة'}
                            {passwordStrength >= 3 && 'كلمة مرور قوية ومحمية'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* SaaS Plan Selection */}
                    <div className="form-field-group">
                      <label className="field-label">اختر باقة الاشتراك المناسبة لعيادتك *</label>
                      <div className="saas-plan-selector-grid">
                        {[
                          {
                            id: 'starter',
                            name: 'Starter (الأساسية)',
                            price: '499 ج.م',
                            period: '/ شهر',
                            badge: 'العيادات الفردية',
                            features: ['طبيب واحد', '500 رسالة SMS', 'مواعيد ومرضى وفواتير']
                          },
                          {
                            id: 'pro',
                            name: 'Pro (العيادة الذكية)',
                            price: '999 ج.م',
                            period: '/ شهر',
                            badge: 'الأكثر طلباً',
                            features: ['حتى 3 أطباء', '2000 رسالة SMS', 'مساعد ذكي ومخزون']
                          },
                          {
                            id: 'enterprise',
                            name: 'Enterprise (المراكز الكبرى)',
                            price: '1999 ج.م',
                            period: '/ شهر',
                            badge: 'مؤسسي متقدم',
                            features: ['حتى 10 أطباء', '6000 رسالة SMS', 'نطاق مخصص وأفرع']
                          }
                        ].map((plan) => {
                          const isSelected = (regForm.subscriptionTier || 'pro') === plan.id;
                          return (
                            <div
                              key={plan.id}
                              className={`saas-plan-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setRegForm(prev => ({ ...prev, subscriptionTier: plan.id }))}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  setRegForm(prev => ({ ...prev, subscriptionTier: plan.id }));
                                }
                              }}
                            >
                              <div className="plan-card-header">
                                <span className="plan-name">{plan.name}</span>
                                {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                              </div>
                              <div className="plan-price-row">
                                <span className="plan-price">{plan.price}</span>
                                <span className="plan-period">{plan.period}</span>
                              </div>
                              <ul className="plan-features-mini">
                                {plan.features.map((feat, idx) => (
                                  <li key={idx}>
                                    <Check size={12} className="feat-check" />
                                    <span>{feat}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="plan-select-indicator">
                                <div className={`radio-dot ${isSelected ? 'active' : ''}`} />
                                <span>{isSelected ? 'الباقة المختارة' : 'اختيار هذه الباقة'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="form-options-row">
                      <label className="checkbox-control">
                        <input 
                          type="checkbox" 
                          checked={regForm.agreeTerms} 
                          onChange={(e) => setRegForm({ ...regForm, agreeTerms: e.target.checked })}
                          required
                        />
                        <span className="checkbox-label terms-label">
                          أوافق على <a href="#terms" onClick={(e) => e.preventDefault()}>شروط الاستخدام</a> و <a href="#privacy" onClick={(e) => e.preventDefault()}>سياسة أمان وخصوصية البيانات الطبية</a>
                        </span>
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-auth-primary btn-register-cta"
                      disabled={isLoading || !regForm.doctorName || !regForm.clinicName || !regForm.phone || !regForm.password || !regForm.agreeTerms}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="btn-spinner" size={20} />
                          <span>جاري تدشين وتجهيز عيادتك...</span>
                        </>
                      ) : (
                        <>
                          <span>تدشين حساب العيادة مجاناً</span>
                          <ArrowLeft size={18} />
                        </>
                      )}
                    </button>
                  </form>
                </Tabs.Content>
              </Tabs.Root>

            {/* Bottom Footer Navigation */}
            <div className="auth-footer-nav">
              <div className="footer-links-group">
                <a href="/booking" className="footer-link" target="_blank" rel="noreferrer">
                  <Globe size={14} />
                  <span>بوابة حجز واستعلام المرضى</span>
                </a>
                <span className="footer-divider">•</span>
                <a href="/" className="footer-link">
                  <Stethoscope size={14} />
                  <span>الصفحة الرئيسية للمنصة</span>
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
