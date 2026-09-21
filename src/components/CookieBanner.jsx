import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

/**
 * Clean, non-intrusive cookie and privacy consent banner.
 * Complies with international and regional medical data privacy requirements.
 */
export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('clinicflow_cookie_consent');
      if (!consent) {
        // Show after small initial delay for better UX
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // safe fallback
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('clinicflow_cookie_consent', 'accepted');
    } catch {}
    setIsVisible(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('clinicflow_cookie_consent', 'dismissed');
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="إشعار ملفات تعريف الارتباط والخصوصية"
      role="region"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        maxWidth: '560px',
        margin: '0 auto',
        zIndex: 9999,
        backgroundColor: 'var(--surface, #FFFFFF)',
        border: '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
        direction: 'rtl',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div 
          style={{
            padding: '8px',
            borderRadius: '10px',
            backgroundColor: 'var(--surface-container, rgba(9, 9, 11, 0.05))',
            color: 'var(--text-primary, #09090B)',
            flexShrink: 0
          }}
        >
          <ShieldCheck size={20} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary, #09090B)' }}>
            نحن نهتم بخصوصية بياناتك الطبية
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary, #71717A)', lineHeight: '1.4' }}>
            نستخدم ملفات تعريف الارتباط الأساسية لتأمين الجلسات وتفضيلات الوضع الليلي وسلامة الاتصال السحابي.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleAccept}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--primary, #09090B)',
            color: 'var(--clinic-on-primary, #FFFFFF)',
            fontSize: '0.78rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.15s ease'
          }}
        >
          موافق
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="إغلاق إشعار الخصوصية"
          style={{
            padding: '7px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary, #71717A)',
            border: '1px solid var(--border-color, #E4E4E7)',
            cursor: 'pointer'
          }}
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
};

export default CookieBanner;
