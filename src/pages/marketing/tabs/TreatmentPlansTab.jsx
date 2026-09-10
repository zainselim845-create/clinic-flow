import React from 'react';
import { CheckCircle2, AlertTriangle, MessageCircle } from 'lucide-react';
import { generateTreatmentPlanFollowUpMessage } from '../../../services/treatmentPlansService';

export function TreatmentPlansTab({ unfinishedPlans, currentClinic }) {
  return (
    <div className="crm-tab-content">
      <div className="plans-tracker-intro">
        <h4>🦷 تتبع ومتابعة الخطط العلاجية غير المكتملة (Treatment Plan Tracker)</h4>
        <p>يكتشف المرضى الذين بدأوا خطوات علاجية وتوقفوا (مثل: بدأ حشو العصب ولم يقم بتركيب التاج أو الحشو النهائي)، ويرسل لهم تنبيهاً طبياً للحفاظ على صحة السن.</p>
      </div>

      <div className="plans-cards-grid">
        {(unfinishedPlans || []).map((plan) => {
          const msg = generateTreatmentPlanFollowUpMessage(plan, { name: plan.patientName }, currentClinic);
          const cleanPhone = (plan.patientPhone || '').replace(/^0/, '20');
          const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

          return (
            <div key={plan.id} className="treatment-plan-card">
              <div className="tp-header">
                <div>
                  <h4>{plan.patientName}</h4>
                  <span className="tp-title">{plan.title}</span>
                </div>
                <span className="tp-progress-badge">{plan.progressPercent}% مكتمل</span>
              </div>

              {/* Progress Bar */}
              <div className="tp-bar-wrap">
                <div className="tp-bar-fill" style={{ width: `${plan.progressPercent}%` }}></div>
              </div>

              <div className="tp-items-list">
                {plan.items?.map((item) => (
                  <div key={item.id} className={`tp-item-row ${item.status === 'completed' ? 'done' : 'pending'}`}>
                    {item.status === 'completed' ? <CheckCircle2 size={16} className="text-success" /> : <AlertTriangle size={16} className="text-warning" />}
                    <span>{item.procedureName}</span>
                    <strong className="item-state">{item.status === 'completed' ? 'تم الإنجاز' : 'معلق ومتبقي'}</strong>
                  </div>
                ))}
              </div>

              <div className="tp-footer">
                <a href={smsUrl} className="default-custom-btn">
                  <MessageCircle size={16} />
                  <span>تذكير المريض عبر SMS لاستكمال الخطة</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
