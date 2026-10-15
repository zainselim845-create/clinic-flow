import React from 'react';
import { 
  Building2, Check, User, Lock, Mail, Phone, 
  ShieldCheck, Eye, EyeOff, Loader2, ArrowLeft, 
  Sparkles, ChevronDown
} from 'lucide-react';

const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter (الأساسية)',
    price: '499',
    currency: 'ج.م',
    period: '/ شهر',
    badge: 'للعيادات الفردية',
    features: ['طبيب واحد معتمد', 'فرع رئيسي واحد', 'إدارة المواعيد والمرضى', 'الفواتير وسندات القبض']
  },
  {
    id: 'pro',
    name: 'Pro (العيادة المتقدمة)',
    price: '999',
    currency: 'ج.م',
    period: '/ شهر',
    badge: 'الأكثر طلباً • تجربة مجانية',
    isPopular: true,
    features: ['حتى 3 أطباء وكوادر', 'ربط فروع متعددة', 'المساعد السريري الذكي', 'إدارة المخزون والتوريدات']
  },
  {
    id: 'enterprise',
    name: 'Enterprise (المراكز الكبرى)',
    price: '1999',
    currency: 'ج.م',
    period: '/ شهر',
    badge: 'للمراكز والمستشفيات',
    features: ['حتى 10 أطباء وموظفين', 'باقة رسائل SMS وواتساب', 'نطاق مخصص وتقارير متقدمة', 'دعم فني مخصص 24/7']
  }
];

/**
 * RegisterClinicForm - New clinic registration & onboarding tab component
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
      {/* Consolidated Google OAuth Primary Registration Hero */}
      <div className="google-primary-cta-card google-register-hero">
        <div className="google-cta-badge highlight">
          <Sparkles size={13} />
          <span>التسجيل السريع الذكي بنقرة واحدة</span>
        </div>
        <h3 className="google-card-heading">تدشين العيادة فوراً عبر Google</h3>
        <p className="google-card-desc">
          سحب بيانات الطبيب، البريد المعتمد، وتدشين حساب العيادة فوراً في السحابة الطبية دون أي خطوات يدوية.
        </p>
        
        <button 
          type="button" 
          onClick={handleGoogleSignInClick}
          className="btn-google-primary-hero btn-google-register"
          disabled={isLoading || isLocked}
          aria-label="تدشين العيادة وتفعيلها فوراً بحساب Google"
        >
          <svg className="google-svg" width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          <span>تدشين العيادة والربط الفوري بحساب Google</span>
        </button>

        {/* Streamlined inline prefill option */}
        <div className="google-sub-action">
          <span>أو تريد تعبئة باقي البيانات يدوياً؟</span>
          <button
            type="button"
            onClick={handleAutofillFromGoogle}
            className="btn-link-autofill"
            disabled={isLoading || isLocked}
          >
            سحب الاسم والبريد من Google إلى النموذج
          </button>
        </div>
      </div>

      <div className="auth-separator">
        <span>أو إنشاء الحساب وإدخال البيانات يدوياً</span>
      </div>

      <form onSubmit={handleRegisterSubmit} className="auth-form register-form">
        
        {/* Row 1: Doctor & Clinic Name */}
        <div className="form-fields-grid-2">
          <div className="form-field-group">
            <label className="field-label" htmlFor="regDoctorName">
              <span>اسم الطبيب المسؤول *</span>
            </label>
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
            <label className="field-label" htmlFor="regClinicName">
              <span>اسم العيادة أو المركز الطبي *</span>
            </label>
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

        {/* Row 2: Specialty Selector */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="regSpecialty">
            <span>التخصص السريري للعيادة *</span>
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
              <span>رقم هاتف الطبيب / العيادة *</span>
            </label>
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
            <label className="field-label" htmlFor="regEmail">
              <span>البريد الإلكتروني المهني *</span>
            </label>
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

        {/* Row 4: Password with meter */}
        <div className="form-field-group">
          <label className="field-label" htmlFor="regPassword">
            <span>كلمة المرور للحساب *</span>
          </label>
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
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
                {passwordStrength === 1 && 'كلمة مرور مقبولة (يفضل إضافة أرقام ورموز)'}
                {passwordStrength === 2 && 'كلمة مرور جيدة'}
                {passwordStrength >= 3 && 'كلمة مرور قوية ومؤمنة بالكامل'}
              </span>
            </div>
          )}
        </div>

        {/* Row 5: SaaS Plan Selection */}
        <div className="form-field-group">
          <div className="field-label-row">
            <label className="field-label">اختر باقة الاشتراك الأنسب لعيادتك *</label>
            <span className="plan-trial-badge">
              <ShieldCheck size={12} />
              تجربة 14 يوماً مجانية بدون بطاقة ائتمان
            </span>
          </div>
          <div className="saas-plan-selector-grid">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isSelected = (regForm.subscriptionTier || 'pro') === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`saas-plan-card ${isSelected ? 'selected' : ''} ${plan.isPopular ? 'popular' : ''}`}
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
                  {plan.badge && (
                    <div className={`plan-badge-top ${plan.isPopular ? 'popular-badge' : ''}`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="plan-card-body">
                    <span className="plan-name">{plan.name}</span>
                    <div className="plan-price-row">
                      <span className="plan-price">{plan.price}</span>
                      <span className="plan-currency">{plan.currency}</span>
                      <span className="plan-period">{plan.period}</span>
                    </div>

                    <ul className="plan-features-mini">
                      {plan.features.map((feat, idx) => (
                        <li key={idx}>
                          <Check size={13} className="feat-check" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="plan-select-indicator">
                    <div className={`radio-dot ${isSelected ? 'active' : ''}`}>
                      {isSelected && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                    <span>{isSelected ? 'الباقة المختارة' : 'اختيار هذه الباقة'}</span>
                  </div>
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
              أوافق على <a href="#terms" onClick={(e) => e.preventDefault()}>شروط الاستخدام</a> و <a href="#privacy" onClick={(e) => e.preventDefault()}>سياسة أمان وخصوصية السجلات الطبية</a>
            </span>
          </label>
        </div>

        {/* Primary Submit CTA */}
        <button 
          type="submit" 
          className="btn-auth-primary btn-register-cta"
          disabled={isLoading || !regForm.doctorName || !regForm.clinicName || !regForm.phone || !regForm.password || !regForm.agreeTerms}
        >
          {isLoading ? (
            <>
              <Loader2 className="btn-spinner" size={20} />
              <span>جاري تدشين وتجهيز منظومة عيادتك...</span>
            </>
          ) : (
            <>
              <span>تدشين العيادة وبدء الاستخدام الفوري</span>
              <ArrowLeft size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
