import React from 'react';

export function CreateClinicModal({
  isOpen,
  onClose,
  newClinic,
  setNewClinic,
  onSubmit
}) {
  if (!isOpen) return null;

  return (
    <div className="saas-modal-backdrop" onClick={onClose}>
      <div className="saas-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="create-clinic-title">
        <div className="saas-modal-header">
          <h3 id="create-clinic-title">تسجيل عيادة جديدة في المنصة (Provision Tenant)</h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="close-modal-btn"
            aria-label="إغلاق النافذة"
          >
            ✕
          </button>
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
                  slug: prev.slug ? prev.slug : val.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')
                }));
              }}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="clinic-doctor-input">اسم الطبيب المدير</label>
              <input 
                id="clinic-doctor-input"
                type="text" 
                placeholder="مثال: د. كريم محمود" 
                value={newClinic.doctorName}
                onChange={(e) => setNewClinic(prev => ({ ...prev, doctorName: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="clinic-specialty-input">التخصص الطبي</label>
              <input 
                id="clinic-specialty-input"
                type="text" 
                placeholder="مثال: طب الأطفال وحديثي الولادة" 
                value={newClinic.specialty}
                onChange={(e) => setNewClinic(prev => ({ ...prev, specialty: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="clinic-slug-input">المسار المخصص (URL Slug) *</label>
              <input 
                id="clinic-slug-input"
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

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="btn-confirm-provision">
              تجهيز وحفظ العيادة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
