import React, { useState } from 'react';
import { Stethoscope, Check, CalendarPlus, BellRing } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './ConsultationModal.css';

export default function ConsultationModal({
  appointment,
  onClose,
  onComplete
}) {
  const { dispatch } = useApp();
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
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
        clinicId: appointment.clinicId || appointment.clinic_id || null,
        clinic_id: appointment.clinicId || appointment.clinic_id || null,
        patientId: appointment.patientId || appointment.id,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        reason: diagnosis || 'متابعة وفحص دوري',
        intervalMonths: months,
        dueDate,
        status: 'pending',
        notes: notes || diagnosis || 'متابعة وفحص دوري',
        createdAt: new Date().toISOString(),
        lastContactedAt: null
      };

      dispatch({
        type: 'ADD_RECALL',
        payload: recallPayload
      });
    }

    onComplete({
      appointmentId: appointment.id,
      patientId: appointment.patientId || appointment.id,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      diagnosis,
      notes,
      paidAmount: appointment.fee || '300 ج.م',
      paymentMethod,
      recallInterval,
      followUpOption
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content consultation-modal consultation-modal-box">
        <div className="consultation-header">
          <div className="consultation-title">
            <Stethoscope className="text-primary" size={22} />
            <h3>إنهاء كشف المريض: {appointment.patientName}</h3>
          </div>
          <button type="button" onClick={onClose} className="btn-close" aria-label="إغلاق">×</button>
        </div>

        <form onSubmit={handleSubmit} className="consultation-form">
          <div className="consultation-scroll-body">
            <div className="patient-quick-badge">
              <div className="badge-item">
                <span className="badge-label">نوع الزيارة</span>
                <strong className="badge-value">{appointment.type || 'كشف عادي'}</strong>
              </div>
              <div className="badge-item">
                <span className="badge-label">رقم الهاتف</span>
                <strong className="badge-value" style={{ direction: 'ltr', textAlign: 'right' }}>{appointment.patientPhone}</strong>
              </div>
              <div className="badge-item">
                <span className="badge-label">رسوم الكشف</span>
                <strong className="badge-value" style={{ color: '#1E8E3E' }}>{appointment.fee || '300 ج.م'}</strong>
              </div>
            </div>

            <div className="form-group">
              <label>التشخيص الطبي السريري *</label>
              <input
                type="text"
                placeholder="مثال: التهاب معوي حاد، نزلة شعبية، علاج عصب، متابعة سكر..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ملاحظات الكشف والتوصيات الطبية</label>
              <textarea
                rows={3}
                placeholder="ملاحظات الطبيب السريرية، تفاصيل العلاج، أو توصيات المتابعة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>طريقة تحصيل الرسوم</label>
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
                  <span>فيزا وبطاقة بنكية</span>
                </label>

                <label className={`radio-pill ${paymentMethod === 'instapay' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payMethod"
                    value="instapay"
                    checked={paymentMethod === 'instapay'}
                    onChange={() => setPaymentMethod('instapay')}
                  />
                  <span>إنستاباي ومحفظة</span>
                </label>
              </div>
            </div>

            {/* Periodic Recall Selector */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BellRing size={16} className="text-primary" />
                <span>جدولة استدعاء ومتابعة دورية للمريض</span>
              </label>
              <select
                className="input-field"
                value={recallInterval}
                onChange={(e) => setRecallInterval(e.target.value)}
              >
                <option value="none">بدون استدعاء دوري</option>
                <option value="1_month">استدعاء دوري بعد شهر واحد (1)</option>
                <option value="3_months">استدعاء دوري بعد 3 أشهر (فحص ربع سنوي)</option>
                <option value="6_months">استدعاء دوري بعد 6 أشهر (فحص نصف سنوي)</option>
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
          </div>

          <div className="modal-actions consultation-footer">
            <button type="button" onClick={onClose} className="btn-cancel-consultation">
              إلغاء
            </button>
            <button type="submit" className="btn-submit-consultation">
              <Check size={18} />
              <span>تأكيد إتمام الكشف وحفظ السجل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
