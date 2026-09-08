import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, LogOut, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import GlobalSearchModal from './GlobalSearchModal';
import TenantSwitcher from './TenantSwitcher';
import ReportIssueModal from './ReportIssueModal';
import './Header.css';

const Header = ({ title }) => {
  const { state, toggleTheme } = useApp();
  const { user, clinic, role, signOut } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const unreadCount = state.notifications?.filter(n => !n.read).length || 0;

  // Real Logged-in User Identity (strictly reflects logged-in user or active tenant doctor)
  const effectiveRole = user?.role || role || 'doctor';
  const isDoctor = effectiveRole === 'doctor' || effectiveRole === 'super_admin' || effectiveRole === 'multi_clinic_owner';
  const activeDoctorName = tenant?.doctorName || state.clinicInfo?.doctorName || clinic?.doctorName || 'د. أحمد الشريف';
  const activeSpecialty = tenant?.specialty || state.clinicInfo?.specialty || clinic?.specialty || 'المدير الطبي';

  // Display user name: prioritize authenticated user name; fallback to active clinic doctor
  const displayName = user?.name 
    ? user.name 
    : (isDoctor ? activeDoctorName : 'موظف الاستقبال');

  // Display role: prioritize authenticated user job title; fallback to active clinic specialty or role label
  let displayRole = user?.jobTitle;
  if (!displayRole) {
    if (user?.role === 'super_admin') {
      displayRole = 'مدير عام المنصة والسحابة';
    } else if (user?.role === 'multi_clinic_owner') {
      displayRole = 'مالك مجمع العيادات';
    } else if (isDoctor) {
      displayRole = activeSpecialty;
    } else {
      displayRole = user?.role === 'staff' ? 'سكرتارية واستقبال العيادة' : 'طاقم العيادة';
    }
  }

  const initial = displayName.replace(/^د\.?\s*/, '').trim().charAt(0) || displayName.charAt(0) || (isDoctor ? 'د' : 'س');


  const handleLogout = async () => {
    if (window.confirm('هل تريد تسجيل الخروج من النظام؟')) {
      await signOut();
      navigate('/login');
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-title-wrap">
          <h1>{title}</h1>
          <TenantSwitcher />
        </div>

        <div className="header-actions">
          {/* Interactive Global Search Trigger Bar */}
          <div className="search-bar" onClick={() => setIsSearchOpen(true)} title="بحث سريع وشامل (Ctrl + K)">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="بحث سريع في العيادة..." 
              readOnly 
              style={{ cursor: 'pointer' }}
            />
            <span className="search-kbd-shortcut">Ctrl K</span>
          </div>

          <button className="theme-header-btn" onClick={toggleTheme} title="تبديل الوضع الليلي / الفاتح">
            {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button 
            className="theme-header-btn" 
            onClick={() => setIsReportModalOpen(true)} 
            title="إبلاغ عن عطل أو مشكلة فنية"
            style={{ color: '#ef4444' }}
          >
            <Bug size={18} />
          </button>

          <button className="notification-btn" onClick={() => navigate('/notifications')} title="التنبيهات">
            <Bell size={19} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {/* Unified Profile & Account Action */}
          <div className="doctor-profile">
            <div className="avatar">{initial}</div>
            <div className="doctor-info">
              <span className="doctor-name">{displayName}</span>
              <span className="doctor-role">{displayRole}</span>
            </div>
            <button 
              type="button" 
              className="btn-logout-header"
              onClick={handleLogout}
              title="تسجيل الخروج من الحساب"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Global Search & Command Center Modal */}
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />

      {/* Report Bug / Issue Modal */}
      <ReportIssueModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />
    </>
  );
};

export default React.memo(Header);
