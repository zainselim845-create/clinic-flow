import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { initGlobalErrorListeners } from './services/systemErrorService';
import './App.css';

// Smart Lazy Load with Auto-Retry on Deployment Update
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {});
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
const Labs = lazyWithRetry(() => import('./pages/Labs'));
const Inventory = lazyWithRetry(() => import('./pages/Inventory'));
const Attendance = lazyWithRetry(() => import('./pages/Attendance'));
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/superadmin/SuperAdminDashboard'));
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

const pageTitles = {
  '/': 'لوحة التحكم السريرية',
  '/dashboard': 'لوحة التحكم السريرية',
  '/appointments': 'إدارة المواعيد والتقويم',
  '/patients': 'السجلات والملفات الطبية',
  '/invoices': 'الفوترة والتحصيلات المالية',
  '/labs': 'إدارة المعامل والتركيبات',
  '/inventory': 'مخزون المستلزمات الطبية',
  '/attendance': 'حضور وانصراف الطاقم',
  '/doctor-agent': 'مساعد الطبيب الذكي',
  '/notifications': 'التنبيهات والإشعارات',
  '/settings': 'إعدادات وإدارة العيادة',
  '/booking': 'حجز موعد',
  '/manage-booking': 'إدارة الحجز والمواعيد',
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
  const { user } = useAuth();
  const { tenant } = useTenant();

  const isSuperAdmin = user?.role === 'super_admin' || user?.isSuperAdmin === true;

  return (
    <div className="app-wrapper" data-theme={state.theme}>
      {isSuperAdmin && (
        <aside className="saas-admin-floating-banner" aria-label="شريط مدير الساس">
          <div className="saas-admin-banner-inner">
            <div className="saas-admin-meta">
              <span className="saas-admin-badge">
                <ShieldCheck size={14} />
                <span>وضع مدير الساس (SaaS Admin)</span>
              </span>
              <span className="saas-admin-text">
                أنت تعاين حالياً عيادة العميل: <strong>{tenant?.name || 'عيادة تجريبية'}</strong>
              </span>
            </div>
            <div className="saas-admin-actions">
              <button 
                type="button" 
                onClick={() => navigate('/super-admin')} 
                className="btn-return-to-saas-admin"
                title="العودة إلى لوحة تحكم إدارة الساس المركزية"
              >
                <ArrowLeft size={14} />
                <span>العودة للوحة إدارة الساس (Control Plane)</span>
              </button>
            </div>
          </div>
        </aside>
      )}
      <Sidebar />
      <div className="main-content">
        <Header title={pageTitles[location.pathname] || 'لوحة التحكم'} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  const { state } = useApp();
  const { user } = useAuth();

  useEffect(() => {
    initGlobalErrorListeners();
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 1. Public Pages (Clean Canvas Layout) */}
          <Route path="/" element={
            user ? (
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            ) : (
              <LandingPage />
            )
          }>
            {user && <Route index element={<Dashboard />} />}
          </Route>

          <Route path="/login" element={
            <div className="app-wrapper booking-layout" data-theme={state.theme}><Login /></div>
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
          <Route path="/admin" element={<Navigate to="/super-admin" replace />} />
          <Route path="/saas-admin" element={<Navigate to="/super-admin" replace />} />

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
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/doctor-agent" element={
              <ProtectedRoute allowedRoles={['doctor']}><DoctorAssistant /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['doctor']}><Settings /></ProtectedRoute>
            } />
          </Route>

          {/* 3. Removed Routes Redirects */}
          <Route path="/labs" element={<Navigate to="/" replace />} />
          <Route path="/attendance" element={<Navigate to="/" replace />} />
          <Route path="/insurance" element={<Navigate to="/" replace />} />

          {/* 4. Fallback unknown paths */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;

