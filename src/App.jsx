import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
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
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

const pageTitles = {
  '/': 'لوحة التحكم السريرية',
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
  const { state } = useApp();

  return (
    <div className="app-wrapper" data-theme={state.theme}>
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

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* 1. Public Pages (Clean Canvas Layout) */}
        <Route path="/login" element={
          <div className="app-wrapper booking-layout" data-theme={state.theme}><Login /></div>
        } />
        <Route path="/booking" element={
          <div className="app-wrapper booking-layout" data-theme={state.theme}><Booking /></div>
        } />
        <Route path="/manage-booking" element={
          <div className="app-wrapper booking-layout" data-theme={state.theme}><ManageBooking /></div>
        } />

        {/* 2. Admin Protected Routes with Sidebar & Header Layout */}
        <Route element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Dashboard />} />
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
  );

}

export default App;

