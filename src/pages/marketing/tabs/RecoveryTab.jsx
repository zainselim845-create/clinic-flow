import React, { useState, useMemo } from 'react';
import { 
  Send, MessageCircle, CheckCircle2, Clock, 
  ArrowLeft, Search, Check, RefreshCw, AlertCircle
} from 'lucide-react';
import { 
  getBookingFunnelStats, 
  getBookingDrafts, 
  markDraftAsRecovered,
  generateLeadRecoveryWhatsAppUrl, 
  generateLeadRecoverySmsUrl 
} from '../../../services/leadRecoveryService';
import { generateNoShowRecoveryMessage } from '../../../services/noShowRecoveryService';

export function RecoveryTab({ abandonedLeads: initialAbandonedLeads, noShowAppointments, currentClinic }) {
  const clinicId = currentClinic?.id;

  // Local state to allow instant reactive updates when marking drafts as recovered
  const [draftsVersion, setDraftsVersion] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'abandoned' | 'recovered'
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate live funnel stats
  const funnelStats = useMemo(() => {
    return getBookingFunnelStats(clinicId);
  }, [clinicId, draftsVersion, initialAbandonedLeads]);

  // Retrieve drafts list
  const allDrafts = useMemo(() => {
    return getBookingDrafts(clinicId);
  }, [clinicId, draftsVersion, initialAbandonedLeads]);

  // Filtered drafts for the table
  const filteredDrafts = useMemo(() => {
    return allDrafts.filter(draft => {
      // Exclude completed bookings from the abandoned leads table
      if (draft.status === 'completed') return false;

      // Status filter
      if (filterStatus === 'abandoned' && draft.status !== 'abandoned') return false;
      if (filterStatus === 'recovered' && draft.status !== 'recovered') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPhone = (draft.phone || '').toLowerCase().includes(q);
        const matchesName = (draft.name || '').toLowerCase().includes(q);
        const matchesService = (draft.service || '').toLowerCase().includes(q);
        if (!matchesPhone && !matchesName && !matchesService) return false;
      }

      return true;
    });
  }, [allDrafts, filterStatus, searchQuery]);

  // Handle marking draft as recovered
  const handleMarkRecovered = (draftId) => {
    markDraftAsRecovered(draftId, clinicId);
    setDraftsVersion(v => v + 1);
  };

  // Helper for step name display
  const getStepDisplay = (stepNum) => {
    switch (Number(stepNum)) {
      case 1:
        return { label: 'توقف عند إدخال البيانات', className: 'warning' };
      case 2:
        return { label: 'توقف عند اختيار الخدمة', className: 'warning' };
      case 3:
        return { label: 'توقف عند اختيار الموعد', className: 'warning' };
      case 4:
        return { label: 'توقف عند مراجعة الحجز', className: 'warning' };
      default:
        return { label: 'محاولة أولية', className: '' };
    }
  };

  return (
    <div className="crm-tab-content">
      {/* ======================================================== */}
      {/* SECTION 1: BOOKING FUNNEL TELEMETRY & CONVERSION KPIS    */}
      {/* ======================================================== */}
      <div className="funnel-hero-card">
        <div className="funnel-header-row">
          <div className="funnel-header-title">
            <h3>مسار الحجز الذاتي ومراقبة التحويل (Booking Funnel & Drop-off Telemetry)</h3>
            <p>مراقبة حية لكل زائر يبدأ خطوات الحجز وتحديد أسباب ومراحل التراجع بدقة متناهية</p>
          </div>
          <button 
            type="button" 
            className="btn-lead-action btn-lead-mark" 
            onClick={() => setDraftsVersion(v => v + 1)}
            title="تحديث البيانات"
          >
            <RefreshCw size={14} />
            <span>تحديث المسار</span>
          </button>
        </div>

        {/* Top KPI Metrics Strip */}
        <div className="funnel-kpi-strip">
          <div className="funnel-kpi-box primary">
            <span className="kpi-label">إجمالي محاولات الحجز</span>
            <span className="kpi-value">{funnelStats.totalStarted}</span>
          </div>
          <div className="funnel-kpi-box success">
            <span className="kpi-label">حجوزات مكتملة</span>
            <span className="kpi-value">{funnelStats.completedCount}</span>
          </div>
          <div className="funnel-kpi-box warning">
            <span className="kpi-label">محاولات متروكة</span>
            <span className="kpi-value">{funnelStats.abandonedCount}</span>
          </div>
          <div className="funnel-kpi-box accent">
            <span className="kpi-label">حالات تم استعادتها</span>
            <span className="kpi-value">{funnelStats.recoveredCount}</span>
          </div>
          <div className="funnel-kpi-box success">
            <span className="kpi-label">معدل التحويل الكلي</span>
            <span className="kpi-value">{funnelStats.conversionRate}%</span>
          </div>
          <div className="funnel-kpi-box accent">
            <span className="kpi-label">معدل الاستعادة</span>
            <span className="kpi-value">{funnelStats.recoveryRate}%</span>
          </div>
        </div>

        {/* Visual Funnel Pipeline */}
        <div className="funnel-pipeline">
          {/* Stage 1 */}
          <div className="funnel-stage-card">
            <span className="funnel-stage-num">المرحلة 01</span>
            <span className="funnel-stage-name">إدخال رقم الهاتف والبيانات</span>
            <div className="funnel-stage-metrics">
              <span className="funnel-stage-count">{funnelStats.step1Count}</span>
              <span className="funnel-stage-rate">100%</span>
            </div>
            <div className="funnel-stage-bar">
              <div className="funnel-stage-bar-fill" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Drop-off 1 */}
          <div className="funnel-drop-arrow">
            <span className="funnel-drop-badge">فقد {funnelStats.dropOffStep1}</span>
            <ArrowLeft size={16} className="text-secondary" />
          </div>

          {/* Stage 2 */}
          <div className="funnel-stage-card">
            <span className="funnel-stage-num">المرحلة 02</span>
            <span className="funnel-stage-name">اختيار الخدمة الطبية</span>
            <div className="funnel-stage-metrics">
              <span className="funnel-stage-count">{funnelStats.step2Count}</span>
              <span className="funnel-stage-rate">
                {funnelStats.totalStarted > 0 ? Math.round((funnelStats.step2Count / funnelStats.totalStarted) * 100) : 0}%
              </span>
            </div>
            <div className="funnel-stage-bar">
              <div 
                className="funnel-stage-bar-fill" 
                style={{ 
                  width: `${funnelStats.totalStarted > 0 ? Math.round((funnelStats.step2Count / funnelStats.totalStarted) * 100) : 0}%` 
                }} 
              />
            </div>
          </div>

          {/* Drop-off 2 */}
          <div className="funnel-drop-arrow">
            <span className="funnel-drop-badge">فقد {funnelStats.dropOffStep2}</span>
            <ArrowLeft size={16} className="text-secondary" />
          </div>

          {/* Stage 3 */}
          <div className="funnel-stage-card">
            <span className="funnel-stage-num">المرحلة 03</span>
            <span className="funnel-stage-name">اختيار الموعد والفترة</span>
            <div className="funnel-stage-metrics">
              <span className="funnel-stage-count">{funnelStats.step3Count}</span>
              <span className="funnel-stage-rate">
                {funnelStats.totalStarted > 0 ? Math.round((funnelStats.step3Count / funnelStats.totalStarted) * 100) : 0}%
              </span>
            </div>
            <div className="funnel-stage-bar">
              <div 
                className="funnel-stage-bar-fill" 
                style={{ 
                  width: `${funnelStats.totalStarted > 0 ? Math.round((funnelStats.step3Count / funnelStats.totalStarted) * 100) : 0}%` 
                }} 
              />
            </div>
          </div>

          {/* Drop-off 3 */}
          <div className="funnel-drop-arrow">
            <span className="funnel-drop-badge">فقد {funnelStats.dropOffStep3}</span>
            <ArrowLeft size={16} className="text-secondary" />
          </div>

          {/* Stage 4: Completed */}
          <div className="funnel-stage-card completed">
            <span className="funnel-stage-num">المرحلة 04</span>
            <span className="funnel-stage-name">تم تأكيد الحجز بنجاح</span>
            <div className="funnel-stage-metrics">
              <span className="funnel-stage-count">{funnelStats.completedCount}</span>
              <span className="funnel-stage-rate">{funnelStats.conversionRate}%</span>
            </div>
            <div className="funnel-stage-bar">
              <div 
                className="funnel-stage-bar-fill" 
                style={{ 
                  width: `${funnelStats.conversionRate}%`,
                  background: 'var(--success)'
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: ABANDONED LEADS TABLE & 1-CLICK RECOVERY      */}
      {/* ======================================================== */}
      <div className="leads-management-card" style={{ marginBottom: '1.5rem' }}>
        <div className="leads-filter-toolbar">
          <div className="leads-filter-tabs">
            <button 
              type="button"
              className={`leads-filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              كافة المحاولات ({allDrafts.filter(d => d.status !== 'completed').length})
            </button>
            <button 
              type="button"
              className={`leads-filter-tab ${filterStatus === 'abandoned' ? 'active' : ''}`}
              onClick={() => setFilterStatus('abandoned')}
            >
              بانتظار التواصل ({allDrafts.filter(d => d.status === 'abandoned').length})
            </button>
            <button 
              type="button"
              className={`leads-filter-tab ${filterStatus === 'recovered' ? 'active' : ''}`}
              onClick={() => setFilterStatus('recovered')}
            >
              تمت الاستعادة ({allDrafts.filter(d => d.status === 'recovered').length})
            </button>
          </div>

          <div className="leads-search-input-wrap">
            <Search size={15} className="text-tertiary" />
            <input 
              type="text"
              placeholder="بحث برقم الهاتف أو الاسم أو الخدمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredDrafts.length === 0 ? (
          <div className="empty-sub" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            لا توجد محاولات حجز تطابق معايير العرض الحالية.
          </div>
        ) : (
          <div className="leads-table-container">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>بيانات المريض</th>
                  <th>مرحلة التوقف</th>
                  <th>الخدمة المطلوبة</th>
                  <th>الموعد المحدد</th>
                  <th>وقت المحاولة</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: 'left' }}>إجراءات الاستعادة الفورية</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => {
                  const stepMeta = getStepDisplay(draft.step);
                  const isRecovered = draft.status === 'recovered';
                  const waUrl = generateLeadRecoveryWhatsAppUrl(draft, currentClinic);
                  const smsUrl = generateLeadRecoverySmsUrl(draft, currentClinic);
                  const timeFormatted = new Date(draft.updatedAt || draft.createdAt || Date.now()).toLocaleDateString('ar-EG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={draft.id}>
                      <td>
                        <div className="lead-patient-cell">
                          <strong>{draft.name || 'مريض غير مسجل الاسم'}</strong>
                          <span className="lead-patient-phone">{draft.phone}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`lead-step-badge ${stepMeta.className}`}>
                          <Clock size={12} />
                          <span>{draft.stepName || stepMeta.label}</span>
                        </span>
                      </td>

                      <td>
                        <span>{draft.service || 'لم تحدد بعد'}</span>
                      </td>

                      <td>
                        {draft.date ? (
                          <span>{draft.date} {draft.slot ? `(${draft.slot})` : ''}</span>
                        ) : (
                          <span className="text-tertiary">لم يحدد</span>
                        )}
                      </td>

                      <td>
                        <span className="text-secondary">{timeFormatted}</span>
                      </td>

                      <td>
                        {isRecovered ? (
                          <span className="lead-step-badge recovered">
                            <CheckCircle2 size={12} />
                            <span>تم التواصل</span>
                          </span>
                        ) : (
                          <span className="lead-step-badge warning">
                            <AlertCircle size={12} />
                            <span>بانتظار المتابعة</span>
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="lead-actions-cell">
                          <a 
                            href={waUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-lead-action btn-lead-wa"
                            onClick={() => {
                              if (!isRecovered) handleMarkRecovered(draft.id);
                            }}
                            title="إرسال رابط الإكمال عبر واتساب بضغطة واحدة"
                          >
                            <MessageCircle size={13} />
                            <span>واتساب</span>
                          </a>

                          <a 
                            href={smsUrl} 
                            className="btn-lead-action btn-lead-sms"
                            onClick={() => {
                              if (!isRecovered) handleMarkRecovered(draft.id);
                            }}
                            title="إرسال رسالة SMS تحتوي رابط إكمال الحجز"
                          >
                            <Send size={13} />
                            <span>SMS</span>
                          </a>

                          {!isRecovered ? (
                            <button
                              type="button"
                              className="btn-lead-action btn-lead-mark"
                              onClick={() => handleMarkRecovered(draft.id)}
                              title="تسجيل الحالة كمستعادة يدوياً"
                            >
                              <Check size={13} />
                              <span>تمت المتابعة</span>
                            </button>
                          ) : (
                            <span className="btn-lead-action btn-lead-mark is-recovered" title="تمت متابعة هذه المحاولة">
                              <Check size={13} />
                              <span>مستعاد</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: NO-SHOW APPOINTMENTS RECOVERY                 */}
      {/* ======================================================== */}
      <div className="leads-management-card">
        <div className="funnel-header-row">
          <div className="funnel-header-title">
            <h3>استعادة المواعيد غير المحضورة (No-Show Appointments Recovery)</h3>
            <p>إعادة التواصل مع المرضى الذين حجزوا موعداً ولم يتمكنوا من الحضور وتسهيل إعادة الجدولة</p>
          </div>
        </div>

        {(noShowAppointments || []).length === 0 ? (
          <div className="empty-sub" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            لا توجد حالات عدم حضور (No-Show) مسجلة حالياً.
          </div>
        ) : (
          <div className="leads-table-container">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>اسم المريض</th>
                  <th>رقم الهاتف</th>
                  <th>الموعد السابق</th>
                  <th>الخدمة / الإجراء</th>
                  <th style={{ textAlign: 'left' }}>إعادة الجدولة والتواصل</th>
                </tr>
              </thead>
              <tbody>
                {noShowAppointments.map((appt) => {
                  const msg = generateNoShowRecoveryMessage(appt, currentClinic);
                  const cleanPhone = (appt.patientPhone || '').replace(/^0/, '20').replace(/\D/g, '');
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
                  const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

                  return (
                    <tr key={appt.id}>
                      <td>
                        <strong>{appt.patientName || 'مريض بدون اسم'}</strong>
                      </td>
                      <td>
                        <span className="lead-patient-phone">{appt.patientPhone}</span>
                      </td>
                      <td>
                        <span>{appt.date} {appt.time ? `(${appt.time})` : ''}</span>
                      </td>
                      <td>
                        <span>{appt.service || appt.type || 'كشف عيادة'}</span>
                      </td>
                      <td>
                        <div className="lead-actions-cell">
                          <a 
                            href={waUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-lead-action btn-lead-wa"
                            title="إرسال رابط إعادة الجدولة عبر واتساب"
                          >
                            <MessageCircle size={13} />
                            <span>واتساب</span>
                          </a>

                          <a 
                            href={smsUrl} 
                            className="btn-lead-action btn-lead-sms"
                            title="إرسال رابط إعادة الجدولة عبر SMS"
                          >
                            <Send size={13} />
                            <span>SMS</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
