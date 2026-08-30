import React, { useState } from 'react';
import { Stethoscope, Check, CalendarPlus, BellRing } from 'lucide-react';
import { useApp } from '../../context/AppContext';


export default function ConsultationModal({
  appointment,
  onClose,
  onComplete
}) {
  const { dispatch } = useApp();
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [followUpOption, setFollowUpOption] = useState('none'); // 'none' | '7_days' | '14_days'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'instapay'
  const [recallInterval, setRecallInterval] = useState('none'); // 'none' | '1_month' | '3_months' | '6_months' | '12_months'

  if (!appointment) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    // If periodic recall was chosen, dispatch ADD_RECALL
    if (recallInterval !== 'none') {
      const months = recallInterval === '1_month' ? 1 : recallInterval === '3_months' ? 3 : recallInterval === '6_months' ? 6 : 12;
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      const dueDate = d.toISOString().split('T')[0];

      const recallPayload = {
        id: 'rec-' + Date.now(),
        patientId: appointment.patientId || appointment.id,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        reason: diagnosis || 'متابعة وفحص دوري',
        intervalMonths: months,
        dueDate,
        status: 'pending',
        notes: consultationNotes || '',
        createdAt: new Date().toISOString(),
        lastContactedAt: null
      };
      dispatch({ type: 'ADD_RECALL', payload: recallPayload });
    }

    onComplete({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      diagnosis,
      prescription,
      notes: prescription,
      followUpOption,
      paymentMethod
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content consultation-modal" style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div className="title-row">
            <Stethoscope className="text-primary" size={20} />
            <h3>إنهاء كشف المريض: {appointment.patientName}</h3>
          </div>
          <button type="button" onClick={onClose} className="btn-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="consultation-form">
          <div className="patient-quick-badge">
            <span>نوع الزيارة: <strong>{appointment.type || 'كشف عادي'}</strong></span>
            <span>الهاتف: <strong>{appointment.patientPhone}</strong></span>
            <span>رسوم الكشف: <strong>{appointment.fee || '300 ج.م'}</strong></span>
          </div>

          <div className="form-group">
            <label>التشخيص الطبي (Diagnosis) *</label>
            <input
              type="text"
              placeholder="مثال: التهاب معوي حاد، نزلة شعبية، متابعة سكر..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>الوصفة الطبية وملاحظات العلاج</label>
            <textarea
              rows={2}
              placeholder="الأدوية المقررة أو اضغط زر 'روشتة إلكترونية' لإنشاء روشتة تفصيلية..."
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>طريقة تحصيل الرسوم (Payment Method)</label>
            <div className="followup-radio-group">
              <label className={`radio-pill ${paymentMethod === 'cash' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                />
                <span>نقداً (كاش)</span>
              </label>

              <label className={`radio-pill ${paymentMethod === 'card' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <span>فيزا / كارت</span>
              </label>

              <label className={`radio-pill ${paymentMethod === 'instapay' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payMethod"
                  value="instapay"
                  checked={paymentMethod === 'instapay'}
                  onChange={() => setPaymentMethod('instapay')}
                />
                <span>إنستاباي / محفظة</span>
              </label>
            </div>
          </div>

          {/* Periodic Recall Selector */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BellRing size={16} className="text-primary" />
              <span>جدولة استدعاء ومتابعة دورية تلقائية (Patient Recall)</span>
            </label>
            <select
              className="input-field"
              value={recallInterval}
              onChange={(e) => setRecallInterval(e.target.value)}
            >
              <option value="none">بدون جدولة استدعاء دوري</option>
              <option value="1_month">استدعاء دوري بعد شهر واحد (1)</option>
              <option value="3_months">استدعاء دوري بعد 3 أشهر (فحص سكر / ربع سنوي)</option>
              <option value="6_months">استدعاء دوري بعد 6 أشهر (نصف سنوي)</option>
              <option value="12_months">استدعاء دوري بعد سنة (فحص سنوي)</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <CalendarPlus size={16} />
              <span>استشارة قريبة مجانية</span>
            </label>
            <div className="followup-radio-group">
              <label className={`radio-pill ${followUpOption === 'none' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="followup"
                  value="none"
                  checked={followUpOption === 'none'}
                  onChange={() => setFollowUpOption('none')}
                />
                <span>لا تحتاج استشارة قريبة</span>
              </label>

              <label className={`radio-pill ${followUpOption === '7_days' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="followup"
                  value="7_days"
                  checked={followUpOption === '7_days'}
                  onChange={() => setFollowUpOption('7_days')}
                />
                <span>استشارة بعد أسبوع (7 أيام)</span>
              </label>

              <label className={`radio-pill ${followUpOption === '14_days' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="followup"
                  value="14_days"
                  checked={followUpOption === '14_days'}
                  onChange={() => setFollowUpOption('14_days')}
                />
                <span>استشارة بعد أسبوعين (14 يوماً)</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              إلغاء
            </button>
            <button type="submit" className="btn btn-success">
              <Check size={18} />
              <span>تأكيد إتمام الكشف وتحديث السجل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
