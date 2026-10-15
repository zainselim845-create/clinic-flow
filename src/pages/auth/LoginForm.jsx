import React from 'react';
import { User, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

/**
 * LoginForm - Pure Minimalist Doctor / Staff Login
 */
export default function LoginForm({
  identifier,
  setIdentifier,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  showPassword,
  setShowPassword,
  isLoading,
  isLocked,
  lockoutTimer,
  handleSubmit,
  handleGoogleSignInClick,
  onForgotPasswordClick
}) {
  return (
    <div className="auth-tab-content">
      {/* Minimal Google Action */}
      <div className="google-minimal-container">
        <button 
          type="button" 
          onClick={handleGoogleSignInClick}
          className="btn-minimal-google"
          disabled={isLoading || isLocked}
          aria-label="تسجيل الدخول باستخدام Google"
        >
          <svg className="google-svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          <span>المتابعة باستخدام Google</span>
        </button>
      </div>

      <div className="auth-separator">
        <span>أو تسجيل الدخول ببيانات الحساب</span>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-field-group">
          <label className="field-label" htmlFor="identifier">
            <span>البريد الإلكتروني أو الهاتف</span>
          </label>
          <div className="field-input-wrapper">
            <User className="input-icon" size={16} />
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
            <label className="field-label" htmlFor="password">
              <span>كلمة المرور</span>
            </label>
            <button
              type="button"
              className="btn-forgot-password-inline"
              onClick={onForgotPasswordClick}
            >
              نسيت كلمة المرور؟
            </button>
          </div>
          <div className="field-input-wrapper">
            <Lock className="input-icon" size={16} />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
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
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="form-options-row">
          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLocked || isLoading}
            />
            <span className="checkbox-label">تذكرني على هذا الجهاز</span>
          </label>
        </div>

        <button 
          type="submit" 
          className="btn-auth-primary"
          disabled={isLoading || isLocked || !identifier.trim() || !password}
        >
          {isLoading ? (
            <>
              <Loader2 className="btn-spinner" size={18} />
              <span>جاري تسجيل الدخول...</span>
            </>
          ) : isLocked ? (
            <span>يرجى الانتظار ({lockoutTimer}s)...</span>
          ) : (
            <>
              <span>تسجيل الدخول</span>
              <ArrowLeft size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
