import React from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { X } from 'lucide-react';
import { slugifyClinic } from '../../../services/authService';

export function CreateClinicModal({
  isOpen,
  onClose,
  newClinic,
  setNewClinic,
  onSubmit
}) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="saas-modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content className="saas-modal-card" role="dialog" aria-modal="true" aria-labelledby="create-clinic-title">
            <div className="saas-modal-header">
              <Dialog.Title id="create-clinic-title" asChild>
                <h3>تسجيل عيادة جديدة في المنصة (Provision Tenant)</h3>
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

        <form onSubmit={onSubmit} className="saas-modal-form">
          <div className="form-group">
            <label htmlFor="clinic-name-input">اسم المركز أو العيادة *</label>
            <input 
              id="clinic-name-input"
              type="text" 
              placeholder="مثال: مجمع النخبة الطبي" 
              value={newClinic.name}
              onChange={(e) => {
                const val = e.target.value;
                setNewClinic(prev => ({ 
                  ...prev, 
                  name: val,
                  slug: prev.slugManual ? prev.slug : slugifyClinic(val, prev.specialty)
                }));
              }}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="clinic-doctor-input">اسم الطبيب المدير *</label>
              <input 
                id="clinic-doctor-input"
                type="text" 
                placeholder="مثال: د. كريم محمود" 
                value={newClinic.doctorName}
                onChange={(e) => setNewClinic(prev => ({ ...prev, doctorName: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clinic-specialty-input">التخصص الطبي *</label>
              <input 
                id="clinic-specialty-input"
                type="text" 
                placeholder="مثال: طب الأطفال وحديثي الولادة" 
                value={newClinic.specialty}
                onChange={(e) => setNewClinic(prev => ({ ...prev, specialty: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="clinic-email-input">البريد الإلكتروني لدخول الطبيب *</label>
              <input 
                id="clinic-email-input"
                type="email" 
                placeholder="doctor@elnokhba.com" 
                dir="ltr"
                value={newClinic.doctorEmail || ''}
                onChange={(e) => setNewClinic(prev => ({ ...prev, doctorEmail: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clinic-password-input">كلمة المرور لحساب الطبيب *</label>
              <input 
                id="clinic-password-input"
                type="password" 
                placeholder="••••••••" 
                dir="ltr"
                value={newClinic.doctorPassword || ''}
                onChange={(e) => setNewClinic(prev => ({ ...prev, doctorPassword: e.target.value }))}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="clinic-phone-input">رقم الهاتف المحمول *</label>
              <input 
                id="clinic-phone-input"
                type="tel" 
                placeholder="01012345678" 
                dir="ltr"
                value={newClinic.phone || ''}
                onChange={(e) => setNewClinic(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clinic-tier-select">باقة الاشتراك (Subscription Tier)</label>
              <select 
                id="clinic-tier-select"
                value={newClinic.subscriptionTier}
                onChange={(e) => setNewClinic(prev => ({ ...prev, subscriptionTier: e.target.value }))}
              >
                <option value="starter">أساسي Starter (850 ج.م/شهر)</option>
                <option value="pro">عيادة ذكية Pro (1,800 ج.م/شهر)</option>
                <option value="enterprise">مؤسسي Enterprise (3,500 ج.م/شهر)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clinic-slug-input">المسار المخصص (URL Slug) *</label>
            <input 
              id="clinic-slug-input"
              type="text" 
              placeholder="el-nokhba" 
              dir="ltr"
              value={newClinic.slug}
              onChange={(e) => setNewClinic(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'), slugManual: true }))}
              required
            />
            <small className="help-text">سيكون رابط الحجز المباشر: /c/{newClinic.slug || 'slug'}/booking</small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="btn-confirm-provision">
              تجهيز وتدشين العيادة
            </button>
          </div>
        </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
