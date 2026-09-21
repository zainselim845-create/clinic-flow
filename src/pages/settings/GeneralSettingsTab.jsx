import React, { useState } from 'react';
import { 
  Building2, Save, CheckCircle2, Phone, Mail, Clock, 
  CalendarDays, ArrowLeft, Stethoscope, Globe, 
  FileText, Printer, ShieldCheck, UserCheck, Sparkles,
  Copy, ExternalLink, MessageSquare, Layers, Package
} from 'lucide-react';

import { CLINIC_SPECIALTIES } from '../../data/specialtiesData';
import { formatSenderId } from '../../services/smsService';
import ClinicPalettePicker from '../../components/ClinicPalettePicker';
import ClinicLogoUploader from '../../components/ClinicLogoUploader';

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
          <p>إدارة البيانات المهنية للطبيب، هوية المركز والاعتمادات الرسمية</p>
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
      {/* BRAND & IDENTITY: LOGO UPLOADER & 3-COLOR PALETTE         */}
      {/* ======================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.75rem' }}>
        <ClinicLogoUploader
          value={clinicForm.logoUrl || clinicForm.branding?.logoUrl || ''}
          onChange={(newLogoUrl) => {
            setClinicForm(prev => ({
              ...prev,
              logoUrl: newLogoUrl,
              branding: {
                ...(prev.branding || {}),
                logoUrl: newLogoUrl
              }
            }));
          }}
          onSaveDirectly={true}
        />

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
              background: 'var(--clinic-primary, #09090B)',
              color: '#FFF',
              padding: '0.5rem',
              borderRadius: '8px'
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>الملف المهني والهوية الطبية للطبيب</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>البيانات المعتمدة التي تظهر في التقارير الطبية وتذاكر الحجز</p>
            </div>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.78rem',
            background: 'var(--bg-tertiary, #F4F4F5)',
            border: '1px solid var(--border-color, #E4E4E7)',
            color: 'var(--text-primary, #09090B)',
            padding: '0.25rem 0.65rem',
            borderRadius: '6px',
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
            <small style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>يُطبع رسمياً في ترويسة التقارير والملف السريري</small>
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
              background: 'var(--clinic-primary-light, #F4F4F5)',
              color: 'var(--clinic-primary, #09090B)',
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
              <optgroup label="طب وجراحة الفم والأسنان">
                {CLINIC_SPECIALTIES.filter(s => s.category === 'dental').map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="الطب البشري والتخصصات الطبية">
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
            هل تريد إعادة تحميل قائمة الخدمات النموذجية لـ ({clinicForm.specialty || 'تخصصك'})؟
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
      {/* CARD: CLINIC FEATURE MODULES (المعمل والمخزن)            */}
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
              background: 'var(--clinic-primary, #09090B)',
              color: '#FFF',
              padding: '0.5rem',
              borderRadius: '8px'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>تفعيل وإدارة ميزات العيادة (Feature Modules)</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>تخصيص الميزات التشغيلية المفعّلة في عيادتك للتحكم فيما يظهر بالقائمة الرئيسية</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          
          {/* Module 1: Labs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.15rem',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            background: 'var(--surface, #FFF)',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Layers size={22} />
              </div>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text-primary)' }}>معمل التركيبات والتحاليل</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                  إدارة ومتابعة طلبات معامل الأسنان والتحاليل
                </span>
              </div>
            </div>
            <label className="switch-toggle" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
              <input 
                type="checkbox"
                checked={Boolean(clinicForm.enableLabs ?? clinicForm.modules?.labs)}
                onChange={(e) => {
                  const val = e.target.checked;
                  setClinicForm(prev => ({
                    ...prev,
                    enableLabs: val,
                    modules: {
                      ...(prev.modules || {}),
                      labs: val
                    }
                  }));
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span className="slider round" style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: Boolean(clinicForm.enableLabs ?? clinicForm.modules?.labs) ? '#10B981' : '#CBD5E1',
                borderRadius: '34px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '20px', width: '20px', left: Boolean(clinicForm.enableLabs ?? clinicForm.modules?.labs) ? '25px' : '3px', bottom: '3px',
                  backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
          </div>

          {/* Module 2: Inventory */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.15rem',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            background: 'var(--surface, #FFF)',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Package size={22} />
              </div>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text-primary)' }}>المخزون والمستلزمات الطبية</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                  مراقبة أرصدة الخامات وتنبيهات النواقص
                </span>
              </div>
            </div>
            <label className="switch-toggle" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
              <input 
                type="checkbox"
                checked={Boolean(clinicForm.enableInventory ?? clinicForm.modules?.inventory)}
                onChange={(e) => {
                  const val = e.target.checked;
                  setClinicForm(prev => ({
                    ...prev,
                    enableInventory: val,
                    modules: {
                      ...(prev.modules || {}),
                      inventory: val
                    }
                  }));
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span className="slider round" style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: Boolean(clinicForm.enableInventory ?? clinicForm.modules?.inventory) ? '#10B981' : '#CBD5E1',
                borderRadius: '34px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '20px', width: '20px', left: Boolean(clinicForm.enableInventory ?? clinicForm.modules?.inventory) ? '25px' : '3px', bottom: '3px',
                  backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
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
              <CalendarDays size={22} style={{ color: 'var(--clinic-primary, #09090B)' }} />
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
