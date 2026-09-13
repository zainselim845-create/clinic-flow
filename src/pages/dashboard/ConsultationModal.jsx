import React, { useState, useMemo } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { 
  Stethoscope, Check, CalendarPlus, BellRing, X, AlertTriangle, 
  ShieldAlert, Pill, Plus, Trash2, Printer, Sparkles 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { checkPrescriptionSafety } from '../../services/drugInteractionService';
import { 
  COMMON_MEDICATIONS, 
  createPrescription, 
  savePrescriptionToStorage 
} from '../../services/prescriptionService';
import PrescriptionPrintModal from '../../components/PrescriptionPrintModal';
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

  // e-Prescription builder state
  const [medications, setMedications] = useState([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('');
  const [newMedDuration, setNewMedDuration] = useState('');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [previewPrescription, setPreviewPrescription] = useState(null);

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
    const medsText = medications.map(m => `${m.name} ${m.instructions || ''}`).join(' ');
    const combinedClinicalText = `${diagnosis} ${procedures} ${notes} ${newMedName} ${medsText}`.trim();
    if (!combinedClinicalText || !patientRecord) return [];
    return checkPrescriptionSafety(combinedClinicalText, patientRecord);
  }, [diagnosis, procedures, notes, newMedName, medications, patientRecord]);

  if (!appointment) return null;

  const handleAddPresetMedication = (preset) => {
    const newMed = {
      id: 'med-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: preset.name,
      dose: preset.defaultDose,
      frequency: preset.defaultFrequency,
      duration: preset.defaultDuration,
      instructions: preset.defaultInstructions
    };
    setMedications(prev => [...prev, newMed]);
  };

  const handleAddCustomMedication = (e) => {
    if (e) e.preventDefault();
    if (!newMedName.trim()) return;
    const newMed = {
      id: 'med-' + Date.now(),
      name: newMedName.trim(),
      dose: newMedDose.trim() || 'قرص واحد',
      frequency: newMedFrequency.trim() || 'مرتين يومياً بعد الأكل',
      duration: newMedDuration.trim() || 'لمدة 5 أيام',
      instructions: newMedInstructions.trim()
    };
    setMedications(prev => [...prev, newMed]);
    setNewMedName('');
    setNewMedDose('');
    setNewMedFrequency('');
    setNewMedDuration('');
    setNewMedInstructions('');
  };

  const handleRemoveMedication = (id) => {
    setMedications(prev => prev.filter(m => m.id !== id));
  };

  const handleOpenPrescriptionPreview = () => {
    const compiled = createPrescription({
      clinic: state.activeClinic,
      doctor: state.activeDoctor || (state.doctors && state.doctors[0]),
      patient: patientRecord,
      appointment,
      diagnosis,
      procedures,
      medications,
      generalInstructions,
      nextVisit: followUpOption === '7_days' ? 'بعد أسبوع' : followUpOption === '14_days' ? 'بعد أسبوعين' : null
    });
    setPreviewPrescription(compiled);
    setShowPrescriptionModal(true);
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

    // Compile e-Prescription
    const compiledPrescription = createPrescription({
      clinic: state.activeClinic,
      doctor: state.activeDoctor || (state.doctors && state.doctors[0]),
      patient: patientRecord,
      appointment,
      diagnosis,
      procedures,
      medications,
      generalInstructions,
      nextVisit: followUpOption === '7_days' ? 'بعد أسبوع' : followUpOption === '14_days' ? 'بعد أسبوعين' : null
    });

    if (medications.length > 0 || diagnosis) {
      savePrescriptionToStorage(compiledPrescription);
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
      followUpOption,
      prescription: compiledPrescription
    });
  };

  const isModalOpen = isOpen !== undefined ? isOpen : !!appointment;

  return (
    <Dialog.Root open={isModalOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content className="modal-content consultation-modal consultation-modal-box">
            <div className="apple-sheet-grabber" style={{ marginBottom: '8px' }} />
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
              <label htmlFor="consult-diagnosis">التشخيص الطبي السريري *</label>
              <input
                id="consult-diagnosis"
                type="text"
                placeholder="مثال: التهاب معوي حاد، نزلة شعبية، علاج عصب، متابعة سكر..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="consult-procedures">الإجراءات والعلاجات المنفذة</label>
              <textarea
                id="consult-procedures"
                rows={2}
                placeholder="مثال: حشو تجميلي ضرس 6 سفلي، تنظيف جير، خلع ضرس عقل..."
                value={procedures}
                onChange={(e) => setProcedures(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="consult-notes">ملاحظات الكشف والتوصيات الطبية</label>
              <textarea
                id="consult-notes"
                rows={2}
                placeholder="ملاحظات الطبيب السريرية، تفاصيل العلاج، أو توصيات المتابعة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* e-Prescription Digital Section */}
            <div className="rx-builder-container">
              <div className="rx-builder-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Pill size={17} style={{ color: '#0F766E' }} />
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>الروشتة والعلاج الدوائي المقترح (℞)</strong>
                  <span className="rx-count-pill">({medications.length})</span>
                </div>
                {medications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenPrescriptionPreview}
                    className="btn-rx-quick-preview"
                    title="معاينة وطباعة الروشتة الطبية الرسمية"
                    aria-label="معاينة وطباعة الروشتة الطبية الرسمية"
                  >
                    <Printer size={14} />
                    <span>معاينة وطباعة الروشتة</span>
                  </button>
                )}
              </div>

              {/* Quick Preset Medications Chips */}
              <div className="rx-preset-chips-container">
                <span className="rx-preset-label">أدوية شائعة سريعة الإضافة:</span>
                <div className="rx-preset-chips">
                  {COMMON_MEDICATIONS.slice(0, 6).map(med => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => handleAddPresetMedication(med)}
                      className="rx-chip-btn"
                      title={`إضافة ${med.name}`}
                      aria-label={`إضافة ${med.name}`}
                    >
                      <Plus size={12} />
                      <span>{med.name.split('(')[0].trim()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Medication Input Form */}
              <div className="rx-add-form-grid">
                <input
                  type="text"
                  className="input-field"
                  placeholder="اسم الدواء والشكل (مثال: كتافلام 50 مجم أقراص)"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  aria-label="اسم الدواء والشكل"
                />
                <div className="rx-inputs-row">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="الجرعة (قرص واحد)"
                    value={newMedDose}
                    onChange={(e) => setNewMedDose(e.target.value)}
                    aria-label="جرعة الدواء"
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="التكرار (كل 12 ساعة بعد الأكل)"
                    value={newMedFrequency}
                    onChange={(e) => setNewMedFrequency(e.target.value)}
                    aria-label="تكرار ومواعيد تناول الدواء"
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="المدة (لمدة 5 أيام)"
                    value={newMedDuration}
                    onChange={(e) => setNewMedDuration(e.target.value)}
                    aria-label="مدة تناول الدواء"
                  />
                </div>
                <div className="rx-inputs-row" style={{ marginTop: '0.35rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="تعليمات خاصة (مثال: مع كوب ماء وفير، تجنب الشاي والقهوة ساعتين)"
                    value={newMedInstructions}
                    onChange={(e) => setNewMedInstructions(e.target.value)}
                    aria-label="تعليمات خاصة بتناول الدواء"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMedication}
                    disabled={!newMedName.trim()}
                    className="btn-add-med-item"
                    aria-label="إضافة الدواء إلى الروشتة"
                  >
                    <Plus size={15} />
                    <span>إضافة للروشتة</span>
                  </button>
                </div>
              </div>

              {/* Added Medications Table */}
              {medications.length > 0 && (
                <div className="rx-meds-table-wrapper">
                  <table className="rx-meds-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>الدواء</th>
                        <th>الجرعة والتكرار</th>
                        <th>المدة</th>
                        <th>تعليمات</th>
                        <th>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medications.map((m, idx) => (
                        <tr key={m.id}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{m.name}</td>
                          <td>{m.dose} - {m.frequency}</td>
                          <td>{m.duration}</td>
                          <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{m.instructions || '-'}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedication(m.id)}
                              className="btn-remove-med"
                              title="حذف هذا الدواء"
                              aria-label={`حذف دواء ${m.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* General instructions */}
              <div style={{ marginTop: '0.6rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="نصائح وتعليمات عامة للمريض (شرب سوائل، راحة تامة، تجنب الأطعمة الحارة...)"
                  value={generalInstructions}
                  onChange={(e) => setGeneralInstructions(e.target.value)}
                  aria-label="نصائح وتعليمات عامة للمريض"
                />
              </div>
            </div>

            {/* Periodic Recall Selector */}
            <div className="form-group">
              <label htmlFor="consult-recall-interval" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BellRing size={16} className="text-primary" />
                <span>جدولة استدعاء ومتابعة دورية للمريض</span>
              </label>
              <select
                id="consult-recall-interval"
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
            {medications.length > 0 && (
              <button 
                type="button" 
                onClick={handleOpenPrescriptionPreview}
                className="btn-cancel-consultation"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: '#0F766E', color: '#0F766E' }}
              >
                <Printer size={15} />
                <span>معاينة الروشتة</span>
              </button>
            )}
            <button type="submit" className="btn-submit-consultation">
              <Check size={18} />
              <span>إنهاء الكشف وتحويل للمحاسبة</span>
            </button>
          </div>
        </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>

      {/* Prescription Preview & Print Modal */}
      {showPrescriptionModal && previewPrescription && (
        <PrescriptionPrintModal
          isOpen={showPrescriptionModal}
          prescription={previewPrescription}
          onClose={() => setShowPrescriptionModal(false)}
        />
      )}
    </Dialog.Root>
  );
}

