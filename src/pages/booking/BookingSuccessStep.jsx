import React, { useState } from 'react';
import { 
  Stethoscope, CheckCircle, Check, Copy, MapPin, 
  MessageCircle, CalendarPlus, RefreshCw,
  CreditCard, Smartphone, Banknote, ShieldCheck
} from 'lucide-react';
import { parseArabicTime } from '../../utils/parseArabicTime';
import { getBookingConfirmationWhatsAppUrl } from '../../services/smsService';

export default function BookingSuccessStep({
  createdBooking,
  currentClinic,
  copiedCode,
  onCopyBookingCode,
  onNewBooking,
  onManageBooking,
  onNavigate
}) {
  const [copiedPayment, setCopiedPayment] = useState(false);
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

  const clinicSlug = currentClinic?.slug;
  const manageBase = typeof window !== 'undefined' 
    ? (clinicSlug ? `${window.location.origin}/c/${clinicSlug}/manage-booking` : `${window.location.origin}/manage-booking`)
    : (clinicSlug ? `/c/${clinicSlug}/manage-booking` : '/manage-booking');
  const manageUrlWithParams = createdBooking?.bookingCode
    ? `${manageBase}?code=${encodeURIComponent(createdBooking.bookingCode)}&phone=${encodeURIComponent(createdBooking.patientPhone || '')}`
    : manageBase;

  const whatsAppUrl = getBookingConfirmationWhatsAppUrl({
    patientName: createdBooking?.patientName,
    phone: createdBooking?.patientPhone,
    date: createdBooking?.date,
    time: createdBooking?.time,
    clinicName: currentClinic?.name,
    bookingCode: createdBooking?.bookingCode,
    manageUrl: manageUrlWithParams
  });

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

  const getNavigationUrl = (clinic) => {
    if (!clinic) return '#';
    if (clinic.googleMapsUrl && clinic.googleMapsUrl.trim()) {
      return clinic.googleMapsUrl.trim();
    }
    if (clinic.coordinates && clinic.coordinates.lat && clinic.coordinates.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${clinic.coordinates.lat},${clinic.coordinates.lng}`;
    }
    const query = clinic.address ? `${clinic.address} ${clinic.name || ''}` : (clinic.name || 'عيادة');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const getOpenStreetMapUrl = (address, clinicName) => {
    const query = address ? `${address} ${clinicName || ''}` : (clinicName || 'عيادة');
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
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
                {createdBooking.nationalId && (
                  <div className="ticket-row">
                    <span className="ticket-lbl">الرقم القومي:</span>
                    <strong className="ticket-val" dir="ltr">{createdBooking.nationalId}</strong>
                  </div>
                )}
                {createdBooking.governorate && (
                  <div className="ticket-row">
                    <span className="ticket-lbl">المحافظة:</span>
                    <strong className="ticket-val">{createdBooking.governorate}</strong>
                  </div>
                )}
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
                <div className="ticket-row">
                  <span className="ticket-lbl">طريقة الدفع:</span>
                  <strong className="ticket-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {createdBooking.paymentMethod === 'instapay' && <><CreditCard size={14} color="#0284c7" /> <span>إنستاباي (InstaPay)</span></>}
                    {createdBooking.paymentMethod === 'vodafone_cash' && <><Smartphone size={14} color="#e11d48" /> <span>محفظة إلكترونية كاش</span></>}
                    {createdBooking.paymentMethod === 'meeza' && <><CreditCard size={14} color="#16a34a" /> <span>بطاقة ميزة الوطنية</span></>}
                    {(!createdBooking.paymentMethod || createdBooking.paymentMethod === 'cash') && <><Banknote size={14} color="#64748b" /> <span>الدفع نقداً بالعيادة</span></>}
                  </strong>
                </div>
              </div>

              {/* Egyptian Electronic Payment Instruction Box (InstaPay / Cash Wallet) */}
              {createdBooking.paymentMethod === 'instapay' && (
                <div style={{
                  background: '#f0f9ff',
                  border: '1.5px solid #bae6fd',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  margin: '0.85rem 0',
                  textAlign: 'right'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0369a1' }}>
                      عنوان الدفع اللحظي عبر إنستاباي (InstaPay IPA):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = currentClinic?.instapayIpa || `${currentClinic?.slug || 'clinic'}@instapay`;
                        navigator.clipboard.writeText(target);
                        setCopiedPayment(true);
                        setTimeout(() => setCopiedPayment(false), 2500);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #7dd3fc',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#0284c7',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedPayment ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedPayment ? 'تم النسخ' : 'نسخ العنوان'}</span>
                    </button>
                  </div>
                  <code style={{ fontSize: '0.9rem', color: '#0369a1', fontWeight: 800, direction: 'ltr', display: 'inline-block' }}>
                    {currentClinic?.instapayIpa || `${currentClinic?.slug || 'clinic'}@instapay`}
                  </code>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                    يرجى كتابة كود الحجز ({createdBooking.bookingCode}) في خانة ملاحظات التحويل لتأكيد الإيصال فورياً.
                  </p>
                </div>
              )}

              {createdBooking.paymentMethod === 'vodafone_cash' && (
                <div style={{
                  background: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  margin: '0.85rem 0',
                  textAlign: 'right'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#be123c' }}>
                      رقم المحفظة الإلكترونية لتحويل الكاش:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = currentClinic?.cashWalletPhone || currentClinic?.phone || '01000000000';
                        navigator.clipboard.writeText(target);
                        setCopiedPayment(true);
                        setTimeout(() => setCopiedPayment(false), 2500);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fda4af',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#be123c',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedPayment ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedPayment ? 'تم النسخ' : 'نسخ الرقم'}</span>
                    </button>
                  </div>
                  <code style={{ fontSize: '0.95rem', color: '#be123c', fontWeight: 800, direction: 'ltr', display: 'inline-block' }}>
                    {currentClinic?.cashWalletPhone || currentClinic?.phone || '01000000000'}
                  </code>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                    بعد إتمام التحويل، يرجى إبراز رسالة التأكيد للاستقبال عند الحضور بالعيادة.
                  </p>
                </div>
              )}

              <a 
                href={getNavigationUrl(currentClinic)}
                target="_blank" 
                rel="noopener noreferrer" 
                className="nebras-ticket-address"
                title="عرض موقع العيادة والاتجاهات المباشرة عبر خرائط جوجل (Google Maps)"
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <MapPin size={16} />
                <span>{currentClinic?.address || 'موقع العيادة على الخريطة'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginRight: 'auto' }}>
                  (الاتجاهات عبر خرائط Google)
                </span>
              </a>
            </div>

            {/* Action Buttons */}
            <div className="nebras-actions-row">
              <a 
                href={whatsAppUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="nebras-action-btn whatsapp" 
                title="إرسال تذكرة الحجز عبر واتساب"
                aria-label="حفظ وإرسال تذكرة الحجز عبر تطبيق واتساب"
              >
                <MessageCircle size={18} />
                <span>حفظ التذكرة عبر واتساب</span>
              </a>
              <a 
                href={smsUrl} 
                className="nebras-action-btn sms"
                aria-label="إرسال تفاصيل الموعد عبر رسالة نصية قصيرة SMS"
              >
                <MessageCircle size={18} />
                <span>إرسال تفاصيل الموعد عبر SMS</span>
              </a>
              <a 
                href={getGoogleCalendarUrl(createdBooking)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="nebras-action-btn calendar"
                aria-label="إضافة الموعد إلى تقويم جوجل Google Calendar"
              >
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
