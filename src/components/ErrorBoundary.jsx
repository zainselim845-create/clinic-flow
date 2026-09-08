import React from 'react';
import { captureSystemError, reportUserBug } from '../services/systemErrorService';
import { AlertTriangle, RefreshCw, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorId: null,
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
    this.setState({ errorId: errEntry.id });
  }

  handleReload = () => {
    window.location.reload();
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

            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              تم رصد المشكلة وتسجيل تقرير تشخيصي آلي برقم كود:{' '}
              <code style={{ background: '#0f172a', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#38bdf8' }}>
                {this.state.errorId || 'ERR-SYS'}
              </code>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--primary, #0284c7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={18} />
                <span>إعادة تحديث الصفحة</span>
              </button>

              <button
                onClick={() => this.setState(prev => ({ showReportForm: !prev.showReportForm }))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'transparent',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                <MessageSquare size={18} />
                <span>إبلاغ الدعم الفني عن المشكلة</span>
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
