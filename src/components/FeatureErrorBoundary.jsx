import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { captureSystemError } from '../services/systemErrorService';

/**
 * FeatureErrorBoundary
 * Localized Error Boundary for individual widgets and sub-features.
 * Prevents isolated feature errors from crashing the parent page or dashboard.
 */
class FeatureErrorBoundary extends React.Component {
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
    console.warn(`[FeatureErrorBoundary:${this.props.featureName || 'Widget'}]`, error, errorInfo);
    try {
      captureSystemError({
        type: 'feature_widget_crash',
        message: `[${this.props.featureName || 'Widget'}] ${error?.message || 'Component Crash'}`,
        stack: error?.stack || errorInfo?.componentStack,
        severity: 'warning',
        context: {
          feature: this.props.featureName || 'UnknownFeature',
          componentStack: errorInfo?.componentStack
        }
      });
    } catch {
      // Ignore secondary error logging failure
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="feature-error-container"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'var(--bg-secondary, #1e293b)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--text-primary, #f8fafc)',
            textAlign: 'center',
            margin: '0.5rem 0',
            direction: 'rtl'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', marginBottom: '0.5rem' }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              تعثر مؤقت في تحميل {this.props.featureName ? `قسم "${this.props.featureName}"` : 'هذا القسم'}
            </span>
          </div>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
            البيانات في باقي أقسام العيادة تعمل بصورة طبيعية ومحفوظة بأمان.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary, #0284c7)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FeatureErrorBoundary;
