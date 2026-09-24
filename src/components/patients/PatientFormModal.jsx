import React from 'react';
import { X } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Portal } from '@ark-ui/react/portal';

export default function PatientFormModal({
  isOpen,
  onClose,
  selectedPatient,
  formData,
  setFormData,
  onSubmit
}) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Dialog.Content className="modal-content glass-card" style={{ maxWidth: '640px', width: '100%' }}>
            <div className="modal-header">
              <Dialog.Title asChild>
                <h3>{selectedPatient ? 'تعديل بيانات المريض' : 'إضافة مريض جديد'}</h3>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <button className="close-btn" type="button" aria-label="إغلاق" onClick={onClose}>
                  <X size={24} />
                </button>
              </Dialog.CloseTrigger>
            </div>
            
            <form onSubmit={onSubmit} className="modal-form">
              <div className="form-group">
                <label>الاسم بالكامل</label>
                <input 
                  type="text" 
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>العمر</label>
                  <input 
                    type="number" 
                    className="input-field"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>الجنس</label>
                  <select 
                    className="input-field"
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input 
                    type="tel" 
                    className="input-field"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>فصيلة الدم</label>
                  <select 
                    className="input-field"
                    value={formData.bloodType || ''}
                    onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                  >
                    <option value="">غير معروف</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>التشخيص والشكوى المبدئية</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="مثال: ألم في الأسنان، فحص دوري..."
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label style={{ color: '#DC2626', fontWeight: 800 }}>تنبيهات طبية وحساسيات (Medical Alerts)</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="مثال: حساسية بنسلين، ضغط، سكري، أدوية سيولة..."
                  value={formData.medicalAlerts || ''}
                  onChange={(e) => setFormData({...formData, medicalAlerts: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>ملاحظات إضافية</label>
                <textarea 
                  className="input-field"
                  rows="2"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
                <button type="submit" className="btn-primary">حفظ</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
