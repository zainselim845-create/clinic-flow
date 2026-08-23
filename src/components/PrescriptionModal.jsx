import React, { useState } from 'react';
import { X, Printer, Plus, Trash2, Send, Stethoscope, Pill } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './PrescriptionModal.css';

const PrescriptionModal = ({ isOpen, onClose, patient }) => {
  const { clinic, user } = useAuth();

  const doctorName = clinic?.name || user?.user_metadata?.name || 'د. أحمد الشريف';
  const specialty = clinic?.specialty || 'استشاري الباطنة والجهاز الهضمي';
  const clinicAddress = clinic?.address || 'القاهرة — التجمع الخامس — عيادات الأمل الطبية';
  const clinicPhone = clinic?.phone || '01006285031';

  const todayStr = new Date().toISOString().split('T')[0];

  const [diagnosis, setDiagnosis] = useState(patient?.diagnosis || 'كشف ومتابعة طبية');
  const [medicines, setMedicines] = useState([
    { name: '', dosage: 'قرص واحد', frequency: 'بعد الأكل مرتين يومياً', duration: 'لمدة ٧ أيام' }
  ]);
  const [advice, setAdvice] = useState('شرب كميات كافية من الماء والراحة التامة.');

  if (!isOpen || !patient) return null;

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: 'قرص واحد', frequency: 'بعد الأكل مرتين يومياً', duration: 'لمدة ٥ أيام' }]);
  };

  const handleRemoveMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const medList = medicines
      .filter(m => m.name.trim())
      .map((m, i) => `${i + 1}. ${m.name} — (${m.dosage}) ${m.frequency} [${m.duration}]`)
      .join('\n');

    const msg = `🏥 *روشتة طبية إلكترونية — ${doctorName}*\n` +
      `👤 *المريض:* ${patient.name}\n` +
      `📅 *التاريخ:* ${todayStr}\n` +
      `🩺 *التشخيص:* ${diagnosis}\n\n` +
      `💊 *العلاج والأدوية:*\n${medList || 'لا توجد أدوية مضافة'}\n\n` +
      `📝 *تعليمات:* ${advice}\n\n` +
      `📞 للاستفسار: ${clinicPhone}\nنتمنى لكم الشفاء العاجل! ✨`;

    const cleanPhone = patient.phone ? patient.phone.replace(/^0/, '20').replace(/\D/g, '') : '';
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="modal-overlay prescription-modal-overlay">
      <div className="modal-content glass-card prescription-modal-container">
        
        {/* Actions bar */}
        <div className="prescription-actions-header no-print">
          <div className="title-area">
            <Pill size={22} className="text-primary" />
            <h3>تحرير وطباعة الروشتة الطبية (Rx)</h3>
          </div>
          <div className="btn-group">
            <button className="btn-whatsapp-share" onClick={handleShareWhatsApp} title="إرسال الروشتة على واتساب المريض">
              <Send size={16} />
              <span>إرسال واتساب</span>
            </button>
            <button className="btn-print" onClick={handlePrint} title="طباعة الروشتة (A5/A4)">
              <Printer size={16} />
              <span>طباعة الروشتة 🖨️</span>
            </button>
            <button className="close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Printable Prescription Sheet */}
        <div className="printable-prescription-sheet" id="prescription-sheet">
          
          {/* Clinic Header */}
          <div className="prescription-header">
            <div className="doctor-meta">
              <h2>{doctorName}</h2>
              <p className="doctor-sub">{specialty}</p>
              <span className="clinic-contact-info">📞 {clinicPhone}</span>
            </div>
            <div className="clinic-badge-logo">
              <Stethoscope size={36} color="#1B6FE3" />
              <span>كلينك فلو</span>
            </div>
          </div>

          <div className="prescription-divider"></div>

          {/* Patient Info Bar */}
          <div className="prescription-patient-bar">
            <div className="patient-meta-item">
              <span className="label">اسم المريض:</span>
              <strong className="value">{patient.name}</strong>
            </div>
            <div className="patient-meta-item">
              <span className="label">العمر:</span>
              <span className="value">{patient.age ? `${patient.age} سنة` : 'غير محدد'}</span>
            </div>
            <div className="patient-meta-item">
              <span className="label">الجنس:</span>
              <span className="value">{patient.gender || 'ذكر'}</span>
            </div>
            <div className="patient-meta-item">
              <span className="label">التاريخ:</span>
              <span className="value">{todayStr}</span>
            </div>
          </div>

          {/* Diagnosis Field */}
          <div className="prescription-diagnosis-row">
            <span className="rx-label">التشخيص:</span>
            <input 
              type="text" 
              className="diagnosis-input" 
              value={diagnosis} 
              onChange={(e) => setDiagnosis(e.target.value)} 
              placeholder="التشخيص الطبي..."
            />
          </div>

          {/* Rx Symbol & Medicines Section */}
          <div className="prescription-body">
            <div className="rx-watermark">℞</div>

            <div className="medicines-editor-list">
              {medicines.map((med, index) => (
                <div key={index} className="med-row-item">
                  <span className="med-index">{index + 1}.</span>
                  <div className="med-fields">
                    <input 
                      type="text" 
                      className="med-input med-name" 
                      placeholder="اسم الدواء والتركيز (e.g. Panadol Extra 500mg)"
                      value={med.name}
                      onChange={(e) => handleMedChange(index, 'name', e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="med-input med-dosage" 
                      placeholder="الجرعة (e.g. قرص واحد)"
                      value={med.dosage}
                      onChange={(e) => handleMedChange(index, 'dosage', e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="med-input med-freq" 
                      placeholder="التكرار (e.g. بعد الأكل مرتين يومياً)"
                      value={med.frequency}
                      onChange={(e) => handleMedChange(index, 'frequency', e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="med-input med-dur" 
                      placeholder="المدة (e.g. لمدة أسبوع)"
                      value={med.duration}
                      onChange={(e) => handleMedChange(index, 'duration', e.target.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn-remove-med no-print" 
                    onClick={() => handleRemoveMedicine(index)}
                    title="حذف هذا الدواء"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button type="button" className="btn-add-med no-print" onClick={handleAddMedicine}>
                <Plus size={16} />
                <span>إضافة دواء آخر (Rx)</span>
              </button>
            </div>

            {/* Doctor Advice / Notes */}
            <div className="prescription-advice-box">
              <span className="advice-label">تعليمات ونصائح طبية:</span>
              <textarea 
                className="advice-textarea" 
                rows={2} 
                value={advice} 
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="تعليمات للمريض، مواعيد التحاليل، الراحة..."
              />
            </div>
          </div>

          {/* Footer Signature & Address */}
          <div className="prescription-footer">
            <div className="footer-address">
              <span>📍 {clinicAddress}</span>
            </div>
            <div className="footer-signature">
              <p>توقيع الطبيب المعالج</p>
              <div className="signature-line"></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default PrescriptionModal;
