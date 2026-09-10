import React from 'react';
import { Zap, RefreshCw, Send, MessageCircle } from 'lucide-react';
import { generateLeadRecoverySmsMessage } from '../../../services/leadRecoveryService';
import { generateNoShowRecoveryMessage } from '../../../services/noShowRecoveryService';

export function RecoveryTab({ abandonedLeads, noShowAppointments, currentClinic }) {
  return (
    <div className="crm-tab-content">
      <div className="recovery-columns-grid">
        
        {/* Abandoned Booking Leads */}
        <div className="recovery-col">
          <div className="col-header">
            <h4><Zap size={18} className="text-warning" /> سلات الحجز المتروكة (Abandoned Leads)</h4>
            <small>أشخاص كتبوا رقمهم في بوابة الحجز ولم يكملوا الخطوة الثانية</small>
          </div>

          {(abandonedLeads || []).length === 0 ? (
            <div className="empty-sub">لا توجد محاولات حجز متروكة حالياً.</div>
          ) : (
            abandonedLeads.map((draft, idx) => {
              const msg = generateLeadRecoverySmsMessage(draft, currentClinic);
              const cleanPhone = (draft.phone || '').replace(/^0/, '20');
              const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

              return (
                <div key={draft.id || idx} className="lead-recovery-card">
                  <div className="lead-info">
                    <strong>رقم الهاتف: <span dir="ltr">{draft.phone}</span></strong>
                    <span>تاريخ المحاولة: {new Date(draft.updatedAt || draft.createdAt || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <a href={smsUrl} className="btn-action-primary">
                    <Send size={14} />
                    <span>إرسال رابط الإكمال عبر SMS</span>
                  </a>
                </div>
              );
            })
          )}
        </div>

        {/* No-Show & Cancelled Recovery */}
        <div className="recovery-col">
          <div className="col-header">
            <h4><RefreshCw size={18} className="text-error" /> استعادة مواعيد الـ No-Show</h4>
            <small>مرضى حجزوا موعداً ولم يتمكنوا من الحضور</small>
          </div>

          {(noShowAppointments || []).length === 0 ? (
            <div className="empty-sub">لا توجد حالات No-Show مسجلة.</div>
          ) : (
            noShowAppointments.map((appt) => {
              const msg = generateNoShowRecoveryMessage(appt, currentClinic);
              const cleanPhone = (appt.patientPhone || '').replace(/^0/, '20');
              const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

              return (
                <div key={appt.id} className="lead-recovery-card">
                  <div className="lead-info">
                    <strong>{appt.patientName}</strong>
                    <span>الموعد الأصلي: {appt.date} ({appt.time})</span>
                  </div>
                  <a href={smsUrl} className="btn-action-success">
                    <MessageCircle size={14} />
                    <span>إعادة جدولة عبر SMS مع كود خصم</span>
                  </a>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
