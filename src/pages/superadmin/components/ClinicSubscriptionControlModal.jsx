import React, { useState, useEffect } from 'react';
import { 
  X, Save, CheckCircle2, AlertOctagon, Clock, 
  Ban, CreditCard, Activity, Layers, Crown, DollarSign
} from 'lucide-react';
import { 
  getSaaSSubscriptionPlans, 
  updateClinicSubscriptionDetails 
} from '../../../services/saasSubscriptionPlansService';

export default function ClinicSubscriptionControlModal({ isOpen, onClose, tenant: propTenant, clinic: propClinic, onUpdateSuccess, onSuccess }) {
  const tenant = propTenant || propClinic || {};

  const plans = getSaaSSubscriptionPlans();

  const isInitialLifetime = Boolean(tenant.isLifetimeLicense || tenant.subscriptionStatus === 'lifetime');

  const [status, setStatus] = useState(isInitialLifetime ? 'lifetime' : (tenant.subscriptionStatus || 'active'));
  const [isLifetimeLicense, setIsLifetimeLicense] = useState(isInitialLifetime);
  const [tier, setTier] = useState(tenant.subscriptionTier || 'pro');
  const [customAgreedPrice, setCustomAgreedPrice] = useState(
    tenant.customAgreedPrice !== undefined && tenant.customAgreedPrice !== null ? tenant.customAgreedPrice : ''
  );
  const [billingCycle, setBillingCycle] = useState(
    isInitialLifetime ? 'lifetime' : (tenant.billingCycle || 'monthly')
  );
  const [nextBillingDate, setNextBillingDate] = useState(
    isInitialLifetime ? 'مدى الحياة' : (tenant.nextBillingDate || '')
  );
  const [suspensionReason, setSuspensionReason] = useState(
    tenant.suspensionReason || 'عدم سداد الاشتراك الدوري المستحق'
  );
  const [smsQuota, setSmsQuota] = useState(tenant.quotas?.monthlySmsQuota || 1000);
  const [extraSmsCredits, setExtraSmsCredits] = useState(tenant.quotas?.extraSmsCredits || 0);
  const [maxDoctors, setMaxDoctors] = useState(tenant.quotas?.maxDoctors || 3);
  
  // Feature Modules State
  const [enableLabs, setEnableLabs] = useState(Boolean(tenant.enableLabs ?? tenant.modules?.labs));
  const [enableInventory, setEnableInventory] = useState(Boolean(tenant.enableInventory ?? tenant.modules?.inventory));
  const [enableAiAssistant, setEnableAiAssistant] = useState(Boolean(tenant.enableAiAssistant ?? tenant.modules?.aiAssistant ?? true));
  const [enableSms, setEnableSms] = useState(Boolean(tenant.enableSms ?? tenant.modules?.sms ?? true));

  // Payment recording state
  const [paymentType, setPaymentType] = useState(isInitialLifetime ? 'lifetime_buyout' : 'recurring');
  const [paymentMethod, setPaymentMethod] = useState('instapay');
  const [paymentAmount, setPaymentAmount] = useState(isInitialLifetime ? 25000 : 999);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const isLife = Boolean(tenant.isLifetimeLicense || tenant.subscriptionStatus === 'lifetime');
    setStatus(isLife ? 'lifetime' : (tenant.subscriptionStatus || 'active'));
    setIsLifetimeLicense(isLife);
    setTier(tenant.subscriptionTier || 'pro');
    setCustomAgreedPrice(tenant.customAgreedPrice !== undefined && tenant.customAgreedPrice !== null ? tenant.customAgreedPrice : '');
    setBillingCycle(isLife ? 'lifetime' : (tenant.billingCycle || 'monthly'));
    setNextBillingDate(isLife ? 'مدى الحياة' : (tenant.nextBillingDate || ''));
    setSuspensionReason(tenant.suspensionReason || 'عدم سداد الاشتراك الدوري المستحق');
    setSmsQuota(tenant.quotas?.monthlySmsQuota || 1000);
    setExtraSmsCredits(tenant.quotas?.extraSmsCredits || 0);
    setMaxDoctors(tenant.quotas?.maxDoctors || 3);
    setEnableLabs(Boolean(tenant.enableLabs ?? tenant.modules?.labs));
    setEnableInventory(Boolean(tenant.enableInventory ?? tenant.modules?.inventory));
    setEnableAiAssistant(Boolean(tenant.enableAiAssistant ?? tenant.modules?.aiAssistant ?? true));
    setEnableSms(Boolean(tenant.enableSms ?? tenant.modules?.sms ?? true));
  }, [tenant]);

  // Quick Action Handlers
  const handleImmediateFreeze = () => {
    setIsLifetimeLicense(false);
    setStatus('suspended');
    setSuspensionReason('تم تعليق حساب العيادة مؤقتاً لعدم سداد الاشتراك الدوري المستحق.');
  };

  const handleImmediateActivate = () => {
    setIsLifetimeLicense(false);
    setStatus('active');
    setSuspensionReason('');
  };

  const handleSetGracePeriod = () => {
    setIsLifetimeLicense(false);
    setStatus('grace_period');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setNextBillingDate(d.toISOString().slice(0, 10));
  };

  const handleSetLifetime = () => {
    setIsLifetimeLicense(true);
    setStatus('lifetime');
    setBillingCycle('lifetime');
    setNextBillingDate('مدى الحياة');
    setSuspensionReason('');
    setPaymentType('lifetime_buyout');
    if (!customAgreedPrice) {
      setCustomAgreedPrice(25000);
      setPaymentAmount(25000);
    }
    setPaymentNotes('شراء وترخيص البورتال مدى الحياة (Lifetime Portal Buyout)');
  };

  const handleQuickAddDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNextBillingDate(d.toISOString().slice(0, 10));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updates = {
      subscriptionStatus: isLifetimeLicense ? 'lifetime' : status,
      subscriptionTier: tier,
      isLifetimeLicense: Boolean(isLifetimeLicense),
      billingCycle: isLifetimeLicense ? 'lifetime' : billingCycle,
      customAgreedPrice: customAgreedPrice !== '' ? Number(customAgreedPrice) : undefined,
      nextBillingDate: isLifetimeLicense ? 'مدى الحياة' : nextBillingDate,
      suspensionReason: (!isLifetimeLicense && status === 'suspended') ? suspensionReason : undefined,
      quotas: {
        ...(tenant.quotas || {}),
        monthlySmsQuota: Number(smsQuota) || 1000,
        extraSmsCredits: Number(extraSmsCredits) || 0,
        maxDoctors: Number(maxDoctors) || 3
      },
      enableLabs: Boolean(enableLabs),
      enableInventory: Boolean(enableInventory),
      enableAiAssistant: Boolean(enableAiAssistant),
      enableSms: Boolean(enableSms),
      modules: {
        ...(tenant.modules || {}),
        labs: Boolean(enableLabs),
        inventory: Boolean(enableInventory),
        aiAssistant: Boolean(enableAiAssistant),
        sms: Boolean(enableSms)
      }
    };

    if (paymentAmount > 0 && paymentNotes) {
      updates.offlinePayment = {
        amount: Number(paymentAmount),
        method: paymentMethod,
        notes: paymentNotes,
        type: paymentType,
        date: new Date().toISOString()
      };
      updates.lastPayment = updates.offlinePayment;
    }

    const success = updateClinicSubscriptionDetails(tenant.slug || tenant.id, updates);
    if (success) {
      setIsSaved(true);
      if (onUpdateSuccess) onUpdateSuccess(updates);
      if (onSuccess) onSuccess(updates);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1200);
    }
  };

  if (!isOpen || (!propTenant && !propClinic)) return null;

  return (
    <div className="saas-modal-backdrop" style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000, padding: '1rem', direction: 'rtl'
    }}>
      <div className="saas-modal-card" style={{
        background: 'var(--surface, #FFFFFF)',
        border: '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '740px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color, #E4E4E7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isLifetimeLicense ? '#FFFBEB' : status === 'suspended' ? '#FEF2F2' : 'var(--surface)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: isLifetimeLicense ? '#92400E' : status === 'suspended' ? '#991B1B' : 'var(--text-primary)' }}>
                التحكم الشامل في اشتراك وترخيص: {tenant.name}
              </h3>
              <span style={{
                fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '999px',
                background: isLifetimeLicense ? '#FEF3C7' : status === 'suspended' ? '#FEE2E2' : status === 'grace_period' ? '#FEF08A' : '#ECFDF5',
                color: isLifetimeLicense ? '#B45309' : status === 'suspended' ? '#DC2626' : status === 'grace_period' ? '#A16207' : '#059669'
              }}>
                {isLifetimeLicense ? '👑 مدى الحياة (Lifetime Portal)' : status === 'suspended' ? 'موقوف ومجمد' : status === 'grace_period' ? 'مهلة سداد' : 'نشط وساري'}
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              الطبيب: {tenant.doctorName || 'طبيب العيادة'} | المسار: /{tenant.slug} | الباقة: {tier.toUpperCase()}
              {customAgreedPrice !== '' && ` | السعر المتفق عليه: ${customAgreedPrice} ج.م`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.4rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Quick Action Bar */}
          <div style={{
            background: 'var(--bg-secondary, #FAFAFA)',
            border: '1px solid var(--border-color, #E4E4E7)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={16} />
              إجراءات الإيقاف الفوري، التفعيل، وترخيص مدى الحياة:
            </strong>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Lifetime Portal Buyout Button */}
              <button
                type="button"
                onClick={handleSetLifetime}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #FCD34D',
                  background: isLifetimeLicense ? '#D97706' : '#FEF3C7',
                  color: isLifetimeLicense ? '#FFF' : '#92400E',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                <Crown size={15} />
                <span>👑 ترخيص دائم مدى الحياة (شراء البورتال)</span>
              </button>

              <button
                type="button"
                onClick={handleImmediateActivate}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #6EE7B7',
                  background: (!isLifetimeLicense && status === 'active') ? '#10B981' : '#ECFDF5',
                  color: (!isLifetimeLicense && status === 'active') ? '#FFF' : '#047857',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                <CheckCircle2 size={15} />
                <span>تفعيل ونظام دوري (Active)</span>
              </button>

              <button
                type="button"
                onClick={handleImmediateFreeze}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #FCA5A5',
                  background: (!isLifetimeLicense && status === 'suspended') ? '#EF4444' : '#FEE2E2',
                  color: (!isLifetimeLicense && status === 'suspended') ? '#FFF' : '#B91C1C',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                <Ban size={15} />
                <span>إيقاف وتجميد العيادة فوراً (Suspend)</span>
              </button>

              <button
                type="button"
                onClick={handleSetGracePeriod}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #93C5FD',
                  background: status === 'grace_period' ? '#3B82F6' : '#EFF6FF',
                  color: status === 'grace_period' ? '#FFF' : '#1E40AF',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <AlertOctagon size={15} />
                <span>مهلة سداد ٧ أيام</span>
              </button>
            </div>

            {/* Suspension Reason */}
            {status === 'suspended' && !isLifetimeLicense && (
              <div style={{ marginTop: '0.5rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#991B1B', marginBottom: '0.35rem' }}>
                  سبب الإيقاف والتجميد (يظهر للطبيب في شاشة القفل الحمراء بالعيادة):
                </label>
                <input
                  type="text"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="مثال: تأخر سداد الاشتراك الشهري لشهر سبتمبر ٢٠٢٦"
                  style={{
                    width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                    border: '1px solid #FCA5A5', fontSize: '0.85rem', color: '#7F1D1D'
                  }}
                />
              </div>
            )}

            {/* Lifetime Notice Banner */}
            {isLifetimeLicense && (
              <div style={{ marginTop: '0.5rem', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Crown size={20} color="#B45309" />
                <div style={{ fontSize: '0.82rem', color: '#92400E' }}>
                  <strong>وضع شراء البورتال مدى الحياة مفعّل:</strong> العيادة لن يتم إيقافها أبداً، والوصول مفتوح دائماً بدون تاريخ انتهاء أو تجديد إجباري.
                </div>
              </div>
            )}
          </div>

          {/* Section: Custom Pricing & Flexible Billing Schedule */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <DollarSign size={17} color="#10B981" />
              تحديد السعر بمزاجك ونظام السداد المخصص (Custom Pricing & Schedule)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  السعر المتفق عليه لهذا الطبيب (ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="سعر الباقة الافتراضي تلقائياً"
                  value={customAgreedPrice}
                  onChange={(e) => setCustomAgreedPrice(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                  السعر الذي يدفعه لك بمزاجك واتفاقكما.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  دورة وتكرار السداد (Billing Cycle)
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => {
                    setBillingCycle(e.target.value);
                    if (e.target.value === 'lifetime') {
                      setIsLifetimeLicense(true);
                      setStatus('lifetime');
                      setNextBillingDate('مدى الحياة');
                    } else if (isLifetimeLicense) {
                      setIsLifetimeLicense(false);
                      setStatus('active');
                    }
                  }}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                >
                  <option value="monthly">شهري (Monthly)</option>
                  <option value="quarterly">ربع سنوي (كل ٣ شهور)</option>
                  <option value="semi_annual">نصف سنوي (كل ٦ شهور)</option>
                  <option value="annual">سنوي (كل سنة)</option>
                  <option value="lifetime">👑 شراء دائم مدى الحياة (One-time Buyout)</option>
                  <option value="custom">اتفاق مرن مخصص (Custom Agreement)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  تاريخ استحقاق السداد القادم
                </label>
                <input
                  type="text"
                  placeholder="مثال: 2026-10-01 أو مدى الحياة"
                  value={nextBillingDate}
                  onChange={(e) => setNextBillingDate(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => handleQuickAddDays(30)} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#FFF', cursor: 'pointer' }}>+ شهر</button>
                  <button type="button" onClick={() => handleQuickAddDays(90)} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#FFF', cursor: 'pointer' }}>+ ٣ شهور</button>
                  <button type="button" onClick={() => handleQuickAddDays(180)} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#FFF', cursor: 'pointer' }}>+ ٦ شهور</button>
                  <button type="button" onClick={() => handleQuickAddDays(365)} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#FFF', cursor: 'pointer' }}>+ سنة</button>
                  <button type="button" onClick={() => setNextBillingDate('مدى الحياة')} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #FCD34D', background: '#FEF3C7', color: '#92400E', cursor: 'pointer', fontWeight: 700 }}>مدى الحياة ∞</button>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Plan Selection */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              تعيين مواصفات وميزات الباقة الممنوحة
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {plans.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    setTier(p.id);
                    setSmsQuota(p.monthlySmsQuota || 1000);
                    setMaxDoctors(p.maxDoctors || 3);
                  }}
                  style={{
                    border: tier === p.id ? '2px solid var(--clinic-primary, #09090B)' : '1px solid var(--border-color)',
                    background: tier === p.id ? 'var(--bg-secondary, #F4F4F5)' : 'var(--surface)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{p.nameEn || p.name}</strong>
                    {tier === p.id && <CheckCircle2 size={16} color="var(--clinic-primary, #09090B)" />}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, margin: '0.35rem 0 0.15rem' }}>
                    {p.monthlyPrice} ج.م <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>/شهر</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {p.monthlySmsQuota} رسالة SMS • حتى {p.maxDoctors} أطباء
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Quotas Overrides */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              تخصيص الحصص المباشرة للعيادة
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  حصة الرسائل الشهرية المعتمدة
                </label>
                <input
                  type="number"
                  min={0}
                  value={smsQuota}
                  onChange={(e) => setSmsQuota(Number(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  رصيد SMS إضافي مشحون (Bonus)
                </label>
                <input
                  type="number"
                  min={0}
                  value={extraSmsCredits}
                  onChange={(e) => setExtraSmsCredits(Number(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  عدد الأطباء الأقصى المصرح به
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxDoctors}
                  onChange={(e) => setMaxDoctors(Number(e.target.value) || 1)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>
          </div>

          {/* Section: Feature Modules Toggles (التحكم المركزي في الميزات) */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} color="#6366F1" />
              إدارة وتفعيل ميزات العيادة من الإدارة المركزية (Feature Modules Toggles)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: enableLabs ? 'rgba(99, 102, 241, 0.05)' : 'transparent', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableLabs}
                  onChange={(e) => setEnableLabs(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6366F1' }}
                />
                <div>
                  <strong style={{ fontSize: '0.84rem', display: 'block' }}>معمل التركيبات (Labs)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>طلبات وحالات المعامل</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: enableInventory ? 'rgba(16, 185, 129, 0.05)' : 'transparent', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableInventory}
                  onChange={(e) => setEnableInventory(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10B981' }}
                />
                <div>
                  <strong style={{ fontSize: '0.84rem', display: 'block' }}>المخزون (Inventory)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>المستلزمات وتنبيهات النواقص</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: enableAiAssistant ? 'rgba(16, 185, 129, 0.05)' : 'transparent', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableAiAssistant}
                  onChange={(e) => setEnableAiAssistant(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10B981' }}
                />
                <div>
                  <strong style={{ fontSize: '0.84rem', display: 'block' }}>المساعد الذكي (AI)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>مساعد الطبيب السريري</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: enableSms ? 'rgba(2, 132, 199, 0.05)' : 'transparent', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableSms}
                  onChange={(e) => setEnableSms(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#0284C7' }}
                />
                <div>
                  <strong style={{ fontSize: '0.84rem', display: 'block' }}>بوابة SMS (Messages)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>تأكيدات وتذكيرات الحجز</span>
                </div>
              </label>

            </div>
          </div>

          {/* Offline Payment Recording */}
          <div style={{ background: 'var(--bg-secondary, #FAFAFA)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CreditCard size={16} />
              تسجيل عملية تحصيل / سداد اشتراك أو شراء بورتال
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>نوع التحصيل</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                >
                  <option value="recurring">سداد اشتراك دوري متفق عليه</option>
                  <option value="lifetime_buyout">👑 شراء وترخيص بورتال مدى الحياة (Buyout)</option>
                  <option value="topup">شحن رصيد رسائل SMS إضافي</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>طريقة التحصيل</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                >
                  <option value="instapay">Instapay (إنستاباي)</option>
                  <option value="vodafone_cash">فودافون كاش / محفظة إلكترونية</option>
                  <option value="bank_transfer">تحويل بنكي رسمي</option>
                  <option value="cash">نقدي (كاش باليد)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>المبلغ المحصل (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 700 }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  رقم العملية / مرجع التحويل والملاحظات
                </label>
                <input
                  type="text"
                  placeholder="مثال: تحويل إنستاباي رقم TRX-982103 - تم شراء البورتال بالكامل"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 700
              }}
            >
              {isSaved ? <CheckCheck size={16} /> : <Save size={16} />}
              <span>{isSaved ? 'تم حفظ التعديلات بنجاح!' : 'حفظ وتطبيق التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
