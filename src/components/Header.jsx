import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, LogOut, Menu, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import GlobalSearchModal from './GlobalSearchModal';
import TenantSwitcher from './TenantSwitcher';
import ReportIssueModal from './ReportIssueModal';
import ConfirmationModal from './ConfirmationModal';
import { isSupabaseConfigured } from '../lib/supabase';
import './Header.css';

const Header = ({ title, onOpenAiCopilot }) => {
  const { state, toggleTheme, setMobileNavOpen } = useApp();
  const { user, clinic, role, signOut } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const unreadCount = state.notifications?.filter(n => !n.read).length || 0;
  const isCloudConnected = isSupabaseConfigured();

  // Real Logged-in User Identity (strictly reflects logged-in user or active tenant doctor)
  const effectiveRole = user?.role || role || 'doctor';
  const isDoctor = effectiveRole === 'doctor' || effectiveRole === 'super_admin' || effectiveRole === 'multi_clinic_owner';
  const activeDoctorName = tenant?.doctorName || state.clinicInfo?.doctorName || clinic?.doctorName || tenant?.name || 'طبيب العيادة';
  const activeSpecialty = tenant?.specialty || state.clinicInfo?.specialty || clinic?.specialty || 'المدير الطبي';

  // Display user name: prioritize authenticated user name; fallback to active clinic doctor
  const rawName = user?.name 
    ? user.name 
    : (isDoctor ? activeDoctorName : 'موظف الاستقبال');
  const displayName = (isDoctor && rawName && !rawName.startsWith('د.')) ? `د. ${rawName}` : rawName;

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


  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="header">
        <div className="header-title-wrap">
          <button 
            type="button"
            className="mobile-menu-btn" 
            onClick={() => setMobileNavOpen(prev => !prev)}
            aria-label="تبديل القائمة الجانبية"
            title="القائمة"
          >
            <Menu size={20} />
          </button>
          <h1>{title}</h1>
          <TenantSwitcher />
        </div>

        <div className="header-actions">

          {/* Google Material 3 Global Search Trigger Bar */}
          <button 
            type="button" 
            className="search-bar" 
            onClick={() => setIsSearchOpen(true)} 
            title="بحث سريع وشامل (Ctrl + K)"
            aria-label="فتح نافذة البحث السريع والشامل"
          >
            <Search size={17} className="search-icon" aria-hidden="true" />
            <span className="search-placeholder">بحث في العيادة (اسم، هاتف، موعد)...</span>
            <span className="search-kbd-shortcut">Ctrl K</span>
          </button>

          <button 
            type="button"
            className="theme-header-btn" 
            onClick={toggleTheme} 
            title="تبديل الوضع الليلي / الفاتح"
            aria-label={state.theme === 'light' ? 'التحويل إلى الوضع الداكن' : 'التحويل إلى الوضع الفاتح'}
          >
            {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button 
            type="button"
            className="notification-btn" 
            onClick={() => navigate('/notifications')} 
            title="التنبيهات"
            aria-label={unreadCount > 0 ? `التنبيهات، لديك ${unreadCount} تنبيهات غير مقروءة` : 'التنبيهات'}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {/* Quick SaaS Admin Switcher Button (Super Admin Only) */}
          {(user?.role === 'super_admin' || user?.isSuperAdmin) && (
            <button 
              type="button" 
              className="btn-saas-header-switch"
              onClick={() => navigate('/super-admin')}
              title="الانتقال إلى لوحة تحكم إدارة الساس (SaaS Control Plane)"
              aria-label="الانتقال إلى لوحة تحكم إدارة الساس"
            >
              <ShieldCheck size={16} />
              <span>إدارة الساس</span>
            </button>
          )}

          {/* Unified Google-Style Profile Chip */}
          <div className="doctor-profile">
            <div className="avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(tenant?.logoUrl || tenant?.branding?.logoUrl || state.clinicInfo?.logoUrl) ? (
                <img 
                  src={tenant?.logoUrl || tenant?.branding?.logoUrl || state.clinicInfo?.logoUrl} 
                  alt="شعار العيادة" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initial
              )}
            </div>
            <div className="doctor-info">
              <span className="doctor-name">{displayName}</span>
              <span className="doctor-role">{displayRole}</span>
            </div>
            <button 
              type="button" 
              className="btn-logout-header"
              onClick={handleLogout}
              title="تسجيل الخروج من الحساب"
              aria-label="تسجيل الخروج من الحساب"
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

      {/* Logout Confirmation Modal (Item 15) */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title="تأكيد تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج من نظام كلينيك فلو؟"
        confirmText="تسجيل الخروج"
        cancelText="البقاء في النظام"
        isDestructive={false}
      />
    </>
  );
};

export default React.memo(Header);
