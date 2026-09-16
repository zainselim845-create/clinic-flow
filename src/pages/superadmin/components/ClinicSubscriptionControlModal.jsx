import React, { useState, useEffect } from 'react';
import { 
  X, Save, ShieldAlert, CheckCircle2, AlertOctagon, Clock, 
  Ban, Check, RefreshCw, Zap, CreditCard, Calendar, PhoneCall,
  Activity, Layers
} from 'lucide-react';
import { 
  getSaaSSubscriptionPlans, 
  updateClinicSubscriptionDetails 
} from '../../../services/saasSubscriptionPlansService';
import { getClinicUsage } from '../../../services/usageMeteringService';

export default function ClinicSubscriptionControlModal({ isOpen, onClose, tenant: propTenant, clinic: propClinic, onUpdateSuccess, onSuccess }) {
  const tenant = propTenant || propClinic;
  if (!isOpen || !tenant) return null;

  const plans = getSaaSSubscriptionPlans();

  const [status, setStatus] = useState(tenant.subscriptionStatus || 'active');
  const [tier, setTier] = useState(tenant.subscriptionTier || 'pro');
  const [suspensionReason, setSuspensionReason] = useState(
    tenant.suspensionReason || 'عدم سداد الاشتراك الدوري المستحق'
  );
  const [smsQuota, setSmsQuota] = useState(tenant.quotas?.monthlySmsQuota || 1000);
  const [extraSmsCredits, setExtraSmsCredits] = useState(tenant.quotas?.extraSmsCredits || 0);
  const [maxDoctors, setMaxDoctors] = useState(tenant.quotas?.maxDoctors || 3);
  const [paymentMethod, setPaymentMethod] = useState('instapay');
  const [paymentAmount, setPaymentAmount] = useState(999);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const usage = getClinicUsage(tenant.id, tenant.quotas, tier);

  useEffect(() => {
    setStatus(tenant.subscriptionStatus || 'active');
    setTier(tenant.subscriptionTier || 'pro');
    setSuspensionReason(tenant.suspensionReason || 'عدم سداد الاشتراك الدوري المستحق');
    setSmsQuota(tenant.quotas?.monthlySmsQuota || 1000);
    setExtraSmsCredits(tenant.quotas?.extraSmsCredits || 0);
    setMaxDoctors(tenant.quotas?.maxDoctors || 3);
  }, [tenant]);

  // Quick Action Handlers
  const handleImmediateFreeze = () => {
    setStatus('suspended');
    setSuspensionReason('تم تعليق حساب العيادة مؤقتاً لعدم سداد الاشتراك الدوري المستحق.');
  };

  const handleImmediateActivate = () => {
    setStatus('active');
    setSuspensionReason('');
  };

  const handleSetTrial = () => {
    setStatus('trial');
  };

  const handleSetGracePeriod = () => {
    setStatus('grace_period');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updates = {
      subscriptionStatus: status,
      subscriptionTier: tier,
      suspensionReason: status === 'suspended' ? suspensionReason : undefined,
      quotas: {
        ...(tenant.quotas || {}),
        monthlySmsQuota: Number(smsQuota) || 1000,
        extraSmsCredits: Number(extraSmsCredits) || 0,
        maxDoctors: Number(maxDoctors) || 3
      }
    };

    if (paymentAmount > 0 && paymentNotes) {
      updates.lastPayment = {
        amount: paymentAmount,
        method: paymentMethod,
        notes: paymentNotes,
        date: new Date().toISOString()
      };
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
        maxWidth: '720px',
        maxHeight: '90vh',
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
          background: status === 'suspended' ? '#FEF2F2' : 'var(--surface)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: status === 'suspended' ? '#991B1B' : 'var(--text-primary)' }}>
                التحكم والرقابة على اشتراك: {tenant.name}
              </h3>
              <span style={{
                fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '999px',
                background: status === 'suspended' ? '#FEE2E2' : status === 'trial' ? '#FEF3C7' : '#ECFDF5',
                color: status === 'suspended' ? '#DC2626' : status === 'trial' ? '#D97706' : '#059669'
              }}>
                {status === 'suspended' ? 'موقوف لعدم السداد' : status === 'trial' ? 'فترة تجريبية' : 'نشط وساري'}
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              الطبيب: {tenant.doctorName || 'طبيب العيادة'} | المسار: /{tenant.slug} | الباقة الحالية: {tier.toUpperCase()}
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
          
          {/* Quick Action Bar for Freezing/Activation */}
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
              إجراءات الإيقاف الفوري والتفعيل السريع (One-Click Actions)
            </strong>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleImmediateFreeze}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #FCA5A5',
                  background: status === 'suspended' ? '#EF4444' : '#FEE2E2',
                  color: status === 'suspended' ? '#FFF' : '#B91C1C',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                <Ban size={15} />
                <span>إيقاف وتجميد العيادة فوراً (Suspend)</span>
              </button>

              <button
                type="button"
                onClick={handleImmediateActivate}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #6EE7B7',
                  background: status === 'active' ? '#10B981' : '#ECFDF5',
                  color: status === 'active' ? '#FFF' : '#047857',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                <CheckCircle2 size={15} />
                <span>تفعيل وتنشيط العيادة (Activate)</span>
              </button>

              <button
                type="button"
                onClick={handleSetTrial}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #FCD34D',
                  background: status === 'trial' ? '#F59E0B' : '#FEF3C7',
                  color: status === 'trial' ? '#FFF' : '#92400E',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <Clock size={15} />
                <span>فترة تجريبية (Trial)</span>
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

            {/* Suspension Reason (Only visible or editable when suspended or about to suspend) */}
            {status === 'suspended' && (
              <div style={{ marginTop: '0.5rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#991B1B', marginBottom: '0.35rem' }}>
                  سبب الإيقاف والتجميد (يظهر للطبيب في شاشة القفل الحمراء بالعيادة):
                </label>
                <input
                  type="text"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="مثال: عدم سداد الاشتراك الشهري لشهر سبتمبر ٢٠٢٦"
                  style={{
                    width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px',
                    border: '1px solid #FCA5A5', fontSize: '0.85rem', color: '#7F1D1D'
                  }}
                />
              </div>
            )}
          </div>

          {/* Tier Plan Selection */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              تعيين باقة الاشتراك للعيادة
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
              تخصيص الحصص وتزويد الرصيد لهذه العيادة
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

          {/* Offline Payment Recording */}
          <div style={{ background: 'var(--bg-secondary, #FAFAFA)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CreditCard size={16} />
              تسجيل عملية تحصيل / سداد اشتراك جديدة
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                >
                  <option value="instapay">Instapay (إنستاباي)</option>
                  <option value="vodafone_cash">فودافون كاش / محفظة إلكترونية</option>
                  <option value="bank_transfer">تحويل بنكي رسمي</option>
                  <option value="cash">سداد نقدي مباشر</option>
                  <option value="credit_card">بطاقة ائتمان / دفع إلكتروني</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>المبلغ المحصل (ج.م)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>ملاحظات ورقم العملية</label>
                <input
                  type="text"
                  placeholder="رقم التحويل / مرجع الفاتورة"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>
          </div>

          {isSaved && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1rem', borderRadius: '8px',
              background: '#ECFDF5', color: '#047857', fontSize: '0.85rem', fontWeight: 700
            }}>
              <CheckCircle2 size={18} />
              <span>تم تطبيق تحديثات الرقابة والاشتراك على العيادة بنجاح!</span>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.5rem', background: 'var(--clinic-primary, #09090B)', color: '#FFF' }}
            >
              <Save size={16} />
              <span>حفظ وتطبيق التغييرات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
