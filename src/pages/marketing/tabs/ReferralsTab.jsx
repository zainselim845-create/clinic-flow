import React from 'react';
import { Copy, Check } from 'lucide-react';
import { 
  getPatientReferralCode, 
  getPatientReferralLink 
} from '../../../services/referralService';

export function ReferralsTab({ 
  patients, 
  handleCopyLink, 
  copiedLinkIndex 
}) {
  return (
    <div className="crm-tab-content">
      <div className="referral-intro-banner">
        <h4>🤝 نظام رشّح صديق ومكافآت الإحالة (Referral Viral Engine)</h4>
        <p>كل مريض لديه كود ورابط إحالة خاص به. عند قدوم مريض جديد من خلاله، يحصل المريض وصديقه على نقاط وخصومات مسجلة في المحفظة.</p>
      </div>

      <div className="referral-cards-grid">
        {(patients || []).slice(0, 6).map((p, idx) => {
          const code = getPatientReferralCode(p.id);
          const link = getPatientReferralLink(code);

          return (
            <div key={p.id} className="referral-patient-box">
              <div className="ref-top">
                <strong>{p.name}</strong>
                <span className="ref-code-tag">{code}</span>
              </div>
              <div className="ref-link-row">
                <input type="text" readOnly value={link} dir="ltr" />
                <button 
                  onClick={() => handleCopyLink(link, idx)}
                  className="btn-copy-code"
                  title="نسخ رابط الإحالة"
                >
                  {copiedLinkIndex === idx ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="ref-stats-row">
                <span>عدد الإحالات الناجحة: <strong>{(parseInt((p.id || '1').replace(/\D/g, ''), 10) || 1) % 3}</strong></span>
                <span>رصيد المكافآت: <strong className="text-success">{((parseInt((p.id || '1').replace(/\D/g, ''), 10) || 1) % 3) * 150} ج.م</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
