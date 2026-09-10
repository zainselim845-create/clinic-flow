import React from 'react';
import { Users, Send, ShieldCheck } from 'lucide-react';
import { generatePostVisitFeedbackMessage } from '../../../services/feedbackService';

export function FeedbackTab({ 
  postVisitPatients, 
  feedbacksList, 
  currentClinic, 
  handleSimulateFeedbackRating 
}) {
  return (
    <div className="crm-tab-content">
      <div className="feedback-funnel-box">
        <h4>🌟 محرك السمعة الرقمية وتحويل التقييمات لجوجل (Reputation Funnel)</h4>
        <p>بعد الزيارة بـ 24 ساعة، يتم إرسال رسالة قياس الرضا: التقييم المرتفع (4-5 نجوم) يُوجّه لتقييم العيادة على خرائط جوجل، والتقييم المنخفض يُوجّه سراً لبريد الإدارة لحل المشكلة فوراً.</p>
      </div>

      <div className="crm-split-grid">
        {/* Eligible Visits for Follow-up */}
        <div className="crm-section-box">
          <div className="box-header">
            <h4><Users size={18} /> زيارات مكتملة بانتظار إرسال استبيان الرضا ({(postVisitPatients || []).length})</h4>
          </div>
          <div className="feedbacks-actions-list">
            {(postVisitPatients || []).length === 0 ? (
              <p className="text-muted text-center py-3">لا توجد زيارات مكتملة تحتاج متابعة حالياً.</p>
            ) : (
              postVisitPatients.map((pv) => {
                const msg = generatePostVisitFeedbackMessage({ name: pv.patientName }, pv, currentClinic);
                const cleanPhone = (pv.patientPhone || '').replace(/^0/, '20');
                const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

                return (
                  <div key={pv.appointmentId} className="post-visit-item">
                    <div>
                      <strong>{pv.patientName}</strong>
                      <small>كشف {pv.type} — {pv.date}</small>
                    </div>
                    <div className="pv-actions">
                      <a href={smsUrl} className="btn-action-primary">
                        <Send size={13} />
                        <span>إرسال استبيان الرضا عبر SMS</span>
                      </a>
                      <div className="simulate-ratings">
                        <button onClick={() => handleSimulateFeedbackRating(pv.patientName, 5)} title="محاكاة 5 نجوم (تحويل لجوجل)">⭐ 5</button>
                        <button onClick={() => handleSimulateFeedbackRating(pv.patientName, 2)} title="محاكاة تقييم منخفض (تحويل للإدارة)">⚠️ 2</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Smart Routing Ledger */}
        <div className="crm-section-box">
          <div className="box-header">
            <h4><ShieldCheck size={18} className="text-success" /> سجل توجيه التقييمات الذكي</h4>
          </div>
          <div className="feedbacks-ledger">
            {(feedbacksList || []).map((fb) => (
              <div key={fb.id} className="ledger-fb-row">
                <div className="l-top">
                  <strong>{fb.patientName}</strong>
                  <span className="l-stars">{'⭐'.repeat(fb.rating)}</span>
                </div>
                <p className="l-comment">"{fb.comment}"</p>
                <div className="l-routing">
                  {fb.rating >= 4 ? (
                    <span className="route-tag success">✅ تم التوجيه لـ Google Maps Review</span>
                  ) : (
                    <span className="route-tag warning">🛡️ تم توجيه شكوى سرية لمدير العيادة</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
