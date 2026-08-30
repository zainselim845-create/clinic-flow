import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Printer, Send, FileText, CheckCircle2, 
  Stethoscope, Calendar, User, Phone, Pill
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayDateStr } from '../utils/timeSlots';
import './PrescriptionModal.css';


const COMMON_DIAGNOSES = [
  'التهاب المعدة والأمعاء الحاد',
  'متلازمة القولون العصبي (IBS)',
  'ارتجاع المريء المعدي (GERD)',
  'نزلة معوية حادة وجفاف خفيف',
  'ارتفاع ضغط الدم الشرياني',
  'داء السكري من النوع الثاني',
  'فحص شامل ومتابعة دورية'
];

const COMMON_MEDICATIONS = [
  { name: 'Panadol Extra 500mg', dose: 'قرص واحد', freq: 'عند اللزوم كل 8 ساعات', duration: '5 أيام', notes: 'بعد الأكل' },
  { name: 'Nexium 40mg', dose: 'قرص واحد', freq: 'مرة واحدة يومياً صباحاً', duration: '14 يوم', notes: 'قبل الإفطار بنصف ساعة' },
  { name: 'Colona Tablets', dose: 'قرص واحد', freq: '3 مرات يومياً', duration: '10 أيام', notes: 'قبل الوجبات بـ 20 دقيقة' },
  { name: 'Augmentin 1gm', dose: 'قرص واحد', freq: 'كل 12 ساعة', duration: '7 أيام', notes: 'بعد الأكل مباشرة' },
  { name: 'Motilium 10mg', dose: 'قرص واحد', freq: 'قبل الأكل 3 مرات', duration: '5 أيام', notes: 'لتنظيم حركة المعدة' },
  { name: 'Antinal 200mg', dose: 'كبسولة واحدة', freq: '4 مرات يومياً', duration: '5 أيام', notes: 'مطهر معوي' }
];

export const PrescriptionModal = ({ isOpen, onClose, patient, appointment }) => {
  const { state, dispatch } = useApp();
  const clinicInfo = state.clinicInfo || {};
  const today = getTodayDateStr();

  const [diagnosis, setDiagnosis] = useState(appointment?.notes || '');
  const [medications, setMedications] = useState([
    { id: 'med-1', name: '', dose: '', freq: '', duration: '', notes: '' }
  ]);
  const [labTests, setLabTests] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [generalAdvice, setGeneralAdvice] = useState('الراحة التامة وتناول السوائل الدافئة والالتزام بالجرعات في مواعيدها.');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const patientName = patient?.name || appointment?.patientName || 'مريض العيادة';
  const patientPhone = patient?.phone || appointment?.patientPhone || '';
  const patientAge = patient?.age || appointment?.patientAge || '30';
  const patientGender = patient?.gender || appointment?.patientGender || 'غير محدد';

  const handleAddMedication = () => {
    setMedications(prev => [
      ...prev,
      { id: 'med-' + Date.now(), name: '', dose: '', freq: '', duration: '', notes: '' }
    ]);
  };

  const handleRemoveMedication = (id) => {
    if (medications.length <= 1) return;
    setMedications(prev => prev.filter(m => m.id !== id));
  };

  const handleMedChange = (id, field, value) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleQuickAddMed = (preset) => {
    setMedications(prev => {
      // replace empty row or append
      const last = prev[prev.length - 1];
      if (prev.length === 1 && !last.name) {
        return [{ id: last.id, ...preset }];
      }
      return [...prev, { id: 'med-' + Date.now(), ...preset }];
    });
  };

  const handleSavePrescription = () => {
    const rxData = {
      id: 'rx-' + Date.now(),
      patientId: patient?.id || appointment?.patientId || 'patient-1',
      patientName,
      patientPhone,
      appointmentId: appointment?.id,
      date: today,
      doctorName: clinicInfo.doctorName || 'د. أحمد الشريف',
      specialty: clinicInfo.specialty || 'استشاري الباطنة والجهاز الهضمي',
      diagnosis,
      medications: medications.filter(m => m.name.trim()),
      labTests,
      followUpDate,
      generalAdvice,
      createdAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_PRESCRIPTION', payload: rxData });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!patientPhone) {
      alert('رقم هاتف المريض غير متوفر.');
      return;
    }

    const medsText = medications
      .filter(m => m.name.trim())
      .map((m, idx) => `${idx + 1}. *${m.name}* (${m.dose})\n   - التكرار: ${m.freq} | المدة: ${m.duration} ${m.notes ? `(${m.notes})` : ''}`)
      .join('\n\n');

    const msg = `*الروشتة الطبية الإلكترونية — ${clinicInfo.name || 'عيادة كلينك فلو'}*
*الطبيب المعالج:* ${clinicInfo.doctorName || 'د. أحمد الشريف'} (${clinicInfo.specialty || 'استشاري'})
-----------------------------------------
*المريض:* ${patientName} | *التاريخ:* ${today}
*التشخيص:* ${diagnosis || 'فحص سريري ومتابعة'}
-----------------------------------------
*العلاج الدوائي (Rx):*
${medsText || 'لا توجد أدوية محددة.'}

${labTests ? `*الفحوصات والتحاليل المطلوبة:*\n- ${labTests}\n` : ''}
${followUpDate ? `*موعد الاستشارة القادم:* ${followUpDate}\n` : ''}
*تعليمات عامة:* ${generalAdvice}
-----------------------------------------
*العنوان:* ${clinicInfo.address || 'مصر الجديدة'}
*للطوارئ:* ${clinicInfo.phone || '01006285031'}`;

    const cleanPhone = patientPhone.replace(/\D/g, '');
    const url = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="prescription-modal-overlay">
      <div className="prescription-modal-card glass-card">
        
        {/* Header */}
        <div className="modal-header">
          <div className="brand-title">
            <Pill size={22} className="text-primary" />
            <h3>منشئ الروشتة الطبية والعلاج الإلكتروني (E-Prescription)</h3>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Patient Summary Bar */}
        <div className="patient-rx-summary-strip">
          <div className="rx-meta-pill">
            <User size={15} />
            <span><strong>المريض:</strong> {patientName}</span>
          </div>
          <div className="rx-meta-pill">
            <Calendar size={15} />
            <span><strong>التاريخ:</strong> {today}</span>
          </div>
          <div className="rx-meta-pill">
            <Phone size={15} />
            <span dir="ltr">{patientPhone}</span>
          </div>
          <div className="rx-meta-pill">
            <span><strong>السن:</strong> {patientAge} سنة</span>
          </div>
        </div>

        <div className="modal-body-scrollable">
          
          {/* 1. Diagnosis Section */}
          <div className="rx-section-box">
            <label className="rx-section-label">
              <Stethoscope size={16} /> التشخيص الطبي (Diagnosis):
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="اكتب التشخيص الطبي للحالة..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
            
            <div className="quick-tags-row">
              <span className="quick-label">تشخيصات شائعة:</span>
              {COMMON_DIAGNOSES.map((d, i) => (
                <button 
                  key={i} 
                  type="button" 
                  className="quick-diag-chip"
                  onClick={() => setDiagnosis(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Medications Section (Rx) */}
          <div className="rx-section-box">
            <div className="section-title-row">
              <label className="rx-section-label">
                <Pill size={16} /> الأدوية والعلاج المقترح (Rx):
              </label>
              <button 
                type="button" 
                className="btn-add-med-row" 
                onClick={handleAddMedication}
              >
                <Plus size={15} />
                <span>إضافة دواء جديد</span>
              </button>
            </div>

            {/* Quick Medications Bar */}
            <div className="quick-tags-row">
              <span className="quick-label">أدوية شائعة:</span>
              {COMMON_MEDICATIONS.map((med, i) => (
                <button 
                  key={i} 
                  type="button" 
                  className="quick-med-chip"
                  onClick={() => handleQuickAddMed(med)}
                >
                  + {med.name}
                </button>
              ))}
            </div>

            {/* Dynamic Meds Grid */}
            <div className="medications-table-wrapper">
              <table className="medications-rx-table">
                <thead>
                  <tr>
                    <th>اسم الدواء والتركيز</th>
                    <th>الجرعة</th>
                    <th>التكرار والموعد</th>
                    <th>المدة</th>
                    <th>ملاحظات</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((med) => (
                    <tr key={med.id}>
                      <td>
                        <input 
                          type="text" 
                          className="rx-cell-input name-col" 
                          placeholder="e.g. Panadol 500mg" 
                          value={med.name}
                          onChange={(e) => handleMedChange(med.id, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="rx-cell-input" 
                          placeholder="قرص واحد" 
                          value={med.dose}
                          onChange={(e) => handleMedChange(med.id, 'dose', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="rx-cell-input" 
                          placeholder="كل 8 ساعات" 
                          value={med.freq}
                          onChange={(e) => handleMedChange(med.id, 'freq', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="rx-cell-input" 
                          placeholder="5 أيام" 
                          value={med.duration}
                          onChange={(e) => handleMedChange(med.id, 'duration', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="rx-cell-input" 
                          placeholder="بعد الأكل" 
                          value={med.notes}
                          onChange={(e) => handleMedChange(med.id, 'notes', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          type="button" 
                          className="btn-trash-med" 
                          onClick={() => handleRemoveMedication(med.id)}
                          disabled={medications.length <= 1}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Lab Investigations & Next Appointment */}
          <div className="form-grid-2col">
            <div className="rx-section-box">
              <label className="rx-section-label">
                <FileText size={16} /> الفحوصات والتحاليل المطلوبة (Lab & Radiology):
              </label>
              <textarea 
                className="input-field" 
                rows={3}
                placeholder="تحليل صورة دم كاملة CBC، سونار على البطن..."
                value={labTests}
                onChange={(e) => setLabTests(e.target.value)}
              />
            </div>

            <div className="rx-section-box">
              <label className="rx-section-label">
                <Calendar size={16} /> موعد الاستشارة / المتابعة القادمة:
              </label>
              <input 
                type="date" 
                className="input-field"
                min={today}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />

              <label className="rx-section-label" style={{ marginTop: '0.75rem' }}>
                تعليمات وإرشادات للمريض:
              </label>
              <input 
                type="text" 
                className="input-field" 
                value={generalAdvice}
                onChange={(e) => setGeneralAdvice(e.target.value)}
              />
            </div>
          </div>

        </div>

        {/* Printable Prescription Template (Visible during window.print) */}
        <div className="printable-rx-sheet" id="printable-rx">
          <div className="print-header">
            <div className="print-clinic-brand">
              <h2>{clinicInfo.name || 'عيادة كلينك فلو'}</h2>
              <h4>{clinicInfo.doctorName || 'د. أحمد الشريف'}</h4>
              <p>{clinicInfo.specialty || 'استشاري الباطنة والجهاز الهضمي والكبد'}</p>
            </div>
            <div className="print-clinic-contacts">
              <p>العنوان: {clinicInfo.address}</p>
              <p>الهاتف: {clinicInfo.phone}</p>
            </div>
          </div>

          <div className="print-patient-bar">
            <span><strong>اسم المريض:</strong> {patientName}</span>
            <span><strong>السن:</strong> {patientAge} سنة</span>
            <span><strong>التاريخ:</strong> {today}</span>
          </div>

          {diagnosis && (
            <div className="print-diagnosis-bar">
              <strong>التشخيص الطبي (Diagnosis):</strong> {diagnosis}
            </div>
          )}

          <div className="print-rx-symbol">℞</div>

          <div className="print-meds-list">
            {medications.filter(m => m.name.trim()).map((m, idx) => (
              <div key={idx} className="print-med-item">
                <div className="print-med-name">
                  <strong>{idx + 1}. {m.name}</strong> — {m.dose}
                </div>
                <div className="print-med-details">
                  <span>التكرار: {m.freq}</span>
                  <span>المدة: {m.duration}</span>
                  {m.notes && <span>({m.notes})</span>}
                </div>
              </div>
            ))}
          </div>

          {labTests && (
            <div className="print-labs-box">
              <strong>الفحوصات والتحاليل المطلوبة:</strong>
              <p>{labTests}</p>
            </div>
          )}

          {followUpDate && (
            <div className="print-followup-box">
              <strong>موعد الاستشارة القادمة:</strong> {followUpDate}
            </div>
          )}

          <div className="print-footer">
            <p>{generalAdvice}</p>
            <div className="print-signature-line">
              <span>توقيع الطبيب المعالج: _______________________</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-footer-actions">
          {savedSuccess && (
            <div className="save-success-pill">
              <CheckCircle2 size={16} />
              <span>تم حفظ الروشتة في ملف المريض بنجاح!</span>
            </div>
          )}

          <button 
            type="button" 
            className="btn-primary-action" 
            onClick={handleSavePrescription}
          >
            <CheckCircle2 size={16} />
            <span>حفظ الروشتة في سجل المريض</span>
          </button>

          <button 
            type="button" 
            className="btn-print-action" 
            onClick={handlePrint}
          >
            <Printer size={16} />
            <span>طباعة الروشتة (A4 / A5)</span>
          </button>

          <button 
            type="button" 
            className="btn-whatsapp-action" 
            onClick={handleSendWhatsApp}
          >
            <Send size={16} />
            <span>إرسال عبر واتساب المريض</span>
          </button>

          <button 
            type="button" 
            className="btn-cancel-action" 
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
};
export default PrescriptionModal;
