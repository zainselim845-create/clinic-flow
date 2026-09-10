import React, { useState } from 'react';
import { 
  DENTAL_WORK_TYPES, TOOTH_SHADES 
} from '../services/labsService';
import { Layers, X, CheckCircle2 } from 'lucide-react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import './LabOrderModal.css';

const LabOrderModal = ({ 
  isOpen, 
  onClose, 
  onSaveOrder, 
  patients = [] 
}) => {
  const [patientName, setPatientName] = useState('');
  const [labName, setLabName] = useState('معمل الأهرام للتركيبات الرقمية');
  const [workType, setWorkType] = useState('zircon_crown');
  const [toothNumber, setToothNumber] = useState('');
  const [shade, setShade] = useState('A2');
  const [cost, setCost] = useState('450');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientName) return;

    setIsSubmitting(true);
    const workObj = DENTAL_WORK_TYPES.find(w => w.id === workType);

    const newOrder = {
      id: 'lab_' + Date.now(),
      patientName,
      labName,
      workType: workObj?.labelAr || workType,
      toothNumber: toothNumber ? Number(toothNumber) : null,
      shade,
      cost: Number(cost || 0),
      status: 'sent',
      sentDate: new Date().toISOString().split('T')[0],
      dueDate,
      notes,
      createdAt: new Date().toISOString()
    };

    if (onSaveOrder) onSaveOrder(newOrder);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }}>
      <Portal>
        <Dialog.Backdrop className="lab-modal-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="lab-modal-card">
            
            <div className="lab-modal-header">
              <div className="hdr-flex">
                <Layers size={20} className="text-nebras-orange" />
                <div>
                  <Dialog.Title asChild>
                    <h4>طلب معمل أسنان جديد (Dental Lab Order)</h4>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <p>إرسال ومتابعة التركيبات الثابتة والمتحركة بدقة سريرية</p>
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.CloseTrigger asChild>
                <button onClick={onClose} className="btn-close-sm" aria-label="إغلاق النافذة" type="button">
                  <X size={16} />
                </button>
              </Dialog.CloseTrigger>
            </div>

        <form onSubmit={handleSubmit} className="lab-modal-body">
          
          <div className="form-grid-2">
            <div className="field-block">
              <label>اسم المريض *</label>
              <input
                type="text"
                list="patients-list"
                required
                placeholder="اسم المريض..."
                className="input-field"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
              <datalist id="patients-list">
                {patients.map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>

            <div className="field-block">
              <label>المعمل الخارجي *</label>
              <input
                type="text"
                required
                placeholder="اسم المعمل..."
                className="input-field"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="field-block">
              <label>نوع التركيبة أو العمل السني *</label>
              <select
                className="input-field"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
              >
                {DENTAL_WORK_TYPES.map(w => (
                  <option key={w.id} value={w.id}>{w.labelAr}</option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <label>رقم السن / الضرس</label>
              <input
                type="number"
                placeholder="مثال: 16"
                className="input-field"
                value={toothNumber}
                onChange={(e) => setToothNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="field-block">
              <label>درجة اللون / الشيد (Tooth Shade) *</label>
              <select
                className="input-field"
                value={shade}
                onChange={(e) => setShade(e.target.value)}
              >
                {TOOTH_SHADES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <label>تكلفة المعمل (ج.م)</label>
              <input
                type="number"
                min="0"
                step="50"
                className="input-field"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>

            <div className="field-block">
              <label>تاريخ الاستلام المتوقع *</label>
              <input
                type="date"
                required
                className="input-field"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="field-block">
            <label>تعليمات خاصة وملاحظات للمعمل</label>
            <textarea
              rows="2"
              placeholder="مثال: يرجى مراعاة مسافة الإطباق (Occlusion Clearance)، تشريح طبيعي دقيق..."
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="lab-modal-footer">
            <Dialog.CloseTrigger asChild>
              <button type="button" onClick={onClose} className="btn-cancel">
                إلغاء
              </button>
            </Dialog.CloseTrigger>
            <button type="submit" disabled={isSubmitting} className="btn-save">
              <CheckCircle2 size={16} />
              <span>إرسال وتوثيق الطلب</span>
            </button>
          </div>

        </form>

          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default LabOrderModal;
