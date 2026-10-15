import React from 'react';
import { 
  Building2, User, Lock, Mail, Phone, 
  Eye, EyeOff, Loader2, ArrowLeft, ChevronDown
} from 'lucide-react';

const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'الأساسية',
    price: '499 ج.م',
    period: '/ شهر',
    hint: 'طبيب واحد • فرع واحد'
  },
  {
    id: 'pro',
    name: 'المتقدمة',
    price: '999 ج.م',
    period: '/ شهر',
    hint: 'حتى 3 أطباء • فروع متعددة',
    badge: 'شائع'
  },
  {
    id: 'enterprise',
    name: 'المؤسسية',
    price: '1999 ج.م',
    period: '/ شهر',
    hint: '10 أطباء • دعم مخصص'
  }
];

/**
 * RegisterClinicForm - Pure Minimalist Clinic Registration
 */
export default function RegisterClinicForm({
  regForm,
  setRegForm,
  specialtiesList,
  passwordStrength,
  showPassword,
  setShowPassword,
  isLoading,
  isLocked,
  handleRegisterSubmit,
  handleGoogleSignInClick,
  handleAutofillFromGoogle
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
          aria-label="المتابعة السريعة باستخدام Google"
        >
          <svg className="google-svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          <span>المتابعة باستخدام Google (تدشين سريع)</span>
        </button>

        <div className="google-minimal-hint">
          <span>ترغب في ملء النموذج يدوياً؟</span>
          <button
            type="button"
            onClick={handleAutofillFromGoogle}
            className="btn-text-subtle"
            disabled={isLoading || isLocked}
          >
            استيراد الاسم والبريد إلى الحقول
          </button>
        </div>
      </div>

      <div className="auth-separator">
        <span>أو التسجيل ببيانات العيادة</span>
      </div>

      <form onSubmit={handleRegisterSubmit} className="auth-form">
        
        {/* Row 1: Doctor & Clinic Name */}
        <div className="form-fields-grid-2">
          <div className="form-field-group">
            <label className="field-label" htmlFor="regDoctorName">
              <span>اسم الطبيب المسؤول *</span>
            </label>
            <div className="field-input-wrapper">
              <User className="input-icon" size={16} />
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
            <label className="field-label" htmlFor="regClinicName">
              <span>اسم العيادة *</span>
            </label>
            <div className="field-input-wrapper">
              <Building2 className="input-icon" size={16} />
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

        {/* Row 2: Specialty Selector */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="regSpecialty">
            <span>التخصص الطبي للعيادة *</span>
          </label>
          <div className="field-select-wrapper">
            <select
              id="regSpecialty"
              name="specialty"
              className="field-input field-select"
              value={regForm.specialty}
              onChange={(e) => setRegForm({ ...regForm, specialty: e.target.value })}
              disabled={isLoading}
            >
              {specialtiesList.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            <ChevronDown className="select-arrow-icon" size={16} />
          </div>
        </div>

        {/* Row 3: Phone & Email */}
        <div className="form-fields-grid-2">
          <div className="form-field-group">
            <label className="field-label" htmlFor="regPhone">
              <span>رقم الهاتف *</span>
            </label>
            <div className="field-input-wrapper">
              <Phone className="input-icon" size={16} />
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
            <label className="field-label" htmlFor="regEmail">
              <span>البريد الإلكتروني *</span>
            </label>
            <div className="field-input-wrapper">
              <Mail className="input-icon" size={16} />
              <input 
                id="regEmail"
                name="email"
                type="email" 
                className="field-input has-icon" 
                placeholder="doctor@clinic.com"
                dir="ltr"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Row 4: Password with meter */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="regPassword">
            <span>كلمة المرور *</span>
          </label>
          <div className="field-input-wrapper">
            <Lock className="input-icon" size={16} />
            <input 
              id="regPassword"
              name="password"
              type={showPassword ? "text" : "password"} 
              className="field-input has-icon has-toggle" 
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
              className="btn-toggle-eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Minimal Password Strength Indicator */}
          {regForm.password && (
            <div className="password-meter-wrap">
              <div className="meter-bars">
                <span className={`meter-segment ${passwordStrength >= 1 ? 'active weak' : ''}`} />
                <span className={`meter-segment ${passwordStrength >= 2 ? 'active medium' : ''}`} />
                <span className={`meter-segment ${passwordStrength >= 3 ? 'active strong' : ''}`} />
              </div>
            </div>
          )}
        </div>

        {/* Row 5: Minimalist SaaS Plan Selector */}
        <div className="form-field-group">
          <label className="field-label">باقة الاشتراك *</label>
          <div className="saas-plan-selector-grid minimal">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isSelected = (regForm.subscriptionTier || 'pro') === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`saas-plan-card-minimal ${isSelected ? 'selected' : ''}`}
                  onClick={() => setRegForm(prev => ({ ...prev, subscriptionTier: plan.id }))}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setRegForm(prev => ({ ...prev, subscriptionTier: plan.id }));
                    }
                  }}
                >
                  <div className="plan-minimal-top">
                    <span className="plan-minimal-name">{plan.name}</span>
                    {plan.badge && <span className="plan-minimal-badge">{plan.badge}</span>}
                  </div>
                  <div className="plan-minimal-price">{plan.price}</div>
                  <div className="plan-minimal-hint">{plan.hint}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 6: Terms and Privacy */}
        <div className="form-options-row">
          <label className="checkbox-control">
            <input 
              type="checkbox" 
              checked={regForm.agreeTerms} 
              onChange={(e) => setRegForm({ ...regForm, agreeTerms: e.target.checked })}
              required
            />
            <span className="checkbox-label terms-label">
              أوافق على <a href="#terms" onClick={(e) => e.preventDefault()}>الشروط</a> و <a href="#privacy" onClick={(e) => e.preventDefault()}>سياسة الخصوصية الطبية</a>
            </span>
          </label>
        </div>

        {/* Primary Submit CTA */}
        <button 
          type="submit" 
          className="btn-auth-primary"
          disabled={isLoading || !regForm.doctorName || !regForm.clinicName || !regForm.phone || !regForm.password || !regForm.agreeTerms}
        >
          {isLoading ? (
            <>
              <Loader2 className="btn-spinner" size={18} />
              <span>جاري تدشين الحساب...</span>
            </>
          ) : (
            <>
              <span>إنشاء حساب العيادة</span>
              <ArrowLeft size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
