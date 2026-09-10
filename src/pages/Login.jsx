import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Loader2, UserCheck, Shield, ArrowLeft, AlertTriangle, KeyRound, Building2, ShieldCheck, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Tabs } from '../components/ui/tabs';
import { Dialog } from '../components/ui/dialog';
import { Collapsible } from '../components/ui/collapsible';
import './Login.css';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUpDoctorAndClinic, signInWithGoogle, user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const initialPortal = searchParams.get('portal') === 'admin' || searchParams.get('portal') === 'saas' ? 'saas' : 'clinic';
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  const [portalScope, setPortalScope] = useState(initialPortal); // 'clinic' | 'saas'
  const [activeTab, setActiveTab] = useState(initialTab); // 'login' | 'register'
  const [identifier, setIdentifier] = useState(initialPortal === 'saas' ? 'superadmin@clinicflow.com' : '');
  const [password, setPassword] = useState(initialPortal === 'saas' ? 'admin' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // New Clinic Onboarding Form State
  const [regForm, setRegForm] = useState({
    doctorName: '',
    email: '',
    phone: '',
    password: '',
    clinicName: '',
    specialty: 'طب وجراحة الفم والأسنان',
    address: 'القاهرة، مصر'
  });
  
  const from = location.state?.from?.pathname || (portalScope === 'saas' ? '/super-admin' : '/dashboard');

  // Handle portal scope switch
  const handleScopeChange = (scope) => {
    setPortalScope(scope);
    setError('');
    setSuccessMessage('');
    if (scope === 'saas') {
      setActiveTab('login');
      setIdentifier('superadmin@clinicflow.com');
      setPassword('admin');
    } else {
      setIdentifier('');
      setPassword('');
    }
  };

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
      setError(`تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم قفل تسجيل الدخول لمدة ${LOCKOUT_SECONDS} ثانية لحماية الحساب.`);
    } else {
      setError(`${msg || 'بيانات الدخول غير صحيحة.'} (المحاولة ${nextFailed} من ${MAX_FAILED_ATTEMPTS})`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    if (!identifier || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await signIn(identifier, password);
      if (signInError) throw signInError;
      
      const loggedUser = data?.user;
      if (loggedUser?.role === 'super_admin' || loggedUser?.isSuperAdmin || portalScope === 'saas') {
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

    if (regForm.password && regForm.password.length < 6) {
      setError('كلمة المرور يجب أن لا تقل عن 6 أحرف لحماية بيانات المرضى.');
      return;
    }

    if (!regForm.doctorName || !regForm.clinicName || !regForm.email || !regForm.phone || !regForm.password) {
      setError('يرجى ملء جميع الحقول الإلزامية لتسجيل العيادة.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: signUpError } = await signUpDoctorAndClinic(regForm);
      if (signUpError) throw signUpError;

      setSuccessMessage('تم تأسيس حساب العيادة بنجاح! جاري تحويلك لمنظومة العيادة...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.message || 'فشل تسجيل العيادة، يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectRoleLogin = async (presetId, presetPass) => {
    if (lockoutTimer > 0) return;
    setActiveTab('login');
    setIdentifier(presetId);
    setPassword(presetPass);
    setError('');
    setIsLoading(true);
    try {
      const { data, error: signInError } = await signIn(presetId, presetPass);
      if (signInError) throw signInError;
      const loggedUser = data?.user;
      if (loggedUser?.role === 'super_admin' || loggedUser?.isSuperAdmin || presetId.includes('superadmin')) {
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

  const handleGoogleSignInClick = () => {
    if (lockoutTimer > 0) return;
    setIsGoogleModalOpen(true);
  };

  const handleSelectGoogleAccount = async (personaRole) => {
    setIsGoogleModalOpen(false);
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const { error: gError } = await signInWithGoogle(personaRole);
      if (gError) throw gError;
      setSuccessMessage('تم التحقق والتسجيل عبر حساب Google بنجاح! جاري توجيهك...');
      setTimeout(() => {
        if (personaRole === 'superadmin') {
          navigate('/super-admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 600);
    } catch (err) {
      setError(err.message || 'تعذر تسجيل الدخول عبر Google. يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = lockoutTimer > 0;

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        
        {/* Portal Scope Switcher (Clinics Clients vs SaaS Platform Admin) */}
        <div className="portal-scope-selector" role="tablist" aria-label="بوابات المنظومة">
          <button 
            type="button" 
            className={`scope-pill-btn ${portalScope === 'clinic' ? 'active' : ''}`}
            onClick={() => handleScopeChange('clinic')}
          >
            <Building2 size={15} />
            <span>بوابة العيادات والأطباء (العملاء)</span>
          </button>
          <button 
            type="button" 
            className={`scope-pill-btn ${portalScope === 'saas' ? 'active saas-active' : ''}`}
            onClick={() => handleScopeChange('saas')}
          >
            <ShieldCheck size={15} />
            <span>إدارة المنصة (SaaS Admin)</span>
          </button>
        </div>

        <div className="login-header">
          <div className={`login-logo ${portalScope === 'saas' ? 'saas-logo' : ''}`}>
            {portalScope === 'saas' ? (
              <ShieldCheck size={44} className="logo-icon saas-icon" />
            ) : (
              <Stethoscope size={44} className="logo-icon" />
            )}
          </div>
          <h1 className="login-title">
            {portalScope === 'saas' 
              ? 'إدارة منصة ClinicFlow (SaaS Control Plane)' 
              : 'منظومة ClinicFlow الطبية'}
          </h1>
          <p className="login-subtitle">
            {portalScope === 'saas' 
              ? 'مركز الرقابة السحابي لإدارة اشتراكات العيادات، التراخيص، والأنظمة' 
              : 'نظام إدارة العيادات، المواعيد، والسجلات السريرية المعتمد'}
          </p>
          {portalScope === 'saas' && (
            <div className="saas-portal-badge-notice">
              <Shield size={14} />
              <span>منطقة إدارة سحابية محمية • مخصصة للمدير العام ومسؤولي المنصة السحابية</span>
            </div>
          )}
        </div>

        {/* Global Error & Success Alerts */}
        {error && (
          <div className={`error-message ${isLocked ? 'lockout-alert' : 'shake'}`} style={isLocked ? { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' } : { marginBottom: '1rem' }}>
            {isLocked && <AlertTriangle size={18} />}
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600, textAlign: 'center' }}>
            {successMessage}
          </div>
        )}

        {portalScope === 'saas' ? (
          <div className="saas-login-wrapper">
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="saasIdentifier">البريد الإلكتروني لمدير المنصة</label>
                <input
                  id="saasIdentifier"
                  name="identifier"
                  aria-label="البريد الإلكتروني لمدير المنصة"
                  type="text"
                  className="form-control"
                  placeholder="superadmin@clinicflow.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isLocked || isLoading}
                  required
                  dir="ltr"
                  autoComplete="username"
                />
              </div>

              <div className="form-group relative">
                <label className="form-label" htmlFor="saasPassword">كلمة المرور الرئيسية</label>
                <div className="password-input-wrapper">
                  <input
                    id="saasPassword"
                    name="password"
                    aria-label="كلمة المرور الرئيسية"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
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
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg login-btn saas-submit-btn"
                disabled={isLoading || isLocked || !identifier || !password}
              >
                {isLoading ? (
                  <Loader2 className="spinner" size={22} />
                ) : isLocked ? (
                  `يرجى الانتظار (${lockoutTimer} ثانية)... `
                ) : (
                  'تسجيل الدخول إلى لوحة تحكم الساس'
                )}
              </button>
            </form>
          </div>
        ) : (
          <Tabs.Root 
            value={activeTab} 
            onValueChange={(details) => { setActiveTab(details.value); setError(''); setSuccessMessage(''); }}
            className="login-tabs-root"
          >
            <Tabs.List className="login-tabs-container">
              <Tabs.Trigger 
                value="login"
                className={`login-tab-button ${activeTab === 'login' ? 'active' : ''}`}
              >
                تسجيل الدخول الآمن
              </Tabs.Trigger>
              <Tabs.Trigger 
                value="register"
                className={`login-tab-button ${activeTab === 'register' ? 'active' : ''}`}
              >
                تسجيل طبيب وعيادة جديدة ✨
              </Tabs.Trigger>
            </Tabs.List>

          {/* 1. SIGN IN FORM */}
          <Tabs.Content value="login">
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="identifier">البريد الإلكتروني أو رقم الهاتف</label>
                <input
                  id="identifier"
                  name="identifier"
                  aria-label="البريد الإلكتروني أو رقم الهاتف"
                  type="text"
                  className="form-control"
                  placeholder="name@clinic.com / 010XXXXXXXX"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isLocked || isLoading}
                  required
                  dir="ltr"
                  autoComplete="username"
                />
              </div>

              <div className="form-group relative">
                <label className="form-label" htmlFor="password">كلمة المرور</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    aria-label="كلمة المرور"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
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
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg login-btn"
                disabled={isLoading || isLocked || !identifier || !password}
              >
                {isLoading ? (
                  <Loader2 className="spinner" size={22} />
                ) : isLocked ? (
                  `يرجى الانتظار (${lockoutTimer} ثانية)... `
                ) : (
                  'تسجيل الدخول إلى العيادة'
                )}
              </button>
            </form>
          </Tabs.Content>

          {/* 2. CLINIC ONBOARDING REGISTRATION FORM */}
          <Tabs.Content value="register">
            <form onSubmit={handleRegisterSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="regDoctorName">اسم الطبيب الكامل *</label>
                <input 
                  id="regDoctorName"
                  name="doctorName"
                  aria-label="اسم الطبيب الكامل"
                  type="text" 
                  className="form-control" 
                  placeholder="د. محمد عبد الرحمن"
                  value={regForm.doctorName}
                  onChange={(e) => setRegForm({ ...regForm, doctorName: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regClinicName">اسم العيادة أو المركز الطبي *</label>
                <input 
                  id="regClinicName"
                  name="clinicName"
                  aria-label="اسم العيادة أو المركز الطبي"
                  type="text" 
                  className="form-control" 
                  placeholder="عيادة الشروق لطب الأسنان"
                  value={regForm.clinicName}
                  onChange={(e) => setRegForm({ ...regForm, clinicName: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regSpecialty">التخصص السريري للعيادة *</label>
                <select
                  id="regSpecialty"
                  name="specialty"
                  aria-label="التخصص السريري للعيادة"
                  className="form-control"
                  value={regForm.specialty}
                  onChange={(e) => setRegForm({ ...regForm, specialty: e.target.value })}
                  disabled={isLoading}
                >
                  <option value="طب وجراحة الفم والأسنان">طب وجراحة الفم والأسنان</option>
                  <option value="الأمراض الجلدية والتجميل والليزر">الأمراض الجلدية والتجميل والليزر</option>
                  <option value="طب الأطفال وحديثي الولادة">طب الأطفال وحديثي الولادة</option>
                  <option value="طب وجراحة العيون">طب وجراحة العيون</option>
                  <option value="أمراض الباطنة والقلب والسكر">أمراض الباطنة والقلب والسكر</option>
                  <option value="جراحة العظام والمفاصل والعمود الفقري">جراحة العظام والمفاصل والعمود الفقري</option>
                  <option value="النساء والتوليد وعلاج العقم">النساء والتوليد وعلاج العقم</option>
                  <option value="الأنف والأذن والحنجرة">الأنف والأذن والحنجرة</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regPhone">رقم الهاتف المحمول (مصر) *</label>
                <input 
                  id="regPhone"
                  name="phone"
                  aria-label="رقم الهاتف المحمول للمسؤول"
                  type="tel" 
                  className="form-control" 
                  placeholder="010XXXXXXXX"
                  dir="ltr"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regEmail">البريد الإلكتروني المهني *</label>
                <input 
                  id="regEmail"
                  name="email"
                  aria-label="البريد الإلكتروني المهني"
                  type="email" 
                  className="form-control" 
                  placeholder="doctor@myclinic.com"
                  dir="ltr"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group relative">
                <label className="form-label" htmlFor="regPassword">كلمة المرور للحساب *</label>
                <div className="password-input-wrapper">
                  <input 
                    id="regPassword"
                    name="password"
                    aria-label="كلمة المرور للحساب"
                    type={showPassword ? "text" : "password"} 
                    className="form-control" 
                    placeholder="لا تقل عن 6 أحرف"
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
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg login-btn"
                disabled={isLoading || !regForm.doctorName || !regForm.clinicName || !regForm.phone || !regForm.password}
              >
                {isLoading ? (
                  <Loader2 className="spinner" size={22} />
                ) : (
                  'إنشاء وتدشين العيادة فوراً'
                )}
              </button>
            </form>
          </Tabs.Content>
        </Tabs.Root>
      )}

        {/* Google OAuth Single Sign-On */}
        <div className="login-divider">
          <span>أو الدخول المباشر السحابي</span>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleSignInClick}
          className="btn btn-google-login"
          disabled={isLoading || isLocked}
          aria-label="تسجيل الدخول باستخدام حساب Google"
        >
          <svg className="google-icon" width="19" height="19" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          <span>تسجيل الدخول باستخدام Google</span>
        </button>

        {/* Ark UI Google Account Picker Modal */}
        <Dialog.Root open={isGoogleModalOpen} onOpenChange={(details) => setIsGoogleModalOpen(details.open)} lazyMount unmountOnExit>
          <Dialog.Backdrop className="google-picker-backdrop" />
          <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content className="google-picker-card">
              <div className="google-picker-header">
                <svg className="google-icon" width="22" height="22" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
                <Dialog.Title asChild>
                  <h3>اختيار حساب Google للمتابعة</h3>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <p>اختر الحساب والدور المصرح به لاختبار الصلاحيات</p>
                </Dialog.Description>
              </div>

              <div className="google-accounts-list">
                <div 
                  className="google-account-item" 
                  onClick={() => handleSelectGoogleAccount('doctor')}
                >
                  <div className="google-avatar-circle" style={{ background: '#0B57D0', color: '#FFF' }}>أ</div>
                  <div className="account-details">
                    <strong>د. أحمد الشريف (حساب طبيب)</strong>
                    <small>dr.ahmed.google@gmail.com</small>
                    <span className="role-tag doctor-tag">صلاحيات سريرية وطبية كاملة</span>
                  </div>
                </div>

                <div 
                  className="google-account-item" 
                  onClick={() => handleSelectGoogleAccount('staff')}
                >
                  <div className="google-avatar-circle" style={{ background: '#0284C7', color: '#FFF' }}>س</div>
                  <div className="account-details">
                    <strong>سارة كمال (حساب استقبال وسكرتارية)</strong>
                    <small>sara.kamal.reception@gmail.com</small>
                    <span className="role-tag staff-tag">صلاحيات تنظيم المواعيد والصالة فقط</span>
                  </div>
                </div>

                <div 
                  className="google-account-item" 
                  onClick={() => handleSelectGoogleAccount('superadmin')}
                >
                  <div className="google-avatar-circle" style={{ background: '#DC2626', color: '#FFF' }}>م</div>
                  <div className="account-details">
                    <strong>مدير المنصة العام (Super Admin)</strong>
                    <small>admin.google@clinicflow.com</small>
                    <span className="role-tag admin-tag">لوحة التحكم السحابية الشاملة</span>
                  </div>
                </div>
              </div>

              <Dialog.CloseTrigger asChild>
                <button 
                  type="button" 
                  className="btn-close-google-picker"
                >
                  إلغاء
                </button>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        {/* Ark UI Collapsible Fast Role Testing Helpers */}
        <Collapsible.Root defaultOpen={false} className="demo-sandbox-helper" style={{ marginTop: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '0.85rem 1.15rem', background: 'var(--surface-container, #F0F4F9)' }}>
          <Collapsible.Trigger style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem', userSelect: 'none', width: '100%', background: 'transparent', border: 'none', textAlign: 'right' }}>
            <KeyRound size={15} className="text-primary" />
            <span>تجربة الأدوار والصلاحيات مباشرة (الدخول الفوري بنقرة واحدة)</span>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <div className="presets-buttons-grid" style={{ marginTop: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
              <button 
                type="button" 
                className="preset-btn"
                onClick={() => handleDirectRoleLogin('doctor@clinicflow.com', 'admin')}
                disabled={isLocked}
                title="دخول مباشر بصلاحية طبيب العيادة"
              >
                <Shield size={16} className="text-primary" />
                <div>
                  <strong>دخول: طبيب العيادة (Doctor)</strong>
                  <span>د. أحمد الشريف • صلاحيات سريرية ومالية</span>
                </div>
              </button>

              <button 
                type="button" 
                className="preset-btn"
                onClick={() => handleDirectRoleLogin('reception@clinicflow.com', '123')}
                disabled={isLocked}
                title="دخول مباشر بصلاحية موظف استقبال وسكرتارية"
              >
                <UserCheck size={16} style={{ color: '#0284C7' }} />
                <div>
                  <strong>دخول: سكرتارية واستقبال (Staff)</strong>
                  <span>سارة كمال • مواعيد وصالة انتظار فقط</span>
                </div>
              </button>

              <button 
                type="button" 
                className="preset-btn"
                onClick={() => handleDirectRoleLogin('owner@clinicflow.com', 'admin')}
                disabled={isLocked}
                title="دخول مباشر بصلاحية مالك مجمع العيادات"
              >
                <Shield size={16} style={{ color: '#F59E0B' }} />
                <div>
                  <strong>دخول: مالك مجمع عيادات (Owner)</strong>
                  <span>د. شريف العوضي • تبديل بين الفروع</span>
                </div>
              </button>

              <button 
                type="button" 
                className="preset-btn"
                onClick={() => handleDirectRoleLogin('superadmin@clinicflow.com', 'admin')}
                disabled={isLocked}
                title="دخول مباشر بصلاحية مدير المنصة العام"
              >
                <Shield size={16} style={{ color: '#EF4444' }} />
                <div>
                  <strong>دخول: مدير عام المنصة (Super Admin)</strong>
                  <span>تحكم كامل وسحابي في كافة العيادات</span>
                </div>
              </button>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>

        <div className="login-footer-links">
          <div className="footer-links-row">
            <a href="/booking" className="footer-nav-link" target="_blank" rel="noreferrer">
              <Building2 size={14} />
              <span>بوابة حجز واستعلام المرضى</span>
            </a>
            <span className="footer-dot">•</span>
            <a href="/" className="footer-nav-link">
              <Globe size={14} />
              <span>الصفحة العامة لمنصة ClinicFlow</span>
            </a>
          </div>

          <div className="footer-portal-switch-prompt">
            {portalScope === 'clinic' ? (
              <button 
                type="button"
                className="btn-text-portal-switch" 
                onClick={() => handleScopeChange('saas')}
              >
                <ShieldCheck size={14} />
                <span>هل أنت مدير عام للمنصة؟ اضغط هنا لدخول إدارة الساس (SaaS Admin)</span>
              </button>
            ) : (
              <button 
                type="button"
                className="btn-text-portal-switch" 
                onClick={() => handleScopeChange('clinic')}
              >
                <Building2 size={14} />
                <span>العودة إلى بوابة أطباء وعيادات العملاء (Client Clinics Portal)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
