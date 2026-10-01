import React from 'react';
import { AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { captureSystemError } from '../services/systemErrorService';

/**
 * PageErrorBoundary
 * Route-level Error Boundary for ClinicFlow pages.
 * Ensures that if a single page has a render bug or unexpected null property,
 * the sidebar, navigation, and other clinic pages remain 100% operational.
 */
class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn(`[PageErrorBoundary:${this.props.pageName || 'Page'}]`, error, errorInfo);
    try {
      captureSystemError({
        type: 'page_render_crash',
        message: `[${this.props.pageName || 'Page'}] ${error?.message || 'Page Crash'}`,
        stack: error?.stack || errorInfo?.componentStack,
        severity: 'critical',
        context: {
          page: this.props.pageName || 'UnknownPage',
          componentStack: errorInfo?.componentStack
        }
      });
    } catch {
      // Ignore secondary error logging failure
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleNavigateDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="page-error-boundary-container"
          style={{
            minHeight: '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            direction: 'rtl',
            fontFamily: 'inherit'
          }}
        >
          <div 
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              borderRadius: '16px',
              background: 'var(--bg-secondary, #ffffff)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <AlertCircle size={28} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary, #09090b)' }}>
              تعثر مؤقت في عرض {this.props.pageName ? `صفحة "${this.props.pageName}"` : 'هذه الصفحة'}
            </h2>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              بيانات عيادتك ومرضاك محفوظة بأمان تام في قاعدة البيانات. يمكنك إعادة تحميل هذا القسم أو التوجه إلى لوحة التحكم الرئيسية فوراً.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--primary, #09090b)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} />
                <span>إعادة المحاولة</span>
              </button>

              <button
                type="button"
                onClick={this.handleNavigateDashboard}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span>لوحة التحكم الرئيسية</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
