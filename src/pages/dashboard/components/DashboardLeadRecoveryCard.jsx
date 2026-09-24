import React from 'react';
import { UserX, ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { BOOKING_FUNNEL_STEPS, generateLeadRecoveryWhatsAppUrl } from '../../../services/leadRecoveryService';

/**
 * DashboardLeadRecoveryCard
 * Visual telemetry and 1-click WhatsApp lead recovery for patients who dropped out during online booking.
 */
const DashboardLeadRecoveryCard = ({
  bookingFunnelStats = { conversionRate: 100, step1Count: 0, step2Count: 0, step3Count: 0, completedCount: 0 },
  recentAbandonedLeads = [],
  currentClinic = {},
  isDoctor = false,
  onNavigateToCrm = () => {}
}) => {
  return (
    <div className="dashboard-funnel-card">
      <div className="funnel-card-header">
        <div className="funnel-header-title">
          <div className="funnel-header-icon-box">
            <UserX size={16} />
          </div>
          <div>
            <h4 className="funnel-title">مسار الحجز واستعادة المرضى</h4>
            <span className="funnel-subtitle">رصد المرضى الذين بدأوا الحجز وتوقفوا</span>
          </div>
        </div>
        <span className="funnel-badge-pill">
          {bookingFunnelStats.conversionRate}% نسبة الإكمال
        </span>
      </div>

      {/* Conversion Funnel Progress Indicators */}
      <div className="funnel-steps-bar" role="group" aria-label="مراحل مسار الحجز الرقمي">
        <div className="funnel-step-item" title="الخطوة 1: إدخال الهاتف والاسم">
          <span className="step-val">{bookingFunnelStats.step1Count}</span>
          <span className="step-lbl">بيانات</span>
        </div>
        <span className="funnel-step-arrow" aria-hidden="true">←</span>
        <div className="funnel-step-item" title="الخطوة 2: اختيار نوع الخدمة">
          <span className="step-val">{bookingFunnelStats.step2Count}</span>
          <span className="step-lbl">الخدمة</span>
        </div>
        <span className="funnel-step-arrow" aria-hidden="true">←</span>
        <div className="funnel-step-item" title="الخطوة 3: اختيار الموعد المناسب">
          <span className="step-val">{bookingFunnelStats.step3Count}</span>
          <span className="step-lbl">الموعد</span>
        </div>
        <span className="funnel-step-arrow" aria-hidden="true">←</span>
        <div className="funnel-step-item completed" title="الخطوة 4: حجز مؤكد ومكتمل">
          <span className="step-val">{bookingFunnelStats.completedCount}</span>
          <span className="step-lbl">مؤكد</span>
        </div>
      </div>

      {/* Abandoned Leads List */}
      <div className="funnel-leads-section">
        <div className="funnel-leads-header">
          <span className="leads-header-title">
            حالات معلقة لم تكتمل ({recentAbandonedLeads.length})
          </span>
          {isDoctor && (
            <button 
              type="button" 
              onClick={onNavigateToCrm}
              className="btn-link-crm"
              title="فتح مركز التسويق واستعادة العملاء بالكامل"
            >
              <span>مركز الاستعادة</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {recentAbandonedLeads.length === 0 ? (
          <div className="funnel-empty-state">
            <CheckCircle2 size={20} className="empty-check-icon" />
            <span>كافة المرضى الذين بدأوا الحجز أتموا خطواتهم بنجاح.</span>
          </div>
        ) : (
          <div className="funnel-leads-list">
            {recentAbandonedLeads.map((lead) => {
              const stepName = BOOKING_FUNNEL_STEPS[lead.step]?.name || lead.stepName || 'توقف أثناء الحجز';
              const whatsappUrl = generateLeadRecoveryWhatsAppUrl(lead, currentClinic);
              return (
                <div key={lead.id} className="funnel-lead-row">
                  <div className="lead-row-info">
                    <div className="lead-row-top">
                      <strong className="lead-name">{lead.name || 'مريض جديد'}</strong>
                      <span className="lead-phone" dir="ltr">{lead.phone}</span>
                    </div>
                    <div className="lead-row-meta">
                      <span className="lead-step-badge">{stepName}</span>
                      {lead.service && <span className="lead-service-badge">{lead.service}</span>}
                    </div>
                  </div>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-recover-lead"
                    title="إرسال رسالة تذكيرية فورية عبر واتساب لاستكمال الحجز بنقرة واحدة"
                  >
                    <MessageCircle size={13} />
                    <span>استعادة</span>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardLeadRecoveryCard;
