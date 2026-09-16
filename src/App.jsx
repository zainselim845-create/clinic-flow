import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DoctorAiFloatingWidget from './components/DoctorAiFloatingWidget';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import SeoHeadManager from './components/SeoHeadManager';
import Breadcrumbs from './components/Breadcrumbs';
import ScrollProgressBar from './components/ui/ScrollProgressBar';
import ScrollToTopButton from './components/ui/ScrollToTopButton';
import CookieBanner from './components/CookieBanner';
import FloatingContactButton from './components/FloatingContactButton';
import { initGlobalErrorListeners } from './services/systemErrorService';
import './App.css';

// Smart Lazy Load with Auto-Retry on Deployment Update & Missing Export Shield
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    let pageHasAlreadyBeenForceRefreshed = false;
    try {
      pageHasAlreadyBeenForceRefreshed = JSON.parse(
        window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
      );
    } catch (_) {}

    try {
      const component = await componentImport();
      try {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      } catch (_) {}
      return component && component.default ? component : { default: component || (() => null) };
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed && typeof window !== 'undefined' && window.location?.reload) {
        try {
          window.sessionStorage?.setItem('page-has-been-force-refreshed', 'true');
        } catch (_) {}
        window.location.reload();
      }
      throw error;
    }
  });

// Lazy Loaded Pages for Instant Initial Page Load & Low Bandwidth
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Appointments = lazyWithRetry(() => import('./pages/Appointments'));
const Patients = lazyWithRetry(() => import('./pages/Patients'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
const Booking = lazyWithRetry(() => import('./pages/Booking'));
const ManageBooking = lazyWithRetry(() => import('./pages/ManageBooking'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const DoctorAssistant = lazyWithRetry(() => import('./pages/DoctorAssistant'));
const Invoices = lazyWithRetry(() => import('./pages/Invoices'));
const Inventory = lazyWithRetry(() => import('./pages/Inventory'));
const Attendance = lazyWithRetry(() => import('./pages/Attendance'));
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/superadmin/SuperAdminDashboard'));
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding'));
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const SmsIntegration = lazyWithRetry(() => import('./pages/SmsIntegration'));
const Labs = lazyWithRetry(() => import('./pages/Labs'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

const pageTitles = {
  '/': 'لوحة التحكم السريرية',
  '/dashboard': 'لوحة التحكم السريرية',
  '/appointments': 'إدارة المواعيد والتقويم',
  '/patients': 'السجلات والملفات الطبية',
  '/invoices': 'الفوترة والتحصيلات المالية',
  '/inventory': 'مخزون المستلزمات الطبية',
  '/attendance': 'حضور وانصراف الطاقم',
  '/doctor-agent': 'مساعد الطبيب الذكي',
  '/notifications': 'التنبيهات والإشعارات',
  '/sms-integration': 'بوابة الرسائل النصية والتكامل',
  '/labs': 'معمل التركيبات والتحاليل',
  '/settings': 'إعدادات وإدارة العيادة',
  '/booking': 'حجز موعد',
  '/manage-booking': 'إدارة الحجز والمواعيد',
  '/onboarding': 'تهيئة وإعداد نظام العيادة',
};


// Fast Sleek Loading Spinner Component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem',
    color: 'var(--primary)',
    fontFamily: 'inherit'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3.5px solid var(--border-color)',
      borderTopColor: 'var(--primary)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
      جاري التحميل...
    </span>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Admin Dashboard & Protected Layout Wrapper
const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();
  const { user, isImpersonating, stopImpersonating } = useAuth();
  const { tenant } = useTenant();
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin' || user?.isSuperAdmin === true || isImpersonating;

  return (
    <div className={`app-wrapper ${isSuperAdmin ? 'has-saas-banner' : ''}`} data-theme={state.theme}>
      {isSuperAdmin && (
        <aside className="saas-admin-floating-banner" aria-label="شريط مدير الساس">
          <div className="saas-admin-banner-inner">
            <div className="saas-admin-meta">
              <span className="saas-admin-badge" style={isImpersonating ? { background: 'rgba(234, 88, 12, 0.4)', borderColor: '#F97316', color: '#FFEDD5' } : {}}>
                <ShieldCheck size={14} />
                <span>{isImpersonating ? 'وضع محاكاة العميل (Active Impersonation)' : 'وضع مدير الساس (SaaS Admin)'}</span>
              </span>
              <span className="saas-admin-text">
                {isImpersonating ? (
                  <>أنت تتصفح النظام بصلاحيات: <strong>{user?.name}</strong> ({user?.jobTitle || user?.role}) • عيادة: <strong>{tenant?.name}</strong></>
                ) : (
                  <>أنت تعاين حالياً عيادة العميل: <strong>{tenant?.name || 'عيادة تجريبية'}</strong></>
                )}
              </span>
            </div>
            <div className="saas-admin-actions">
              <button 
                type="button" 
                onClick={() => {
                  if (isImpersonating && stopImpersonating) {
                    stopImpersonating();
                  }
                  navigate('/super-admin');
                }} 
                className="btn-return-to-saas-admin"
                style={isImpersonating ? { background: '#EA580C', color: '#FFFFFF', borderColor: '#C2410C' } : {}}
                title="العودة إلى لوحة تحكم إدارة الساس المركزية"
              >
                <ArrowLeft size={14} />
                <span>{isImpersonating ? 'إنهاء المحاكاة والعودة الفورية للساس' : 'العودة للوحة إدارة الساس (Control Plane)'}</span>
              </button>
            </div>
          </div>
        </aside>
      )}
      <Sidebar />
      <div className="main-content">
        <Header 
          title={pageTitles[location.pathname] || 'لوحة التحكم'} 
          onOpenAiCopilot={() => setIsAiCopilotOpen(prev => !prev)}
        />
        <main className="page-content">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  const { state } = useApp();
  const { user } = useAuth();
  const { isDedicatedDomain } = useTenant();

  useEffect(() => {
    initGlobalErrorListeners();
  }, []);

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-to-content">الانتقال إلى المحتوى الرئيسي</a>
      <ScrollProgressBar />
      <SeoHeadManager />
      <main id="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 1. Public Pages (Clean Canvas Layout) */}
            <Route path="/" element={
              user ? (
                (user.role === 'super_admin' || user.isSuperAdmin) ? (
                  <Navigate to="/super-admin" replace />
                ) : (
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                )
              ) : isDedicatedDomain ? (
                <div className="app-wrapper booking-layout" data-theme={state.theme}><Booking /></div>
              ) : (
                <LandingPage />
              )
            }>
              {user && !user.isSuperAdmin && user.role !== 'super_admin' && <Route index element={<Dashboard />} />}
            </Route>

            <Route path="/login" element={
              <div className="app-wrapper booking-layout" data-theme={state.theme}><Login /></div>
            } />
            <Route path="/onboarding" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <div className="app-wrapper booking-layout" data-theme={state.theme}><Onboarding /></div>
              </ProtectedRoute>
            } />
            <Route path="/booking" element={
              <div className="app-wrapper booking-layout" data-theme={state.theme}><Booking /></div>
            } />
            <Route path="/manage-booking" element={
              <div className="app-wrapper booking-layout" data-theme={state.theme}><ManageBooking /></div>
            } />

            {/* Multi-Tenant Public Pages & Tenant Slugs */}
            <Route path="/c/:clinicSlug" element={<Navigate to="booking" replace />} />
            <Route path="/c/:clinicSlug/booking" element={
              <div className="app-wrapper booking-layout" data-theme={state.theme}><Booking /></div>
            } />
            <Route path="/c/:clinicSlug/manage-booking" element={
              <div className="app-wrapper booking-layout" data-theme={state.theme}><ManageBooking /></div>
            } />

            {/* Super Admin Control Plane & SaaS Admin Aliases */}
            <Route path="/super-admin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/superadmin" element={<Navigate to="/super-admin" replace />} />
            <Route path="/admin" element={<Navigate to="/super-admin" replace />} />
            <Route path="/saas-admin" element={<Navigate to="/super-admin" replace />} />
            <Route path="/saas" element={<Navigate to="/super-admin" replace />} />
            <Route path="/control-plane" element={<Navigate to="/super-admin" replace />} />

            {/* 2. Admin Protected Routes with Sidebar & Header Layout */}
            <Route element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/appointments" element={
                <ProtectedRoute requiredPermission="appointments"><Appointments /></ProtectedRoute>
              } />
              <Route path="/patients" element={
                <ProtectedRoute requiredPermission="patients"><Patients /></ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute requiredPermission="invoices"><Invoices /></ProtectedRoute>
              } />
              <Route path="/inventory" element={
                <ProtectedRoute requiredPermission="inventory"><Inventory /></ProtectedRoute>
              } />
              <Route path="/attendance" element={
                <ProtectedRoute><Attendance /></ProtectedRoute>
              } />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/doctor-agent" element={
                <ProtectedRoute allowedRoles={['doctor']}><DoctorAssistant /></ProtectedRoute>
              } />
              <Route path="/doctor-assistant" element={<Navigate to="/doctor-agent" replace />} />
              <Route path="/sms-integration" element={
                <ProtectedRoute allowedRoles={['doctor']}><SmsIntegration /></ProtectedRoute>
              } />
              <Route path="/labs" element={
                <ProtectedRoute allowedRoles={['doctor', 'super_admin']}><Labs /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute allowedRoles={['doctor']}><Settings /></ProtectedRoute>
              } />
            </Route>

            {/* 3. Removed Routes Redirects */}
            <Route path="/insurance" element={<Navigate to="/" replace />} />

            {/* 4. Fallback unknown paths */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <ScrollToTopButton />
      <FloatingContactButton />
      <CookieBanner />
    </ErrorBoundary>
  );
}

export default App;

