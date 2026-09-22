import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant, getCombinedTenants } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, Plus, ShieldCheck, 
  ExternalLink, AlertTriangle, Globe, LogOut, Server, Users, MapPin
} from 'lucide-react';
import { 
  getSystemErrors, 
  resolveSystemError, 
  resolveAllSystemErrors,
  clearSystemErrors, 
  deleteSystemError,
  getBugReports, 
  updateBugReportStatus,
  deleteBugReport,
  clearBugReports 
} from '../../services/systemErrorService';
import {
  SaasStatsGrid,
  ClinicsTable,
  UsersTable,
  TelemetryBugsCenter,
  CreateClinicModal,
  CreateUserModal,
  EditUserModal,
  TopUpCreditsModal,
  SaasInfrastructureCenter,
  SaasBrandingModal,
  ClinicSubscriptionControlModal,
  SaasGeographicAnalytics
} from './components';
import { getSaaSBillingMetrics } from '../../services/saasSubscriptionPlansService';
import Breadcrumbs from '../../components/Breadcrumbs';
import { 
  saveRegisteredTenant, 
  saveRegisteredUser,
  getAllPlatformUsers,
  updateUserAccount,
  resetUserPassword,
  toggleUserAccountStatus,
  deleteUserAccount
} from '../../services/authService';
import { formatSenderId } from '../../services/smsService';
import { getClinicUsage } from '../../services/usageMeteringService';
import './SuperAdminDashboard.css';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { signOut, impersonateUser } = useAuth();
  const { allTenants: contextTenants, setAllTenants, switchTenant, updateTenantStatus, deleteTenant, updateTenantInfo, refreshTenants } = useTenant();
  const allTenants = contextTenants || [];
  const [activeTab, setActiveTab] = useState('clinics'); // 'clinics' | 'users' | 'telemetry_bugs' | 'infrastructure'
  const [systemErrors, setSystemErrors] = useState(getSystemErrors());
  const [bugReports, setBugReports] = useState(getBugReports());
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [selectedTopUpClinic, setSelectedTopUpClinic] = useState(null);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [selectedBrandingClinic, setSelectedBrandingClinic] = useState(null);
  const [isSubscriptionControlModalOpen, setIsSubscriptionControlModalOpen] = useState(false);
  const [selectedClinicForControl, setSelectedClinicForControl] = useState(null);

  // User accounts management state
  const [allUsers, setAllUsers] = useState(() => getAllPlatformUsers());
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userClinicFilter, setUserClinicFilter] = useState('all');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState(null);

  const [newClinic, setNewClinic] = useState({
    name: '',
    doctorName: '',
    specialty: 'طب وجراحة الأسنان',
    phone: '01000000000',
    slug: '',
    senderId: '',
    subscriptionTier: 'pro',
    doctorEmail: '',
    doctorPassword: ''
  });

  // Calculate high-level platform stats
  const totalClinics = allTenants.length;
  const activeClinics = allTenants.filter(t => (t.subscriptionStatus || 'active') === 'active').length;
  const lifetimeClinics = allTenants.filter(t => t.isLifetimeLicense || t.subscriptionStatus === 'lifetime').length;
  const pendingClinics = allTenants.filter(t => t.subscriptionStatus === 'pending_approval').length;
  const suspendedClinics = allTenants.filter(t => t.subscriptionStatus === 'suspended').length;
  const totalSmsUsed = allTenants.reduce((sum, t) => {
    const usage = getClinicUsage(t.id, t.quotas, t.subscriptionTier);
    return sum + (usage.smsUsed || 0);
  }, 0);
  const totalSmsQuota = allTenants.reduce((sum, t) => {
    const usage = getClinicUsage(t.id, t.quotas, t.subscriptionTier);
    return sum + (usage.totalSmsAllowed || usage.monthlySmsQuota || 1000);
  }, 0);
  const billingMetrics = getSaaSBillingMetrics(allTenants);
  const estimatedMRR = billingMetrics.mrr;

  // Filtered tenants with safe nil handling
  const cleanSearch = (searchTerm || '').trim().toLowerCase();
  const filteredTenants = allTenants.filter(t => {
    const nameStr = (t.name || '').toLowerCase();
    const doctorStr = (t.doctorName || '').toLowerCase();
    const slugStr = (t.slug || '').toLowerCase();
    const matchesSearch = !cleanSearch || nameStr.includes(cleanSearch) || doctorStr.includes(cleanSearch) || slugStr.includes(cleanSearch);
    const matchesTier = tierFilter === 'all' || t.subscriptionTier === tierFilter;
    const currentStatus = t.subscriptionStatus || 'active';
    let matchesStatus = statusFilter === 'all';
    if (!matchesStatus) {
      if (statusFilter === 'lifetime') {
        matchesStatus = currentStatus === 'lifetime' || Boolean(t.isLifetimeLicense);
      } else if (statusFilter === 'active') {
        matchesStatus = currentStatus === 'active';
      } else {
        matchesStatus = currentStatus === statusFilter;
      }
    }
    return matchesSearch && matchesTier && matchesStatus;
  });

  const handleRefreshAll = () => {
    if (refreshTenants) {
      refreshTenants();
    } else {
      const freshTenants = getCombinedTenants(true);
      setAllTenants(freshTenants);
    }
    const freshUsers = getAllPlatformUsers();
    setAllUsers(freshUsers);
  };

  const handleApproveClinic = (slug) => {
    updateTenantStatus(slug, 'active');
    handleRefreshAll();
  };

  const handleSuspendClinic = (slug) => {
    const reason = window.prompt('سبب إيقاف العيادة وتعليق الاشتراك:', 'عدم سداد الاشتراك الدوري المستحق');
    if (reason !== null) {
      updateTenantStatus(slug, 'suspended', reason.trim() || 'عدم سداد الاشتراك الدوري المستحق');
      handleRefreshAll();
    }
  };

  const handleReactivateClinic = (slug) => {
    updateTenantStatus(slug, 'active');
    handleRefreshAll();
  };

  const handleCopyLink = (slug) => {
    const link = `${window.location.origin}/c/${slug}/booking`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleSwitchAndVisit = (slug) => {
    switchTenant(slug);
    navigate('/dashboard');
  };

  // Keep platform tenants and users reactive to additions, storage events, BroadcastChannel, CustomEvent, and tab focus
  React.useEffect(() => {
    handleRefreshAll();
    const handleStorageChange = (e) => {
      if (!e || e.key === 'clinicflow_registered_tenants' || e.key === 'clinicflow_registered_users' || e.key === 'clinicflow_auth_user' || e.key === 'clinicflow_active_tenant_slug') {
        handleRefreshAll();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleRefreshAll);
    window.addEventListener('clinicflow_sync', handleRefreshAll);
    document.addEventListener('visibilitychange', handleRefreshAll);

    let channel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('clinicflow_tenants_sync');
        channel.onmessage = () => {
          handleRefreshAll();
        };
      } catch (channelErr) {
        console.warn('[SuperAdminDashboard] BroadcastChannel sync warning:', channelErr);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleRefreshAll);
      window.removeEventListener('clinicflow_sync', handleRefreshAll);
      document.removeEventListener('visibilitychange', handleRefreshAll);
      if (channel) {
        try { channel.close(); } catch (_) {}
      }
    };
  }, [activeTab]);

  const handleDeleteClinic = (slugOrId) => {
    const target = allTenants.find(t => t.slug === slugOrId || t.id === slugOrId);
    const clinicName = target?.name || slugOrId;
    if (window.confirm(`تحذير أمني: هل أنت متأكد من رغبتك في حذف عيادة (${clinicName}) نهائياً من المنصة؟\nسيتم إزالة كافة الحسابات والبيانات التابعة لها.`)) {
      deleteTenant(slugOrId);
      handleRefreshAll();
    }
  };

  const handleImpersonateUser = (targetUser) => {
    if (targetUser?.clinicSlug && targetUser.clinicSlug !== '*') {
      switchTenant(targetUser.clinicSlug);
    }
    if (impersonateUser) {
      impersonateUser(targetUser);
      navigate('/dashboard');
    }
  };

  const handleOpenEditUser = (targetUser) => {
    setSelectedUserToEdit(targetUser);
    setIsEditUserModalOpen(true);
  };

  const handleOpenResetPassword = (targetUser) => {
    const newPass = window.prompt(`إدخال كلمة مرور جديدة لحساب (${targetUser.name}):`, '');
    if (newPass && newPass.trim()) {
      resetUserPassword(targetUser.id, newPass.trim());
      setAllUsers(getAllPlatformUsers());
      alert(`تم تحديث كلمة مرور (${targetUser.name}) بنجاح!`);
    }
  };

  const handleToggleUserStatus = (userId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    toggleUserAccountStatus(userId, nextStatus);
    setAllUsers(getAllPlatformUsers());
  };

  const handleDeleteUser = (userId) => {
    const target = allUsers.find(u => u.id === userId);
    const name = target?.name || userId;
    if (window.confirm(`تحذير أمني: هل أنت متأكد من رغبتك في حذف حساب (${name}) نهائياً من المنصة؟`)) {
      deleteUserAccount(userId);
      setAllUsers(getAllPlatformUsers());
    }
  };

  const handleCreateUser = (userData) => {
    saveRegisteredUser(userData);
    setAllUsers(getAllPlatformUsers());
    setIsCreateUserModalOpen(false);
  };

  const handleUpdateUser = (userId, updates) => {
    updateUserAccount(userId, updates);
    setAllUsers(getAllPlatformUsers());
    setIsEditUserModalOpen(false);
    setSelectedUserToEdit(null);
  };

  const handleDirectResetPassword = (userId, newPassword) => {
    resetUserPassword(userId, newPassword);
    setAllUsers(getAllPlatformUsers());
  };


  const handleCreateClinic = (e) => {
    e.preventDefault();
    if (!newClinic.name || !newClinic.slug) return;

    const resolvedSenderId = newClinic.senderId?.trim() 
      ? formatSenderId(newClinic.senderId, 'ClinicFlow')
      : '';

    const created = {
      id: `clinic_${Date.now()}`,
      name: newClinic.name,
      doctorName: newClinic.doctorName || 'دكتور معالج',
      specialty: newClinic.specialty,
      phone: newClinic.phone,
      slug: newClinic.slug.toLowerCase().replace(/\s+/g, '-'),
      senderId: resolvedSenderId,
      subscriptionTier: newClinic.subscriptionTier,
      subscriptionStatus: 'active',
      branding: {
        primaryColor: newClinic.subscriptionTier === 'enterprise' ? '#10B981' : '#09090B',
        accentColor: '#10B981',
        badgeText: newClinic.specialty
      },
      quotas: {
        maxDoctors: newClinic.subscriptionTier === 'enterprise' ? 10 : 3,
        monthlySmsQuota: newClinic.subscriptionTier === 'enterprise' ? 5000 : 2000,
        smsUsed: 0,
        aiTokensQuota: 10000000,
        aiTokensUsed: 0
      },
      services: [
        { id: '1', name: 'كشف وفحص تشخيصي أولي', price: '300 ج.م', duration: 30 }
      ]
    };

    // 1. Persist tenant to persistent storage (localStorage)
    saveRegisteredTenant(created);

    // 2. If doctor credentials provided, persist doctor user account for login
    if (newClinic.doctorEmail && newClinic.doctorPassword) {
      saveRegisteredUser({
        id: `doc-${created.id}`,
        name: newClinic.doctorName || 'دكتور العيادة',
        email: newClinic.doctorEmail.toLowerCase().trim(),
        phone: newClinic.phone || '',
        password: newClinic.doctorPassword,
        role: 'doctor',
        isClinicOwner: true,
        jobTitle: newClinic.specialty || 'المدير الطبي واستشاري العيادة',
        clinicId: created.id,
        clinicSlug: created.slug,
        allowedClinics: [created.slug],
        permissions: ['*'],
        authenticatedAt: new Date().toISOString()
      });
    }

    handleRefreshAll();
    setIsCreateModalOpen(false);
    setNewClinic({
      name: '',
      doctorName: '',
      specialty: 'طب وجراحة الأسنان',
      phone: '01000000000',
      slug: '',
      senderId: '',
      subscriptionTier: 'pro',
      doctorEmail: '',
      doctorPassword: ''
    });
  };

  // Telemetry and Bug Report Handlers
  const handleClearErrors = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح كافة سجلات الأعطال البرمجية والتشخيصية من النظام؟')) {
      clearSystemErrors();
      setSystemErrors([]);
    }
  };

  const handleResolveError = (errorId) => {
    const updated = resolveSystemError(errorId);
    setSystemErrors([...updated]);
  };

  const handleResolveAllErrors = () => {
    const updated = resolveAllSystemErrors();
    setSystemErrors([...updated]);
  };

  const handleDeleteError = (errorId) => {
    const updated = deleteSystemError(errorId);
    setSystemErrors([...updated]);
  };

  const handleUpdateBugStatus = (bugId, newStatus) => {
    const updated = updateBugReportStatus(bugId, newStatus);
    setBugReports([...updated]);
  };

  const handleDeleteBug = (bugId) => {
    const updated = deleteBugReport(bugId);
    setBugReports([...updated]);
  };

  const handleClearBugs = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح كافة بلاغات المستخدمين من المنصة؟')) {
      clearBugReports();
      setBugReports([]);
    }
  };

  const unresolvedIncidentsCount = 
    systemErrors.filter(e => e.status !== 'resolved').length + 
    bugReports.filter(b => b.status !== 'resolved').length;

  return (
    <div className="super-admin-layout" dir="rtl">
      {/* Top Bar */}
      <header className="super-admin-header">
        <div className="header-brand-group">
          <div className="header-title-text">
            <div className="platform-tag">
              <ShieldCheck size={14} />
              <span>Platform Control Plane</span>
            </div>
            <h1>إدارة منصة ClinicFlow B2B SaaS</h1>
          </div>

          <div className="header-nav-shortcuts">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="back-to-app-btn clinic-portal-btn" 
              title="معاينة بوابة العيادات والأطباء (Client Clinics Portal)"
            >
              <Building2 size={16} />
              <span>بوابة العيادات</span>
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="back-to-app-btn landing-portal-btn" 
              title="زيارة الصفحة الرئيسية العامة للموقع"
            >
              <Globe size={16} />
              <span>الموقع العام</span>
            </button>
            <button 
              onClick={() => window.open('/booking', '_blank')} 
              className="back-to-app-btn booking-portal-btn" 
              title="فتح بوابة حجز واستعلام المرضى في نافذة جديدة"
            >
              <ExternalLink size={15} />
              <span>بوابة المرضى</span>
            </button>
          </div>
        </div>

        <div className="header-action-group">
          <button 
            type="button" 
            className="btn-create-tenant"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} />
            <span>تسجيل عيادة جديدة (Provision Tenant)</span>
          </button>
          <button
            type="button"
            className="btn-superadmin-logout"
            onClick={async () => {
              if (signOut) await signOut();
              navigate('/login');
            }}
            title="تسجيل الخروج من لوحة التحكم"
          >
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="super-admin-container">
        <Breadcrumbs />
        {/* KPI Cards Grid */}
        <SaasStatsGrid 
          totalClinics={totalClinics}
          activeClinics={activeClinics}
          estimatedMRR={estimatedMRR}
          totalSmsUsed={totalSmsUsed}
          totalSmsQuota={totalSmsQuota}
        />

        {/* Navigation Tabs */}
        <div className="saas-tabs-nav">
          <button
            type="button"
            onClick={() => setActiveTab('clinics')}
            className={`saas-tab-btn ${activeTab === 'clinics' ? 'active-tab' : ''}`}
          >
            <Building2 size={16} />
            <span>دليل العيادات والاشتراكات ({totalClinics})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              setAllUsers(getAllPlatformUsers());
            }}
            className={`saas-tab-btn ${activeTab === 'users' ? 'active-tab' : ''}`}
          >
            <Users size={16} />
            <span>حسابات العملاء والمستخدمين ({allUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('telemetry_bugs');
              setSystemErrors(getSystemErrors());
              setBugReports(getBugReports());
            }}
            className={`saas-tab-btn ${activeTab === 'telemetry_bugs' ? 'active-tab active-telemetry' : ''}`}
          >
            <AlertTriangle size={16} />
            <span>مركز الأعطال وبلاغات النظام ({unresolvedIncidentsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('infrastructure')}
            className={`saas-tab-btn ${activeTab === 'infrastructure' ? 'active-tab' : ''}`}
          >
            <Server size={16} />
            <span>البنية السحابية والربط المركزي (Infrastructure)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('geographic')}
            className={`saas-tab-btn ${activeTab === 'geographic' ? 'active-tab' : ''}`}
          >
            <MapPin size={16} />
            <span>الانتشار والمواقع الجغرافية (Geo Analytics)</span>
          </button>
        </div>

        {activeTab === 'clinics' ? (
          <ClinicsTable
            filteredTenants={filteredTenants}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            tierFilter={tierFilter}
            setTierFilter={setTierFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            activeClinics={activeClinics}
            lifetimeClinics={lifetimeClinics}
            pendingClinics={pendingClinics}
            suspendedClinics={suspendedClinics}
            copiedSlug={copiedSlug}
            onCopyLink={handleCopyLink}
            onApproveClinic={handleApproveClinic}
            onSuspendClinic={handleSuspendClinic}
            onReactivateClinic={handleReactivateClinic}
            onSwitchAndVisit={handleSwitchAndVisit}
            onTopUpClinic={(clinic) => {
              setSelectedTopUpClinic(clinic);
              setIsTopUpModalOpen(true);
            }}
            onCustomizeBrand={(clinic) => {
              setSelectedBrandingClinic(clinic);
              setIsBrandingModalOpen(true);
            }}
            onManageSubscription={(clinic) => {
              setSelectedClinicForControl(clinic);
              setIsSubscriptionControlModalOpen(true);
            }}
            onDeleteClinic={handleDeleteClinic}
            onRefresh={handleRefreshAll}
          />
        ) : activeTab === 'users' ? (
          <UsersTable
            users={allUsers}
            searchTerm={userSearchTerm}
            setSearchTerm={setUserSearchTerm}
            roleFilter={userRoleFilter}
            setRoleFilter={setUserRoleFilter}
            statusFilter={userStatusFilter}
            setStatusFilter={setUserStatusFilter}
            clinicFilter={userClinicFilter}
            setClinicFilter={setUserClinicFilter}
            allTenants={allTenants}
            onImpersonate={handleImpersonateUser}
            onEdit={handleOpenEditUser}
            onResetPassword={handleOpenResetPassword}
            onToggleStatus={handleToggleUserStatus}
            onDelete={handleDeleteUser}
            onOpenCreate={() => setIsCreateUserModalOpen(true)}
            onRefresh={handleRefreshAll}
          />
        ) : activeTab === 'telemetry_bugs' ? (
          <TelemetryBugsCenter
            systemErrors={systemErrors}
            bugReports={bugReports}
            onRefresh={() => {
              setSystemErrors(getSystemErrors());
              setBugReports(getBugReports());
            }}
            onClearErrors={handleClearErrors}
            onResolveError={handleResolveError}
            onResolveAllErrors={handleResolveAllErrors}
            onDeleteError={handleDeleteError}
            onUpdateBugStatus={handleUpdateBugStatus}
            onDeleteBug={handleDeleteBug}
            onClearBugs={handleClearBugs}
          />
        ) : activeTab === 'geographic' ? (
          <SaasGeographicAnalytics allTenants={allTenants} />
        ) : (
          <SaasInfrastructureCenter allTenants={allTenants} />
        )}

        {/* Security & Architectural Invariants */}
        <div className="saas-security-banner">
          <ShieldCheck size={28} className="shield-icon" />
          <div>
            <h3>حصانة أمن البيانات عبر PostgreSQL RLS</h3>
            <p>
              يتم عزل كافة السجلات الطبية، المواعيد، الفواتير، وحسابات الطاقم تلقائياً عبر مفتاح العيادة 
              <code>clinic_id</code>. لا يمكن لمستخدم أو مريض من عيادة الاطلاع على سجلات عيادة أخرى بأي طريقة.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Create Tenant */}
      <CreateClinicModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        newClinic={newClinic}
        setNewClinic={setNewClinic}
        onSubmit={handleCreateClinic}
      />

      {/* Modal: Top-up Tenant Credits */}
      <TopUpCreditsModal
        isOpen={isTopUpModalOpen}
        onClose={() => {
          setIsTopUpModalOpen(false);
          setSelectedTopUpClinic(null);
        }}
        clinic={selectedTopUpClinic}
        onSuccess={() => {
          handleRefreshAll();
        }}
      />

      {/* Modal: Create User Account */}
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSubmit={handleCreateUser}
        allTenants={allTenants}
      />

      {/* Modal: Edit User Account */}
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUserToEdit(null);
        }}
        user={selectedUserToEdit}
        onSubmit={handleUpdateUser}
        onResetPassword={handleDirectResetPassword}
        allTenants={allTenants}
      />

      {/* Modal: SaaS Clinic Branding & Logo Customizer */}
      <SaasBrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => {
          setIsBrandingModalOpen(false);
          setSelectedBrandingClinic(null);
        }}
        clinic={selectedBrandingClinic}
        onSave={async (clinicIdOrSlug, brandingUpdates) => {
          if (updateTenantInfo) {
            updateTenantInfo({
              id: clinicIdOrSlug,
              slug: clinicIdOrSlug,
              ...brandingUpdates
            });
          }
          handleRefreshAll();
        }}
      />

      {/* Modal: Clinic Lifecycle & Subscription Control */}
      <ClinicSubscriptionControlModal
        isOpen={isSubscriptionControlModalOpen}
        onClose={() => {
          setIsSubscriptionControlModalOpen(false);
          setSelectedClinicForControl(null);
        }}
        clinic={selectedClinicForControl}
        onSuccess={(updates) => {
          if (selectedClinicForControl && updates) {
            updateTenantInfo({
              id: selectedClinicForControl.id,
              slug: selectedClinicForControl.slug,
              ...updates
            });
          }
          handleRefreshAll();
        }}
      />
    </div>
  );
}
