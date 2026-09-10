import React from 'react';
import { 
  ArrowRight, Sparkles, Users, UserPlus, AlertCircle, Loader2 
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

          {/* SERVICE SELECTION */}
          <div className="nebras-section">
            <label htmlFor="patientService" className="nebras-section-heading">الخدمة الطبية المطلوبة</label>
            <div className="nebras-input-group">
              <select 
                id="patientService"
                name="service"
                aria-label="الخدمة الطبية المطلوبة"
                className="nebras-input nebras-select"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              >
                {(currentClinic?.services && currentClinic.services.length > 0 ? currentClinic.services : [
                  { id: '1', name: 'كشف وفحص تشخيصي شامل', price: '300 ج.م' },
                  { id: '2', name: 'استشارة ومتابعة بعد العلاج', price: '150 ج.م' },
                  { id: '3', name: 'جلسة فحص دوري', price: '200 ج.م' }
                ])
                .filter(s => !s.name?.includes('طوارئ'))
                .map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name} {s.price ? `— (${s.price}${typeof s.price === 'number' ? ' ج.م' : ''})` : ''}
                  </option>
                ))}
              </select>
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
              <div className="nebras-error-banner">
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
