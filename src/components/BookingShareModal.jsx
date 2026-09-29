import React, { useState } from 'react';
import { 
  X, Copy, Check, ExternalLink, Share2, MessageCircle, 
  QrCode, Globe, ShieldCheck, Download, Sparkles, Building2
} from 'lucide-react';
import { 
  getClinicBookingUrl, 
  getClinicDomain, 
  getClinicQrCodeUrl, 
  getClinicBookingWhatsAppShareUrl,
  SAAS_PLATFORM_DOMAIN
} from '../utils/clinicUrls';
import { toast } from '../lib/toast';
import { copyToClipboard } from '../utils/clipboard';

export default function BookingShareModal({ isOpen, onClose, tenant }) {
  if (!isOpen || !tenant) return null;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);

  const bookingUrl = getClinicBookingUrl(tenant);
  const dedicatedDomain = getClinicDomain(tenant);
  const qrCodeUrl = getClinicQrCodeUrl(bookingUrl, 320);
  const whatsappUrl = getClinicBookingWhatsAppShareUrl(tenant);

  const slug = tenant.slug || 'clinic';
  const customDomain = (tenant.customDomain || tenant.custom_domain || '').trim();
  const automaticSubdomain = `https://${slug}.${SAAS_PLATFORM_DOMAIN}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(bookingUrl);
    if (success) {
      setCopiedLink(true);
      toast.success('تم نسخ رابط حجز العيادة بنجاح');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopySubdomain = async () => {
    const success = await copyToClipboard(automaticSubdomain);
    if (success) {
      setCopiedSubdomain(true);
      toast.success('تم نسخ النطاق الفرعي بنجاح');
      setTimeout(() => setCopiedSubdomain(false), 2500);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 9, 11, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        dir="rtl"
        style={{
          background: 'var(--bg-primary, #FFFFFF)',
          color: 'var(--text-primary, #09090B)',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, #E4E4E7)',
          padding: '1.75rem',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #F4F4F5)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}>
              <Share2 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>بوابة الحجز والنطاق الرقمي</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #71717A)' }}>
                {tenant.name || 'عيادة كلينيك فلو'} • {tenant.doctorName ? `د. ${tenant.doctorName.replace(/^د\.?\s*/, '')}` : 'طبيب العيادة'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #71717A)',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. Primary Public Booking Link */}
        <div style={{
          background: 'var(--surface-container-low, #F8FAFC)',
          border: '1.5px solid var(--border-color, #E2E8F0)',
          borderRadius: '14px',
          padding: '1.1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #09090B)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Globe size={15} style={{ color: '#0284C7' }} />
              رابط الحجز المباشر للمرضى
            </span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              background: '#DCFCE7',
              color: '#15803D',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              نشط وجاهز
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '10px',
            padding: '0.5rem 0.75rem'
          }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              direction: 'ltr',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              color: '#0F172A',
              fontWeight: 600
            }}>
              {bookingUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: copiedLink ? '#10B981' : '#09090B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F1F5F9',
                color: '#334155',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 0.65rem',
                cursor: 'pointer',
                textDecoration: 'none',
                flexShrink: 0
              }}
              title="معاينة البوابة في نافذة جديدة"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        {/* 2. WhatsApp Share & Direct Channels */}
        <div style={{ marginBottom: '1.25rem' }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              width: '100%',
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
              transition: 'background 0.15s ease'
            }}
          >
            <MessageCircle size={20} />
            <span>إرسال ومشاركة الرابط للمرضى عبر الواتساب</span>
          </a>
        </div>

        {/* 3. Scannable QR Code for Clinic Desk */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          background: 'var(--surface-container-lowest, #FFFFFF)',
          border: '1.5px solid var(--border-color, #E2E8F0)',
          borderRadius: '14px',
          padding: '1.1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{
            width: '110px',
            height: '110px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img 
              src={qrCodeUrl} 
              alt="QR Code لحجز المواعيد"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              loading="lazy"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary, #09090B)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <QrCode size={16} style={{ color: '#10B981' }} />
              رمز الاستجابة السريعة (QR Code)
            </span>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary, #64748B)', lineHeight: 1.5 }}>
              قم بطباعة هذا الرمز وضعه على مكتب الاستقبال بالعيادة ليتمكن المراجعون من حجز وتأكيد مواعيدهم بهواتفهم مباشرة.
            </p>
            <div style={{ marginTop: '0.25rem' }}>
              <a
                href={qrCodeUrl}
                download={`clinic-qr-${slug}.svg`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#0284C7',
                  textDecoration: 'underline'
                }}
              >
                <Download size={13} />
                <span>فتح الرمز بحجم كامل للطباعة</span>
              </a>
            </div>
          </div>
        </div>

        {/* 4. Subdomain & Custom Domain Technical Transparency */}
        <div style={{
          borderTop: '1px solid var(--border-color, #F1F5F9)',
          paddingTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary, #64748B)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span>السب دومين الخاص بالعيادة:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', direction: 'ltr' }}>
              <code style={{ background: '#F1F5F9', color: '#0F172A', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                {automaticSubdomain}
              </code>
              <button
                type="button"
                onClick={handleCopySubdomain}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                title="نسخ السب دومين"
              >
                {copiedSubdomain ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span>النطاق التجاري المخصص (Custom Domain):</span>
            {customDomain ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#16A34A', fontWeight: 700, direction: 'ltr' }}>
                <ShieldCheck size={14} />
                {customDomain}
              </span>
            ) : (
              <span style={{ color: '#94A3B8' }}>
                غير مفعل (يمكنك ربطه من تبويب النطاق المخصص)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
