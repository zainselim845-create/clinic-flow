import React, { useState } from 'react';
import { 
  Building2, Save, CheckCircle2, Phone, Mail, Clock, 
  CalendarDays, ArrowLeft, Stethoscope, Globe, 
  FileText, Printer, ShieldCheck, UserCheck, Sparkles,
  Copy, ExternalLink, MessageSquare
} from 'lucide-react';

import { CLINIC_SPECIALTIES } from '../../data/specialtiesData';
import { formatSenderId } from '../../services/smsService';
import ClinicPalettePicker from '../../components/ClinicPalettePicker';

export default function GeneralSettingsTab({
  clinicForm,
  setClinicForm,
  handleSaveClinic,
  clinicSaveSuccess,
  onNavigateToSchedule,
  onNavigateToVisitTypes
}) {
  const [specialtyNotice, setSpecialtyNotice] = useState('');
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);

  const clinicSlug = clinicForm.slug || 'dr-ahmed';
  const resolvedSenderId = clinicForm.senderId || formatSenderId(clinicSlug, 'ClinicFlow');

  const handleCopyBookingLink = () => {
    const bookingUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/c/${clinicSlug}/booking` 
      : `/c/${clinicSlug}/booking`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(bookingUrl);
      setCopiedBookingLink(true);
      setTimeout(() => setCopiedBookingLink(false), 2500);
    }
  };

  const handleApplyDefaultServicesForSpecialty = () => {
    const currentSpecialtyName = clinicForm.specialty || '';
    const matched = CLINIC_SPECIALTIES.find(s => s.name === currentSpecialtyName || currentSpecialtyName.includes(s.name));
    if (!matched) {
      alert('يرجى اختيار تخصص طبي من القائمة أولاً.');
      return;
    }
    const confirmReset = window.confirm(`هل أنت متأكد من رغبتك في تحميل قائمة الخدمات والأسعار النموذجية لتخصص (${matched.name})؟ سيتم تحديث قائمة الخدمات الافتراضية.`);
    if (confirmReset) {
      setClinicForm(prev => ({
        ...prev,
        category: matched.category,
        services: matched.defaultServices || prev.services,
        visitTypes: matched.defaultVisitTypes || prev.visitTypes
      }));
      setSpecialtyNotice(`تم تحميل خدمات (${matched.name}) النموذجية بنجاح!`);
      setTimeout(() => setSpecialtyNotice(''), 5000);
    }
  };

  return (
    <form onSubmit={handleSaveClinic} className="settings-section" dir="rtl">
      {/* Top Header & Save Action */}
      <div className="section-header">
        <div>
          <h3>إعدادات وهوية الطبيب والعيادة (Doctor & Clinic Profile)</h3>
          <p>إدارة البيانات المهنية للطبيب، هوية المركز والاعتمادات، وإعدادات الروشتة والطباعة</p>
        </div>
        <button type="submit" className="btn btn-primary btn-save">
          <Save size={18} />
          <span>حفظ كافة التعديلات</span>
        </button>
      </div>

      {clinicSaveSuccess && (
        <div className="settings-alert success">
          <CheckCircle2 size={18} />
          <span>تم حفظ وتحديث بيانات الطبيب والعيادة بنجاح!</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* BRAND & MONOCHROME COLOR PALETTE CUSTOMIZER               */}
      {/* ======================================================== */}
      <div style={{ marginBottom: '1.5rem' }}>
        <ClinicPalettePicker
          value={clinicForm.branding?.primaryColor || clinicForm.primaryColor || '#09090B'}
          onChange={(newColor, palette) => {
            setClinicForm(prev => ({
              ...prev,
              branding: {
                ...(prev.branding || {}),
                primaryColor: newColor,
                paletteId: palette.id
              }
            }));
          }}
          onSaveDirectly={true}
        />
      </div>

      {/* ======================================================== */}
      {/* CARD 1: DOCTOR PROFESSIONAL PROFILE                      */}
      {/* ======================================================== */}
      <div className="settings-card-block" style={{
        background: 'var(--bg-primary)',
        border: '1.5px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0071E3, #2563EB)',
              color: '#FFF',
              padding: '0.5rem',
              borderRadius: '10px'
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>الملف المهني والهوية الطبية للطبيب</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>البيانات المعتمدة التي تظهر في الروشتات الطبية، التقارير، وتذاكر الحجز</p>
            </div>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.78rem',
            background: 'rgba(37, 99, 235, 0.08)',
            color: '#2563EB',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontWeight: 700
          }}>
            <ShieldCheck size={13} />
            <span>طبيب معتمد</span>
          </span>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="doctorName">اسم الطبيب المدير المسؤول *</label>
            <div className="input-with-icon">
              <UserCheck size={18} />
              <input 
                id="doctorName"
                name="doctorName"
                type="text" 
                value={clinicForm.doctorName || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, doctorName: e.target.value })}
                placeholder="مثال: د. أحمد الشريف" 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="doctorTitle">اللقب والمسمى الأكاديمي والاستشاري *</label>
            <div className="input-with-icon">
              <Stethoscope size={18} />
              <input 
                id="doctorTitle"
                name="doctorTitle"
                type="text" 
                value={clinicForm.doctorTitle || clinicForm.specialty || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, doctorTitle: e.target.value })}
                placeholder="مثال: استشاري أول جراحة الفم والأسنان وزراعة وتجميل الأسنان" 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="syndicateNumber">رقم ترخيص مزاولة المهنة / قيد النقابة</label>
            <div className="input-with-icon">
              <ShieldCheck size={18} />
              <input 
                id="syndicateNumber"
                name="syndicateNumber"
                type="text" 
                value={clinicForm.syndicateNumber || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, syndicateNumber: e.target.value })}
                placeholder="مثال: قيد نقابة: 28419 / القاهرة" 
              />
            </div>
            <small style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>يُطبع رسمياً في ترويسة الروشتة والتقرير السريري</small>
          </div>

          <div className="form-group">
            <label htmlFor="doctorEmail">البريد الإلكتروني المهني للطبيب *</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input 
                id="doctorEmail"
                name="doctorEmail"
                type="email" 
                dir="ltr"
                value={clinicForm.doctorEmail || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, doctorEmail: e.target.value })}
                placeholder="doctor@clinicflow.com" 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="doctorDirectPhone">رقم هاتف الطبيب المباشر والواتساب</label>
            <div className="input-with-icon">
              <Phone size={18} />
              <input 
                id="doctorDirectPhone"
                name="doctorDirectPhone"
                type="tel" 
                dir="ltr"
                value={clinicForm.doctorDirectPhone || clinicForm.phone || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, doctorDirectPhone: e.target.value })}
                placeholder="01006285031" 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="consultationDuration">مدة الكشف الافتراضية للعيادة</label>
            <select
              id="consultationDuration"
              value={clinicForm.consultationDuration || clinicForm.scheduleConfig?.slotDuration || 30}
              onChange={(e) => {
                const dur = parseInt(e.target.value, 10) || 30;
                setClinicForm(prev => ({
                  ...prev,
                  consultationDuration: dur,
                  scheduleConfig: {
                    ...(prev.scheduleConfig || {}),
                    slotDuration: dur
                  }
                }));
              }}
              className="saas-filter-select"
              style={{ height: '42px', width: '100%' }}
            >
              <option value={15}>15 دقيقة (كشف واستشارة سريعة)</option>
              <option value={20}>20 دقيقة (فحص طبي قياسي)</option>
              <option value={30}>30 دقيقة (كشف وفحص سريري مفصل)</option>
              <option value={45}>45 دقيقة (جلسة علاجية مطولة)</option>
              <option value={60}>60 دقيقة (فحص شامل أو إجراء علاجي)</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="doctorBio">نبذة مهنية عن الطبيب والمؤهلات الأكاديمية</label>
            <textarea
              id="doctorBio"
              name="doctorBio"
              rows={2}
              value={clinicForm.doctorBio || ''}
              onChange={(e) => setClinicForm({ ...clinicForm, doctorBio: e.target.value })}
              placeholder="مثال: زميل الكلية الملكية للجراحين، ماجستير جراحة وتجميل الأسنان جامعة القاهرة، خبرة أكثر من 15 عاماً..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.88rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD 2: CLINIC IDENTITY & PUBLIC PROFILE                 */}
      {/* ======================================================== */}
      <div className="settings-card-block" style={{
        background: 'var(--bg-primary)',
        border: '1.5px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFF',
              padding: '0.5rem',
              borderRadius: '10px'
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>بيانات وهوية المركز أو العيادة</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>البيانات العامة المعلنة للمرضى في صفحة الحجز، الفواتير، وتقييمات خرائط جوجل</p>
            </div>
          </div>
          {specialtyNotice && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              background: '#ECFDF5',
              color: '#059669',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontWeight: 700
            }}>
              <CheckCircle2 size={13} />
              <span>{specialtyNotice}</span>
            </span>
          )}
        </div>

        {/* Clinic Digital Identity & Direct Booking Link Bar */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(0, 113, 227, 0.1)',
              color: '#0071E3',
              padding: '0.45rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Globe size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>رابط صفحة حجز المرضى المباشر:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', flexWrap: 'wrap' }}>
                <code style={{ direction: 'ltr', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
                  /c/{clinicSlug}/booking
                </code>
                <button
                  type="button"
                  onClick={handleCopyBookingLink}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    background: copiedBookingLink ? '#ECFDF5' : 'var(--bg-primary)',
                    color: copiedBookingLink ? '#059669' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {copiedBookingLink ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                  <span>{copiedBookingLink ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                </button>
                <a
                  href={`/c/${clinicSlug}/booking`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none'
                  }}
                >
                  <span>معاينة</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.8rem',
              background: 'rgba(59, 130, 246, 0.08)',
              color: '#2563eb',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontFamily: 'monospace',
              fontWeight: 700
            }}
            title="معرّف مرسل رسائل SMS المعتمد للعيادة لدى شركات المحمول"
            >
              <MessageSquare size={13} />
              <span>Sender ID: {resolvedSenderId}</span>
            </span>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="clinicName">اسم المركز أو العيادة الرسمي *</label>
            <div className="input-with-icon">
              <Building2 size={18} />
              <input 
                id="clinicName"
                name="clinicName"
                type="text" 
                value={clinicForm.name || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                placeholder="مثال: مركز النخبة لطب وجراحة الأسنان" 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="specialtySelect">التخصص الطبي الرئيسي للعيادة *</label>
            <select
              id="specialtySelect"
              value={clinicForm.specialty || ''}
              onChange={(e) => {
                const val = e.target.value;
                setClinicForm(prev => ({
                  ...prev,
                  specialty: val,
                  doctorTitle: prev.doctorTitle || val
                }));
              }}
              className="saas-filter-select"
              style={{ height: '42px', width: '100%' }}
            >
              <optgroup label="🦷 طب وجراحة الفم والأسنان">
                {CLINIC_SPECIALTIES.filter(s => s.category === 'dental').map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="🩺 الطب البشري والتخصصات الطبية">
                {CLINIC_SPECIALTIES.filter(s => s.category === 'medical').map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="clinicPhone">هاتف العيادة للاستقبال والحجز *</label>
            <div className="input-with-icon">
              <Phone size={18} />
              <input 
                id="clinicPhone"
                name="clinicPhone"
                type="tel" 
                dir="ltr"
                value={clinicForm.phone || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
                placeholder="01006285031" 
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="regularFee">رسوم الكشف الافتراضي (ج.م) *</label>
            <input 
              id="regularFee"
              name="regularFee"
              type="text" 
              value={clinicForm.regularFee || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, regularFee: e.target.value })}
              placeholder="300 ج.م" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="consultationFee">رسوم الاستشارة والمتابعة (ج.م)</label>
            <input 
              id="consultationFee"
              name="consultationFee"
              type="text" 
              value={clinicForm.consultationFee || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, consultationFee: e.target.value })}
              placeholder="150 ج.م" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="workingHours">مواعيد وأيام العمل المعلنة للمرضى (نص توضيحي)</label>
            <div className="input-with-icon">
              <Clock size={18} />
              <input 
                id="workingHours"
                name="workingHours"
                type="text" 
                value={clinicForm.workingHours || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, workingHours: e.target.value })}
                placeholder="السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً" 
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="clinicAddress">عنوان العيادة بالتفصيل *</label>
            <input 
              id="clinicAddress"
              name="clinicAddress"
              type="text" 
              value={clinicForm.address || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
              placeholder="مثال: مصر الجديدة — شارع الأهرام، برج الأطباء، الدور الرابع" 
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="googleReviewUrl">رابط صفحة العيادة على خرائط جوجل (Google Maps Reviews URL)</label>
            <div className="input-with-icon">
              <Globe size={18} />
              <input 
                id="googleReviewUrl"
                name="googleReviewUrl"
                type="url" 
                dir="ltr"
                value={clinicForm.googleReviewUrl || ''} 
                onChange={(e) => setClinicForm({ ...clinicForm, googleReviewUrl: e.target.value })}
                placeholder="https://g.page/r/your-clinic/review أو https://maps.google.com/?cid=..." 
              />
            </div>
            <small style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              يوجه النظام المرضى الراضين تلقائياً لتقييم عيادتك على Google Maps بعد إتمام الكشف بنجاح لرفع تقييم العيادة.
            </small>
          </div>
        </div>

        {/* Load Default Template Services Button */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px dashed var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            💡 هل تريد إعادة تحميل قائمة الخدمات النموذجية لـ ({clinicForm.specialty || 'تخصصك'})؟
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleApplyDefaultServicesForSpecialty}
            style={{ fontSize: '0.8rem' }}
          >
            <Sparkles size={14} />
            <span>تحميل خدمات التخصص النموذجية</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD 3: e-PRESCRIPTION & PRINT SETTINGS                  */}
      {/* ======================================================== */}
      <div className="settings-card-block" style={{
        background: 'var(--bg-primary)',
        border: '1.5px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
              color: '#FFF',
              padding: '0.5rem',
              borderRadius: '10px'
            }}>
              <Printer size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>إعدادات الروشتة الطبية والطباعة (e-Prescription Setup)</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>تخصيص مقاس ورق الطباعة (A4 / A5)، الترويسة، وملاحظات تذييل الروشتة الرسمية</p>
            </div>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.78rem',
            background: 'rgba(139, 92, 246, 0.08)',
            color: '#7C3AED',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontWeight: 700
          }}>
            <FileText size={13} />
            <span>طباعة ذكية ℞</span>
          </span>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="rxPaperSize">مقاس ورق الطباعة الافتراضي</label>
            <select
              id="rxPaperSize"
              value={clinicForm.prescriptionPaperSize || 'A4'}
              onChange={(e) => setClinicForm({ ...clinicForm, prescriptionPaperSize: e.target.value })}
              className="saas-filter-select"
              style={{ height: '42px', width: '100%' }}
            >
              <option value="A4">A4 (210 × 297 مم) — ورقة طباعة كاملة قياسية</option>
              <option value="A5">A5 (148 × 210 مم) — دفتر روشتات نصف صفحة مدمج</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rxPrintMode">نمط وتصميم ورق الروشتة</label>
            <select
              id="rxPrintMode"
              value={clinicForm.prescriptionPrintMode || 'full'}
              onChange={(e) => setClinicForm({ ...clinicForm, prescriptionPrintMode: e.target.value })}
              className="saas-filter-select"
              style={{ height: '42px', width: '100%' }}
            >
              <option value="full">روشتة إلكترونية كاملة (تشمل الترويسة والشعار والعنوان للورق الأبيض)</option>
              <option value="pad">طباعة الأدوية فقط (مخصصة لدفاتر الروشتات المطبوعة مسبقاً لدى المطبعة)</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="rxHeader">نص ترويسة الروشتة الإضافي (Rx Header Subtitle)</label>
            <input 
              id="rxHeader"
              name="rxHeader"
              type="text" 
              value={clinicForm.prescriptionHeader || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, prescriptionHeader: e.target.value })}
              placeholder="مثال: عيادة تخصصية متطورة — رعاية طبية وفق أحدث البروتوكولات الدولية" 
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="rxFooter">تذييل الروشتة وملاحظات المتابعة والتعليمات (Rx Footer)</label>
            <input 
              id="rxFooter"
              name="rxFooter"
              type="text" 
              value={clinicForm.prescriptionFooter || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, prescriptionFooter: e.target.value })}
              placeholder="مثال: الاستشارة والمتابعة مجاناً خلال 14 يوماً من تاريخ الكشف — لحالات الطوارئ: 01006285031" 
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* QUICK WORKFLOW SHORTCUTS                                 */}
      {/* ======================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginTop: '0.5rem'
      }}>
        {onNavigateToSchedule && (
          <div 
            onClick={onNavigateToSchedule}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CalendarDays size={22} style={{ color: '#0071E3' }} />
              <div>
                <strong style={{ fontSize: '0.9rem', display: 'block' }}>مواعيد العمل وشفتات الجدول</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>تفعيل الأيام، فترات الراحة، وحظر الإجازات</span>
              </div>
            </div>
            <ArrowLeft size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
        )}

        {onNavigateToVisitTypes && (
          <div 
            onClick={onNavigateToVisitTypes}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Stethoscope size={22} style={{ color: '#10B981' }} />
              <div>
                <strong style={{ fontSize: '0.9rem', display: 'block' }}>قائمة الخدمات والأسعار (Visit Types)</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>إدارة كشوفات العيادة، الخدمات، وتحديد الأسعار</span>
              </div>
            </div>
            <ArrowLeft size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
        )}
      </div>
    </form>
  );
}
