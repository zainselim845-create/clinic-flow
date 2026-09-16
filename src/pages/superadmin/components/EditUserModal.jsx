import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { X, Edit, Shield, Building, Lock, Mail, Phone, Briefcase, KeyRound, Check } from 'lucide-react';

export function EditUserModal({
  isOpen,
  onClose,
  user,
  onSubmit,
  onResetPassword,
  allTenants = []
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'doctor',
    clinicSlug: 'dr-ahmed',
    jobTitle: '',
    status: 'active'
  });

  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'doctor',
        clinicSlug: user.clinicSlug || allTenants[0]?.slug || 'dr-ahmed',
        jobTitle: user.jobTitle || '',
        status: user.status || 'active'
      });
      setNewPassword('');
      setPasswordSuccess(false);
      setError('');
    }
  }, [user, allTenants]);

  if (!user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }

    const selectedClinic = allTenants.find(t => t.slug === formData.clinicSlug);

    const updates = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      role: formData.role,
      clinicSlug: formData.clinicSlug,
      clinicId: selectedClinic?.id || formData.clinicSlug,
      clinicName: selectedClinic?.name || formData.clinicSlug,
      jobTitle: formData.jobTitle.trim(),
      status: formData.status
    };

    onSubmit(user.id, updates);
  };

  const handlePasswordSubmit = () => {
    if (!newPassword.trim()) {
      setError('يرجى كتابة كلمة المرور الجديدة');
      return;
    }
    onResetPassword(user.id, newPassword.trim());
    setPasswordSuccess(true);
    setNewPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="saas-modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content className="saas-modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <div className="saas-modal-header">
              <Dialog.Title id="edit-user-title" asChild>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit size={18} color="var(--clinic-primary, #09090B)" />
                  <h3>تعديل بيانات الحساب (Edit User Account)</h3>
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
                <label htmlFor="edit-user-name">الاسم الكامل *</label>
                <input
                  id="edit-user-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="edit-user-email">البريد الإلكتروني</label>
                  <input
                    id="edit-user-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-user-phone">رقم الهاتف</label>
                  <input
                    id="edit-user-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="edit-user-role">نوع الحساب والدور</label>
                  <select
                    id="edit-user-role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    disabled={user.role === 'super_admin'}
                  >
                    <option value="doctor">طبيب معالج / مالك عيادة</option>
                    <option value="staff">سكرتارية واستقبال (Reception)</option>
                    <option value="multi_clinic_owner">مالك مجمع عيادات (Owner)</option>
                    {user.role === 'super_admin' && (
                      <option value="super_admin">مدير عام المنصة</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-user-status">حالة الحساب</label>
                  <select
                    id="edit-user-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">نشط ومفعل (Active)</option>
                    <option value="suspended">موقوف مؤقتاً (Suspended)</option>
                    <option value="inactive">غير نشط (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="edit-user-clinic">العيادة التابعة</label>
                  <select
                    id="edit-user-clinic"
                    value={formData.clinicSlug}
                    onChange={(e) => setFormData({ ...formData, clinicSlug: e.target.value })}
                    disabled={user.role === 'super_admin'}
                  >
                    {allTenants.map(t => (
                      <option key={t.slug} value={t.slug}>
                        {t.name || t.slug} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-user-job">المسمى الوظيفي / التخصص</label>
                  <input
                    id="edit-user-job"
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                </div>
              </div>

              {/* Direct Password Reset Box */}
              <div style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0369A1', fontWeight: 700, fontSize: '0.88rem' }}>
                  <KeyRound size={16} />
                  <span>تغيير كلمة المرور فوراً (Direct Password Reset)</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="أدخل كلمة مرور جديدة للعميل..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={handlePasswordSubmit}
                    style={{
                      background: '#0284C7',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {passwordSuccess ? (
                      <>
                        <Check size={14} />
                        <span>تم التحديث!</span>
                      </>
                    ) : (
                      <span>تحديث</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={onClose} className="btn-cancel">
                  إلغاء
                </button>
                <button type="submit" className="btn-submit">
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
