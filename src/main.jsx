import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { TenantProvider } from './context/TenantContext';
import ErrorBoundary from './components/ErrorBoundary';
import { LocaleProvider } from '@ark-ui/react/locale';
import App from './App';
import './index.css';

// Auto-recover from stale dynamic chunk loading after new deployments
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

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
              </AppProvider>
            </AuthProvider>
          </TenantProvider>
        </BrowserRouter>
      </LocaleProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

