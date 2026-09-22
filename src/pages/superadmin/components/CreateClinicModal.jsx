import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { X, Eye, EyeOff } from 'lucide-react';
import { slugifyClinic } from '../../../services/authService';

export function CreateClinicModal({
  isOpen,
  onClose,
  newClinic,
  setNewClinic,
  onSubmit
}) {
  const [showPassword, setShowPassword] = useState(false);
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
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <select
                  id="clinic-specialty-select"
                  value={
                    ['طب وجراحة الأسنان', 'الأمراض الجلدية والتجميل والليزر', 'طب الأطفال وحديثي الولادة', 'طب وجراحة العيون', 'أمراض النساء والتوليد', 'الأشعة والتصوير الطبي', 'القلب والأوعية الدموية', 'العظام والمفاصل', 'الباطنة والجهاز الهضمي'].includes(newClinic.specialty)
                      ? newClinic.specialty
                      : 'custom'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'custom') {
                      setNewClinic(prev => ({
                        ...prev,
                        specialty: val,
                        slug: prev.slugManual ? prev.slug : slugifyClinic(prev.name, val)
                      }));
                    }
                  }}
                  style={{ minWidth: '160px', padding: '0.5rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                >
                  <option value="طب وجراحة الأسنان">طب وجراحة الأسنان</option>
                  <option value="الأمراض الجلدية والتجميل والليزر">جلدية وتجميل</option>
                  <option value="طب الأطفال وحديثي الولادة">طب الأطفال (Pediatrics)</option>
                  <option value="طب وجراحة العيون">طب العيون (Ophthalmology)</option>
                  <option value="أمراض النساء والتوليد">نساء وتوليد (OB/GYN)</option>
                  <option value="الأشعة والتصوير الطبي">أشعة وتصوير طبي</option>
                  <option value="القلب والأوعية الدموية">قلب وأوعية دموية</option>
                  <option value="العظام والمفاصل">عظام ومفاصل</option>
                  <option value="الباطنة والجهاز الهضمي">باطنة وجهاز هضمي</option>
                  <option value="custom">تخصص آخر (مخصص)...</option>
                </select>
                <input 
                  id="clinic-specialty-input"
                  type="text" 
                  placeholder="أدخل التخصص الطبي..." 
                  value={newClinic.specialty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewClinic(prev => ({ 
                      ...prev, 
                      specialty: val,
                      slug: prev.slugManual ? prev.slug : slugifyClinic(prev.name, val)
                    }));
                  }}
                  style={{ flex: 1, minWidth: '150px' }}
                  required
                />
              </div>
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

            <div className="form-group relative">
              <label htmlFor="clinic-password-input">كلمة المرور لحساب الطبيب *</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="clinic-password-input"
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  dir="ltr"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  value={newClinic.doctorPassword || ''}
                  onChange={(e) => setNewClinic(prev => ({ ...prev, doctorPassword: e.target.value }))}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              onChange={(e) => {
                const s = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                setNewClinic(prev => ({
                  ...prev,
                  slug: s,
                  slugManual: true
                }));
              }}
              required
            />
            <small className="help-text">سيكون رابط الحجز المباشر: /c/{newClinic.slug || 'slug'}/booking</small>
          </div>

          <div className="form-group">
            <label htmlFor="clinic-sender-id-input">معرّف مرسل الـ SMS الحصري (Telecom Sender ID) - اختياري</label>
            <input 
              id="clinic-sender-id-input"
              type="text" 
              placeholder="مثال: EliteClinic أو DrAhmed" 
              dir="ltr"
              maxLength={11}
              value={newClinic.senderId || ''}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 11);
                setNewClinic(prev => ({ ...prev, senderId: clean, senderIdManual: true }));
              }}
            />
            <small className="help-text">
              يُحدد من قِبل إدارة العيادة (من 3 إلى 11 حرف/رقم إنجليزي دون مسافات). المعرف الحالي: <strong>{newClinic.senderId || 'لم يُحدد بعد (اختياري)'}</strong>
            </small>
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
