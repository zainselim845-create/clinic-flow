import React from 'react';
import { Bug, AlertTriangle, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';

export function TelemetryBugsCenter({
  systemErrors,
  bugReports,
  onRefresh,
  onClearErrors,
  onResolveError,
  onUpdateBugStatus
}) {
  return (
    <div className="saas-section-card">
      <div className="section-card-header telemetry-header">
        <div>
          <h2>مركز رصد الأعطال وبلاغات النظام (System Health & Bug Center)</h2>
          <p>استقبال تلقائي لكافة الأخطاء البرمجية والبلاغات من الأطباء والطاقم في كافة العيادات</p>
        </div>
        <div className="telemetry-header-actions">
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-secondary telemetry-refresh-btn"
            title="تحديث قائمة البلاغات والأعطال"
          >
            <RefreshCw size={14} />
            <span>تحديث السجل</span>
          </button>
          <button
            type="button"
            onClick={onClearErrors}
            className="btn btn-danger telemetry-clear-btn"
            title="مسح سجل الأعطال البرمجية القديمة"
          >
            <Trash2 size={14} />
            <span>مسح السجلات</span>
          </button>
        </div>
      </div>

      {/* Sub-Section 1: User Bug Reports */}
      <div className="telemetry-sub-section">
        <h3 className="telemetry-sub-title bugs">
          <Bug size={20} color="#0284c7" />
          <span>بلاغات الأطباء والمستخدمين ({bugReports.length})</span>
        </h3>

        {bugReports.length > 0 ? (
          <div className="telemetry-list">
            {bugReports.map((bug) => (
              <div key={bug.id} className="telemetry-card bug-report-card">
                <div className="telemetry-card-top">
                  <div className="telemetry-badge-group">
                    <span className={`telemetry-category-badge ${bug.category || 'bug'}`}>
                      {bug.category === 'bug' ? 'عطل برمجي' : bug.category === 'performance' ? 'بطء استجابة' : 'اقتراح / واجهة'}
                    </span>
                    <strong className="telemetry-card-title">{bug.title}</strong>
                  </div>
                  <select
                    value={bug.status}
                    onChange={(e) => onUpdateBugStatus(bug.id, e.target.value)}
                    className="telemetry-status-select"
                    aria-label="حالة البلاغ"
                  >
                    <option value="open">قيد الانتظار (Open)</option>
                    <option value="in_progress">جاري التحقق (In Progress)</option>
                    <option value="resolved">تم الحل (Resolved)</option>
                  </select>
                </div>

                <p className="telemetry-card-desc">
                  {bug.description}
                </p>

                <div className="telemetry-meta-footer">
                  <span>العيادة: <strong>{bug.clinicName} ({bug.clinicId})</strong></span>
                  <span>الطبيب: <strong>{bug.doctorEmail}</strong></span>
                  <span>الصفحة: <code>{bug.path}</code></span>
                  <span>الوقت: {new Date(bug.createdAt).toLocaleTimeString('ar-EG')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="telemetry-empty-state">
            لا توجد بلاغات مرسلة من الأطباء حالياً. النظام يعمل بسلاسة تامة.
          </div>
        )}
      </div>

      {/* Sub-Section 2: Automated Runtime Exceptions */}
      <div className="telemetry-sub-section">
        <h3 className="telemetry-sub-title errors">
          <AlertTriangle size={20} color="#ef4444" />
          <span>سجل الأعطال البرمجية والتشخيصية التلقائية ({systemErrors.length})</span>
        </h3>

        {systemErrors.length > 0 ? (
          <div className="telemetry-list">
            {systemErrors.map((err) => (
              <div 
                key={err.id} 
                className={`telemetry-card system-error-card ${err.status === 'resolved' ? 'is-resolved' : 'is-unresolved'}`}
              >
                <div className="telemetry-card-top">
                  <div className="telemetry-badge-group">
                    <span className={`telemetry-severity-badge ${err.severity === 'critical' ? 'critical' : 'warning'}`}>
                      {err.severity.toUpperCase()}
                    </span>
                    <span className="telemetry-type-pill">
                      {err.type}
                    </span>
                    <strong className="telemetry-card-title">{err.message}</strong>
                  </div>

                  {err.status !== 'resolved' ? (
                    <button
                      type="button"
                      onClick={() => onResolveError(err.id)}
                      className="btn-resolve-error"
                      title="تعليم العطل كـ محلول"
                    >
                      تعليم كـ محلول
                    </button>
                  ) : (
                    <span className="resolved-check-label">
                      <CheckCircle2 size={14} />
                      <span>تم الحل</span>
                    </span>
                  )}
                </div>

                {err.stack && (
                  <pre className="telemetry-error-stack">
                    {err.stack}
                  </pre>
                )}

                <div className="telemetry-meta-footer">
                  <span>كود العطل: <code>{err.id}</code></span>
                  <span>العيادة: <strong>{err.clinicId}</strong></span>
                  <span>المسار: <code>{err.path}</code></span>
                  <span>التاريخ: {new Date(err.timestamp).toLocaleString('ar-EG')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="telemetry-empty-state">
            لا توجد أي أعطال برمجية مسجلة في النظام. كافة العمليات مستقرة 100%.
          </div>
        )}
      </div>
    </div>
  );
}
