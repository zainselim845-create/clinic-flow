import React, { useState } from 'react';
import { CheckCircle2, MessageCircle, Send, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { 
  REACTIVATION_STAGES, 
  REACTIVATION_STAGES_LIST,
  generateReactivationMessage 
} from '../../../services/reactivationService';
import { sendSmsBatchAsync } from '../../../services/smsService';
import { useTenant } from '../../../context/TenantContext';

export function ReactivationTab({ crmStats, segmentedPatients = [], currentClinic }) {
  const { hasFeature, tenant } = useTenant();
  const canSendSms = hasFeature ? hasFeature('sms') : (tenant?.subscriptionTier === 'enterprise');
  const [selectedBulkStage, setSelectedBulkStage] = useState(1);
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const dormantPatients = (segmentedPatients || []).filter(p => p && (p.lifecycle === 'dormant' || p.lifecycle === 'lost'));

  const handleBulkReactivation = () => {
    if (!canSendSms) {
      setDispatchStatus({
        success: false,
        error: 'خاصية إرسال حملات إعادة التنشيط الآلية عبر SMS متاحة حصرياً لباقة Enterprise (المراكز الكبرى). يرجى الترقية لتفعيل الإرسال السحابي المباشر.'
      });
      return;
    }

    if (!dormantPatients || dormantPatients.length === 0) {
      setDispatchStatus({
        success: false,
        error: 'لا يوجد مرضى خاملون مؤهلون لإعادة التنشيط حالياً.'
      });
      return;
    }

    setIsDispatching(true);
    setDispatchStatus(null);

    const recipients = dormantPatients.map(p => ({
      phone: p.phone,
      message: generateReactivationMessage(selectedBulkStage, p, currentClinic),
      idempotencyKey: `reactivate_s${selectedBulkStage}_${p.id}_${new Date().toISOString().slice(0, 10)}`
    }));

    try {
      const result = sendSmsBatchAsync(recipients, currentClinic?.id || 'default');
      setDispatchStatus({
        success: true,
        count: result.enqueuedCount,
        batchId: result.batchId,
        message: `تم إدراج ${result.enqueuedCount} رسالة إعادة تنشيط في طابور المعالجة الخلفي بنجاح (كود الدفعة: ${result.batchId})`
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
      <div className="reactivation-flow-intro">
        <div className="flow-steps-graphic">
          <div className="f-step">
            <span className="step-badge">المرحلة 1</span>
            <strong>رسالة تذكير صحية</strong>
            <p>تذكير دافئ بالفحص الدوري</p>
          </div>
          <div className="f-arrow">بعد أسبوع</div>
          <div className="f-step">
            <span className="step-badge">المرحلة 2</span>
            <strong>متابعة واستفسار</strong>
            <p>الاطمئنان وعرض المساعدة</p>
          </div>
          <div className="f-arrow">بعد أسبوع</div>
          <div className="f-step highlight">
            <span className="step-badge">المرحلة 3</span>
            <strong>عرض وخصم خاص</strong>
            <p>كوبون ترويجي للعودة</p>
          </div>
        </div>
      </div>

      {/* Bulk Background Reactivation Control Header */}
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
              إعادة تنشيط جماعية لكافة المرضى الخاملين في الخلفية (Async Queue)
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            إجمالي المرضى المنقطعين (6 أشهر فأكثر): <strong>{dormantPatients.length} مريض</strong>. اختر مرحلة الحملة وأطلق الإرسال فوراً.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedBulkStage}
            onChange={(e) => setSelectedBulkStage(Number(e.target.value))}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <option value={1}>المرحلة 1: تذكير صحي دافئ</option>
            <option value={2}>المرحلة 2: متابعة واطمئنان</option>
            <option value={3}>المرحلة 3: عرض وخصم خاص</option>
          </select>

          <button
            type="button"
            onClick={handleBulkReactivation}
            disabled={isDispatching || dormantPatients.length === 0}
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
            <span>{isDispatching ? 'جاري الجدولة...' : `إرسال الحملة (${dormantPatients.length})`}</span>
          </button>
        </div>
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

      <div className="reactivation-candidates-list">
        {crmStats.dormantCount === 0 ? (
          <div className="empty-state-box">
            <CheckCircle2 size={40} className="text-success" />
            <h4>رائع! جميع مرضاك نشطون ولا يوجد مرضى خاملون متأخرون عن 6 أشهر.</h4>
          </div>
        ) : (
          dormantPatients.map(p => (
            <div key={p.id} className="reactivation-patient-card">
              <div className="p-header">
                <div>
                  <h4>{p.name}</h4>
                  <span className="text-muted">آخر كشف منذ {p.daysSinceLastVisit || 180} يوماً ({p.diagnosis || 'كشف أسنان'})</span>
                </div>
                <span className="dormant-badge">انقطاع 6+ أشهر</span>
              </div>

              <div className="stages-actions-row">
                {(REACTIVATION_STAGES_LIST || []).map(stage => {
                  const msg = generateReactivationMessage(stage.stage, p, currentClinic);
                  const cleanPhone = (p.phone || '').replace(/^0/, '20');
                  const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

                  return (
                    <div key={stage.stage} className="stage-action-box">
                      <span className="s-title">{stage.name}</span>
                      <a href={smsUrl} className="btn-stage-sms">
                        <MessageCircle size={14} />
                        <span>إرسال SMS ({stage.discount ? 'مع خصم' : 'تذكير'})</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
