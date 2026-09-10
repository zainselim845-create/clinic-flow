import React from 'react';
import { Phone, AlertCircle, Loader2, ChevronLeft, ShieldCheck } from 'lucide-react';

export default function PhoneCheckStep({
  formData,
  setFormData,
  phoneError,
  setPhoneError,
  isCheckingPhone,
  onSubmit
}) {
  return (
    <div className="nebras-card search-card">
      <div className="nebras-card-header">
        <p>حجز موعد أونلاين / Online Booking</p>
      </div>

      <div className="nebras-card-body">
        <div className="search-instruction">
          <h4>أدخل رقم هاتفك المحمول للبدء</h4>
          <p>سنتحقق فوراً من قاعدة البيانات: إذا كنت مسجلاً مسبقاً ستتمكن من اختيار موعدك مباشرة، وإذا كانت زيارتك الأولى ستسجل بياناتك أولاً.</p>
        </div>

        <form onSubmit={onSubmit} className="nebras-search-form">
          <div className="nebras-input-group">
            <label htmlFor="SearchPhoneNumber" className="nebras-label">رقم الهاتف المحمول (مصر) *</label>
            <div className="nebras-input-wrap">
              <input 
                type="tel"
                id="SearchPhoneNumber"
                name="phone"
                aria-label="رقم الهاتف المحمول للمريض"
                className={`nebras-input ${phoneError ? 'error-border' : ''}`}
                placeholder="01012345678"
                dir="ltr"
                value={formData.phone}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\s+/g, '');
                  setFormData(prev => ({ ...prev, phone: clean }));
                  setPhoneError('');
                }}
                maxLength={11}
                autoFocus
                required
              />
              <Phone size={18} className="nebras-field-icon" />
            </div>
            {phoneError && (
              <span className="nebras-error-msg">
                <AlertCircle size={14} />
                <span>{phoneError}</span>
              </span>
            )}
          </div>

          <div className="nebras-btn-wrap">
            <button 
              type="submit" 
              id="searchPatient"
              className="default-custom-btn"
              disabled={isCheckingPhone || !formData.phone || formData.phone.length < 11}
            >
              {isCheckingPhone ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>جاري التحقق من قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <span>متابعة</span>
                  <ChevronLeft size={18} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="nebras-privacy-badge">
          <ShieldCheck size={16} />
          <span>بياناتك الطبية والشخصية مشفرة ومحمية بالكامل.</span>
        </div>
      </div>
    </div>
  );
}
