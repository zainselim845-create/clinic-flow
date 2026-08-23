import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, user, isDemoMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) throw signInError;
      navigate('/');
    } catch (err) {
      setError(err.message || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-logo">
            <Stethoscope size={48} className="logo-icon" />
          </div>
          <h1 className="login-title">تسجيل الدخول — ClinicFlow</h1>
          <p className="login-subtitle">مرحباً بك مجدداً في نظام إدارة العيادة</p>
        </div>

        {isDemoMode && (
          <div className="demo-notice badge badge-warning">
            الوضع التجريبي — اضغط دخول للمتابعة
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="admin@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={!isDemoMode}
              dir="ltr"
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
                required={!isDemoMode}
                dir="ltr"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message shake">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-lg login-btn"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="spinner" size={24} /> : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="login-footer">
          <p>ليس لديك حساب؟ <a href="#" className="contact-link">تواصل معنا</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
