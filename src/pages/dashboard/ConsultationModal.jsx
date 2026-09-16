import React, { useState, useMemo, useEffect } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { 
  Stethoscope, Check, CalendarPlus, BellRing, X, 
  ShieldAlert, Pill, Plus, Trash2, Printer
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTenant } from '../../context/TenantContext';
import { checkPrescriptionSafety } from '../../services/drugInteractionService';
import { COMMON_MEDICATIONS, createPrescriptionRecord } from '../../services/prescriptionService';
import './ConsultationModal.css';

export default function ConsultationModal({
  isOpen,
  appointment,
  onClose,
  onComplete
}) {
  const { state, dispatch } = useApp();
  const { tenant } = useTenant();
  const defaultClinicFee = state.clinicInfo?.regularFee || '300 ج.م';
  const [customFee, setCustomFee] = useState(appointment?.fee || defaultClinicFee);
  const [diagnosis, setDiagnosis] = useState('');
  const [procedures, setProcedures] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpOption, setFollowUpOption] = useState('none');
  const [recallInterval, setRecallInterval] = useState('none');

  // e-Prescription States
  const [medications, setMedications] = useState([]);
  const [selectedQuickMed, setSelectedQuickMed] = useState('');
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('قرص واحد');
  const [newMedFreq, setNewMedFreq] = useState('كل 8 ساعات بعد الأكل');
  const [newMedDuration, setNewMedDuration] = useState('لمدة 5 أيام');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [printPrescriptionImmediate, setPrintPrescriptionImmediate] = useState(false);

  useEffect(() => {
    if (appointment) {
      setCustomFee(appointment.fee || state.clinicInfo?.regularFee || '300 ج.م');
      setDiagnosis(appointment.diagnosis || '');
      setProcedures(appointment.procedures || '');
      setNotes(appointment.notes || '');
      setMedications([]);
      setNewMedName('');
      setSelectedQuickMed('');
      setPrintPrescriptionImmediate(false);
    }
  }, [appointment, state.clinicInfo]);

  const handleSelectQuickMed = (medId) => {
    setSelectedQuickMed(medId);
    const found = COMMON_MEDICATIONS.find(m => m.id === medId);
    if (found) {
      setNewMedName(found.name);
      setNewMedDose(found.defaultDose);
      setNewMedFreq(found.defaultFrequency);
      setNewMedDuration(found.defaultDuration);
      setNewMedInstructions(found.defaultInstructions);
    }
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    setMedications(prev => [
      ...prev,
      {
        id: 'med_' + Date.now(),
        name: newMedName.trim(),
        dose: newMedDose.trim(),
        frequency: newMedFreq.trim(),
        duration: newMedDuration.trim(),
        instructions: newMedInstructions.trim()
      }
    ]);
    setNewMedName('');
    setSelectedQuickMed('');
    setNewMedInstructions('');
  };

  const handleRemoveMedication = (id) => {
    setMedications(prev => prev.filter(m => m.id !== id));
  };

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
    const medNames = medications.map(m => m.name).join(' ');
    const combinedClinicalText = `${diagnosis} ${procedures} ${notes} ${newMedName} ${medNames}`.trim();
    if (!combinedClinicalText || !patientRecord) return [];
    return checkPrescriptionSafety(combinedClinicalText, patientRecord);
  }, [diagnosis, procedures, notes, newMedName, medications, patientRecord]);

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

    // Build e-Prescription if medications added
    let prescriptionRecord = null;
    if (medications.length > 0) {
      prescriptionRecord = createPrescriptionRecord({
        clinic: tenant || state.clinicInfo,
        doctor: { name: tenant?.doctorName || state.clinicInfo?.doctorName || 'د. استشاري العيادة' },
        patient: {
          id: appointment.patientId || appointment.id,
          name: appointment.patientName,
          phone: appointment.patientPhone
        },
        appointment,
        diagnosis,
        procedures,
        medications,
        generalInstructions: notes
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
      fee: customFee?.trim() || appointment.fee || '300 ج.م',
      recallInterval,
      followUpOption,
      prescription: prescriptionRecord,
      printPrescriptionImmediate
    });
  };

  const isModalOpen = isOpen !== undefined ? isOpen : !!appointment;

  return (
    <Dialog.Root open={isModalOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content className="modal-content consultation-modal consultation-modal-box">
            <div className="sheet-modal-grabber" style={{ marginBottom: '8px' }} />
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

            <div className="form-group" style={{ 
              background: 'var(--bg-secondary)', 
              padding: '0.85rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              marginBottom: '1rem'
            }}>
              <label htmlFor="consult-fee" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.4rem' }}>
                <span>تكلفة الكشف / الخدمات المنفذة (ج.م)</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                  (يحددها الطبيب وفريقه بحسب الإجراءات المنفذة)
                </span>
              </label>
              <input
                id="consult-fee"
                type="text"
                className="input-field"
                placeholder="300 ج.م"
                value={customFee}
                onChange={(e) => setCustomFee(e.target.value)}
                style={{ fontWeight: 600, fontSize: '0.95rem' }}
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

            {/* e-Prescription Section */}
            <div style={{
              background: 'var(--surface, #FFFFFF)',
              border: '1px solid var(--border-color, #E4E4E7)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Pill size={18} color="var(--primary)" />
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    الروشتة الطبية الإلكترونية (e-Prescription)
                  </strong>
                  {medications.length > 0 && (
                    <span style={{ fontSize: '0.75rem', background: '#ECFDF5', color: '#047857', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700 }}>
                      {medications.length} دواء
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Pick from Library */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: 600 }}>
                  أدوية شائعة جاهزة للعيادة:
                </label>
                <select
                  value={selectedQuickMed}
                  onChange={(e) => handleSelectQuickMed(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                >
                  <option value="">-- اختر من قائمة الأدوية الشائعة أو اكتب يدوياً أدناه --</option>
                  {COMMON_MEDICATIONS.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.defaultFrequency})</option>
                  ))}
                </select>
              </div>

              {/* Manual Entry Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="اسم الدواء (مثال: أوجمنتين 1 جم)"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', gridColumn: 'span 2' }}
                />
                <input
                  type="text"
                  placeholder="الجرعة (مثال: قرص واحد)"
                  value={newMedDose}
                  onChange={(e) => setNewMedDose(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
                <input
                  type="text"
                  placeholder="التكرار (مثال: كل 8 ساعات)"
                  value={newMedFreq}
                  onChange={(e) => setNewMedFreq(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
                <input
                  type="text"
                  placeholder="المدة (مثال: 5 أيام)"
                  value={newMedDuration}
                  onChange={(e) => setNewMedDuration(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddMedication}
                  disabled={!newMedName.trim()}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  <Plus size={15} />
                  <span>إضافة للروشتة</span>
                </button>
              </div>

              {/* Added Medications Table */}
              {medications.length > 0 && (
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                  <table style={{ width: '100%', fontSize: '0.82rem', textAlign: 'right', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.35rem' }}>الدواء</th>
                        <th style={{ padding: '0.35rem' }}>الجرعة</th>
                        <th style={{ padding: '0.35rem' }}>التكرار</th>
                        <th style={{ padding: '0.35rem' }}>المدة</th>
                        <th style={{ padding: '0.35rem', textAlign: 'center' }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medications.map((m, idx) => (
                        <tr key={m.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.35rem', fontWeight: 700 }}>{m.name}</td>
                          <td style={{ padding: '0.35rem' }}>{m.dose}</td>
                          <td style={{ padding: '0.35rem' }}>{m.frequency}</td>
                          <td style={{ padding: '0.35rem' }}>{m.duration}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedication(m.id)}
                              style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '0.2rem' }}
                              title="حذف الدواء"
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

              {/* Print / WhatsApp Immediate Option */}
              {medications.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={printPrescriptionImmediate}
                    onChange={(e) => setPrintPrescriptionImmediate(e.target.checked)}
                  />
                  <Printer size={14} color="var(--primary)" />
                  <span>فتح نافذة الطباعة والإرسال عبر واتساب فور إنهاء الكشف</span>
                </label>
              )}
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

