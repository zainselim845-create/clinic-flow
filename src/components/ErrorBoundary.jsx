import React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    const errorMsg = String(error?.message || '');
    if (
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError'
    ) {
      // Chunk hash mismatch after deployment - auto reload once
      const reloaded = window.sessionStorage.getItem('chunk_boundary_reload');
      if (!reloaded) {
        window.sessionStorage.setItem('chunk_boundary_reload', 'true');
        window.location.reload();
        return { hasError: false, error: null };
      }
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ClinicFlow Uncaught Runtime Error:', error, errorInfo);
    const errorMsg = String(error?.message || '');
    if (
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError'
    ) {
      const reloaded = window.sessionStorage.getItem('chunk_boundary_reload');
      if (!reloaded) {
        window.sessionStorage.setItem('chunk_boundary_reload', 'true');
        window.location.reload();
        return;
      }
    }
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      // Clear any corrupted local cache if needed
      sessionStorage.clear();
    } catch {
      // Ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #F8FAFC)',
          padding: '2rem',
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          direction: 'rtl'
        }}>
          <div style={{
            background: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <ShieldAlert size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #1E293B)', marginBottom: '0.5rem' }}>
              عذراً، حدث خطأ غير متوقع في النظام
            </h2>
            
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary, #64748B)', lineHeight: '1.6', marginBottom: '1.75rem' }}>
              تم حفظ بياناتك بأمان. يمكنك إعادة تحميل الصفحة للمتابعة دون أي فقد للبيانات المسجلة.
            </p>

            {this.state.error?.message && (
              <div style={{
                background: '#F1F5F9',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#475569',
                textAlign: 'left',
                direction: 'ltr',
                marginBottom: '1.75rem',
                overflowX: 'auto',
                fontFamily: 'monospace'
              }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: 'var(--primary, #2563EB)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <RefreshCw size={16} />
                <span>إعادة تحميل الصفحة</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: 'var(--bg-tertiary, #F1F5F9)',
                  color: 'var(--text-primary, #1E293B)',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Home size={16} />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
