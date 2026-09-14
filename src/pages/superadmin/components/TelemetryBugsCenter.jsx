import React, { useState } from 'react';
import { Bug, AlertTriangle, RefreshCw, Trash2, CheckCircle2, CheckCheck, Filter } from 'lucide-react';

export function TelemetryBugsCenter({
  systemErrors = [],
  bugReports = [],
  onRefresh,
  onClearErrors,
  onResolveError,
  onResolveAllErrors,
  onDeleteError,
  onUpdateBugStatus,
  onDeleteBug,
  onClearBugs
}) {
  const [bugFilter, setBugFilter] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [errorFilter, setErrorFilter] = useState('all'); // 'all' | 'unresolved' | 'critical' | 'resolved'

  // Filter bug reports
  const filteredBugs = bugReports.filter(b => {
    if (bugFilter === 'all') return true;
    return b.status === bugFilter;
  });

  // Filter system errors
  const filteredErrors = systemErrors.filter(e => {
    if (errorFilter === 'all') return true;
    if (errorFilter === 'unresolved') return e.status !== 'resolved';
    if (errorFilter === 'resolved') return e.status === 'resolved';
    if (errorFilter === 'critical') return e.severity === 'critical';
    return true;
  });

  const openBugsCount = bugReports.filter(b => b.status === 'open').length;
  const unresolvedErrorsCount = systemErrors.filter(e => e.status !== 'resolved').length;
  const criticalErrorsCount = systemErrors.filter(e => e.severity === 'critical').length;

  return (
    <div className="saas-section-card">
      <div className="section-card-header telemetry-header">
        <div>
          <h2>مركز رصد الأعطال وبلاغات النظام (System Health & Bug Center)</h2>
          <p>استقبال تلقائي لكافة الأخطاء البرمجية والبلاغات من الأطباء والطاقم في كافة العيادات</p>
        </div>
        <div className="telemetry-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-secondary telemetry-refresh-btn"
            title="تحديث قائمة البلاغات والأعطال"
          >
            <RefreshCw size={14} />
            <span>تحديث السجل</span>
          </button>
          {onResolveAllErrors && systemErrors.length > 0 && (
            <button
              type="button"
              onClick={onResolveAllErrors}
              className="btn btn-secondary telemetry-resolve-all-btn"
              title="تعليم كافة الأعطال كمحلولة"
              style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#047857' }}
            >
              <CheckCheck size={14} />
              <span>تعليم الكل كمحلول</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClearErrors}
            className="btn btn-danger telemetry-clear-btn"
            title="مسح سجل الأعطال البرمجية القديمة"
          >
            <Trash2 size={14} />
            <span>مسح سجل الأعطال</span>
          </button>
        </div>
      </div>

      {/* Sub-Section 1: User Bug Reports */}
      <div className="telemetry-sub-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <h3 className="telemetry-sub-title bugs" style={{ margin: 0 }}>
            <Bug size={20} color="#0284c7" />
            <span>بلاغات الأطباء والمستخدمين ({bugReports.length})</span>
            {openBugsCount > 0 && (
              <span style={{ fontSize: '0.75rem', background: '#FEE2E2', color: '#DC2626', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700 }}>
                {openBugsCount} قيد الانتظار
              </span>
            )}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <div className="telemetry-filters" style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { id: 'all', label: `الكل (${bugReports.length})` },
                { id: 'open', label: `قيد الانتظار (${openBugsCount})` },
                { id: 'in_progress', label: 'جاري المعالجة' },
                { id: 'resolved', label: 'تم الحل' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBugFilter(f.id)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: bugFilter === f.id ? 'var(--primary, #0071E3)' : 'var(--border-color, #E2E8F0)',
                    background: bugFilter === f.id ? 'rgba(0, 113, 227, 0.1)' : 'transparent',
                    color: bugFilter === f.id ? 'var(--primary, #0071E3)' : 'var(--text-secondary, #64748B)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {onClearBugs && bugReports.length > 0 && (
              <button
                type="button"
                onClick={onClearBugs}
                className="btn btn-danger"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                title="مسح كافة بلاغات المستخدمين"
              >
                <Trash2 size={12} />
                <span>مسح البلاغات</span>
              </button>
            )}
          </div>
        </div>

        {filteredBugs.length > 0 ? (
          <div className="telemetry-list">
            {filteredBugs.map((bug) => (
              <div key={bug.id} className="telemetry-card bug-report-card">
                <div className="telemetry-card-top">
                  <div className="telemetry-badge-group">
                    <span className={`telemetry-category-badge ${bug.category || 'bug'}`}>
                      {bug.category === 'bug' ? 'عطل برمجي' : bug.category === 'performance' ? 'بطء استجابة' : 'اقتراح / واجهة'}
                    </span>
                    <strong className="telemetry-card-title">{bug.title}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

                    {onDeleteBug && (
                      <button
                        type="button"
                        onClick={() => onDeleteBug(bug.id)}
                        className="btn-icon delete"
                        title="حذف هذا البلاغ"
                        style={{ padding: '0.35rem', color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
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
            لا توجد بلاغات تطابق الفلتر الحالي. النظام يعمل بسلاسة تامة.
          </div>
        )}
      </div>

      {/* Sub-Section 2: Automated Runtime Exceptions */}
      <div className="telemetry-sub-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <h3 className="telemetry-sub-title errors" style={{ margin: 0 }}>
            <AlertTriangle size={20} color="#ef4444" />
            <span>سجل الأعطال البرمجية والتشخيصية التلقائية ({systemErrors.length})</span>
            {unresolvedErrorsCount > 0 && (
              <span style={{ fontSize: '0.75rem', background: '#FEE2E2', color: '#DC2626', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700 }}>
                {unresolvedErrorsCount} غير محلول
              </span>
            )}
          </h3>

          <div className="telemetry-filters" style={{ display: 'flex', gap: '0.35rem' }}>
            {[
              { id: 'all', label: `كافة الأعطال (${systemErrors.length})` },
              { id: 'unresolved', label: `غير محلولة (${unresolvedErrorsCount})` },
              { id: 'critical', label: `حرجة (${criticalErrorsCount})` },
              { id: 'resolved', label: 'تم حلها' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setErrorFilter(f.id)}
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: errorFilter === f.id ? '#EF4444' : 'var(--border-color, #E2E8F0)',
                  background: errorFilter === f.id ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: errorFilter === f.id ? '#EF4444' : 'var(--text-secondary, #64748B)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredErrors.length > 0 ? (
          <div className="telemetry-list">
            {filteredErrors.map((err) => (
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

                    {onDeleteError && (
                      <button
                        type="button"
                        onClick={() => onDeleteError(err.id)}
                        className="btn-icon delete"
                        title="حذف هذا العطل من السجل"
                        style={{ padding: '0.35rem', color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
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
            لا توجد أي أعطال برمجية تطابق الفلتر المحدد. كافة العمليات مستقرة 100%.
          </div>
        )}
      </div>
    </div>
  );
}
