import React, { useState, useMemo } from 'react';
import { Stethoscope, Check, CalendarPlus, BellRing, AlertTriangle, Pill, Plus, Trash2, Printer, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { checkPrescriptionSafety } from '../../services/drugInteractionService';
import PrescriptionModal from '../../components/PrescriptionModal';

const POPULAR_DRUGS = [
  { name: 'Augmentin', dosage: '1g أقراص', frequency: 'قرص كل 12 ساعة بعد الأكل', duration: 'لمدة 7 أيام' },
  { name: 'Cataflam', dosage: '50mg أقراص', frequency: 'قرص عند اللزوم بعد الأكل', duration: 'عند الألم' },
  { name: 'Panadol Extra', dosage: '500mg', frequency: 'قرصين عند الصداع أو الحرارة', duration: 'عند اللزوم' },
  { name: 'Flagyl', dosage: '500mg أقراص', frequency: 'قرص كل 8 ساعات', duration: 'لمدة 5 أيام' },
  { name: 'Controloc', dosage: '40mg', frequency: 'قرص صباحاً على الريق قبل الإفطار', duration: 'لمدة 14 يوماً' }
];

export default function ConsultationModal({
  appointment,
  onClose,
  onComplete
}) {
  const { state, dispatch } = useApp();
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpOption, setFollowUpOption] = useState('none'); // 'none' | '7_days' | '14_days'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'instapay'
  const [recallInterval, setRecallInterval] = useState('none'); // 'none' | '1_month' | '3_months' | '6_months' | '12_months'

  // E-Prescription State
  const [medications, setMedications] = useState([]);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '', duration: '', instructions: '' });
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);

  const patientRecord = useMemo(() => {
    return (state.patients || []).find(p => p.id === appointment?.patientId) || appointment || {};
  }, [state?.patients, appointment]);

  const safetyWarnings = useMemo(() => {
    const medsText = medications.map(m => `${m.name} ${m.dosage || ''}`).join(' ');
    const combinedText = `${notes} ${medsText} ${newMed.name}`;
    return checkPrescriptionSafety(combinedText, patientRecord);
  }, [notes, medications, newMed.name, patientRecord]);

  const handleAddMedication = (e) => {
    e?.preventDefault();
    if (!newMed.name.trim()) return;
    setMedications([
      ...medications,
      {
        id: 'med_' + Date.now(),
        name: newMed.name.trim(),
        dosage: newMed.dosage.trim() || 'حسب التوجيه',
        frequency: newMed.frequency.trim() || 'قرص بعد الأكل',
        duration: newMed.duration.trim() || 'لمدة 5 أيام',
        instructions: newMed.instructions.trim()
      }
    ]);
    setNewMed({ name: '', dosage: '', frequency: '', duration: '', instructions: '' });
  };

  const handleAddPresetDrug = (drug) => {
    setMedications([
      ...medications,
      {
        id: 'med_' + Date.now(),
        name: drug.name,
        dosage: drug.dosage,
        frequency: drug.frequency,
        duration: drug.duration,
        instructions: ''
      }
    ]);
  };

  const handleRemoveMedication = (medId) => {
    setMedications(medications.filter(m => m.id !== medId));
  };

  if (!appointment) return null;

  const currentPrescriptionObject = {
    id: 'rx_' + (appointment.id || Date.now()),
    rxNumber: 'RX-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toISOString().split('T')[0],
    patientId: appointment.patientId || appointment.id,
    patientName: appointment.patientName,
    patientPhone: appointment.patientPhone,
    patientAge: patientRecord.age,
    patientGender: patientRecord.gender,
    diagnosis,
    medications,
    notes
  };

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
        notes: notes || diagnosis || 'متابعة وفحص دوري',
        createdAt: new Date().toISOString(),
        lastContactedAt: null
      };
      dispatch({ type: 'ADD_RECALL', payload: recallPayload });
    }

    const rxPayload = medications.length > 0 ? currentPrescriptionObject : null;

    if (rxPayload) {
      dispatch({ type: 'ADD_PRESCRIPTION', payload: rxPayload });
    }

    onComplete({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      diagnosis,
      notes,
      medications,
      prescription: rxPayload,
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
            <label>ملاحظات الكشف والتوصيات السريرية</label>
            <textarea
              rows={2}
              placeholder="ملاحظات الطبيب، التشخيص الإضافي، أو توصيات المتابعة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* E-Prescription & Drug Builder */}
          <div className="form-group rx-builder-group" style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Pill size={16} className="text-primary" />
                <strong style={{ fontSize: '0.9rem' }}>الروشتة الطبية الإلكترونية (E-Prescription):</strong>
              </div>
              {medications.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setIsRxModalOpen(true)}
                  className="btn btn-sm btn-outline-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                >
                  <Printer size={14} />
                  <span>معاينة وطباعة الروشتة ({medications.length})</span>
                </button>
              )}
            </div>

            {/* Quick Drug Suggestions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>أدوية شائعة:</span>
              {POPULAR_DRUGS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAddPresetDrug(d)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  + {d.name} {d.dosage}
                </button>
              ))}
            </div>

            {/* New Drug Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) 42px', gap: '0.4rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem' }}>اسم الدواء:</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: أوجمنتين"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem' }}>الجرعة / التركيز:</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: 1g أقراص"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem' }}>التكرار وميعاد الجرعة:</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: قرص كل 12 ساعة"
                  value={newMed.frequency}
                  onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem' }}>المدة:</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: لمدة 7 أيام"
                  value={newMed.duration}
                  onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                />
              </div>
              <div>
                <button 
                  type="button" 
                  onClick={handleAddMedication}
                  disabled={!newMed.name.trim()}
                  className="btn btn-primary"
                  style={{ height: '36px', width: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="إضافة الدواء للروشتة"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Prescribed Medications List */}
            {medications.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {medications.map((m, idx) => (
                  <div key={m.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', border: '1px solid var(--border-color)' }}>
                    <div>
                      <strong>{idx + 1}. {m.name}</strong> <span style={{ color: 'var(--primary)' }}>({m.dosage})</span> — {m.frequency} <span style={{ color: 'var(--text-secondary)' }}>[{m.duration}]</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveMedication(m.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.2rem' }}
                      title="حذف الدواء"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {safetyWarnings.length > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#991B1B' }}>
              {safetyWarnings.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: idx < safetyWarnings.length - 1 ? '0.4rem' : 0 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>{w.title}:</strong> {w.description}
                    {w.recommendation && <div style={{ fontSize: '0.78rem', color: '#7F1D1D', marginTop: '2px' }}>{w.recommendation}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

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

      {isRxModalOpen && (
        <PrescriptionModal
          isOpen={isRxModalOpen}
          onClose={() => setIsRxModalOpen(false)}
          prescription={currentPrescriptionObject}
          clinicInfo={state.clinicInfo}
        />
      )}
    </div>
  );
}
