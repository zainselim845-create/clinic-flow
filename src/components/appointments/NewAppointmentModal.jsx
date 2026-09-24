import React from 'react';
import { X, Plus } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Portal } from '@ark-ui/react/portal';

/**
 * NewAppointmentModal
 * Accessible Ark UI Dialog for scheduling a new clinic appointment.
 */
const NewAppointmentModal = ({
  isOpen = false,
  onClose = () => {},
  formData = { patientId: '', date: '', time: '', type: 'كشف عيادة', fee: '', notes: '' },
  setFormData = () => {},
  onSubmit = () => {},
  patients = [],
  appointments = [],
  blockedSlots = [],
  availableSlots = [],
  onNavigateToNewPatient = () => {}
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Dialog.Content className="modal-content glass-card" style={{ maxWidth: '640px', width: '100%' }}>
            <div className="modal-header">
              <Dialog.Title asChild>
                <h3>إضافة موعد جديد في العيادة</h3>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <button className="close-btn" type="button" aria-label="إغلاق" onClick={onClose}>
                  <X size={24} />
                </button>
              </Dialog.CloseTrigger>
            </div>
            
            <form onSubmit={onSubmit} className="modal-form">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ margin: 0 }}>اسم المريض *</label>
                  <button
                    type="button"
                    onClick={onNavigateToNewPatient}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    title="فتح نافذة إضافة مريض جديد"
                  >
                    <Plus size={13} />
                    <span>إضافة مريض جديد</span>
                  </button>
                </div>
                <select 
                  className="input-field"
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  required
                >
                  <option value="">{patients.length === 0 ? 'لا يوجد مرضى مسجلين (أضف مريضاً أولاً)' : 'اختر المريض...'}</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>التاريخ *</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>الوقت *</label>
                  <select 
                    className="input-field"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  >
                    <option value="">اختر الوقت...</option>
                    {availableSlots.map(slot => {
                      const isBooked = (appointments || []).some(a => a.date === formData.date && a.time === slot && a.status !== 'cancelled');
                      const isBlocked = (blockedSlots || []).some(b => b.date === formData.date && (b.time === slot || b.isFullDay || b.time === 'FULL_DAY'));
                      const isUnavailable = isBooked || isBlocked;

                      return (
                        <option key={slot} value={slot} disabled={isUnavailable}>
                          {slot} {isBooked ? '(محجوز)' : isBlocked ? '(مغلق)' : '(متاح)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>نوع الكشف</label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="كشف عيادة / استشارة / متابعة"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>قيمة الكشف (ج.م)</label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="300 ج.م"
                  value={formData.fee || ''}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                  قيمة كشف العيادة الموحدة (يمكن تعديلها أو إضافة خدمات إضافية أثناء فحص الطبيب).
                </span>
              </div>

              <div className="form-group">
                <label>ملاحظات</label>
                <textarea 
                  className="input-field"
                  rows="3"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
                <button type="submit" className="btn-primary">حفظ وتأكيد الموعد</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default NewAppointmentModal;
