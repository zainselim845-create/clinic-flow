import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * NetworkStatusBanner
 * Discrete, enterprise SaaS status pill that notifies the user
 * when network drops or recovers, without blocking interaction.
 */
export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '9999px',
        fontSize: '0.84rem',
        fontWeight: 600,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.25s ease',
        direction: 'rtl',
        background: isOnline ? '#065F46' : '#991B1B',
        color: '#FFFFFF',
        border: '1px solid ' + (isOnline ? '#059669' : '#DC2626')
      }}
    >
      {isOnline ? (
        <>
          <Wifi size={16} color="#A7F3D0" />
          <span>تمت استعادة الاتصال بالإنترنت بنجاح — المزامنة نشطة</span>
        </>
      ) : (
        <>
          <WifiOff size={16} color="#FECACA" />
          <span>وضع عدم الاتصال — يمكنك الاستمرار وسيتم حفظ البيانات محلياً</span>
        </>
      )}
    </div>
  );
}
