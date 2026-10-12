import React from 'react';
import { 
  Building2, Check, User, Lock, Mail, Phone, 
  ShieldCheck, Eye, EyeOff, Loader2, ArrowLeft 
} from 'lucide-react';

const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter (الأساسية)',
    price: '499 ج.م',
    period: '/ شهر',
    badge: 'العيادات الفردية',
    features: ['طبيب واحد', 'عيادة واحدة (فرع واحد)', 'مواعيد ومرضى وفواتير']
  },
  {
    id: 'pro',
    name: 'Pro (العيادة المتقدمة)',
    price: '999 ج.م',
    period: '/ شهر',
    badge: 'الأكثر طلباً',
    features: ['حتى 3 أطباء', 'ربط فروع وعيادات متعددة', 'المساعد السريري والمخزون']
  },
  {
    id: 'enterprise',
    name: 'Enterprise (المراكز الكبرى)',
    price: '1999 ج.م',
    period: '/ شهر',
    badge: 'مؤسسي متقدم',
    features: ['حتى 10 أطباء', 'باقة رسائل SMS وواتساب', 'نطاق مخصص وتدقيق كامل']
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
    <div>
      {/* Google OAuth Primary Registration Hero */}
      <div className="google-primary-cta-card google-register-hero">
        <div className="google-cta-badge highlight">
          <ShieldCheck size={14} />
          <span>الإنشاء الأساسي السريع - سحب كافة البيانات</span>
        </div>
        <h3 className="google-card-heading">تدشين العيادة فوراً بنقرة واحدة عبر Google</h3>
        <p className="google-card-desc">
          سحب اسم الطبيب، البريد الإلكتروني المعتمد، والصورة لإنشاء العيادة في السحابة فوراً وتوثيقها بدون إدخال يدوي.
        </p>
        <button 
          type="button" 
          onClick={handleGoogleSignInClick}
          className="btn-google-primary-hero btn-google-register"
          disabled={isLoading || isLocked}
          aria-label="تدشين العيادة وسحب كافة المعلومات عبر Google"
        >
          <svg className="google-svg" width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          <span>تدشين العيادة وسحب البيانات عبر Google (أساسي)</span>
        </button>
      </div>

      <div className="auth-separator">
        <span>أو إدخال بيانات التأسيس يدوياً</span>
      </div>

      <form onSubmit={handleRegisterSubmit} className="auth-form register-form">
        {/* Google Pre-fill Helper */}
        <div className="google-autofill-banner">
          <button
            type="button"
            onClick={handleAutofillFromGoogle}
            className="btn-google-autofill"
            disabled={isLoading}
            title="سحب الاسم والبريد الإلكتروني من Google لتسريع ملء النموذج"
          >
            <svg className="google-svg" width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            <span>سحب بياناتي من Google لتعبئة النموذج تلقائياً</span>
          </button>
        </div>
        
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
            {specialtiesList.map((spec) => (
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
            {SUBSCRIPTION_PLANS.map((plan) => {
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
    </div>
  );
}
