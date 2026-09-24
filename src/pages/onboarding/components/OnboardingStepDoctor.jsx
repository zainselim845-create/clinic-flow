import React from 'react';
import { User, UserCheck, Phone, Briefcase, Check, AlertCircle } from 'lucide-react';

export default function OnboardingStepDoctor({
  doctorName,
  setDoctorName,
  username,
  setUsername,
  handleUsernameChange,
  usernameAvailability,
  phone,
  setPhone,
  jobTitle,
  setJobTitle
}) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>
          <UserCheck size={28} color="var(--primary)" />
          <span>بيانات الطبيب واسم المستخدم المخصص</span>
        </h2>
        <p>
          أهلاً بك! خصص اسم ملفك الطبي واسم المستخدم الفريد (@handle) الذي ستستخدمه لتسجيل الدخول ورابط عيادتك.
        </p>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">
            <span>اسم الطبيب / اللقب المهني *</span>
          </label>
          <div className="form-input-wrapper">
            <User className="input-prefix-icon" size={18} />
            <input
              type="text"
              className="form-input has-prefix"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="مثال: د. أحمد مصطفى"
              required
            />
          </div>
          <span className="input-hint">الاسم الذي سيظهر لمرضاك على الروشتات وإيصالات الحجز.</span>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>اسم المستخدم المخصص (@username) *</span>
            {usernameAvailability.available ? (
              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Check size={14} /> متاح للاستخدام
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={14} /> محجوز مسبقاً
              </span>
            )}
          </label>
          <div className="form-input-wrapper">
            <span style={{ position: 'absolute', right: '1rem', fontWeight: 800, color: usernameAvailability.available ? 'var(--primary)' : '#EF4444' }}>@</span>
            <input
              type="text"
              className="form-input has-prefix"
              value={username}
              onChange={handleUsernameChange}
              placeholder="dr-name-clinic"
              style={{ 
                direction: 'ltr', 
                textAlign: 'left', 
                paddingLeft: '1rem', 
                paddingRight: '2.5rem',
                borderColor: !usernameAvailability.available ? '#EF4444' : undefined
              }}
              required
            />
          </div>

          {/* Live Username Availability / Taken Warning */}
          {!usernameAvailability.available ? (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              fontSize: '0.85rem',
              color: '#DC2626',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <AlertCircle size={16} />
                <span>{usernameAvailability.reason}</span>
              </div>
              {usernameAvailability.suggestions && usernameAvailability.suggestions.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>اقتراحات بديلة متاحة:</span>
                  {usernameAvailability.suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setUsername(sug)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        direction: 'ltr'
                      }}
                    >
                      @{sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="username-preview-box">
              <span className="username-status">
                <Check size={14} /> متاح ومناسب لعيادتك
              </span>
              <span className="username-url">{(typeof window !== 'undefined' ? window.location.host : 'clinicflow.com')}/c/{username || 'username'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">
            <span>رقم هاتف الطبيب / واتساب العيادة *</span>
          </label>
          <div className="form-input-wrapper">
            <Phone className="input-prefix-icon" size={18} />
            <input
              type="tel"
              className="form-input has-prefix"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>
          <span className="input-hint">لتلقي إشعارات الحجوزات الطارئة ورسائل المتابعة.</span>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>الدرجة العلمية / التوصيف السريري</span>
          </label>
          <div className="form-input-wrapper">
            <Briefcase className="input-prefix-icon" size={18} />
            <input
              type="text"
              className="form-input has-prefix"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="استشاري ورئيس القسم"
            />
          </div>
          <span className="input-hint">مثال: استشاري جراحة، أخصائي أول، ماجستير طب وجراحة الفم.</span>
        </div>
      </div>
    </div>
  );
}
