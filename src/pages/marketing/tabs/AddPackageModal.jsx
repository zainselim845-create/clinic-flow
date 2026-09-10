import React from 'react';
import { X } from 'lucide-react';
import { Dialog } from '../../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';

export function AddPackageModal({
  isOpen,
  onClose,
  onSubmit,
  packageData,
  setPackageData,
  patients
}) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Dialog.Content className="modal-content" style={{ maxWidth: '560px', width: '100%' }}>
            <div className="modal-header">
              <Dialog.Title asChild>
                <h3>إضافة باقة علاجية أو ليزر لمريض</h3>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <button className="close-btn" onClick={onClose} type="button" aria-label="إغلاق">
                  <X size={20} />
                </button>
              </Dialog.CloseTrigger>
            </div>
            <form onSubmit={onSubmit} className="modal-form">
              <div className="form-group">
                <label>اختر المريض:</label>
                <select 
                  value={packageData.patientId} 
                  onChange={(e) => setPackageData(prev => ({ ...prev, patientId: e.target.value }))}
                  required
                >
                  <option value="">-- اختر المريض من القائمة --</option>
                  {(patients || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>اسم الباقة:</label>
                <input 
                  type="text"
                  value={packageData.packageName}
                  onChange={(e) => setPackageData(prev => ({ ...prev, packageName: e.target.value }))}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>إجمالي الجلسات:</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="20"
                    value={packageData.totalSessions}
                    onChange={(e) => setPackageData(prev => ({ ...prev, totalSessions: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>الجلسات المنجزة:</label>
                  <input 
                    type="number" 
                    min="0" 
                    max={packageData.totalSessions}
                    value={packageData.completedSessions}
                    onChange={(e) => setPackageData(prev => ({ ...prev, completedSessions: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>السعر الإجمالي:</label>
                <input 
                  type="text"
                  value={packageData.price}
                  onChange={(e) => setPackageData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ وتفعيل التتبع</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
