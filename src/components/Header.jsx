import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = ({ title }) => {
  const { state } = useApp();
  const { user, clinic, role, switchRole } = useAuth();
  const navigate = useNavigate();
  const unreadCount = state.notifications?.filter(n => !n.read).length || 0;

  const displayName = role === 'secretary' ? 'أ/ سارة (الاستقبال)' : (clinic?.name || user?.user_metadata?.name || 'د. أحمد الشريف');
  const displaySpecialty = role === 'secretary' ? 'سكرتارية العيادة' : (clinic?.specialty || 'طبيب عام');
  const initial = role === 'secretary' ? 'س' : (displayName.charAt(0) || 'د');

  const toggleRole = () => {
    switchRole(role === 'doctor' ? 'secretary' : 'doctor');
  };

  return (
    <header className="header">
      <div className="header-title">
        <h1>{title}</h1>
      </div>

      <div className="header-actions">
        {/* Role Switcher Button */}
        <button 
          className="role-switcher-btn"
          onClick={toggleRole}
          title="اضغط للتبديل بين واجهة الطبيب وواجهة السكرتارية"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            background: role === 'doctor' ? 'rgba(27, 111, 227, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: role === 'doctor' ? '#1B6FE3' : '#10b981',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <span>{role === 'doctor' ? '👨‍⚕️ حساب: الطبيب' : '📋 حساب: السكرتارية'}</span>
          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>(تبديل)</span>
        </button>

        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="بحث..." />
        </div>

        <button className="notification-btn" onClick={() => navigate('/notifications')}>
          <Bell size={22} />
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>

        <div className="doctor-profile">
          <div className="avatar">{initial}</div>
          <div className="doctor-info">
            <span className="doctor-name">{displayName}</span>
            <span className="doctor-role">{displaySpecialty}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

