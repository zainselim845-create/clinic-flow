import { Routes, Route, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import Notifications from './pages/Notifications';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Settings from './pages/Settings';
import './App.css';

const pageTitles = {
  '/': 'لوحة التحكم',
  '/appointments': 'إدارة المواعيد',
  '/patients': 'إدارة المرضى',
  '/notifications': 'التنبيهات',
  '/settings': 'إعدادات بوابة SMS والربط',
  '/booking': 'حجز موعد',
};

function App() {
  const location = useLocation();
  const { state } = useApp();
  const isBookingPage = location.pathname === '/booking';
  const isLoginPage = location.pathname === '/login';

  // Login page has its own layout
  if (isLoginPage) {
    return (
      <div className="app-wrapper booking-layout" data-theme={state.theme}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    );
  }

  // Booking page has its own layout (no sidebar/header, public access)
  if (isBookingPage) {
    return (
      <div className="app-wrapper booking-layout" data-theme={state.theme}>
        <Routes>
          <Route path="/booking" element={<Booking />} />
        </Routes>
      </div>
    );
  }

  // Admin pages — protected behind authentication
  return (
    <div className="app-wrapper" data-theme={state.theme}>
      <Sidebar />
      <div className="main-content">
        <Header title={pageTitles[location.pathname] || 'لوحة التحكم'} />
        <main className="page-content">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/appointments" element={
              <ProtectedRoute><Appointments /></ProtectedRoute>
            } />
            <Route path="/patients" element={
              <ProtectedRoute><Patients /></ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute><Notifications /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
