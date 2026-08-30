import React, { useState } from 'react';
import { 
  DENTAL_WORK_TYPES, TOOTH_SHADES, LAB_ORDER_STATUSES 
} from '../services/labsService';
import { Layers, X, CheckCircle2, Calendar, DollarSign, Palette } from 'lucide-react';
import './LabOrderModal.css';

const LabOrderModal = ({ 
  isOpen, 
  onClose, 
  onSaveOrder, 
  patients = [] 
}) => {
  if (!isOpen) return null;

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
    <div className="lab-modal-overlay">
      <div className="lab-modal-card">
        
        <div className="lab-modal-header">
          <div className="hdr-flex">
            <Layers size={20} className="text-nebras-orange" />
            <div>
              <h4>إصدار طلب معمل تركيبات جديد (Lab Order)</h4>
              <p>طلب تاج، جسر، أو طقم من معمل الأسنان الخارجي مع تحديد اللون والسن</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-close-sm">
            <X size={16} />
          </button>
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
              <label>رقم السن / الضرس (FDI)</label>
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
            <button type="button" onClick={onClose} className="btn-cancel">
              إلغاء
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-save">
              <CheckCircle2 size={16} />
              <span>إرسال وتوثيق الطلب</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default LabOrderModal;
