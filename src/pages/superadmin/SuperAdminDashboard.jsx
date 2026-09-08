import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { 
  Building2, Plus, Users, CreditCard, Activity, ShieldCheck, 
  ExternalLink, CheckCircle2, AlertTriangle, ArrowRight, 
  Search, Sliders, HardDrive, BarChart3, Copy, CheckCheck
} from 'lucide-react';
import './SuperAdminDashboard.css';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { allTenants, setAllTenants, switchTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
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
  const totalSmsUsed = allTenants.reduce((sum, t) => sum + (t.quotas?.smsUsed || 0), 0);
  const totalSmsQuota = allTenants.reduce((sum, t) => sum + (t.quotas?.monthlySmsQuota || 1000), 0);
  const estimatedMRR = allTenants.reduce((sum, t) => {
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
    return matchesSearch && matchesTier;
  });

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
            <ArrowRight size={18} />
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

        {/* Tenant Directory & Management */}
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
                  type="text" 
                  placeholder="ابحث بالاسم، الطبيب، أو الـ Slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                value={tierFilter} 
                onChange={(e) => setTierFilter(e.target.value)}
                className="saas-filter-select"
              >
                <option value="all">كل الباقات</option>
                <option value="enterprise">مؤسسي Enterprise</option>
                <option value="pro">عيادة ذكية Pro</option>
                <option value="starter">أساسي Starter</option>
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
                  <th>الحالة</th>
                  <th>حصص التشغيل</th>
                  <th>إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => (
                  <tr key={t.slug || t.id}>
                    <td>
                      <div className="tenant-cell-brand">
                        <div 
                          className="tenant-badge-dot" 
                          style={{ backgroundColor: t.branding?.primaryColor || '#0071E3' }} 
                        />
                        <strong>{t.name}</strong>
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
                      <span className="saas-status-pill active">
                        <CheckCircle2 size={12} />
                        <span>نشط</span>
                      </span>
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
                      <div className="tenant-actions-cell">
                        <button 
                          type="button"
                          className="btn-switch-tenant"
                          onClick={() => handleSwitchAndVisit(t.slug)}
                          title="التبديل إلى بيانات هذه العيادة فوراً"
                        >
                          <span>إدارة العيادة</span>
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
