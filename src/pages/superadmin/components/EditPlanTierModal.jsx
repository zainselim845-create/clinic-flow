import React, { useState, useEffect } from 'react';
import { 
  X, Save, Sparkles, Check, CheckCircle2, ShieldCheck, 
  Smartphone, Users, Calendar, DollarSign, Tag, Globe, Activity
} from 'lucide-react';
import { saveSaaSSubscriptionPlan } from '../../../services/saasSubscriptionPlansService';

export default function EditPlanTierModal({ isOpen, onClose, plan, onSaveSuccess, onSave }) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    id: plan?.id || 'custom_' + Date.now(),
    name: plan?.name || 'باقة جديدة',
    nameEn: plan?.nameEn || 'Custom',
    monthlyPrice: plan?.monthlyPrice !== undefined ? plan.monthlyPrice : 799,
    annualPrice: plan?.annualPrice !== undefined ? plan.annualPrice : 7990,
    monthlySmsQuota: plan?.monthlySmsQuota !== undefined ? plan.monthlySmsQuota : 1000,
    maxDoctors: plan?.maxDoctors !== undefined ? plan.maxDoctors : 2,
    maxAppointmentsPerMonth: plan?.maxAppointmentsPerMonth || 1000,
    maxPatients: plan?.maxPatients || 3000,
    aiAssistant: plan?.aiAssistant !== undefined ? plan.aiAssistant : true,
    customDomain: plan?.customDomain !== undefined ? plan.customDomain : false,
    whatsappBot: plan?.whatsappBot !== undefined ? plan.whatsappBot : true,
    labModule: plan?.labModule !== undefined ? plan.labModule : true,
    inventoryModule: plan?.inventoryModule !== undefined ? plan.inventoryModule : true,
    dentalChart: plan?.dentalChart !== undefined ? plan.dentalChart : true,
    badge: plan?.badge || '',
    accentColor: plan?.accentColor || '#09090B',
    description: plan?.description || ''
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        id: plan.id,
        name: plan.name || '',
        nameEn: plan.nameEn || '',
        monthlyPrice: plan.monthlyPrice || 0,
        annualPrice: plan.annualPrice || 0,
        monthlySmsQuota: plan.monthlySmsQuota || 1000,
        maxDoctors: plan.maxDoctors || 1,
        maxAppointmentsPerMonth: plan.maxAppointmentsPerMonth || 1000,
        maxPatients: plan.maxPatients || 3000,
        aiAssistant: Boolean(plan.aiAssistant),
        customDomain: Boolean(plan.customDomain),
        whatsappBot: Boolean(plan.whatsappBot),
        labModule: Boolean(plan.labModule),
        inventoryModule: Boolean(plan.inventoryModule),
        dentalChart: Boolean(plan.dentalChart),
        badge: plan.badge || '',
        accentColor: plan.accentColor || '#09090B',
        description: plan.description || ''
      });
    }
  }, [plan]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = saveSaaSSubscriptionPlan(formData);
    if (success) {
      setSavedSuccess(true);
      if (onSaveSuccess) onSaveSuccess(formData);
      if (onSave) onSave(formData);
      setTimeout(() => {
        setSavedSuccess(false);
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
        maxWidth: '680px',
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
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #09090B)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="var(--clinic-primary, #09090B)" />
              <span>ضبط وتعديل تفاصيل باقة الساس ({formData.nameEn})</span>
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #71717A)' }}>
              التحكم في الأسعار والحصص والميزات الممنوحة للمشتركين في هذه الباقة
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary, #71717A)', padding: '0.4rem', borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Names & Tag */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                اسم الباقة (بالعربية) *
              </label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                الاسم الإنجليزي (ID) *
              </label>
              <input
                type="text"
                dir="ltr"
                className="form-control"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                required
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                شارة الباقة (Badge Text)
              </label>
              <input
                type="text"
                placeholder="مثال: الأكثر طلباً ⭐ أو VIP"
                className="form-control"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)' }}
              />
            </div>
          </div>

          {/* Pricing */}
          <div style={{ background: 'var(--bg-secondary, #FAFAFA)', border: '1px solid var(--border-color, #E4E4E7)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              تسعير الاشتراك (بالجنيه المصري EGP)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  السعر الشهري (ج.م) *
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: Number(e.target.value) || 0 })}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  السعر السنوي (ج.م) *
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={formData.annualPrice}
                  onChange={(e) => setFormData({ ...formData, annualPrice: Number(e.target.value) || 0 })}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)' }}
                />
              </div>
            </div>
          </div>

          {/* Quotas & Capacity */}
          <div style={{ background: 'var(--bg-secondary, #FAFAFA)', border: '1px solid var(--border-color, #E4E4E7)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              الحصص التشغيلية وحدود الاستخدام المشمولة
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  حصة رسائل SMS الشهرية
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={formData.monthlySmsQuota}
                  onChange={(e) => setFormData({ ...formData, monthlySmsQuota: Number(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  الحد الأقصى للأطباء / الموظفين
                </label>
                <input
                  type="number"
                  min={1}
                  className="form-control"
                  value={formData.maxDoctors}
                  onChange={(e) => setFormData({ ...formData, maxDoctors: Number(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  الحد الأقصى للمواعيد / شهر
                </label>
                <input
                  type="number"
                  min={50}
                  className="form-control"
                  value={formData.maxAppointmentsPerMonth}
                  onChange={(e) => setFormData({ ...formData, maxAppointmentsPerMonth: Number(e.target.value) || 1000 })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)' }}
                />
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              الميزات والوحدات المتاحة في هذه الباقة
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={formData.aiAssistant}
                  onChange={(e) => setFormData({ ...formData, aiAssistant: e.target.checked })}
                />
                <span>مساعد الطبيب السريري الذكي (AI)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={formData.customDomain}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.checked })}
                />
                <span>ربط دومين مخصص (Custom Domain & SSL)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={formData.whatsappBot}
                  onChange={(e) => setFormData({ ...formData, whatsappBot: e.target.checked })}
                />
                <span>تأكيدات وتذكيرات واتساب التلقائية</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={formData.labModule}
                  onChange={(e) => setFormData({ ...formData, labModule: e.target.checked })}
                />
                <span>إدارة المعامل والتركيبات الطبية</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={formData.inventoryModule}
                  onChange={(e) => setFormData({ ...formData, inventoryModule: e.target.checked })}
                />
                <span>إدارة المخزون والمستلزمات والصيدلية</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={formData.dentalChart}
                  onChange={(e) => setFormData({ ...formData, dentalChart: e.target.checked })}
                />
                <span>مخطط الأسنان التفاعلي (Dental 3D)</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              الوصف التسويقي للباقة
            </label>
            <textarea
              rows={2}
              className="form-control"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #E4E4E7)', resize: 'vertical' }}
            />
          </div>

          {savedSuccess && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1rem', borderRadius: '8px',
              background: '#ECFDF5', color: '#047857', fontSize: '0.85rem', fontWeight: 700
            }}>
              <CheckCircle2 size={18} />
              <span>تم حفظ تفاصيل الباقة وتحديثها على كامل المنصة بنجاح!</span>
            </div>
          )}

          {/* Actions */}
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
              <span>حفظ تعديلات الباقة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
