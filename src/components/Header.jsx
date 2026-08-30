import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, LogOut, UserCheck } from 'lucide-react';
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
        <div className="header-title">
          <h1>{title}</h1>
        </div>

        <div className="header-actions">
          {/* Active Logged-in Account Badge */}
          <div 
            className="logged-in-user-badge"
            title={`المستخدم المسجل حالياً: ${displayName} (${displayRole})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              background: role === 'doctor' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              color: role === 'doctor' ? 'var(--primary)' : 'var(--success)'
            }}
          >
            <UserCheck size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              {role === 'doctor' ? '' : ''} {displayName}
            </span>
            <span style={{ 
              fontSize: '0.7rem', 
              padding: '0.15rem 0.45rem', 
              borderRadius: '10px', 
              background: role === 'doctor' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              fontWeight: 600
            }}>
              {displayRole}
            </span>
          </div>

          {/* Interactive Global Search Trigger Bar */}
          <div className="search-bar" onClick={() => setIsSearchOpen(true)} title="بحث سريع (Ctrl + K)">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="بحث شامل... (مريض، موعد، سكرتير)" 
              readOnly 
              style={{ cursor: 'pointer' }}
            />
            <span className="search-kbd-shortcut">K</span>
          </div>

          <button className="theme-header-btn" onClick={toggleTheme} title="تبديل الوضع الليلي / الفاتح">
            {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button className="notification-btn" onClick={() => navigate('/notifications')} title="التنبيهات">
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {/* Profile & Logout Action */}
          <div className="doctor-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '0.3rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-md)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              <LogOut size={17} />
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

export default Header;
