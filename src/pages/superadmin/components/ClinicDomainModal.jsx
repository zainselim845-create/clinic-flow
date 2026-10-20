import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  Trash2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Dialog, Portal } from '@/components/ui';
import { 
  DOMAIN_STATUS, 
  sanitizeDomain, 
  isValidDomain, 
  getRequiredDnsRecords, 
  verifyDomainDnsAndSsl, 
  saveClinicDomainSettings, 
  getClinicDomainSettings 
} from '@/features/platform/services/customDomainService';
import { SAAS_PLATFORM_DOMAIN } from '@/utils/clinicUrls';
import { copyToClipboard } from '@/utils/clipboard';

export default function ClinicDomainModal({
  isOpen,
  onClose,
  clinic,
  onSaveDomain,
  updateTenantDomain
}) {
  const [domainInput, setDomainInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clinic) {
      const initial = clinic.customDomain || clinic.custom_domain || '';
      setDomainInput(initial);
      const savedConfig = getClinicDomainSettings(clinic.id || clinic.slug);
      if (savedConfig && savedConfig.domain) {
        setDomainInput(savedConfig.domain);
        if (savedConfig.sslStatus === DOMAIN_STATUS.ACTIVE) {
          setVerificationResult({ isValid: true, sslActive: true, message: 'شهادة الـ SSL مفعلة ونشطة' });
        }
      } else if (initial) {
        setVerificationResult({ isValid: true, sslActive: true, message: 'النطاق مفعّل في إعدادات العيادة' });
      } else {
        setVerificationResult(null);
      }
      setAlert(null);
    }
  }, [clinic]);

  if (!clinic) return null;

  const clinicId = clinic.id || `tenant-${clinic.slug}`;
  const cleanDomain = sanitizeDomain(domainInput);
  const isInputValid = isValidDomain(cleanDomain);
  const defaultSubdomain = `https://${clinic.slug || 'clinic'}.${SAAS_PLATFORM_DOMAIN}`;
  const dnsRecords = cleanDomain ? getRequiredDnsRecords(cleanDomain, clinicId) : [];

  const handleCopy = async (text, key) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleVerify = async () => {
    if (!cleanDomain || !isInputValid) {
      setAlert({ type: 'error', text: 'يرجى إدخال اسم نطاق صحيح قبل بدء الفحص.' });
      return;
    }

    setIsVerifying(true);
    setAlert(null);

    try {
      const res = await verifyDomainDnsAndSsl(cleanDomain, clinicId);
      setVerificationResult(res);
      if (res.isValid && res.sslActive) {
        setAlert({ type: 'success', text: 'مبروك! تم التحقق من الـ DNS بنجاح، وشهادة الـ SSL مفعلة ونشطة.' });
      } else {
        setAlert({ type: 'warning', text: res.message || 'السجلات لم تتطابق بعد في مزود الـ DNS، يستغرق انتشار السجلات من دقيقة إلى 15 دقيقة.' });
      }
    } catch (err) {
      setAlert({ type: 'error', text: 'حدث خطأ أثناء فحص النطاق: ' + err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setAlert(null);

    try {
      if (cleanDomain && !isInputValid) {
        setAlert({ type: 'error', text: 'يرجى إدخال اسم نطاق صالح (مثل dr-ahmed.com أو booking.clinic.com).' });
        setIsSaving(false);
        return;
      }

      if (updateTenantDomain) {
        await updateTenantDomain(clinic.id || clinic.slug, cleanDomain);
      }

      saveClinicDomainSettings(clinicId, {
        domain: cleanDomain,
        sslStatus: cleanDomain ? (verificationResult?.sslActive ? DOMAIN_STATUS.ACTIVE : DOMAIN_STATUS.PENDING_DNS) : DOMAIN_STATUS.UNCONFIGURED,
        verifiedAt: verificationResult?.sslActive ? new Date().toISOString() : null
      });

      if (onSaveDomain) {
        await onSaveDomain(clinic.slug || clinic.id, cleanDomain);
      }

      setAlert({ type: 'success', text: cleanDomain ? `تم ربط وتفعيل الدومين (${cleanDomain}) للعيادة بنجاح!` : 'تمت إزالة الدومين الخاص والعودة للنطاق التلقائي.' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setAlert({ type: 'error', text: 'فشل حفظ الدومين: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (window.confirm(`هل أنت متأكد من رغبتك في إزالة الدومين المخصص لعيادة (${clinic.name})؟`)) {
      setDomainInput('');
      if (updateTenantDomain) {
        await updateTenantDomain(clinic.id || clinic.slug, '');
      }
      saveClinicDomainSettings(clinicId, {
        domain: '',
        sslStatus: DOMAIN_STATUS.UNCONFIGURED,
        verifiedAt: null
      });
      if (onSaveDomain) {
        await onSaveDomain(clinic.slug || clinic.id, '');
      }
      setVerificationResult(null);
      setAlert({ type: 'info', text: 'تمت إزالة الدومين المخصص بنجاح، العيادة تعمل الآن بالنطاق التلقائي.' });
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content 
            className="saas-modal-card"
            style={{
              maxWidth: '640px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '20px',
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              zIndex: 1056
            }}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Globe size={22} />
                </div>
                <div>
                  <Dialog.Title asChild>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 m-0">
                      ربط الدومين المخصص وشهادة الـ SSL (Custom Domain)
                    </h3>
                  </Dialog.Title>
                  <p className="text-xs text-zinc-500 m-0 mt-0.5">
                    العيادة: <strong>{clinic.name}</strong> • الطبيب: {clinic.doctorName || 'طبيب العيادة'}
                  </p>
                </div>
              </div>

              <Dialog.CloseTrigger asChild>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </Dialog.CloseTrigger>
            </div>

            {/* Alert banner */}
            {alert && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: alert.type === 'success' ? '#ECFDF5' : alert.type === 'warning' ? '#FFFBEB' : alert.type === 'info' ? '#EFF6FF' : '#FEF2F2',
                color: alert.type === 'success' ? '#065F46' : alert.type === 'warning' ? '#92400E' : alert.type === 'info' ? '#1E40AF' : '#991B1B',
                border: `1px solid ${alert.type === 'success' ? '#A7F3D0' : alert.type === 'warning' ? '#FDE68A' : alert.type === 'info' ? '#BFDBFE' : '#FECACA'}`
              }}>
                {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{alert.text}</span>
              </div>
            )}

            {/* 1. Default Subdomain Info */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                  النطاق الفرعي التلقائي المجاني (Platform Subdomain):
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                  مفعل تلقائياً
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <code style={{ fontSize: '0.84rem', color: '#0F172A', fontWeight: 700, direction: 'ltr' }}>
                  {defaultSubdomain}
                </code>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopy(defaultSubdomain, 'default-subdomain')}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="نسخ الرابط"
                  >
                    {copiedKey === 'default-subdomain' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    <span>{copiedKey === 'default-subdomain' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                  <a
                    href={defaultSubdomain}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="معاينة الرابط"
                  >
                    <ExternalLink size={13} />
                    <span>زيارة</span>
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Custom Domain Input */}
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', marginBottom: '0.4rem' }}>
                  اسم الدومين الخاص بالعيادة (Custom Domain):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: dr-hazem.com أو booking.clinic.com"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value);
                      setVerificationResult(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                  اكتب اسم النطاق التجاري الخاص بالطبيب بدون https:// أو www (مثال: <code style={{ color: '#059669' }}>dr-ahmed.com</code>).
                </p>
              </div>

              {/* 3. DNS Instructions Table (Shown when domain entered) */}
              {cleanDomain && isInputValid && (
                <div style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.6rem' }}>
                    <Sparkles size={16} color="#059669" />
                    <strong style={{ fontSize: '0.84rem', color: '#166534' }}>
                      سجلات الـ DNS المطلوبة في لوحة تحكم دومين العميل (Cloudflare / GoDaddy / Namecheap):
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dnsRecords.map((rec, index) => (
                      <div 
                        key={index} 
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #DCFCE7',
                          borderRadius: '8px',
                          padding: '0.6rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1D4ED8', background: '#DBEAFE', padding: '1px 5px', borderRadius: '4px' }}>
                              {rec.type}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', direction: 'ltr' }}>
                              Host: {rec.host}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px', direction: 'ltr', fontFamily: 'monospace' }}>
                            Target: {rec.target || rec.value}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(rec.target || rec.value, `rec-${index}`)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {copiedKey === `rec-${index}` ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          <span>{copiedKey === `rec-${index}` ? 'تم النسخ' : 'نسخ الهدف'}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Verification Status */}
                  <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#334155' }}>حالة الربط والـ SSL:</span>
                      {verificationResult?.sslActive ? (
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={13} />
                          مفعل ومحمي بـ SSL
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} />
                          بانتظار توجيه سجلات الـ DNS
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={isVerifying}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <RefreshCw size={13} className={isVerifying ? 'spin' : ''} />
                      <span>{isVerifying ? 'جارٍ الفحص...' : 'فحص الاتصال والـ SSL'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
                  >
                    <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ وتفعيل الدومين'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1rem' }}
                  >
                    <span>إلغاء</span>
                  </button>
                </div>

                {(clinic.customDomain || clinic.custom_domain) && (
                  <button
                    type="button"
                    onClick={handleRemoveDomain}
                    style={{
                      background: 'none',
                      border: '1px solid #FCA5A5',
                      color: '#DC2626',
                      borderRadius: '8px',
                      padding: '0.6rem 0.9rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="إزالة النطاق المخصص والعودة للنطاق التلقائي"
                  >
                    <Trash2 size={14} />
                    <span>إزالة الدومين</span>
                  </button>
                )}
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
