import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, Bell, Globe, Sun, Moon, Stethoscope, LogOut, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { state, toggleTheme } = useApp();
  const { signOut, user } = useAuth();
  const unreadCount = state.notifications?.filter(n => !n.read).length || 0;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Stethoscope size={28} className="logo-icon" />
        <h2>كلينك فلو</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
          <LayoutDashboard size={20} />
          <span>لوحة التحكم</span>
        </NavLink>
        <NavLink to="/appointments" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <CalendarDays size={20} />
          <span>المواعيد</span>
        </NavLink>
        <NavLink to="/patients" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Users size={20} />
          <span>المرضى</span>
        </NavLink>
        <NavLink to="/notifications" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Bell size={20} />
          <span>التنبيهات</span>
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </NavLink>
        <NavLink to="/settings" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Smartphone size={20} />
          <span>إعدادات SMS والربط</span>
        </NavLink>
        <NavLink to="/booking" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Globe size={20} />
          <span>صفحة الحجز</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme}>
          {state.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span>{state.theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>
        </button>
        {user && (
          <button className="logout-btn" onClick={handleSignOut} title="تسجيل الخروج">
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

