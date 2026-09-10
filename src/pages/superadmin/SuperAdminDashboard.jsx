import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, Plus, CreditCard, Activity, ShieldCheck, 
  ExternalLink, CheckCircle2, AlertTriangle, ArrowLeft, 
  Search, HardDrive, Copy, CheckCheck,
  AlertOctagon, Clock, Ban, Check, Bug, RefreshCw, Trash2, LogOut
} from 'lucide-react';
import { 
  getSystemErrors, 
  resolveSystemError, 
  clearSystemErrors, 
  getBugReports, 
  updateBugReportStatus 
} from '../../services/systemErrorService';
import './SuperAdminDashboard.css';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { allTenants, setAllTenants, switchTenant, updateTenantStatus } = useTenant();
  const [activeTab, setActiveTab] = useState('clinics'); // 'clinics' | 'telemetry_bugs'
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
    navigate('/');
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

    setAllTenants(prev => [...prev, created]);
    setIsCreateModalOpen(false);
    setNewClinic({
      name: '',
      doctorName: '',
      specialty: 'طب وجراحة الأسنان',
      phone: '01000000000',
      slug: '',
      subscriptionTier: 'pro'
    });
  };

  return (
    <div className="super-admin-layout" dir="rtl">
      {/* Top Bar */}
      <header className="super-admin-header">
        <div className="header-brand-group">
          <button onClick={() => navigate('/')} className="back-to-app-btn" title="العودة إلى العيادة">
            <ArrowLeft size={18} />
            <span>لوحة العيادة</span>
          </button>
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="super-admin-container">
        
        {/* KPI Cards */}
        <div className="saas-kpi-grid">
          <div className="saas-kpi-card">
            <div className="kpi-icon-wrap primary">
              <Building2 size={24} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">إجمالي العيادات المشتركة</span>
              <strong className="kpi-value">{totalClinics}</strong>
              <span className="kpi-subtext text-success">{activeClinics} عيادة نشطة حالياً</span>
            </div>
          </div>

          <div className="saas-kpi-card">
            <div className="kpi-icon-wrap success">
              <CreditCard size={24} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">العائد الشهري المتكرر (MRR)</span>
              <strong className="kpi-value">{estimatedMRR.toLocaleString()} ج.م</strong>
              <span className="kpi-subtext">نمو مستقر +18% هذا الشهر</span>
            </div>
          </div>

          <div className="saas-kpi-card">
            <div className="kpi-icon-wrap warning">
              <Activity size={24} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">استهلاك رسائل SMS للمنصة</span>
              <strong className="kpi-value">{totalSmsUsed.toLocaleString()} <span className="text-muted">/ {totalSmsQuota.toLocaleString()}</span></strong>
              <span className="kpi-subtext">نسبة الاستهلاك الإجمالي {Math.round((totalSmsUsed / (totalSmsQuota || 1)) * 100)}%</span>
            </div>
          </div>

          <div className="saas-kpi-card">
            <div className="kpi-icon-wrap purple">
              <HardDrive size={24} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">عزل البيانات وحصانة RLS</span>
              <strong className="kpi-value">100%</strong>
              <span className="kpi-subtext text-success">PostgreSQL Multi-Tenant Active</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('clinics')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'clinics' ? 'var(--primary, #0284c7)' : 'var(--bg-secondary, #ffffff)',
              color: activeTab === 'clinics' ? '#fff' : 'var(--text-secondary, #64748b)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'telemetry_bugs' ? '#ef4444' : 'var(--bg-secondary, #ffffff)',
              color: activeTab === 'telemetry_bugs' ? '#fff' : 'var(--text-secondary, #64748b)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <AlertTriangle size={16} />
            <span>مركز الأعطال وبلاغات النظام ({systemErrors.filter(e => e.status !== 'resolved').length + bugReports.filter(b => b.status !== 'resolved').length})</span>
          </button>
        </div>

        {activeTab === 'clinics' ? (
          /* Tenant Directory & Management */
          <div className="saas-section-card">
          <div className="section-card-header">
            <div>
              <h2>دليل المستأجرين والعيادات (Tenants Directory)</h2>
              <p>إدارة الخطط، الحصص التشغيلية، وعزل البيانات لكل عيادة على حدة</p>
            </div>

            <div className="section-header-filters">
              <div className="saas-search-box">
                <Search size={16} />
                <input 
                  id="SuperAdminTenantSearch"
                  name="tenantSearch"
                  aria-label="البحث في المستأجرين والعيادات"
                  type="text" 
                  placeholder="ابحث بالاسم، الطبيب، أو الـ Slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                id="SuperAdminTierFilter"
                name="tierFilter"
                aria-label="فلترة حسب باقة الاشتراك"
                value={tierFilter} 
                onChange={(e) => setTierFilter(e.target.value)}
                className="saas-filter-select"
              >
                <option value="all">كل الباقات</option>
                <option value="enterprise">مؤسسي Enterprise</option>
                <option value="pro">عيادة ذكية Pro</option>
                <option value="starter">أساسي Starter</option>
              </select>

              <select 
                id="SuperAdminStatusFilter"
                name="statusFilter"
                aria-label="فلترة حسب حالة العيادة والاشتراك"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="saas-filter-select"
                style={{ borderColor: statusFilter === 'suspended' ? '#f87171' : statusFilter === 'pending_approval' ? '#fbbf24' : undefined }}
              >
                <option value="all">كافة حالات العيادات</option>
                <option value="active">العيادات النشطة ({activeClinics})</option>
                <option value="pending_approval">قيد المراجعة والموافقة ({pendingClinics})</option>
                <option value="suspended">الموقوفة لعدم السداد ({suspendedClinics})</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="saas-table-wrapper">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>العيادة والمستأجر</th>
                  <th>الطبيب والتخصص</th>
                  <th>المسار المخصص (Slug)</th>
                  <th>باقة الاشتراك</th>
                  <th>حالة الاشتراك والترخيص</th>
                  <th>حصص التشغيل</th>
                  <th>إجراءات الإدارة والرقابة</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => {
                  const subStatus = t.subscriptionStatus || 'active';
                  const isSuspended = subStatus === 'suspended';
                  const isPending = subStatus === 'pending_approval';

                  return (
                    <tr key={t.slug || t.id} style={isSuspended ? { background: '#fef2f218' } : isPending ? { background: '#fffbeb18' } : {}}>
                      <td>
                        <div className="tenant-cell-brand">
                          <div 
                            className="tenant-badge-dot" 
                            style={{ backgroundColor: isSuspended ? '#ef4444' : isPending ? '#f59e0b' : (t.branding?.primaryColor || '#0071E3') }} 
                          />
                          <div>
                            <strong>{t.name}</strong>
                            {isSuspended && <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>{t.suspensionReason || 'موقوف لعدم السداد'}</div>}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="tenant-cell-doctor">
                          <span>{t.doctorName}</span>
                          <small>{t.specialty}</small>
                        </div>
                      </td>

                      <td>
                        <div className="tenant-cell-slug">
                          <code>/c/{t.slug}</code>
                          <button 
                            type="button" 
                            onClick={() => handleCopyLink(t.slug)}
                            className="btn-icon-copy"
                            title="نسخ رابط الحجز العام"
                          >
                            {copiedSlug === t.slug ? <CheckCheck size={14} color="#10B981" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>

                      <td>
                        <span className={`saas-tier-pill ${t.subscriptionTier || 'pro'}`}>
                          {t.subscriptionTier === 'enterprise' ? 'مؤسسي' : t.subscriptionTier === 'pro' ? 'برو ذكي' : 'أساسي'}
                        </span>
                      </td>

                      <td>
                        {isSuspended ? (
                          <span className="saas-status-pill suspended" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <AlertOctagon size={12} />
                            <span>موقوف لعدم السداد</span>
                          </span>
                        ) : isPending ? (
                          <span className="saas-status-pill pending" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <Clock size={12} />
                            <span>بانتظار الموافقة</span>
                          </span>
                        ) : (
                          <span className="saas-status-pill active" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <CheckCircle2 size={12} />
                            <span>نشط وساري</span>
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="tenant-cell-quota">
                          <span>SMS: {t.quotas?.smsUsed || 0}/{t.quotas?.monthlySmsQuota || 1000}</span>
                          <div className="quota-bar-mini">
                            <div 
                              className="quota-bar-fill" 
                              style={{ width: `${Math.min(100, Math.round(((t.quotas?.smsUsed || 0) / (t.quotas?.monthlySmsQuota || 1000)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="tenant-actions-cell" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isPending && (
                            <button 
                              type="button"
                              onClick={() => handleApproveClinic(t.slug)}
                              style={{ background: '#10B981', color: '#fff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="الموافقة على تسجيل العيادة وتفعيلها فوراً"
                            >
                              <Check size={13} />
                              <span>اعتماد العيادة</span>
                            </button>
                          )}

                          {!isSuspended ? (
                            <button 
                              type="button"
                              onClick={() => handleSuspendClinic(t.slug)}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="إيقاف العيادة فوراً لعدم سداد الاشتراك"
                            >
                              <Ban size={13} />
                              <span>إيقاف لعدم السداد</span>
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => handleReactivateClinic(t.slug)}
                              style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="إلغاء الإيقاف وإعادة تفعيل العيادة"
                            >
                              <CheckCircle2 size={13} />
                              <span>إعادة التفعيل</span>
                            </button>
                          )}

                          <button 
                            type="button"
                            className="btn-switch-tenant"
                            onClick={() => handleSwitchAndVisit(t.slug)}
                            title="التبديل إلى بيانات هذه العيادة فوراً"
                          >
                            <span>لوحة العيادة</span>
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <div className="saas-section-card">
            <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>مركز رصد الأعطال وبلاغات النظام (System Health & Bug Center)</h2>
                <p>استقبال تلقائي لكافة الأخطاء البرمجية والبلاغات من الأطباء والطاقم في كافة العيادات</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSystemErrors(getSystemErrors());
                    setBugReports(getBugReports());
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <RefreshCw size={14} />
                  <span>تحديث السجل</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearErrors}
                  className="btn btn-danger"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                >
                  <Trash2 size={14} />
                  <span>مسح السجلات</span>
                </button>
              </div>
            </div>

            {/* Sub-Section 1: User Bug Reports */}
            <div style={{ marginTop: '1.5rem', marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bug size={20} color="#0284c7" />
                <span>بلاغات الأطباء والمستخدمين ({bugReports.length})</span>
              </h3>

              {bugReports.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {bugReports.map(bug => (
                    <div key={bug.id} style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            background: bug.category === 'bug' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: bug.category === 'bug' ? '#ef4444' : '#0284c7',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {bug.category === 'bug' ? 'عطل برمجي' : bug.category === 'performance' ? 'بطء استجابة' : 'اقتراح / واجهة'}
                          </span>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{bug.title}</strong>
                        </div>
                        <select
                          value={bug.status}
                          onChange={(e) => handleUpdateBugStatus(bug.id, e.target.value)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.82rem',
                            fontWeight: 600
                          }}
                        >
                          <option value="open">قيد الانتظار (Open)</option>
                          <option value="in_progress">جاري التحقق (In Progress)</option>
                          <option value="resolved">تم الحل (Resolved)</option>
                        </select>
                      </div>

                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0, lineHeight: '1.6' }}>
                        {bug.description}
                      </p>

                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <span>العيادة: <strong>{bug.clinicName} ({bug.clinicId})</strong></span>
                        <span>الطبيب: <strong>{bug.doctorEmail}</strong></span>
                        <span>الصفحة: <code>{bug.path}</code></span>
                        <span>الوقت: {new Date(bug.createdAt).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-primary)', borderRadius: '12px', color: '#94a3b8' }}>
                  لا توجد بلاغات مرسلة من الأطباء حالياً. النظام يعمل بسلاسة تامة.
                </div>
              )}
            </div>

            {/* Sub-Section 2: Automated Runtime Exceptions */}
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="#ef4444" />
                <span>سجل الأعطال البرمجية والتشخيصية التلقائية ({systemErrors.length})</span>
              </h3>

              {systemErrors.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {systemErrors.map(err => (
                    <div key={err.id} style={{
                      background: 'var(--bg-primary)',
                      border: err.status === 'resolved' ? '1px solid var(--border-color)' : '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      opacity: err.status === 'resolved' ? 0.6 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            background: err.severity === 'critical' ? '#fee2e2' : '#fef3c7',
                            color: err.severity === 'critical' ? '#dc2626' : '#d97706',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {err.severity.toUpperCase()}
                          </span>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            background: 'var(--bg-secondary)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            color: '#0284c7'
                          }}>
                            {err.type}
                          </span>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{err.message}</strong>
                        </div>

                        {err.status !== 'resolved' ? (
                          <button
                            type="button"
                            onClick={() => handleResolveError(err.id)}
                            style={{
                              padding: '0.35rem 0.85rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#10b981',
                              color: '#fff',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            تعليم كـ محلول
                          </button>
                        ) : (
                          <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: 700 }}>✓ تم الحل</span>
                        )}
                      </div>

                      {err.stack && (
                        <pre style={{
                          background: '#0f172a',
                          color: '#f87171',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          overflowX: 'auto',
                          maxHeight: '120px',
                          direction: 'ltr',
                          textAlign: 'left'
                        }}>
                          {err.stack}
                        </pre>
                      )}

                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                        <span>كود العطل: <code>{err.id}</code></span>
                        <span>العيادة: <strong>{err.clinicId}</strong></span>
                        <span>المسار: <code>{err.path}</code></span>
                        <span>التاريخ: {new Date(err.timestamp).toLocaleString('ar-EG')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-primary)', borderRadius: '12px', color: '#94a3b8' }}>
                  لا توجد أي أعطال برمجية مسجلة في النظام. كافة العمليات مستقرة 100%.
                </div>
              )}
            </div>
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
      {isCreateModalOpen && (
        <div className="saas-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="saas-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3>تسجيل عيادة جديدة في المنصة (Provision Tenant)</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="close-modal-btn">✕</button>
            </div>

            <form onSubmit={handleCreateClinic} className="saas-modal-form">
              <div className="form-group">
                <label>اسم المركز أو العيادة *</label>
                <input 
                  type="text" 
                  placeholder="مثال: مجمع النخبة الطبي" 
                  value={newClinic.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewClinic(prev => ({ 
                      ...prev, 
                      name: val,
                      slug: prev.slug ? prev.slug : val.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')
                    }));
                  }}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>اسم الطبيب المدير</label>
                  <input 
                    type="text" 
                    placeholder="مثال: د. كريم محمود" 
                    value={newClinic.doctorName}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, doctorName: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>التخصص الطبي</label>
                  <input 
                    type="text" 
                    placeholder="مثال: طب الأطفال وحديثي الولادة" 
                    value={newClinic.specialty}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, specialty: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>المسار المخصص (URL Slug) *</label>
                  <input 
                    type="text" 
                    placeholder="el-nokhba" 
                    dir="ltr"
                    value={newClinic.slug}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, slug: e.target.value }))}
                    required
                  />
                  <small className="help-text">سيكون رابط الحجز: /c/{newClinic.slug || 'slug'}/booking</small>
                </div>

                <div className="form-group">
                  <label>باقة الاشتراك (Subscription Tier)</label>
                  <select 
                    value={newClinic.subscriptionTier}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, subscriptionTier: e.target.value }))}
                  >
                    <option value="starter">أساسي Starter (850 ج.م/شهر)</option>
                    <option value="pro">عيادة ذكية Pro (1,800 ج.م/شهر)</option>
                    <option value="enterprise">مؤسسي Enterprise (3,500 ج.م/شهر)</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn-confirm-provision">
                  تجهيز وحفظ العيادة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
