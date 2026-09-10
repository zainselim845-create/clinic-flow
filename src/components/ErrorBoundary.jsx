import React from 'react';
import { captureSystemError, reportUserBug } from '../services/systemErrorService';
import { AlertTriangle, RefreshCw, MessageSquare, Send, CheckCircle2, Copy, Check } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null,
      copied: false,
      showReportForm: false,
      reportSubmitted: false,
      reportText: ''
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ClinicFlow Global ErrorBoundary]', error, errorInfo);
    const errEntry = captureSystemError({
      type: 'react_render_crash',
      message: error?.message || 'React Component Crash',
      stack: error?.stack || errorInfo?.componentStack,
      severity: 'critical',
      context: { componentStack: errorInfo?.componentStack }
    });
    this.setState({ errorId: errEntry.id, errorInfo });
  }

  handleReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('_t', Date.now().toString());
    window.location.href = url.toString();
  };

  handleCopyError = () => {
    const errorPayload = {
      errorId: this.state.errorId,
      message: this.state.error?.message || String(this.state.error),
      stack: this.state.error?.stack || '',
      componentStack: this.state.errorInfo?.componentStack || '',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      timestamp: new Date().toISOString()
    };
    navigator.clipboard?.writeText(JSON.stringify(errorPayload, null, 2));
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 3000);
  };

  handleSafeReset = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('clinicflow_active_tenant_slug');
      localStorage.removeItem('activeClinic');
    } catch (_) {}
    window.location.href = '/?_t=' + Date.now();
  };

  handleReportSubmit = (e) => {
    e.preventDefault();
    if (!this.state.reportText.trim()) return;

    reportUserBug({
      title: `تعطل غير متوقع في الواجهة: ${this.state.error?.message || 'Crash'}`,
      description: this.state.reportText,
      category: 'bug'
    });

    this.setState({ reportSubmitted: true });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #0f172a)',
          color: '#f8fafc',
          padding: '1.5rem',
          direction: 'rtl',
          fontFamily: 'inherit'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            background: 'var(--bg-secondary, #1e293b)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.25rem',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <AlertTriangle size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>
              عذراً، حدث خطأ غير متوقع في هذه الشاشة
            </h2>

            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              تم رصد المشكلة وتسجيل تقرير تشخيصي آلي برقم كود:{' '}
              <code style={{ background: '#0f172a', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#38bdf8' }}>
                {this.state.errorId || 'ERR-SYS'}
              </code>
            </p>

            {this.state.error && (
              <details open style={{ marginBottom: '1.5rem', textAlign: 'left', background: 'rgba(0, 0, 0, 0.35)', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.82rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <summary style={{ cursor: 'pointer', color: '#fca5a5', direction: 'rtl', textAlign: 'right', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>التفاصيل التقنية للخطأ (Technical Details):</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      this.handleCopyError();
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: this.state.copied ? '#86efac' : '#cbd5e1',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {this.state.copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{this.state.copied ? 'تم النسخ!' : 'نسخ التقرير الفني'}</span>
                  </button>
                </summary>
                <div style={{ marginTop: '0.6rem', direction: 'ltr', textAlign: 'left' }}>
                  <div style={{ color: '#f87171', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {this.state.error?.message || String(this.state.error)}
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.75rem', maxHeight: '160px', overflowY: 'auto' }}>
                    {this.state.error?.stack || this.state.errorInfo?.componentStack || 'No stack trace available'}
                  </pre>
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'var(--primary, #0284c7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={17} />
                <span>إعادة تحديث</span>
              </button>

              <button
                onClick={this.handleSafeReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
                title="مسح الجلسة المعلقة والعودة للصفحة الرئيسية بأمان"
              >
                <span>العودة للرئيسية (Safe Reset)</span>
              </button>

              <button
                onClick={() => this.setState(prev => ({ showReportForm: !prev.showReportForm }))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.15rem',
                  background: 'transparent',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <MessageSquare size={17} />
                <span>إبلاغ الدعم الفني</span>
              </button>
            </div>

            {this.state.showReportForm && (
              <div style={{ marginTop: '1.75rem', textAlign: 'right', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
                {this.state.reportSubmitted ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', justifyContent: 'center', padding: '0.75rem' }}>
                    <CheckCircle2 size={20} />
                    <span style={{ fontWeight: 700 }}>تم إرسال تقريرك لفريق الدعم الفني بنجاح! شكراً لمساعدتنا.</span>
                  </div>
                ) : (
                  <form onSubmit={this.handleReportSubmit}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>
                      ما الذي كنت تحاول فعله عند حدوث المشكلة؟
                    </label>
                    <textarea
                      rows={3}
                      value={this.state.reportText}
                      onChange={(e) => this.setState({ reportText: e.target.value })}
                      placeholder="صف الخطوات التي قمت بها باختصار لمساعدتنا في إصلاحها فوراً..."
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'vertical',
                        marginBottom: '0.75rem',
                        direction: 'rtl'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 1rem',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Send size={15} />
                      <span>إرسال البلاغ</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
