import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Loader2, UserCheck, Shield, ArrowRight, AlertTriangle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

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

  const handleQuickPreset = (presetId, presetPass) => {
    if (lockoutTimer > 0) return;
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
          <h1 className="login-title">بوابة الدخول الآمن — ClinicFlow</h1>
          <p className="login-subtitle">نظام إدارة العيادات الطبية والسجلات السريرية المعتمد</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="identifier">البريد الإلكتروني أو رقم الهاتف</label>
            <input
              id="identifier"
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

          {error && (
            <div className={`error-message ${isLocked ? 'lockout-alert' : 'shake'}`} style={isLocked ? { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '8px' } : {}}>
              {isLocked && <AlertTriangle size={18} />}
              <span>{error}</span>
            </div>
          )}

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
              'تسجيل الدخول الآمن '
            )}
          </button>
        </form>

        {/* Collapsible Developer & Demo Sandbox Helper */}
        <details className="demo-sandbox-helper" style={{ marginTop: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', userSelect: 'none' }}>
            <KeyRound size={14} />
            <span>حسابات العرض التجريبية (Demo Testing)</span>
          </summary>
          <div className="presets-buttons-grid" style={{ marginTop: '0.75rem' }}>
            <button 
              type="button" 
              className={`preset-btn ${identifier.includes('doctor') ? 'active' : ''}`}
              onClick={() => handleQuickPreset('doctor@clinicflow.com', 'admin')}
              disabled={isLocked}
            >
              <Shield size={16} className="text-primary" />
              <div>
                <strong>حساب الطبيب </strong>
                <span>doctor@clinicflow.com</span>
              </div>
            </button>

            <button 
              type="button" 
              className={`preset-btn ${identifier.includes('sara') ? 'active' : ''}`}
              onClick={() => handleQuickPreset('sara.reception@clinic.com', '123')}
              disabled={isLocked}
            >
              <UserCheck size={16} className="text-emerald" />
              <div>
                <strong>حساب الاستقبال </strong>
                <span>sara.reception@clinic.com</span>
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
