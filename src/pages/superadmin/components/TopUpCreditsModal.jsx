import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { X, Zap, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { topUpClinicCredits, getClinicUsage } from '../../../services/usageMeteringService';

export function TopUpCreditsModal({
  isOpen,
  onClose,
  clinic,
  onSuccess
}) {
  const [smsCredits, setSmsCredits] = useState(500);
  const [aiTokens, setAiTokens] = useState(0);
  const [reason, setReason] = useState('شحن مباشر من لوحة إدارة الساس');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSmsCredits(500);
      setAiTokens(0);
      setReason('شحن رصيد مباشر - تحويل بنكي / فودافون كاش');
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!clinic) return null;

  const currentUsage = getClinicUsage(clinic.id, clinic.quotas, clinic.subscriptionTier);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updated = topUpClinicCredits({
        clinicId: clinic.id,
        smsCredits: Number(smsCredits) || 0,
        aiTokens: Number(aiTokens) || 0,
        reason: reason.trim() || 'شحن رصيد معتمد',
        authorizedBy: 'Super Admin'
      });

      setSuccessMessage(`تم شحن +${smsCredits} رسالة بنجاح! الرصيد المتبقي الجديد: ${updated.remainingSms} رسالة.`);
      setTimeout(() => {
        if (onSuccess) onSuccess(updated);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to top up credits:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="saas-modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content className="saas-modal-card" role="dialog" aria-modal="true" aria-labelledby="topup-credits-title">
            <div className="saas-modal-header">
              <Dialog.Title id="topup-credits-title" asChild>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} color="#D97706" />
                  <h3 style={{ margin: 0 }}>شحن رصيد فوري للعيادة</h3>
                </div>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="close-modal-btn"
                  aria-label="إغلاق النافذة"
                >
                  <X size={18} />
                </button>
              </Dialog.CloseTrigger>
            </div>

            {successMessage ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 1rem' }} />
                <h4 style={{ margin: '0 0 0.5rem', color: '#065F46' }}>عملية الشحن تمت بنجاح</h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="saas-modal-form">
                {/* Target Clinic Details Card */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{clinic.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      الطبيب: {clinic.doctorName} • {clinic.slug}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>الرصيد المتبقي حالياً:</div>
                    <strong style={{ fontSize: '1.1rem', color: currentUsage.isSmsDepleted ? '#EF4444' : '#2563EB' }}>
                      {currentUsage.remainingSms} رسالة
                    </strong>
                  </div>
                </div>

                {/* SMS Credits Input & Quick Select */}
                <div className="form-group">
                  <label htmlFor="sms-credits-input" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Smartphone size={16} color="#2563EB" />
                    <span>عدد رسائل SMS الإضافية المطلوب شحنها *</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {[100, 300, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSmsCredits(amt)}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          borderRadius: '6px',
                          border: smsCredits === amt ? '2px solid #2563EB' : '1px solid var(--border-color)',
                          background: smsCredits === amt ? '#EFF6FF' : 'var(--surface)',
                          color: smsCredits === amt ? '#1D4ED8' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                  <input 
                    id="sms-credits-input"
                    type="number" 
                    min="0"
                    max="100000"
                    value={smsCredits}
                    onChange={(e) => setSmsCredits(Number(e.target.value))}
                    required
                  />
                </div>

                {/* AI Tokens Input */}
                <div className="form-group">
                  <label htmlFor="ai-tokens-input" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="#7C3AED" />
                    <span>توكنز الذكاء الاصطناعي الإضافية (اختياري)</span>
                  </label>
                  <input 
                    id="ai-tokens-input"
                    type="number" 
                    step="50000"
                    min="0"
                    value={aiTokens}
                    onChange={(e) => setAiTokens(Number(e.target.value))}
                  />
                  <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                    500,000 توكن تكفي لحوالي 1,000 استشارة سريرية ومراجعة دوائية.
                  </small>
                </div>

                {/* Reason / Reference */}
                <div className="form-group">
                  <label htmlFor="topup-reason-input">السبب أو رقم العملية المرجعي</label>
                  <input 
                    id="topup-reason-input"
                    type="text" 
                    placeholder="مثال: تحويل إنستاباي رقم TRX-9821" 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="saas-modal-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button 
                    type="submit" 
                    className="saas-btn-primary"
                    disabled={isSubmitting || (smsCredits <= 0 && aiTokens <= 0)}
                    style={{ flex: 1 }}
                  >
                    {isSubmitting ? 'جاري التنفيذ...' : 'اعتماد شحن الرصيد فوراً ⚡'}
                  </button>
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="saas-btn-secondary"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
