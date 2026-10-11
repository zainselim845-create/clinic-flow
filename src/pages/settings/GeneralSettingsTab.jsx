import React, { useState } from 'react';
import { Save, CheckCircle2, CalendarDays, ArrowLeft, Stethoscope } from 'lucide-react';
import { CLINIC_SPECIALTIES } from '../../data/specialtiesData';
import { formatSenderId } from '../../services/smsService';
import BookingShareModal from '../../components/BookingShareModal';
import ClinicPalettePicker from '../../components/ClinicPalettePicker';
import ClinicLogoUploader from '../../components/ClinicLogoUploader';
import { toast } from '../../lib/toast';
import { copyToClipboard } from '../../utils/clipboard';
import { SAAS_PLATFORM_DOMAIN } from '../../utils/clinicUrls';
import {
  DoctorProfileSection,
  ClinicIdentitySection,
  ClinicFeatureModulesSection
} from './components';

export default function GeneralSettingsTab({
  clinicForm = {},
  setClinicForm,
  handleSaveClinic,
  clinicSaveSuccess,
  onNavigateToSchedule,
  onNavigateToVisitTypes,
  onNavigateToCustomDomain
}) {
  const [specialtyNotice, setSpecialtyNotice] = useState('');
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const safeForm = clinicForm || {};
  const clinicSlug = safeForm.slug || '';
  const resolvedSenderId = safeForm.senderId ? formatSenderId(safeForm.senderId) : '';

  const handleCopyBookingLink = async () => {
    const link = `https://${window.location.host}/c/${clinicSlug}/booking`;
    const success = await copyToClipboard(link);
    if (success) {
      setCopiedBookingLink(true);
      toast.success('تم نسخ رابط الحجز المباشر للعيادة بنجاح!');
      setTimeout(() => setCopiedBookingLink(false), 2500);
    }
  };

  const handleCopySubdomain = async () => {
    const fullSubdomain = `https://${clinicSlug || 'clinic'}.${SAAS_PLATFORM_DOMAIN}`;
    const success = await copyToClipboard(fullSubdomain);
    if (success) {
      setCopiedSubdomain(true);
      toast.success('تم نسخ النطاق السحابي المخصص للعيادة!');
      setTimeout(() => setCopiedSubdomain(false), 2500);
    }
  };

  const handleApplyDefaultServicesForSpecialty = () => {
    const currentSpecialty = safeForm.specialty;
    const matched = CLINIC_SPECIALTIES.find(s => s.name === currentSpecialty);
    if (!matched) {
      toast.error('يرجى تحديد التخصص الطبي للعيادة أولاً.');
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

      {/* BRAND & IDENTITY: LOGO UPLOADER & 3-COLOR PALETTE */}
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

      {/* 1. DOCTOR PROFESSIONAL PROFILE */}
      <DoctorProfileSection clinicForm={clinicForm} setClinicForm={setClinicForm} />

      {/* 2. CLINIC IDENTITY & PUBLIC PROFILE (WITH GPS & PAYMENTS) */}
      <ClinicIdentitySection
        clinicForm={clinicForm}
        setClinicForm={setClinicForm}
        specialtyNotice={specialtyNotice}
        resolvedSenderId={resolvedSenderId}
        clinicSlug={clinicSlug}
        handleCopySubdomain={handleCopySubdomain}
        handleCopyBookingLink={handleCopyBookingLink}
        copiedSubdomain={copiedSubdomain}
        copiedBookingLink={copiedBookingLink}
        setIsShareModalOpen={setIsShareModalOpen}
        onNavigateToCustomDomain={onNavigateToCustomDomain}
        handleApplyDefaultServicesForSpecialty={handleApplyDefaultServicesForSpecialty}
      />

      {/* 3. CLINIC FEATURE MODULES */}
      <ClinicFeatureModulesSection clinicForm={clinicForm} setClinicForm={setClinicForm} />

      {/* 4. QUICK WORKFLOW SHORTCUTS */}
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

      {/* Booking Share Modal */}
      <BookingShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tenant={{ ...clinicForm, slug: clinicSlug }}
      />
    </form>
  );
}
