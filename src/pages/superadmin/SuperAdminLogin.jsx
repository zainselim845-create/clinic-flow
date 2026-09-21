import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, 
  AlertTriangle, KeyRound, ShieldAlert, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './SuperAdminLogin.css';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user } = useAuth();

  const [email, setEmail] = useState('superadmin@clinicflow.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    let interval = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // If already authenticated as super_admin, redirect to super-admin dashboard
  useEffect(() => {
    if (user && (user.role === 'super_admin' || user.isSuperAdmin)) {
      const destination = location.state?.from?.pathname || '/super-admin';
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني ورمز المرور السري.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await signIn(email.trim().toLowerCase(), password);
      if (res?.error) {
        throw res.error;
      }

      const loggedUser = res?.data?.user;
      if (loggedUser?.role !== 'super_admin' && !loggedUser?.isSuperAdmin) {
        throw new Error('هذا الحساب لا يمتلك صلاحيات إدارة المنصة المركزية.');
      }

      const destination = location.state?.from?.pathname || '/super-admin';
      navigate(destination, { replace: true });
    } catch (err) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      if (nextFailed >= MAX_FAILED_ATTEMPTS) {
        setLockoutTimer(LOCKOUT_SECONDS);
        setError(`تم تجاوز الحد الأقصى للمحاولات. تم تفعيل القفل الأمني لمدة ${LOCKOUT_SECONDS} ثانية.`);
      } else {
        setError(err.message || `بيانات الدخول غير صحيحة. المحاولة ${nextFailed} من ${MAX_FAILED_ATTEMPTS}.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = lockoutTimer > 0;

  return (
    <div className="superadmin-login-wrapper">
      <div className="superadmin-login-glow" />
      
      <div className="superadmin-login-card">
        <div className="superadmin-header">
          <div className="superadmin-shield-badge">
            <ShieldCheck size={28} />
          </div>
          <h2>إدارة المنصة المركزية</h2>
          <span className="superadmin-subtitle">ClinicFlow SaaS Control Plane</span>
        </div>

        <div className="superadmin-security-alert">
          <ShieldAlert size={16} />
          <span>منطقة محظورة ومخصصة حصرياً للمشرفين العامين. كافة محاولات الدخول مسجلة وتخضع للرقابة الصارمة.</span>
        </div>

        {error && (
          <div className="superadmin-error-box" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {isLocked && (
          <div className="superadmin-lockout-box" role="alert">
            <KeyRound size={16} />
            <span>النظام مقفل مؤقتاً لدواعي الأمان. يرجى الانتظار {lockoutTimer} ثانية قبل المحاولة مجدداً.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="superadmin-form">
          <div className="superadmin-field">
            <label htmlFor="sa-email">البريد الإلكتروني للإدارة</label>
            <div className="superadmin-input-wrap">
              <Mail size={16} className="field-icon" />
              <input
                id="sa-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@clinicflow.com"
                required
                disabled={isLocked || isLoading}
                dir="ltr"
              />
            </div>
          </div>

          <div className="superadmin-field">
            <label htmlFor="sa-password">رمز المرور الإداري</label>
            <div className="superadmin-input-wrap">
              <Lock size={16} className="field-icon" />
              <input
                id="sa-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                disabled={isLocked || isLoading}
                dir="ltr"
              />
              <button
                type="button"
                className="btn-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-superadmin-submit"
            disabled={isLocked || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>جاري التحقق من الصلاحيات...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>الدخول إلى لوحة إدارة الساس</span>
              </>
            )}
          </button>
        </form>

        <div className="superadmin-footer">
          <a href="/login" className="back-to-clinic-link">
            <ArrowRight size={14} />
            <span>العودة لبوابة العيادات العامة</span>
          </a>
        </div>
      </div>
    </div>
  );
}
