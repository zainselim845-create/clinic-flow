import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { X, UserPlus, Shield, User, Building, Lock, Mail, Phone, Briefcase } from 'lucide-react';

export function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
  allTenants = []
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'doctor',
    clinicSlug: allTenants[0]?.slug || '',
    jobTitle: '',
    status: 'active'
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'doctor',
        clinicSlug: allTenants[0]?.slug || '',
        jobTitle: '',
        status: 'active'
      });
      setError('');
    }
  }, [isOpen, allTenants]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('يرجى إدخال اسم المستخدم الكامل');
      return;
    }
    if (!formData.email.trim() && !formData.phone.trim()) {
      setError('يرجى إدخال البريد الإلكتروني أو رقم الهاتف على الأقل');
      return;
    }
    if (!formData.password.trim()) {
      setError('يرجى تعيين كلمة مرور للحساب');
      return;
    }

    const selectedClinic = allTenants.find(t => t.slug === formData.clinicSlug);

    const newUser = {
      id: `user-${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      password: formData.password.trim(),
      role: formData.role,
      isClinicOwner: formData.role === 'doctor' || formData.role === 'multi_clinic_owner',
      jobTitle: formData.jobTitle.trim() || (
        formData.role === 'doctor' 
          ? 'طبيب معالج واستشاري' 
          : formData.role === 'staff' 
          ? 'سكرتارية واستقبال العيادة' 
          : 'مالك ومستثمر طبي'
      ),
      clinicSlug: formData.clinicSlug,
      clinicId: selectedClinic?.id || formData.clinicSlug,
      clinicName: selectedClinic?.name || formData.clinicSlug,
      status: formData.status,
      allowedClinics: [formData.clinicSlug],
      permissions: ['*'],
      createdAt: new Date().toISOString()
    };

    onSubmit(newUser);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="saas-modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content className="saas-modal-card" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
            <div className="saas-modal-header">
              <Dialog.Title id="create-user-title" asChild>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={18} color="#0071e3" />
                  <h3>إضافة حساب عميل جديد (Create User Account)</h3>
                </div>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="close-modal-btn"
                  aria-label="إغلاق النافذة"
                >
                  <X size={18} />
                </button>
              </Dialog.CloseTrigger>
            </div>

            <form onSubmit={handleSubmit} className="saas-modal-form">
              {error && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="create-user-name">الاسم الكامل *</label>
                <input
                  id="create-user-name"
                  type="text"
                  required
                  placeholder="مثال: د. حسام الدين عزمي"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="create-user-email">البريد الإلكتروني</label>
                  <input
                    id="create-user-email"
                    type="email"
                    placeholder="dr.hossam@clinicflow.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="create-user-phone">رقم الهاتف / الواتساب</label>
                  <input
                    id="create-user-phone"
                    type="tel"
                    placeholder="01012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="create-user-pw">كلمة المرور الابتدائية *</label>
                  <input
                    id="create-user-pw"
                    type="text"
                    required
                    placeholder="مثال: Doc@123456"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="create-user-role">نوع الحساب والدور</label>
                  <select
                    id="create-user-role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="doctor">طبيب معالج / مالك عيادة</option>
                    <option value="staff">سكرتارية واستقبال (Reception)</option>
                    <option value="multi_clinic_owner">مالك مجمع عيادات (Owner)</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="create-user-clinic">العيادة التابعة للحساب</label>
                  <select
                    id="create-user-clinic"
                    value={formData.clinicSlug}
                    onChange={(e) => setFormData({ ...formData, clinicSlug: e.target.value })}
                  >
                    {allTenants.map(t => (
                      <option key={t.slug} value={t.slug}>
                        {t.name || t.slug} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="create-user-job">المسمى الوظيفي / التخصص</label>
                  <input
                    id="create-user-job"
                    type="text"
                    placeholder="مثال: استشاري جراحة العظام"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={onClose} className="btn-cancel">
                  إلغاء
                </button>
                <button type="submit" className="btn-submit">
                  <UserPlus size={16} />
                  <span>إنشاء وتفعيل الحساب</span>
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
