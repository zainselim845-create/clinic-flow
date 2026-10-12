import React from 'react';
import { Building2, Phone, Clock, QrCode, MessageSquare, Copy, ExternalLink, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { CLINIC_SPECIALTIES } from '../../../data/specialtiesData';
import { SAAS_PLATFORM_DOMAIN } from '../../../utils/clinicUrls';
import ClinicLocationGpsSection from './ClinicLocationGpsSection';
import EgyptianPaymentSection from './EgyptianPaymentSection';

export default function ClinicIdentitySection({
  clinicForm,
  setClinicForm,
  specialtyNotice,
  resolvedSenderId,
  clinicSlug,
  handleCopySubdomain,
  handleCopyBookingLink,
  copiedSubdomain,
  copiedBookingLink,
  setIsShareModalOpen,
  onNavigateToCustomDomain,
  handleApplyDefaultServicesForSpecialty
}) {
  return (
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
            {specialtyNotice}
          </span>
        )}
      </div>

      {/* Web & Cloud Routing Section */}
      <div style={{
        background: 'var(--surface-container, #F8FAFC)',
        border: '1.5px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              المسارات السحابية وصفحة الحجز العامة (Cloud Routing & URLs)
            </h5>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              روابط الحجز المباشرة التي يمكنك مشاركتها مع مرضاك عبر السوشيال ميديا وواتساب
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title="فتح بطاقة المشاركة الشاملة ورمز QR ومشاركة الواتساب"
            >
              <QrCode size={14} />
              <span>رمز QR ومشاركة الواتساب</span>
            </button>

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.78rem',
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
              <span>Sender: {resolvedSenderId || 'تلقائي'}</span>
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.85rem'
        }}>
          {/* 1. Subdomain */}
          <div style={{
            background: 'var(--bg-primary, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '10px',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                النطاق الفرعي السحابي (Subdomain)
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                مفعل تلقائياً
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.82rem', color: '#0284C7', fontWeight: 700, direction: 'ltr', wordBreak: 'break-all' }}>
                https://{clinicSlug || 'clinic'}.{SAAS_PLATFORM_DOMAIN}
              </code>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleCopySubdomain}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: '6px',
                    padding: '3px 7px',
                    cursor: 'pointer',
                    color: copiedSubdomain ? '#10B981' : 'var(--text-secondary)'
                  }}
                  title="نسخ النطاق الفرعي"
                >
                  {copiedSubdomain ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                </button>
                <a
                  href={`https://${clinicSlug || 'clinic'}.${SAAS_PLATFORM_DOMAIN}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: '6px',
                    padding: '3px 7px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="فتح الرابط"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>

          {/* 2. Direct Booking URL */}
          <div style={{
            background: 'var(--bg-primary, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '10px',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                رابط الحجز المباشر (Direct Route)
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3B82F6', background: '#EFF6FF', padding: '1px 6px', borderRadius: '4px' }}>
                مسار مخصص
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.82rem', color: 'var(--primary, #09090B)', fontWeight: 700, direction: 'ltr', wordBreak: 'break-all' }}>
                /c/{clinicSlug}/booking
              </code>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleCopyBookingLink}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: '6px',
                    padding: '3px 7px',
                    cursor: 'pointer',
                    color: copiedBookingLink ? '#10B981' : 'var(--text-secondary)'
                  }}
                  title="نسخ رابط الحجز"
                >
                  {copiedBookingLink ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                </button>
                <a
                  href={`/c/${clinicSlug}/booking`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: '6px',
                    padding: '3px 7px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="معاينة صفحة الحجز"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>

          {/* 3. Custom Domain */}
          <div style={{
            background: 'var(--bg-primary, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '10px',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                الدومين الخاص المخصص (Custom Domain)
              </span>
              {(clinicForm.customDomain || clinicForm.custom_domain) ? (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                  نطاق خاص مفعل
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                  غير مفعّل
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              {(clinicForm.customDomain || clinicForm.custom_domain) ? (
                <>
                  <code style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700, direction: 'ltr', wordBreak: 'break-all' }}>
                    https://{clinicForm.customDomain || clinicForm.custom_domain}
                  </code>
                  <a
                    href={`https://${clinicForm.customDomain || clinicForm.custom_domain}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color, #E2E8F0)',
                      borderRadius: '6px',
                      padding: '3px 7px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0
                    }}
                    title="زيارة الدومين الخاص"
                  >
                    <ExternalLink size={13} />
                  </a>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>لم يتم ربط نطاق خاص</span>
                  {onNavigateToCustomDomain && (
                    <button
                      type="button"
                      onClick={onNavigateToCustomDomain}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284C7',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <span>ربط الآن</span>
                      <ArrowLeft size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
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

        <div className="form-group">
          <label htmlFor="clinicGovernorate">المدينة / المنطقة</label>
          <input
            id="clinicGovernorate"
            name="clinicGovernorate"
            type="text"
            value={clinicForm.governorate || clinicForm.city || ''}
            onChange={(e) => setClinicForm({ ...clinicForm, governorate: e.target.value, city: e.target.value })}
            placeholder="مثال: القاهرة، الجيزة، الإسكندرية..."
          />
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

        {/* Nested Modular Sections */}
        <ClinicLocationGpsSection clinicForm={clinicForm} setClinicForm={setClinicForm} />
        <EgyptianPaymentSection clinicForm={clinicForm} setClinicForm={setClinicForm} />
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
          <CheckCircle2 size={14} />
          <span>تحميل خدمات التخصص النموذجية</span>
        </button>
      </div>
    </div>
  );
}
