import React, { useState, useMemo } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { Stethoscope, Check, CalendarPlus, BellRing, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { checkPrescriptionSafety } from '../../services/drugInteractionService';
import './ConsultationModal.css';

export default function ConsultationModal({
  isOpen,
  appointment,
  onClose,
  onComplete
}) {
  const { state, dispatch } = useApp();
  const [diagnosis, setDiagnosis] = useState('');
  const [procedures, setProcedures] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpOption, setFollowUpOption] = useState('none');
  const [recallInterval, setRecallInterval] = useState('none');

  // Retrieve patient health factors & allergy history
  const patientRecord = useMemo(() => {
    if (!appointment) return null;
    return (state.patients || []).find(p => 
      p.id === (appointment.patientId || appointment.id) || 
      (p.phone && appointment.patientPhone && p.phone === appointment.patientPhone)
    ) || {};
  }, [state.patients, appointment]);

  // Real-time Clinical Decision Support (CDS) Drug & Allergy Safety Warnings
  const safetyWarnings = useMemo(() => {
    const combinedClinicalText = `${diagnosis} ${procedures} ${notes}`.trim();
    if (!combinedClinicalText || !patientRecord) return [];
    return checkPrescriptionSafety(combinedClinicalText, patientRecord);
  }, [diagnosis, procedures, notes, patientRecord]);

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

    // Doctor only writes clinical data — payment is handled by secretary
    onComplete({
      appointmentId: appointment.id,
      patientId: appointment.patientId || appointment.id,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      diagnosis,
      procedures,
      notes,
      fee: appointment.fee || '300 ج.م',
      recallInterval,
      followUpOption
    });
  };

  const isModalOpen = isOpen !== undefined ? isOpen : !!appointment;

  return (
    <Dialog.Root open={isModalOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content className="modal-content consultation-modal consultation-modal-box">
            <div className="consultation-header">
              <div className="consultation-title">
                <Stethoscope className="text-primary" size={22} />
                <Dialog.Title asChild>
                  <h3>إنهاء كشف المريض: {appointment?.patientName || ''}</h3>
                </Dialog.Title>
              </div>
              <Dialog.CloseTrigger asChild>
                <button type="button" onClick={onClose} className="btn-close" aria-label="إغلاق"><X size={20} /></button>
              </Dialog.CloseTrigger>
            </div>

        <form onSubmit={handleSubmit} className="consultation-form">
          <div className="consultation-scroll-body">
            <div className="patient-quick-badge">
              <div className="badge-item">
                <span className="badge-label">نوع الزيارة</span>
                <strong className="badge-value">{appointment?.type || 'كشف عادي'}</strong>
              </div>
              <div className="badge-item">
                <span className="badge-label">رقم الهاتف</span>
                <strong className="badge-value" style={{ direction: 'ltr', textAlign: 'right' }}>{appointment?.patientPhone || ''}</strong>
              </div>
              <div className="badge-item">
                <span className="badge-label">رسوم الكشف</span>
                <strong className="badge-value" style={{ color: '#1E8E3E' }}>{appointment?.fee || '300 ج.م'}</strong>
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
              <label>الإجراءات والعلاجات المنفذة</label>
              <textarea
                rows={2}
                placeholder="مثال: حشو تجميلي ضرس 6 سفلي، تنظيف جير، خلع ضرس عقل..."
                value={procedures}
                onChange={(e) => setProcedures(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>ملاحظات الكشف والتوصيات الطبية</label>
              <textarea
                rows={2}
                placeholder="ملاحظات الطبيب السريرية، تفاصيل العلاج، أو توصيات المتابعة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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

            {/* CDS Clinical Decision Support Alert Banner */}
            {safetyWarnings.length > 0 && (
              <div className="cds-safety-alert-box" style={{
                margin: '1rem 0',
                padding: '0.9rem 1.1rem',
                borderRadius: '12px',
                background: '#FEF2F2',
                border: '1.5px solid #F87171',
                color: '#991B1B',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <ShieldAlert size={20} color="#DC2626" />
                  <span>تنبيه أمان دوائي وسريري عاجل!</span>
                </div>
                {safetyWarnings.map((warning, idx) => (
                  <div key={idx} style={{ fontSize: '0.86rem', lineHeight: 1.5, background: '#FFFFFF', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #FECACA' }}>
                    <div style={{ fontWeight: 700, color: '#B91C1C' }}>{warning.title}</div>
                    <div style={{ color: '#4B5563', margin: '0.2rem 0' }}>{warning.description}</div>
                    <div style={{ color: '#047857', fontWeight: 600, fontSize: '0.82rem' }}>💡 التوصية السريرية: {warning.recommendation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions consultation-footer">
            <Dialog.CloseTrigger asChild>
              <button type="button" onClick={onClose} className="btn-cancel-consultation">
                إلغاء
              </button>
            </Dialog.CloseTrigger>
            <button type="submit" className="btn-submit-consultation">
              <Check size={18} />
              <span>إنهاء الكشف وتحويل للمحاسبة</span>
            </button>
          </div>
        </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

