import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, Plus, ShieldCheck, 
  ExternalLink, AlertTriangle, Globe, LogOut, Server
} from 'lucide-react';
import { 
  getSystemErrors, 
  resolveSystemError, 
  clearSystemErrors, 
  getBugReports, 
  updateBugReportStatus 
} from '../../services/systemErrorService';
import {
  SaasStatsGrid,
  ClinicsTable,
  TelemetryBugsCenter,
  CreateClinicModal
} from './components';
import { saveRegisteredTenant, saveRegisteredUser } from '../../services/authService';
import { useApp } from '../../context/AppContext';
import DatabaseSyncTab from '../settings/DatabaseSyncTab';
import SmsConfigTab from '../settings/SmsConfigTab';
import AiAssistantConfigTab from '../settings/AiAssistantConfigTab';
import './SuperAdminDashboard.css';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state, dispatch } = useApp();
  const { allTenants, setAllTenants, switchTenant, updateTenantStatus } = useTenant();
  const [activeTab, setActiveTab] = useState('clinics'); // 'clinics' | 'telemetry_bugs' | 'infrastructure'
  const [infraSubTab, setInfraSubTab] = useState('database'); // 'database' | 'sms' | 'ai'
  const [systemErrors, setSystemErrors] = useState(getSystemErrors());
  const [bugReports, setBugReports] = useState(getBugReports());
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClinic, setNewClinic] = useState({
    name: '',
    doctorName: '',
    specialty: 'طب وجراحة الأسنان',
    phone: '01000000000',
    slug: '',
    subscriptionTier: 'pro'
  });

  // Calculate high-level platform stats
  const totalClinics = allTenants.length;
  const activeClinics = allTenants.filter(t => (t.subscriptionStatus || 'active') === 'active').length;
  const pendingClinics = allTenants.filter(t => t.subscriptionStatus === 'pending_approval').length;
  const suspendedClinics = allTenants.filter(t => t.subscriptionStatus === 'suspended').length;
  const totalSmsUsed = allTenants.reduce((sum, t) => sum + (t.quotas?.smsUsed || 0), 0);
  const totalSmsQuota = allTenants.reduce((sum, t) => sum + (t.quotas?.monthlySmsQuota || 1000), 0);
  const estimatedMRR = allTenants.reduce((sum, t) => {
    if (t.subscriptionStatus === 'suspended') return sum; // Exclude suspended from MRR
    const tier = t.subscriptionTier || 'pro';
    if (tier === 'enterprise') return sum + 3500;
    if (tier === 'pro') return sum + 1800;
    return sum + 850;
  }, 0);

  // Filtered tenants
  const filteredTenants = allTenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = tierFilter === 'all' || t.subscriptionTier === tierFilter;
    const currentStatus = t.subscriptionStatus || 'active';
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
    return matchesSearch && matchesTier && matchesStatus;
  });

  const handleApproveClinic = (slug) => {
    updateTenantStatus(slug, 'active');
  };

  const handleResolveError = (errorId) => {
    const updated = resolveSystemError(errorId);
    setSystemErrors([...updated]);
  };

  const handleClearErrors = () => {
    if (window.confirm('هل تريد مسح جميع سجلات الأعطال القديمة؟')) {
      clearSystemErrors();
      setSystemErrors([]);
    }
  };

  const handleUpdateBugStatus = (reportId, newStatus) => {
    const updated = updateBugReportStatus(reportId, newStatus);
    setBugReports([...updated]);
  };

  const handleSuspendClinic = (slug) => {
    const reason = window.prompt('سبب إيقاف العيادة وتعليق الاشتراك:', 'عدم سداد الاشتراك الدوري المستحق');
    if (reason !== null) {
      updateTenantStatus(slug, 'suspended', reason.trim() || 'عدم سداد الاشتراك الدوري المستحق');
    }
  };

  const handleReactivateClinic = (slug) => {
    updateTenantStatus(slug, 'active');
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

  const handleCreateClinic = (e) => {
    e.preventDefault();
    if (!newClinic.name || !newClinic.slug) return;

    const created = {
      id: `clinic_${Date.now()}`,
      name: newClinic.name,
      doctorName: newClinic.doctorName || 'دكتور معالج',
      specialty: newClinic.specialty,
      phone: newClinic.phone,
      slug: newClinic.slug.toLowerCase().replace(/\s+/g, '-'),
      subscriptionTier: newClinic.subscriptionTier,
      subscriptionStatus: 'active',
      branding: {
        primaryColor: newClinic.subscriptionTier === 'enterprise' ? '#7C3AED' : '#0071E3',
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

    setAllTenants(prev => [...prev, created]);
    setIsCreateModalOpen(false);
    setNewClinic({
      name: '',
      doctorName: '',
      specialty: 'طب وجراحة الأسنان',
      phone: '01000000000',
      slug: '',
      subscriptionTier: 'pro',
      doctorEmail: '',
      doctorPassword: ''
    });
  };

  const unresolvedIncidentsCount = 
    systemErrors.filter(e => e.status !== 'resolved').length + 
    bugReports.filter(b => b.status !== 'resolved').length;

  return (
    <div className="super-admin-layout" dir="rtl">
      {/* Top Bar */}
      <header className="super-admin-header">
        <div className="header-brand-group">
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

          <div className="header-title-text">
            <div className="platform-tag">
              <ShieldCheck size={14} />
              <span>Platform Control Plane</span>
            </div>
            <h1>إدارة منصة ClinicFlow B2B SaaS</h1>
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
            className={`saas-tab-btn ${activeTab === 'clinics' ? 'active-clinics' : ''}`}
          >
            <Building2 size={16} />
            <span>دليل العيادات والاشتراكات ({totalClinics})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('telemetry_bugs');
              setSystemErrors(getSystemErrors());
              setBugReports(getBugReports());
            }}
            className={`saas-tab-btn ${activeTab === 'telemetry_bugs' ? 'active-telemetry' : ''}`}
          >
            <AlertTriangle size={16} />
            <span>مركز الأعطال وبلاغات النظام ({unresolvedIncidentsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('infrastructure')}
            className={`saas-tab-btn ${activeTab === 'infrastructure' ? 'active-clinics' : ''}`}
          >
            <Server size={16} />
            <span>البنية السحابية والربط المركزي (Infrastructure)</span>
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
            pendingClinics={pendingClinics}
            suspendedClinics={suspendedClinics}
            copiedSlug={copiedSlug}
            onCopyLink={handleCopyLink}
            onApproveClinic={handleApproveClinic}
            onSuspendClinic={handleSuspendClinic}
            onReactivateClinic={handleReactivateClinic}
            onSwitchAndVisit={handleSwitchAndVisit}
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
            onUpdateBugStatus={handleUpdateBugStatus}
          />
        ) : (
          <div className="saas-infra-container" style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setInfraSubTab('database')}
                style={{
                  background: infraSubTab === 'database' ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: infraSubTab === 'database' ? '#FFFFFF' : 'var(--text-primary)',
                  border: 'none',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                قاعدة بيانات Supabase المركزية
              </button>
              <button
                type="button"
                onClick={() => setInfraSubTab('sms')}
                style={{
                  background: infraSubTab === 'sms' ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: infraSubTab === 'sms' ? '#FFFFFF' : 'var(--text-primary)',
                  border: 'none',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                بوابات الرسائل المركزية (SMS Gateways)
              </button>
              <button
                type="button"
                onClick={() => setInfraSubTab('ai')}
                style={{
                  background: infraSubTab === 'ai' ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: infraSubTab === 'ai' ? '#FFFFFF' : 'var(--text-primary)',
                  border: 'none',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                نماذج الذكاء الاصطناعي السريرية (AI Core)
              </button>
            </div>

            {infraSubTab === 'database' && (
              <DatabaseSyncTab state={state} dispatch={dispatch} />
            )}
            {infraSubTab === 'sms' && (
              <SmsConfigTab />
            )}
            {infraSubTab === 'ai' && (
              <AiAssistantConfigTab />
            )}
          </div>
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
    </div>
  );
}
