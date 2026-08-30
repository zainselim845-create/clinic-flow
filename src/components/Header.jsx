import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import GlobalSearchModal from './GlobalSearchModal';
import './Header.css';

const Header = ({ title }) => {
  const { state, toggleTheme } = useApp();
  const { user, clinic, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const unreadCount = state.notifications?.filter(n => !n.read).length || 0;

  // Real Logged-in User Identity (syncs live with state.clinicInfo)
  const displayName = role === 'doctor' 
    ? (state.clinicInfo?.doctorName || clinic?.doctorName || user?.name || 'د. أحمد الشريف') 
    : (user?.name || 'موظف الاستقبال');
  const displayRole = role === 'doctor' 
    ? (state.clinicInfo?.specialty || clinic?.specialty || user?.jobTitle || 'المدير الطبي') 
    : (user?.jobTitle || user?.role || 'سكرتارية العيادة');
  const initial = displayName.charAt(0) || (role === 'doctor' ? 'د' : 'س');


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
          <span className="clinic-status-badge">
            <span className="live-pulse-dot"></span>
            <span>{clinic?.name || state.clinicInfo?.name || 'العيادة جاهزة'}</span>
          </span>
        </div>

        <div className="header-actions">
          {/* Interactive Global Search Trigger Bar */}
          <div className="search-bar" onClick={() => setIsSearchOpen(true)} title="بحث سريع وشامل (Ctrl + K)">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="بحث شامل... (مريض، موعد، كود)" 
              readOnly 
              style={{ cursor: 'pointer' }}
            />
            <span className="search-kbd-shortcut">Ctrl K</span>
          </div>

          <button className="theme-header-btn" onClick={toggleTheme} title="تبديل الوضع الليلي / الفاتح">
            {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
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
    </>
  );
};

export default React.memo(Header);
