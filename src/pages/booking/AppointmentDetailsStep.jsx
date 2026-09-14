import React from 'react';
import { 
  ArrowRight, Sparkles, Users, UserPlus, AlertCircle, Loader2, Stethoscope 
} from 'lucide-react';
import BookingCalendar from '../../components/BookingCalendar';

const maskName = (name) => {
  if (!name) return 'عميلنا العزيز';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${parts[1][0]}***`;
  return `${parts[0]} ${parts[1][0]}*** ${parts[parts.length - 1][0]}***`;
};

export default function AppointmentDetailsStep({
  formData,
  setFormData,
  isExistingClient,
  recognizedPatient,
  isFamilyMemberBooking,
  setIsFamilyMemberBooking,
  currentClinic,
  clinicAppointments,
  blockedSlots,
  availableSlots,
  bookingError,
  setBookingError,
  isSubmitting,
  onSubmit,
  onBackToPhone
}) {
  return (
    <div className="nebras-card details-card">
      {/* Dark Navy Header */}
      <div className="nebras-card-header flex-between">
        <p>{isExistingClient && !isFamilyMemberBooking ? 'بيانات الموعد (عميل مسجل)' : 'تسجيل مريض جديد وتحديد الموعد'}</p>
        <button 
          type="button" 
          onClick={onBackToPhone}
          className="nebras-header-back-btn"
        >
          <ArrowRight size={14} />
          <span>تغيير الرقم ({formData.phone})</span>
        </button>
      </div>

      {/* White Body */}
      <div className="nebras-card-body">
        <form onSubmit={onSubmit} className="nebras-booking-form">

          {/* BRANCH 1: EXISTING CLIENT WELCOME (NO PERSONAL INPUTS) */}
          {isExistingClient && recognizedPatient && !isFamilyMemberBooking && (
            <div className="nebras-patient-recognized-box">
              <div className="recognized-info">
                <Sparkles size={22} className="text-nebras-orange" />
                <div>
                  <h4>أهلاً بك مجدداً ({maskName(recognizedPatient.name)})</h4>
                  <p>رقم الهاتف: <span dir="ltr">{formData.phone}</span> • ملفك الطبي مسجل لدينا في العيادة. يمكنك اختيار موعدك بالأسفل مباشرةً.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsFamilyMemberBooking(true);
                  setFormData(prev => ({ ...prev, name: '', age: '' }));
                }}
                className="nebras-family-btn"
              >
                <Users size={13} />
                <span>حجز لشخص آخر من العائلة بنفس الرقم؟</span>
              </button>
            </div>
          )}

          {/* BRANCH 2: NEW CLIENT (OR FAMILY) -> FILL INFO FIRST */}
          {(!isExistingClient || isFamilyMemberBooking) && (
            <div className="nebras-new-patient-section">
              <div className="new-patient-title">
                <UserPlus size={18} className="text-nebras-orange" />
                <h5>{isFamilyMemberBooking ? 'بيانات فرد العائلة' : 'البيانات الشخصية للمريض الأول مرة'}</h5>
              </div>

              <div className="nebras-form-grid">
                <div className="nebras-input-group">
                  <label htmlFor="patientFullName" className="nebras-label">الاسم بالكامل (الاسم الثلاثي) *</label>
                  <input 
                    type="text" 
                    id="patientFullName"
                    name="fullName"
                    aria-label="الاسم بالكامل"
                    className="nebras-input"
                    placeholder="أدخل اسمك الثلاثي"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required 
                    autoFocus
                  />
                </div>

                <div className="nebras-row-2">
                  <div className="nebras-input-group">
                    <label htmlFor="patientAge" className="nebras-label">السن (العمر)</label>
                    <input 
                      type="number" 
                      id="patientAge"
                      name="age"
                      aria-label="السن"
                      className="nebras-input"
                      placeholder="مثال: 30"
                      value={formData.age}
                      onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                      min="1"
                      max="120"
                    />
                  </div>
                  <div className="nebras-input-group">
                    <label htmlFor="patientGender" className="nebras-label">النوع</label>
                    <select 
                      id="patientGender"
                      name="gender"
                      aria-label="النوع"
                      className="nebras-input nebras-select"
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SINGLE UNIFIED CLINIC SERVICE */}
          <div className="nebras-section">
            <span className="nebras-section-heading">الخدمة الطبية</span>
            <div className="nebras-service-card" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1.1rem',
              background: '#f8fafc',
              border: '1.5px solid #0284c7',
              borderRadius: '10px',
              marginTop: '0.35rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7'
                }}>
                  <Stethoscope size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                    كشف وفحص بعيادة الطبيب
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    فحص سريري متكامل وتشخيص طبي دقيق
                  </span>
                </div>
              </div>
              <div style={{
                background: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                whiteSpace: 'nowrap'
              }}>
                {currentClinic?.regularFee || '300 ج.م'}
              </div>
            </div>
          </div>

          {/* CALENDAR & TIME SLOTS SELECTION */}
          <div className="nebras-section">
            <h5 className="nebras-section-heading">اختر يوم ووقت الكشف المناسب</h5>
            <BookingCalendar 
              selectedDate={formData.date}
              onSelectDate={(newDate) => {
                setFormData(prev => ({ ...prev, date: newDate, time: '' }));
                setBookingError('');
              }}
              onDateSelect={(newDate) => {
                setFormData(prev => ({ ...prev, date: newDate, time: '' }));
                setBookingError('');
              }}
              selectedTime={formData.time}
              onSelectTime={(newTime) => {
                setFormData(prev => ({ ...prev, time: newTime }));
                setBookingError('');
              }}
              onTimeSelect={(newTime) => {
                setFormData(prev => ({ ...prev, time: newTime }));
                setBookingError('');
              }}
              appointments={clinicAppointments}
              blockedSlots={blockedSlots}
              availableSlots={availableSlots}
              scheduleConfig={currentClinic?.scheduleConfig}
            />
          </div>

          {/* NOTES & SUBMIT */}
          <div className="nebras-section">
            <label htmlFor="bookingNotes" className="nebras-section-heading">ملاحظات إضافية (اختياري)</label>
            <textarea 
              id="bookingNotes"
              name="notes"
              aria-label="ملاحظات إضافية للكشف"
              className="nebras-input nebras-textarea"
              rows="2"
              placeholder="اكتب هنا أي تفاصيل أو أعراض ترغب في إبلاغ الطبيب بها مسبقاً..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            ></textarea>

            {bookingError && (
              <div className="nebras-error-banner" role="alert" aria-live="assertive">
                <AlertCircle size={18} />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="nebras-btn-wrap" style={{ marginTop: '25px' }}>
              <button 
                type="submit" 
                className="default-custom-btn full-width"
                disabled={!formData.time || !formData.date || !formData.name || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>جاري تأكيد حجزك...</span>
                  </>
                ) : (
                  <span>{formData.time ? `تأكيد حجز الموعد (${formData.date} — الساعة ${formData.time})` : 'يرجى اختيار وقت من الجدول أعلاه'}</span>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
