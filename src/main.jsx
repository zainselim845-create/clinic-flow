import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { TenantProvider } from './context/TenantContext';
import ErrorBoundary from './components/ErrorBoundary';
import { LocaleProvider } from '@ark-ui/react/locale';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

// Auto-recover from stale dynamic chunk loading after new deployments
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

// Purge legacy demo artifacts from browser storage
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const PURGE_KEY = 'clinicflow_clean_slate_purged_v1';
    if (!localStorage.getItem(PURGE_KEY)) {
      const demoKeys = [
        'clinicflow_data_dr-ahmed',
        'clinicflow_data_dr-sara',
        'clinicflow_data_dr-zainselim845',
        'clinicflow_data'
      ];
      demoKeys.forEach(k => localStorage.removeItem(k));

      const activeSlug = localStorage.getItem('clinicflow_active_tenant_slug');
      if (['dr-ahmed', 'dr-sara', 'dr-zainselim845'].includes(activeSlug)) {
        localStorage.removeItem('clinicflow_active_tenant_slug');
      }

      const authUserRaw = localStorage.getItem('clinicflow_auth_user');
      if (authUserRaw) {
        try {
          const authUser = JSON.parse(authUserRaw);
          const demoEmails = ['doctor@clinicflow.com', 'sara.clinic@clinicflow.com', 'owner@clinicflow.com', 'reception@clinicflow.com', 'zainselim845@gmail.com', 'admin@clinicflow.com'];
          const demoIds = ['doc-master', 'doc-sara-master', 'doc-zainselim-master', 'user-multi-clinic-owner', 'staff-reception-master', 'admin-master'];
          if (demoIds.includes(authUser.id) || demoEmails.includes(authUser.email?.toLowerCase())) {
            localStorage.removeItem('clinicflow_auth_user');
            sessionStorage.removeItem('clinicflow_auth_user');
          }
        } catch (_) {}
      }

      localStorage.setItem(PURGE_KEY, 'true');
    }
  } catch (_) {}
}

// Register Service Worker for offline PWA support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.location.host.includes('localhost:5173')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service worker registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LocaleProvider locale="ar-EG" dir="rtl">
        <BrowserRouter>
          <TenantProvider>
            <AuthProvider>
              <AppProvider>
                <App />
                <Toaster
                  position="bottom-right"
                  dir="rtl"
                  toastOptions={{
                    style: { fontFamily: 'inherit', direction: 'rtl' }
                  }}
                  richColors
                  closeButton
                />
              </AppProvider>
            </AuthProvider>
          </TenantProvider>
        </BrowserRouter>
      </LocaleProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

