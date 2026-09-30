import React, { useState } from 'react';
import { 
  Crown, TrendingUp, DollarSign, CheckCircle2, ShieldAlert, ShieldCheck,
  Layers, Sliders, Plus, RotateCcw, Trash2, Edit3, Search, 
  Lock, AlertTriangle, PlayCircle, PauseCircle, Check
} from 'lucide-react';
import {
  getSaaSSubscriptionPlans,
  saveSaaSSubscriptionPlan,
  deleteSaaSSubscriptionPlan,
  resetSaaSSubscriptionPlansToDefaults,
  getSaaSBillingMetrics,
  updateClinicSubscriptionDetails
} from '../../../../services/saasSubscriptionPlansService';
import { getClinicUsage } from '../../../../services/usageMeteringService';
import EditPlanTierModal from '../EditPlanTierModal';
import ClinicSubscriptionControlModal from '../ClinicSubscriptionControlModal';

export function SubscriptionPlansTab({ 
  allTenants = [], 
  updateTenantInfo, 
  updateTenantStatus, 
  refreshTenants 
}) {
  const [plans, setPlans] = useState(() => getSaaSSubscriptionPlans());
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [selectedPlanToEdit, setSelectedPlanToEdit] = useState(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [selectedTenantToControl, setSelectedTenantToControl] = useState(null);
  const [clinicSubSearch, setClinicSubSearch] = useState('');
  const [clinicSubStatusFilter, setClinicSubStatusFilter] = useState('all');

  const billingMetrics = getSaaSBillingMetrics(allTenants);

  const handleOpenEditPlan = (plan) => {
    setSelectedPlanToEdit(plan);
    setIsEditPlanModalOpen(true);
  };

  const handleCreateNewPlan = () => {
    setSelectedPlanToEdit(null);
    setIsEditPlanModalOpen(true);
  };

  const handleSavePlan = (planData) => {
    saveSaaSSubscriptionPlan(planData);
    setPlans(getSaaSSubscriptionPlans());
    setIsEditPlanModalOpen(false);
    setSelectedPlanToEdit(null);
  };

  const handleDeletePlan = (planId) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الباقة المخصصة نهائياً؟')) {
      deleteSaaSSubscriptionPlan(planId);
      setPlans(getSaaSSubscriptionPlans());
    }
  };

  const handleResetPlans = () => {
    if (window.confirm('هل أنت متأكد من استعادة الباقات المصنعية الافتراضية (Starter, Pro, Enterprise)؟')) {
      const reset = resetSaaSSubscriptionPlansToDefaults();
      setPlans(reset);
    }
  };

  const handleOpenControlClinic = (tenant) => {
    setSelectedTenantToControl(tenant);
    setIsControlModalOpen(true);
  };

  const handleQuickToggleSuspend = (tenant) => {
    const isSuspended = tenant.subscriptionStatus === 'suspended';
    if (isSuspended) {
      updateClinicSubscriptionDetails(tenant.id, {
        subscriptionStatus: 'active'
      });
      if (updateTenantStatus) updateTenantStatus(tenant.id, 'active');
      if (refreshTenants) refreshTenants();
      alert(`تم فك تجميد وتفعيل عيادة (${tenant.name}) بنجاح!`);
    } else {
      const reason = window.prompt('سبب تجميد وإيقاف العيادة:', 'عدم سداد الاشتراك الدوري المستحق');
      if (reason !== null) {
        const cleanReason = reason.trim() || 'عدم سداد الاشتراك الدوري المستحق';
        updateClinicSubscriptionDetails(tenant.id, {
          subscriptionStatus: 'suspended',
          suspensionReason: cleanReason
        });
        if (updateTenantStatus) updateTenantStatus(tenant.id, 'suspended', cleanReason);
        if (refreshTenants) refreshTenants();
        alert(`تم تجميد عيادة (${tenant.name}) بنجاح ومنع الوصول حتى التسوية.`);
      }
    }
  };

  const _handleUpgradeTier = (tenantId, newTier) => {
    updateClinicSubscriptionDetails(tenantId, { subscriptionTier: newTier });
    if (updateTenantInfo) {
      updateTenantInfo(tenantId, { subscriptionTier: newTier });
    }
    if (refreshTenants) refreshTenants();
  };

  return (
    <div className="infra-content-pane">
      {/* SaaS Billing & Financial Health KPI Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        {/* Lifetime Portals Buyout Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid #FDE68A', borderRadius: '12px', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '3px', background: 'linear-gradient(90deg, #F59E0B, #D97706)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 700 }}>شراء وتراخيص مدى الحياة</span>
            <Crown size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
            {billingMetrics.lifetimeCount || 0} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>بورتال دائم</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 700, marginTop: '0.25rem' }}>
            {(billingMetrics.totalLifetimeRevenue || 0).toLocaleString()} ج.م إجمالي عوائد الشراء
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>الدخل الشهري (MRR)</span>
            <TrendingUp size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {billingMetrics.mrr.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ج.م/شهر</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: '0.25rem' }}>
            مبني على الاشتراكات النشطة
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>الدخل السنوي المتوقع (ARR)</span>
            <DollarSign size={16} color="#3B82F6" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {billingMetrics.arr.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ج.م/سنة</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            إجمالي الإيراد السنوي المستهدف
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>العيادات النشطة والمدفوعة</span>
            <CheckCircle2 size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
            {billingMetrics.activePayingCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>عيادة</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            سارية ومفعلة بالكامل
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>الموقوفة والمجمدة (Suspended)</span>
            <ShieldAlert size={16} color="#EF4444" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: billingMetrics.suspendedCount > 0 ? '#DC2626' : 'var(--text-primary)' }}>
            {billingMetrics.suspendedCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>عيادة</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: billingMetrics.suspendedCount > 0 ? '#DC2626' : 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>
            {billingMetrics.suspendedCount > 0 ? 'معطلة لعدم السداد / بانتظار التحصيل' : 'لا توجد عيادات موقوفة'}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>اشتراكات مدى الحياة</span>
            <Crown size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
            {billingMetrics.lifetimeCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>عيادة</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            شراء دائم وترخيص كامل
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>متوسط الإيراد (ARPU)</span>
            <Layers size={16} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {billingMetrics.arpu.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ج.م</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            لكل عيادة مشتركة شهرياً
          </div>
        </div>
      </div>

      {/* Section 1: SaaS Plans & Tiering Studio */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Sliders size={20} color="#007AFF" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                استوديو هندسة وتعديل باقات الساس (SaaS Pricing & Tiering Studio)
              </h3>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              أنت المتحكم الكامل في المنصة: اضبط أسعار الباقات، عدّل حصص رسائل الـ SMS، حدد عدد الأطباء المسموح، وفعل/عطل الميزات لكل خطة.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCreateNewPlan}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                borderRadius: '8px',
                padding: '0.5rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              <Plus size={15} />
              <span>+ إنشاء باقة مخصصة جديدة (Custom Plan)</span>
            </button>

            <button
              type="button"
              onClick={handleResetPlans}
              className="btn btn-secondary"
              title="استعادة الباقات والأسعار الأصلية المعتمدة"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.82rem'
              }}
            >
              <RotateCcw size={14} />
              <span>إعادة ضبط للافتراضي</span>
            </button>
          </div>
        </div>

        {/* Dynamic Plan Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {plans.map((plan) => {
            const isPro = plan.id === 'pro';
            const isEnterprise = plan.id === 'enterprise';
            const isCustom = !['starter', 'pro', 'enterprise'].includes(plan.id);
            const activeClinicsCount = allTenants.filter(t => (t.subscriptionTier || 'pro') === plan.id).length;

            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--bg-secondary, #F9FAFB)',
                  border: isPro ? '2px solid #2563EB' : isEnterprise ? '2px solid #7C3AED' : '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: isPro ? '0 10px 25px -5px rgba(37, 99, 235, 0.1)' : 'none'
                }}
              >
                {plan.badge && (
                  <div style={{
                    position: 'absolute',
                    top: '-11px',
                    left: '16px',
                    background: isPro ? '#2563EB' : isEnterprise ? '#7C3AED' : '#52525B',
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.65rem',
                    borderRadius: '999px',
                    letterSpacing: '0.3px'
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div>
                  {/* Plan Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)', display: 'block' }}>
                        {plan.name}
                      </strong>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        ID: {plan.id} ({plan.nameEn})
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#2563EB',
                      whiteSpace: 'nowrap'
                    }}>
                      {activeClinicsCount} عيادة مشتركة
                    </span>
                  </div>

                  {/* Pricing Display */}
                  <div style={{
                    background: 'var(--surface)',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline'
                  }}>
                    <div>
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {Number(plan.monthlyPrice || 0).toLocaleString()} ج.م
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
                        / شهرياً
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      سنوي: <strong style={{ color: 'var(--text-primary)' }}>{Number(plan.annualPrice || (plan.monthlyPrice * 10)).toLocaleString()} ج.م</strong>
                    </div>
                  </div>

                  {/* Limits & Quotas */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ background: 'var(--surface)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>الأطباء المعتمدين:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{plan.maxDoctors} طبيب</strong>
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>رصيد SMS شهري:</span>
                      <strong style={{ color: Number(plan.monthlySmsQuota || 0) > 0 ? '#059669' : '#9CA3AF' }}>
                        {Number(plan.monthlySmsQuota || 0) > 0 ? `${Number(plan.monthlySmsQuota).toLocaleString()} رسالة` : 'غير مشمول'}
                      </strong>
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>أقصى مواعيد / شهر:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{Number(plan.maxAppointmentsPerMonth || 1000).toLocaleString()}</strong>
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>سجلات المرضى:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{Number(plan.maxPatients || 5000).toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
                    {[
                      { key: 'aiAssistant', label: 'المساعد الطبي الذكي (AI Core)' },
                      { key: 'customDomain', label: 'دومين مخصص وشهادة SSL' },
                      { key: 'multiBranch', label: 'شبكة فروع متعددة (Multi-Branch)' },
                      { key: 'labModule', label: 'موديول المعامل والتحاليل' },
                      { key: 'inventoryModule', label: 'إدارة المخزن والأدوية' },
                      { key: 'dentalChart', label: 'مخطط الأسنان المتطور' }
                    ].map(feat => {
                      const enabled = Boolean(plan[feat.key]);
                      return (
                        <div key={feat.key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: enabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          <Check size={13} color={enabled ? '#059669' : '#D1D5DB'} />
                          <span style={{ textDecoration: enabled ? 'none' : 'line-through', opacity: enabled ? 1 : 0.6 }}>
                            {feat.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditPlan(plan)}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      padding: '0.45rem',
                      borderRadius: '8px'
                    }}
                  >
                    <Edit3 size={14} />
                    <span>تعديل الباقة والأسعار</span>
                  </button>

                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="btn btn-secondary"
                      title="حذف هذه الباقة المخصصة"
                      style={{
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
                        borderColor: '#FCA5A5',
                        color: '#DC2626'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Clinics Subscriptions & Freeze/Suspend Control Table */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.5rem',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#10B981" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                جدول اشتراكات العيادات والتحكم الفوري (Clinic Lifecycle & Suspension Hub)
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              تجميد العيادة فورياً عند تأخر السداد، تمديد الاشتراك، رفع الحصص، أو تغيير الباقة بنقرة واحدة.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="بحث باسم العيادة أو الطبيب..."
                value={clinicSubSearch}
                onChange={(e) => setClinicSubSearch(e.target.value)}
                className="input-field"
                style={{
                  padding: '0.4rem 2rem 0.4rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  width: '210px'
                }}
              />
            </div>

            <select
              value={clinicSubStatusFilter}
              onChange={(e) => setClinicSubStatusFilter(e.target.value)}
              className="input-field"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.82rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}
            >
              <option value="all">كافة الحالات</option>
              <option value="active">نشط (Active)</option>
              <option value="lifetime">ترخيص مدى الحياة (Lifetime)</option>
              <option value="suspended">موقوف ومجمد (Suspended)</option>
              <option value="grace_period">مهلة سداد (Grace)</option>
            </select>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="saas-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>العيادة والمستأجر</th>
                <th>الباقة الحالية</th>
                <th>حالة الاشتراك</th>
                <th>استهلاك الـ SMS والحصة</th>
                <th>سبب الوقف / الملاحظات</th>
                <th>إجراءات التحكم والوقف</th>
              </tr>
            </thead>
            <tbody>
              {allTenants
                .filter((t) => {
                  const matchSearch = !clinicSubSearch ||
                    (t.name || '').toLowerCase().includes(clinicSubSearch.toLowerCase()) ||
                    (t.doctorName || '').toLowerCase().includes(clinicSubSearch.toLowerCase()) ||
                    (t.slug || '').toLowerCase().includes(clinicSubSearch.toLowerCase());
                  const status = t.subscriptionStatus || 'active';
                  const isLifetime = Boolean(t.isLifetimeLicense || status === 'lifetime');
                  const matchStatus = clinicSubStatusFilter === 'all' 
                    ? true 
                    : clinicSubStatusFilter === 'lifetime' 
                      ? isLifetime 
                      : status === clinicSubStatusFilter;
                  return matchSearch && matchStatus;
                })
                .map((tenant) => {
                  const tier = tenant.subscriptionTier || 'pro';
                  const status = tenant.subscriptionStatus || 'active';
                  const isLifetime = Boolean(tenant.isLifetimeLicense || status === 'lifetime');
                  const isSuspended = status === 'suspended';
                  const isGrace = status === 'grace_period';
                  const usage = getClinicUsage(tenant.id, tenant.quotas, tier);
                  const currentPlanObj = plans.find(p => p.id === tier) || { name: tier.toUpperCase(), monthlyPrice: 999 };

                  return (
                    <tr key={tenant.id} style={{ background: isSuspended ? 'rgba(239, 68, 68, 0.03)' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: isSuspended ? '#EF4444' : isGrace ? '#F59E0B' : '#10B981'
                          }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {tenant.name}
                              </strong>
                              {isLifetime && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  background: '#FEF3C7',
                                  color: '#B45309',
                                  border: '1px solid #FCD34D',
                                  borderRadius: '4px',
                                  padding: '0.1rem 0.4rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}>
                                  <Crown size={10} />
                                  مدى الحياة
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {tenant.doctorName} • <code style={{ fontSize: '0.74rem' }}>/{tenant.slug}</code>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: tier === 'enterprise' ? '#F5F3FF' : tier === 'pro' ? '#EFF6FF' : '#F4F4F5',
                            color: tier === 'enterprise' ? '#7C3AED' : tier === 'pro' ? '#2563EB' : '#52525B'
                          }}>
                            {tier.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            ({currentPlanObj.monthlyPrice} ج.م)
                          </span>
                        </div>
                        {tenant.customAgreedPrice !== undefined && tenant.customAgreedPrice !== null && tenant.customAgreedPrice !== '' && (
                          <div style={{ fontSize: '0.73rem', color: '#059669', fontWeight: 700, marginTop: '3px' }}>
                            اتفاق: {Number(tenant.customAgreedPrice).toLocaleString()} ج.م
                            {tenant.billingCycle === 'annual' ? ' /سنوي' : tenant.billingCycle === 'quarterly' ? ' /٣ أشهر' : tenant.billingCycle === 'semi_annual' ? ' /٦ أشهر' : tenant.billingCycle === 'custom' ? ' (مرن)' : ' /شهري'}
                          </div>
                        )}
                      </td>

                      <td>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '0.22rem 0.65rem',
                          borderRadius: '999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: isSuspended ? '#FEE2E2' : isGrace ? '#FEF08A' : '#ECFDF5',
                          color: isSuspended ? '#DC2626' : isGrace ? '#A16207' : '#047857'
                        }}>
                          {isLifetime ? (
                            <>
                              <Crown size={12} />
                              <span>دائم مدى الحياة ∞</span>
                            </>
                          ) : isSuspended ? (
                            <>
                              <Lock size={12} />
                              <span>موقوف ومجمد</span>
                            </>
                          ) : isGrace ? (
                            <>
                              <AlertTriangle size={12} />
                              <span>مهلة سداد</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} />
                              <span>نشط ومعتمد</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td>
                        <div style={{ minWidth: '130px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 700 }}>{usage.smsUsed || 0} / {usage.totalSmsAllowed || 1000}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{usage.remainingSms} متبقي</span>
                          </div>
                          <div style={{ height: '5px', background: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, Math.round(((usage.smsUsed || 0) / (usage.totalSmsAllowed || 1000)) * 100))}%`,
                              background: usage.isSmsDepleted ? '#EF4444' : '#10B981'
                            }} />
                          </div>
                        </div>
                      </td>

                      <td>
                        {isSuspended ? (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#DC2626',
                            fontWeight: 700,
                            background: '#FEF2F2',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #FCA5A5',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <AlertTriangle size={12} />
                            <span>{tenant.suspensionReason || 'عدم سداد الاشتراك الدوري'}</span>
                          </div>
                        ) : tenant.subscriptionPaymentHistory && tenant.subscriptionPaymentHistory.length > 0 ? (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                            تم سداد {tenant.subscriptionPaymentHistory[tenant.subscriptionPaymentHistory.length - 1].amount} ج.م ({tenant.subscriptionPaymentHistory[tenant.subscriptionPaymentHistory.length - 1].method})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            اشتراك منتظم
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {/* Open Full Lifecycle & Suspension Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenControlClinic(tenant)}
                            className="btn btn-primary"
                            title="التحكم الكامل في الباقة وتجميد العيادة وتمديد الاشتراك"
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#4F46E5',
                              borderColor: '#4338CA'
                            }}
                          >
                            <ShieldAlert size={13} />
                            <span>التحكم في الباقة والوقف</span>
                          </button>

                          {/* Quick Freeze/Unfreeze Toggle */}
                          <button
                            type="button"
                            onClick={() => handleQuickToggleSuspend(tenant)}
                            className="btn btn-secondary"
                            title={isSuspended ? 'إلغاء التجميد وإعادة التفعيل فوراً' : 'تجميد فوري للعيادة مع سبب الإيقاف'}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              borderRadius: '6px',
                              color: isSuspended ? '#059669' : '#DC2626',
                              borderColor: isSuspended ? '#A7F3D0' : '#FECACA'
                            }}
                          >
                            {isSuspended ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                            <span>{isSuspended ? 'فك التجميد' : 'تجميد'}</span>
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

      {/* SaaS Plan Tier Studio Modal */}
      <EditPlanTierModal
        isOpen={isEditPlanModalOpen}
        onClose={() => {
          setIsEditPlanModalOpen(false);
          setSelectedPlanToEdit(null);
        }}
        plan={selectedPlanToEdit}
        onSave={handleSavePlan}
      />

      {/* Clinic Subscription & Lifecycle Control Modal */}
      <ClinicSubscriptionControlModal
        isOpen={isControlModalOpen}
        onClose={() => {
          setIsControlModalOpen(false);
          setSelectedTenantToControl(null);
        }}
        clinic={selectedTenantToControl}
        onSuccess={(updates) => {
          setPlans(getSaaSSubscriptionPlans());
          if (selectedTenantToControl && updates && updateTenantInfo) {
            updateTenantInfo({
              id: selectedTenantToControl.id,
              slug: selectedTenantToControl.slug,
              ...updates
            });
          }
        }}
      />
    </div>
  );
}
