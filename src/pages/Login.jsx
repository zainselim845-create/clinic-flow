import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Loader2, UserCheck, Shield, ArrowRight, AlertTriangle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

const Login = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
    address: 'القاهرة، مصر'
  });
  
  const { signIn, signUpDoctorAndClinic, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // Lockout countdown timer
  useEffect(() => {
    let interval = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => {
          if (prev <= 1) {
            setFailedAttempts(0);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    if (!identifier.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني أو الهاتف وكلمة المرور.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(identifier.trim(), password.trim());
      if (signInError) throw signInError;
      setFailedAttempts(0);
      navigate(from, { replace: true });
    } catch (err) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);

      if (nextFailed >= MAX_FAILED_ATTEMPTS) {
        setLockoutTimer(LOCKOUT_SECONDS);
        setError(`تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم قفل تسجيل الدخول لمدة ${LOCKOUT_SECONDS} ثانية لحماية الحساب.`);
      } else {
        setError(`${err.message || 'بيانات الدخول غير صحيحة.'} (المحاولة ${nextFailed} من ${MAX_FAILED_ATTEMPTS})`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

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

  const handleQuickPreset = (presetId, presetPass) => {
    if (lockoutTimer > 0) return;
    setActiveTab('login');
    setIdentifier(presetId);
    setPassword(presetPass);
    setError('');
  };

  const isLocked = lockoutTimer > 0;

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        
        <div className="login-header">
          <div className="login-logo">
            <Stethoscope size={44} className="logo-icon" />
          </div>
          <h1 className="login-title">منظومة ClinicFlow الطبية</h1>
          <p className="login-subtitle">نظام إدارة العيادات، المواعيد، والسجلات السريرية المعتمد</p>

          {/* Navigation Tab Switches */}
          <div className="login-tabs-container">
            <button 
              type="button"
              className={`login-tab-button ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
            >
              تسجيل الدخول الآمن
            </button>
            <button 
              type="button"
              className={`login-tab-button ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
            >
              تسجيل طبيب وعيادة جديدة ✨
            </button>
          </div>
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

        {/* 1. SIGN IN FORM */}
        {activeTab === 'login' && (
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
        )}

        {/* 2. CLINIC ONBOARDING REGISTRATION FORM */}
        {activeTab === 'register' && (
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
        )}

        {/* Collapsible Developer & Demo Sandbox Helper */}
        <details className="demo-sandbox-helper" style={{ marginTop: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', userSelect: 'none' }}>
            <KeyRound size={14} />
            <span>حسابات العرض التجريبية (Demo Testing)</span>
          </summary>
          <div className="presets-buttons-grid" style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
            <button 
              type="button" 
              className={`preset-btn ${identifier.includes('doctor@') ? 'active' : ''}`}
              onClick={() => handleQuickPreset('doctor@clinicflow.com', 'admin')}
              disabled={isLocked}
            >
              <Shield size={16} className="text-primary" />
              <div>
                <strong>د. أحمد الشريف (أسنان)</strong>
                <span>doctor@clinicflow.com • عيادة مقفلة</span>
              </div>
            </button>

            <button 
              type="button" 
              className={`preset-btn ${identifier.includes('sara.clinic') ? 'active' : ''}`}
              onClick={() => handleQuickPreset('sara.clinic@clinicflow.com', 'admin')}
              disabled={isLocked}
            >
              <Shield size={16} style={{ color: '#8B5CF6' }} />
              <div>
                <strong>د. سارة محمود (جلدية)</strong>
                <span>sara.clinic@clinicflow.com • عيادة مقفلة</span>
              </div>
            </button>

            <button 
              type="button" 
              className={`preset-btn ${identifier.includes('owner') ? 'active' : ''}`}
              onClick={() => handleQuickPreset('owner@clinicflow.com', 'admin')}
              disabled={isLocked}
            >
              <Shield size={16} style={{ color: '#F59E0B' }} />
              <div>
                <strong>مالك العيادات (متعدد العيادات)</strong>
                <span>owner@clinicflow.com • تبديل متاح</span>
              </div>
            </button>

            <button 
              type="button" 
              className={`preset-btn ${identifier.includes('superadmin') ? 'active' : ''}`}
              onClick={() => handleQuickPreset('superadmin@clinicflow.com', 'admin')}
              disabled={isLocked}
            >
              <Shield size={16} style={{ color: '#EF4444' }} />
              <div>
                <strong>مدير المنصة (Super Admin)</strong>
                <span>superadmin@clinicflow.com • تحكم كامل</span>
              </div>
            </button>

            <button 
              type="button" 
              className={`preset-btn ${identifier === 'sara@clinic.com' ? 'active' : ''}`}
              onClick={() => handleQuickPreset('sara@clinic.com', '123')}
              disabled={isLocked}
            >
              <UserCheck size={16} className="text-emerald" />
              <div>
                <strong>سارة كمال (سكرتارية)</strong>
                <span>sara@clinic.com • مقفلة</span>
              </div>
            </button>
          </div>
        </details>

        <div className="login-footer">
          <a href="/booking" className="public-booking-redirect" target="_blank" rel="noreferrer">
            <span>هل أنت مريض وتريد حجز موعد؟ اضغط هنا للانتقال لصفحة الحجز</span>
            <ArrowRight size={14} />
          </a>
        </div>

      </div>
    </div>
  );
};

export default Login;
