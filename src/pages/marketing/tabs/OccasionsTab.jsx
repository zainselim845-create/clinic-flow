import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { 
  OCCASIONS, 
  generatePersonalizedOccasionMessage 
} from '../../../services/occasionCampaignService';
import { sendSmsBatchAsync } from '../../../services/smsService';
import { useTenant } from '../../../context/TenantContext';

export function OccasionsTab({
  selectedOccasion,
  setSelectedOccasion,
  customOccasionOffer,
  setCustomOccasionOffer,
  occasionCandidates = [],
  currentClinic
}) {
  const { hasFeature, tenant } = useTenant();
  const canSendSms = hasFeature ? hasFeature('sms') : (tenant?.subscriptionTier === 'enterprise');
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const handleBatchDispatch = () => {
    if (!canSendSms) {
      setDispatchStatus({
        success: false,
        error: 'خاصية إرسال حملات SMS التلقائية متاحة حصرياً لباقة Enterprise (المراكز الكبرى). يرجى ترقية الباقة لتفعيل الإرسال السحابي المباشر.'
      });
      return;
    }

    if (!occasionCandidates || occasionCandidates.length === 0) {
      setDispatchStatus({
        success: false,
        error: 'لا يوجد مرشحون مؤهلون لهذه المناسبة حالياً.'
      });
      return;
    }

    setIsDispatching(true);
    setDispatchStatus(null);

    const recipients = occasionCandidates.map(c => ({
      phone: c.patientPhone,
      message: generatePersonalizedOccasionMessage(c, selectedOccasion, currentClinic, customOccasionOffer),
      idempotencyKey: `occ_${selectedOccasion}_${c.patientId}_${new Date().toISOString().slice(0, 10)}`
    }));

    try {
      const result = sendSmsBatchAsync(recipients, currentClinic?.id || 'default');
      setDispatchStatus({
        success: true,
        count: result.enqueuedCount,
        batchId: result.batchId,
        message: `تم إدراج ${result.enqueuedCount} رسالة في طابور المعالجة الخلفي بنجاح (كود الدفعة: ${result.batchId})`
      });
    } catch (err) {
      setDispatchStatus({
        success: false,
        error: err.message || 'حدث خطأ أثناء جدولة إرسال الدفعة'
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="crm-tab-content">
      <div className="occasions-select-row">
        {OCCASIONS.map((occ) => (
          <button
            key={occ.id}
            className={`occasion-card-btn ${selectedOccasion === occ.id ? 'active' : ''}`}
            onClick={() => setSelectedOccasion(occ.id)}
          >
            <span className="occ-icon">{occ.icon}</span>
            <strong>{occ.name}</strong>
            <small>{occ.description}</small>
          </button>
        ))}
      </div>

      <div className="occasion-offer-customizer">
        <label>هدية / عرض المناسبة المخصص:</label>
        <input 
          type="text" 
          value={customOccasionOffer}
          onChange={(e) => setCustomOccasionOffer(e.target.value)}
          placeholder="مثال: خصم 20% على جلسات تبييض الأسنان أو باقات النضارة"
        />
      </div>

      {/* Bulk Background Dispatch Control Header */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.25rem',
        margin: '1.25rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Zap size={18} color="var(--primary)" />
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
              إرسال حملة المناسبة دفعة واحدة في الخلفية (Async Queue)
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            إجمالي المرضى المؤهلين للمناسبة الحالية: <strong>{occasionCandidates.length} مريض</strong>. يتم الإرسال عبر طابور المعالجة الآمن بدون تجميد النظام.
          </p>
        </div>

        <button
          type="button"
          onClick={handleBatchDispatch}
          disabled={isDispatching || occasionCandidates.length === 0}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.88rem'
          }}
        >
          {isDispatching ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
          <span>{isDispatching ? 'جاري الجدولة في الطابور...' : `إرسال الحملة لكافة المرشحين (${occasionCandidates.length})`}</span>
        </button>
      </div>

      {dispatchStatus && (
        <div style={{
          backgroundColor: dispatchStatus.success ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${dispatchStatus.success ? '#A7F3D0' : '#FECACA'}`,
          color: dispatchStatus.success ? '#065F46' : '#991B1B',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.85rem'
        }}>
          {dispatchStatus.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{dispatchStatus.message || dispatchStatus.error}</span>
        </div>
      )}

      <div className="candidates-grid">
        {(occasionCandidates || []).map((c) => {
          const msg = generatePersonalizedOccasionMessage(c, selectedOccasion, currentClinic, customOccasionOffer);
          const cleanPhone = (c.patientPhone || '').replace(/^0/, '20');
          const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

          return (
            <div key={c.patientId} className="candidate-card">
              <div className="c-meta">
                <strong>{c.patientName}</strong>
                <span>الخدمة المفضلة له: <strong className="text-primary">{c.favoriteService}</strong></span>
              </div>
              <div className="c-msg-preview">
                <p>{msg}</p>
              </div>
              <a href={smsUrl} className="btn-action-primary full-width">
                <Send size={15} />
                <span>إرسال فردي عبر SMS</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
