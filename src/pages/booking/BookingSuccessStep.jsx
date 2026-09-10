import React from 'react';
import { 
  Stethoscope, CheckCircle, Check, Copy, MapPin, 
  MessageCircle, CalendarPlus, RefreshCw 
} from 'lucide-react';
import { parseArabicTime } from '../../utils/parseArabicTime';

export default function BookingSuccessStep({
  createdBooking,
  currentClinic,
  copiedCode,
  onCopyBookingCode,
  onNewBooking,
  onManageBooking,
  onNavigate
}) {
  const cleanPhone = (createdBooking?.patientPhone || '').replace(/^0/, '20').replace(/\D/g, '');
  const clinicPhoneClean = (currentClinic?.phone || '').replace(/^0/, '20').replace(/\D/g, '');
  const smsMsg = encodeURIComponent(
    `مرحباً، تم حجز موعد كشف باسم: ${createdBooking?.patientName}\n` +
    `كود الحجز: ${createdBooking?.bookingCode}\n` +
    `الموعد: ${createdBooking?.date} الساعة ${createdBooking?.time}\n` +
    `الخدمة: ${createdBooking?.type}\n` +
    `العنوان: ${currentClinic?.address}`
  );
  const smsUrl = `sms:+${clinicPhoneClean || cleanPhone}?body=${smsMsg}`;

  const getGoogleCalendarUrl = (booking) => {
    if (!booking || !booking.date || !booking.time) return '#';
    const parsed = parseArabicTime(booking.time);
    const hours = parsed ? parsed.hours : 18;
    const minutes = parsed ? parsed.minutes : 0;

    const dateFormatted = booking.date.replace(/-/g, '');
    const startHourStr = String(hours).padStart(2, '0');
    const startMinStr = String(minutes).padStart(2, '0');
    const endHour = (hours + 1) % 24;
    const endHourStr = String(endHour).padStart(2, '0');

    const startIso = `${dateFormatted}T${startHourStr}${startMinStr}00`;
    const endIso = `${dateFormatted}T${endHourStr}${startMinStr}00`;

    const title = encodeURIComponent(`موعد كشف في ${currentClinic?.name || 'العيادة'}`);
    const details = encodeURIComponent(`كود الحجز: ${booking.bookingCode}\nالنوع: ${booking.type}\nالعنوان: ${currentClinic?.address || ''}`);
    const location = encodeURIComponent(currentClinic?.address || '');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  const getGoogleMapsUrl = (address, clinicName) => {
    const query = address ? `${address} (${clinicName || ''})` : (clinicName || 'عيادة');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  return (
    <div className="nebras-booking-page">
      {/* Top Bar */}
      <header className="nebras-top-bar">
        <div className="nebras-brand">
          <Stethoscope size={24} className="brand-logo-icon" />
          <span className="brand-title">{currentClinic?.name}</span>
        </div>
        <div className="nebras-bar-links">
          <button onClick={onManageBooking} className="nebras-nav-btn">
            <span>تعديل موعد سابق</span>
          </button>
          <button onClick={() => onNavigate('/login')} className="nebras-nav-btn outline">
            <span>بوابة العيادة</span>
          </button>
        </div>
      </header>

      <div className="nebras-body-container" style={{ maxWidth: '650px' }}>
        {/* Visual Progress Stepper (Success State) */}
        <div className="booking-visual-stepper">
          <div className="stepper-step completed">
            <span className="step-num"><Check size={14} /></span>
            <span className="step-title">التحقق من الهاتف</span>
          </div>
          <div className="stepper-line filled"></div>
          <div className="stepper-step completed">
            <span className="step-num"><Check size={14} /></span>
            <span className="step-title">اختيار الخدمة والموعد</span>
          </div>
          <div className="stepper-line filled"></div>
          <div className="stepper-step active">
            <span className="step-num"><Check size={14} /></span>
            <span className="step-title">تأكيد وتذكرة الحجز</span>
          </div>
        </div>

        <div className="nebras-card">
          <div className="nebras-card-header">
            <h3>تم تأكيد حجز موعدك بنجاح</h3>
          </div>

          <div className="nebras-card-body text-center">
            <div className="nebras-success-icon-wrap">
              <CheckCircle size={52} className="text-nebras-orange" />
            </div>

            <h4 className="success-headline">شكراً لثقتكم بنا</h4>
            <p className="success-subtext">تم تسجيل وتثبيت حجزك في العيادة بنجاح وتجهيز ملفك الطبي.</p>

            {/* Digital Pass */}
            <div className="nebras-ticket-box">
              <div className="nebras-ticket-header">
                <span>كود الحجز المرجعي:</span>
                <div className="ticket-code-group">
                  <strong className="ticket-code-text">{createdBooking.bookingCode}</strong>
                  <button onClick={onCopyBookingCode} className="nebras-btn-copy" title="نسخ الكود">
                    {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedCode ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              <div className="nebras-ticket-grid">
                <div className="ticket-row">
                  <span className="ticket-lbl">اسم المريض:</span>
                  <strong className="ticket-val">{createdBooking.patientName}</strong>
                </div>
                <div className="ticket-row">
                  <span className="ticket-lbl">رقم الهاتف:</span>
                  <strong className="ticket-val" dir="ltr">{createdBooking.patientPhone}</strong>
                </div>
                <div className="ticket-row">
                  <span className="ticket-lbl">تاريخ الموعد:</span>
                  <strong className="ticket-val">{createdBooking.date}</strong>
                </div>
                <div className="ticket-row">
                  <span className="ticket-lbl">التوقيت:</span>
                  <strong className="ticket-val text-nebras-orange">{createdBooking.time}</strong>
                </div>
                <div className="ticket-row">
                  <span className="ticket-lbl">نوع الخدمة:</span>
                  <strong className="ticket-val">{createdBooking.type}</strong>
                </div>
                <div className="ticket-row">
                  <span className="ticket-lbl">قيمة الكشف:</span>
                  <strong className="ticket-val text-nebras-orange">{createdBooking.fee}</strong>
                </div>
              </div>

              <a 
                href={getGoogleMapsUrl(currentClinic?.address, currentClinic?.name)}
                target="_blank" 
                rel="noopener noreferrer" 
                className="nebras-ticket-address"
                title="عرض موقع العيادة والاتجاهات على خرائط جوجل"
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <MapPin size={16} />
                <span>{currentClinic?.address}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginRight: 'auto' }}>
                  (الاتجاهات عبر Google Maps 📍)
                </span>
              </a>
            </div>

            {/* Action Buttons */}
            <div className="nebras-actions-row">
              <a href={smsUrl} className="nebras-action-btn sms">
                <MessageCircle size={18} />
                <span>إرسال تفاصيل الموعد عبر SMS</span>
              </a>
              <a href={getGoogleCalendarUrl(createdBooking)} target="_blank" rel="noopener noreferrer" className="nebras-action-btn calendar">
                <CalendarPlus size={18} />
                <span>إضافة إلى تقويم جوجل</span>
              </a>
            </div>

            <div className="nebras-success-footer">
              <button 
                onClick={onNewBooking} 
                className="nebras-link-btn"
              >
                <RefreshCw size={14} />
                <span>حجز موعد جديد</span>
              </button>
              <button onClick={onManageBooking} className="nebras-link-btn secondary">
                <span>إدارة أو تعديل الموعد</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
