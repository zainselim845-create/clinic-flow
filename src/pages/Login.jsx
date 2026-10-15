import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AlertTriangle, CheckCircle2, Globe, Stethoscope, 
  X, KeyRound, MessageSquare, Mail 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Tabs } from '@/components/ui/tabs';
import { triggerGoogleOAuthPopup } from '@/features/auth/services/googleAuthService';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/utils/safeStorage';
import { LoginHeroPane, LoginForm, RegisterClinicForm } from '@/pages/auth';
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

/**
 * Login & Clinic Onboarding Page - World-Class Medical SaaS Orchestrator
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUpDoctorAndClinic, loginWithGoogleProfile, user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  // Redirect admin portals to dedicated superadmin login
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const portal = params.get('portal');
    if (portal === 'admin' || portal === 'saas') {
      navigate('/superadmin/login', { replace: true });
    }
  }, [location.search, navigate]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [showForgotModal, setShowForgotModal] = useState(false);
  
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

  // Keep activeTab in sync with URL search params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'register') {
      setActiveTab('register');
    } else if (tabParam === 'login') {
      setActiveTab('login');
    }
  }, [location.search]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setError('');
    setSuccessMessage('');
    navigate(`?tab=${newTab}`, { replace: true });
  };

  // Password Strength Calculation
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
        const targetPath = (from === '/onboarding' || from === '/login') ? '/dashboard' : from;
        navigate(targetPath, { replace: true });
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
      
      if (rememberMe) {
        safeSetItem(REMEMBERED_USER_KEY, identifier.trim());
      } else {
        safeRemoveItem(REMEMBERED_USER_KEY);
      }

      const loggedUser = data?.user;
      if (loggedUser?.role === 'super_admin' || loggedUser?.isSuperAdmin) {
        navigate('/super-admin', { replace: true });
      } else {
        const targetPath = (from === '/onboarding' || from === '/login') ? '/dashboard' : from;
        navigate(targetPath, { replace: true });
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
      setError('كلمة المرور يجب أن لا تقل عن 6 خانات لضمان أمان بيانات العيادة.');
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
        const hasExistingClinic = Boolean(
          (res?.tenant?.name && res?.tenant?.slug) ||
          (loggedUser?.clinicSlug && loggedUser.clinicSlug !== '*') ||
          res?.tenant?.isOnboardingCompleted === true ||
          loggedUser?.isOnboardingCompleted === true
        );
        if ((res?.needsOnboarding || loggedUser?.needsOnboarding) && !hasExistingClinic) {
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

  const handleAutofillFromGoogle = async () => {
    if (lockoutTimer > 0) return;
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const profile = await triggerGoogleOAuthPopup();
      const rawName = (profile.name || '').trim();
      const docName = (rawName && !rawName.startsWith('د.')) ? `د. ${rawName}` : rawName;
      const cleanEmail = (profile.email || '').trim().toLowerCase();
      setRegForm(prev => ({
        ...prev,
        doctorName: docName || prev.doctorName,
        email: cleanEmail || prev.email,
        clinicName: prev.clinicName || (docName ? `عيادة ${docName}` : '')
      }));
      setSuccessMessage(`تم استيراد بيانات حسابك من Google بنجاح: ${rawName} (${cleanEmail})`);
    } catch (err) {
      console.warn('Google autofill notice:', err?.message || err);
      setError(err?.message || 'تعذر استيراد البيانات من Google. يرجى إدخال البيانات يدوياً.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = lockoutTimer > 0;

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        <div className="login-dual-card glass-panel">
          
          {/* Left Column: Brand Hero & Testimonial */}
          <LoginHeroPane />

          {/* Right Column: Authentication & Onboarding Forms */}
          <div className="login-forms-pane">
            <div className="forms-header">
              <h1 className="form-main-title">
                {activeTab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب عيادة جديدة'}
              </h1>
              <p className="form-subtitle">
                {activeTab === 'login' 
                  ? 'أدخل بيانات حسابك للمتابعة إلى لوحة التحكم' 
                  : 'ابدأ إدارة عيادتك الطبية في خطوات بسيطة وسريعة'}
              </p>
            </div>

            {/* Global Error Alert */}
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

            {/* Tabs between Login and Register */}
            <Tabs.Root 
              value={activeTab} 
              onValueChange={(details) => handleTabChange(details.value)}
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

              <Tabs.Content value="login">
                <LoginForm 
                  identifier={identifier}
                  setIdentifier={setIdentifier}
                  password={password}
                  setPassword={setPassword}
                  rememberMe={rememberMe}
                  setRememberMe={setRememberMe}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  isLoading={isLoading}
                  isLocked={isLocked}
                  lockoutTimer={lockoutTimer}
                  handleSubmit={handleSubmit}
                  handleGoogleSignInClick={handleGoogleSignInClick}
                  onForgotPasswordClick={() => setShowForgotModal(true)}
                />
              </Tabs.Content>

              <Tabs.Content value="register">
                <RegisterClinicForm 
                  regForm={regForm}
                  setRegForm={setRegForm}
                  specialtiesList={CLINIC_SPECIALTIES_LIST}
                  passwordStrength={passwordStrength}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  isLoading={isLoading}
                  isLocked={isLocked}
                  handleRegisterSubmit={handleRegisterSubmit}
                  handleGoogleSignInClick={handleGoogleSignInClick}
                  handleAutofillFromGoogle={handleAutofillFromGoogle}
                />
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div 
            className="auth-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="forgot-modal-title"
          >
            <div className="auth-modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon-wrap">
                  <KeyRound size={20} className="text-emerald" />
                </div>
                <div>
                  <h3 id="forgot-modal-title">استعادة كلمة المرور / وصول حساب العيادة</h3>
                  <span className="modal-sub">خيارات آمنة لاستعادة الوصول لحسابك</span>
                </div>
              </div>
              <button 
                type="button" 
                className="btn-modal-close" 
                onClick={() => setShowForgotModal(false)}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="auth-modal-body">
              <p className="modal-desc">
                لحماية خصوصية المرضى وأمان السجلات الطبية لعيادتك، تم تأمين وصول الحسابات. يمكنك الاختيار من بين الطرق الآتية:
              </p>

              <div className="modal-options-list">
                {/* Method 1: Google SSO */}
                <div className="modal-option-item">
                  <div className="option-badge">الخيار 1 (فوري)</div>
                  <div className="option-content">
                    <h4>تسجيل الدخول الفوري بحساب Google</h4>
                    <p>إذا كان بريدك الإلكتروني مسجلاً لدى Google، يمكنك الدخول بضغطة زر دون الحاجة لكلمة مرور.</p>
                    <button
                      type="button"
                      className="btn-modal-action-google"
                      onClick={() => {
                        setShowForgotModal(false);
                        handleGoogleSignInClick();
                      }}
                    >
                      <svg className="google-svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                      </svg>
                      <span>المتابعة عبر Google الآن</span>
                    </button>
                  </div>
                </div>

                {/* Method 2: Support Assistance */}
                <div className="modal-option-item">
                  <div className="option-badge secondary">الخيار 2</div>
                  <div className="option-content">
                    <h4>التواصل المباشر مع فريق الدعم الفني</h4>
                    <p>فريق الدعم الفني للمنصة متاح للتحقق من هوية الطبيب وإعادة تعيين بيانات الحساب فوراً.</p>
                    <div className="modal-support-links">
                      <a 
                        href="https://wa.me/201000000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%A7%D8%B3%D8%AA%D8%B9%D8%A7%D8%AF%D8%A9%20%D9%83%D9%84%D9%85%D8%A9%20%D9%85%D8%B1%D9%88%D8%B1%20%D8%AD%D8%B3%D8%A7%D8%A8%20%D8%A7%D9%84%D8%B9%D9%8A%D8%A7%D8%AF%D8%A9" 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-support-link whatsapp"
                      >
                        <MessageSquare size={15} />
                        <span>محادثة واتساب مباشرة للدعم</span>
                      </a>
                      <a 
                        href="mailto:support@clinicflow.com?subject=طلب استعادة كلمة مرور حساب العيادة" 
                        className="btn-support-link email"
                      >
                        <Mail size={15} />
                        <span>مراسلة الدعم بالبريد الإلكتروني</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
