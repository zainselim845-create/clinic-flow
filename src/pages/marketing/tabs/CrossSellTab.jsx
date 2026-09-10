import React from 'react';
import { MessageCircle } from 'lucide-react';

export function CrossSellTab({ crossSellOpportunities }) {
  return (
    <div className="crm-tab-content">
      <div className="cross-sell-intro">
        <h4>💡 محرك البيع المتقاطع الذكي (Clinical History Cross-Sell)</h4>
        <p>يحلل التاريخ الطبي للمريض ويقترح الخدمات التكميلية المعتمدة طبياً (تنظيف ⬅️ تبييض | بوتوكس ⬅️ سكن بوستر | ليزر ⬅️ مناطق إضافية).</p>
      </div>

      <div className="cross-sell-grid">
        {(crossSellOpportunities || []).map((opp, idx) => {
          const cleanPhone = (opp.patientPhone || '').replace(/^0/, '20');
          const messageText = opp.smsMessage || opp.whatsappMessage;
          const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(messageText)}`;

          return (
            <div key={idx} className="cross-sell-card">
              <div className="cs-top">
                <div>
                  <strong>{opp.patientName}</strong>
                  <span className="cs-phone" dir="ltr">{opp.patientPhone}</span>
                </div>
                <span className="confidence-pill">{opp.confidence}% مطابقة طبية</span>
              </div>

              <div className="cs-logic">
                <div className="logic-node">
                  <span className="l-lbl">الخدمة السابقة:</span>
                  <strong className="l-val">{opp.primaryService}</strong>
                </div>
                <div className="logic-arrow">⬅️</div>
                <div className="logic-node highlight">
                  <span className="l-lbl">الخدمة المقترحة:</span>
                  <strong className="l-val text-primary">{opp.suggestedService}</strong>
                </div>
              </div>

              <p className="cs-reason">{opp.reason}</p>

              <div className="cs-msg-preview">
                <small>نص رسالة الـ SMS:</small>
                <p>{messageText}</p>
              </div>

              <div className="cs-card-footer">
                <a href={smsUrl} className="default-custom-btn">
                  <MessageCircle size={16} />
                  <span>إرسال العرض المقترح عبر SMS</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
