import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, CalendarDays, Users, Bell, Globe, Sun, Moon, 
  Stethoscope, LogOut, Smartphone, Bot, Receipt, Layers, 
  Package, UserCheck 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import './Sidebar.css';

const Sidebar = () => {
  const { state, toggleTheme } = useApp();
  const { signOut, user, role } = useAuth();
  const unreadCount = state.notifications?.filter(n => !n.read).length || 0;
  const isDoctor = (user?.role || role || 'doctor') === 'doctor';

  const clinicSpecialty = state.clinicInfo?.specialty || '';
  const isDental = !clinicSpecialty || clinicSpecialty.includes('أسنان') || clinicSpecialty.includes('Dental');
  const brandTitle = isDental ? 'كلينك فلو دنتال' : 'كلينك فلو ميديكال';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon-wrap">
          <Stethoscope size={22} />
        </div>
        <h2>{brandTitle}</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
          <LayoutDashboard size={19} />
          <span>لوحة التحكم</span>
        </NavLink>
        {hasPermission(user, 'appointments') && (
          <NavLink to="/appointments" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <CalendarDays size={19} />
            <span>المواعيد والتقويم</span>
          </NavLink>
        )}
        {hasPermission(user, 'patients') && (
          <NavLink to="/patients" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Users size={19} />
            <span>سجلات المرضى</span>
          </NavLink>
        )}
        {hasPermission(user, 'invoices') && (
          <NavLink to="/invoices" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Receipt size={19} />
            <span>الفوترة والتحصيل</span>
          </NavLink>
        )}
        {hasPermission(user, 'inventory') && (
          <NavLink to="/inventory" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Package size={19} />
            <span>المخزون والمستلزمات</span>
          </NavLink>
        )}
        {isDoctor && (
          <NavLink to="/doctor-agent" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Bot size={19} />
            <span>مساعد الطبيب الذكي</span>
          </NavLink>
        )}
        <NavLink to="/notifications" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Bell size={19} />
          <span>التنبيهات</span>
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </NavLink>
        {isDoctor && (
          <NavLink to="/settings" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Smartphone size={19} />
            <span>إدارة وإعدادات العيادة</span>
          </NavLink>
        )}
        <a href="/booking" target="_blank" rel="noreferrer" className="nav-item" title="معاينة وفتح صفحة الحجز العامة للمرضى في نافذة جديدة">
          <Globe size={19} />
          <span>بوابة الحجز (للمرضى)</span>
        </a>
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

export default React.memo(Sidebar);

