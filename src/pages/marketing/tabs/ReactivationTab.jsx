import React from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { 
  REACTIVATION_STAGES, 
  generateReactivationMessage 
} from '../../../services/reactivationService';

export function ReactivationTab({ crmStats, segmentedPatients, currentClinic }) {
  return (
    <div className="crm-tab-content">
      <div className="reactivation-flow-intro">
        <div className="flow-steps-graphic">
          <div className="f-step">
            <span className="step-badge">المرحلة 1</span>
            <strong>رسالة تذكير صحية</strong>
            <p>تذكير دافئ بالفحص الدوري</p>
          </div>
          <div className="f-arrow">➡️ بعد أسبوع ➡️</div>
          <div className="f-step">
            <span className="step-badge">المرحلة 2</span>
            <strong>متابعة واستفسار</strong>
            <p>الاطمئنان وعرض المساعدة</p>
          </div>
          <div className="f-arrow">➡️ بعد أسبوع ➡️</div>
          <div className="f-step highlight">
            <span className="step-badge">المرحلة 3</span>
            <strong>عرض وخصم خاص</strong>
            <p>كوبون ترويجي للعودة</p>
          </div>
        </div>
      </div>

      <div className="reactivation-candidates-list">
        {crmStats.dormantCount === 0 ? (
          <div className="empty-state-box">
            <CheckCircle2 size={40} className="text-success" />
            <h4>رائع! جميع مرضاك نشطون ولا يوجد مرضى خاملون متأخرون عن 6 أشهر.</h4>
          </div>
        ) : (
          (segmentedPatients || []).filter(p => p && (p.lifecycle === 'dormant' || p.lifecycle === 'lost')).map(p => (
            <div key={p.id} className="reactivation-patient-card">
              <div className="p-header">
                <div>
                  <h4>{p.name}</h4>
                  <span className="text-muted">آخر كشف منذ {p.daysSinceLastVisit || 180} يوماً ({p.diagnosis || 'كشف أسنان'})</span>
                </div>
                <span className="dormant-badge">انقطاع 6+ أشهر</span>
              </div>

              <div className="stages-actions-row">
                {REACTIVATION_STAGES.map(stage => {
                  const msg = generateReactivationMessage(p, stage.stage, currentClinic);
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
