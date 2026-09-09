import React from 'react';
import { 
  Printer, 
  Send, 
  X, 
  CheckCircle2, 
  Calendar, 
  User, 
  Stethoscope, 
  Phone, 
  MapPin, 
  ShieldCheck,
  AlertTriangle 
} from 'lucide-react';
import './PrescriptionModal.css';

export default function PrescriptionModal({
  isOpen,
  onClose,
  prescription,
  clinicInfo,
  doctorInfo
}) {
  if (!isOpen || !prescription) return null;

  const clinic = clinicInfo || {
    name: 'مركز النخبة الطبي التخصصي',
    doctorName: 'د. أحمد الشريف',
    specialty: 'استشاري طب وجراحة وتجميل الفم والأسنان',
    phone: '01006285031',
    address: 'شارع التسعين الشمالي، التجمع الخامس، القاهرة'
  };

  const doctor = doctorInfo || {
    name: clinic.doctorName || 'د. أحمد الشريف',
    title: clinic.specialty || 'المدير الطبي / استشاري أول',
    regNumber: 'م.ن 48291 / نقابة الأطباء'
  };

  const medications = prescription.medications || [];
  const rxDate = prescription.date || new Date().toISOString().split('T')[0];
  const rxId = prescription.rxNumber || prescription.id || 'RX-2026-001';

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const patientPhone = (prescription.patientPhone || '').replace(/\D/g, '');
    if (!patientPhone) {
      alert('لا يتوفر رقم هاتف للمريض لإرسال الروشتة.');
      return;
    }

    const medsSummary = medications.map((m, i) => 
      `${i + 1}. *${m.name}* (${m.dosage || ''})\n   - الجرعة: ${m.frequency || 'حسب الإرشادات'}\n   - المدة: ${m.duration || 'حسب الحاجة'}`
    ).join('\n');

    const message = `*روشتة طبية إلكترونية معتمدة* 📋
*العيادة:* ${clinic.name}
*الطبيب:* ${doctor.name} - ${doctor.title}
----------------------------
*المريض:* ${prescription.patientName}
*التاريخ:* ${rxDate}
*التشخيص:* ${prescription.diagnosis || 'فحص عام'}
----------------------------
*العلاج الموصوف (Rx):*
${medsSummary || 'يرجى مراجعة الصيدلي للتعليمات.'}

${prescription.notes ? `*ملاحظات الطبيب:* ${prescription.notes}\n` : ''}
----------------------------
📍 *العنوان:* ${clinic.address}
📞 *للاستفسار:* ${clinic.phone}
_نتمنى لكم الشفاء العاجل دائمًا_ ✨`;

    const formattedPhone = patientPhone.startsWith('0') ? '2' + patientPhone : patientPhone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="modal-backdrop-rx">
      <div className="rx-modal-dialog">
        
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="rx-modal-toolbar no-print">
          <div className="toolbar-info">
            <Stethoscope size={18} className="text-primary" />
            <span>الروشتة الطبية الإلكترونية الرسمية (Official Digital Rx)</span>
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={handleSendWhatsApp} className="btn-rx-action whatsapp" title="إرسال الروشتة للمريض عبر واتساب">
              <Send size={16} />
              <span>إرسال واتساب</span>
            </button>
            <button type="button" onClick={handlePrint} className="btn-rx-action print" title="طباعة الروشتة A4 / A5">
              <Printer size={16} />
              <span>طباعة الروشتة</span>
            </button>
            <button type="button" onClick={onClose} className="btn-rx-close" aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* The Official Printable Prescription Sheet (A4 / A5) */}
        <div className="prescription-sheet printable-content">
          
          {/* 1. Official Header */}
          <div className="rx-header">
            <div className="rx-clinic-branding">
              <h2 className="rx-clinic-name">{clinic.name}</h2>
              <p className="rx-doctor-name">{doctor.name}</p>
              <p className="rx-doctor-title">{doctor.title}</p>
              <span className="rx-license-badge">{doctor.regNumber}</span>
            </div>
            
            <div className="rx-header-symbol">
              <div className="caduceus-badge">
                <span className="rx-classic-symbol">℞</span>
              </div>
            </div>
          </div>

          <div className="rx-divider-line"></div>

          {/* 2. Patient Demographics Header */}
          <div className="rx-patient-bar">
            <div className="patient-meta-item">
              <span className="label">اسم المريض:</span>
              <strong className="val">{prescription.patientName}</strong>
            </div>
            <div className="patient-meta-item">
              <span className="label">السن / النوع:</span>
              <span className="val">{prescription.patientAge ? `${prescription.patientAge} سنة` : 'بالغ'} • {prescription.patientGender === 'female' ? 'أنثى' : 'ذكر'}</span>
            </div>
            <div className="patient-meta-item">
              <span className="label">التاريخ:</span>
              <span className="val">{rxDate}</span>
            </div>
            <div className="patient-meta-item">
              <span className="label">رقم الروشتة:</span>
              <span className="val rx-code">{rxId}</span>
            </div>
          </div>

          {/* Optional Diagnosis Badge */}
          {prescription.diagnosis && (
            <div className="rx-diagnosis-banner">
              <span className="diag-lbl">التشخيص الطبي (Diagnosis):</span>
              <span className="diag-val">{prescription.diagnosis}</span>
            </div>
          )}

          {/* 3. The Rx Medications Area */}
          <div className="rx-medications-body">
            <div className="rx-symbol-watermark">℞</div>

            <ol className="rx-drugs-list">
              {medications.length > 0 ? (
                medications.map((med, index) => (
                  <li key={med.id || index} className="rx-drug-item">
                    <div className="drug-main-row">
                      <strong className="drug-name">{med.name}</strong>
                      {med.dosage && <span className="drug-dosage">{med.dosage}</span>}
                      {med.duration && <span className="drug-duration">({med.duration})</span>}
                    </div>
                    {med.frequency && (
                      <div className="drug-instructions">
                        ↳ الجرعة والتكرار: <strong>{med.frequency}</strong>
                      </div>
                    )}
                    {med.instructions && (
                      <div className="drug-notes">
                        * إرشادات إضافية: {med.instructions}
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <div className="no-drugs-notice">
                  لم يتم إضافة أدوية لهذه الزيارة (فحص استشاري / متابعة دورية).
                </div>
              )}
            </ol>

            {/* Doctor's General Instructions */}
            {prescription.notes && (
              <div className="rx-general-notes">
                <div className="notes-header">توصيات وإرشادات سريرية للمريض:</div>
                <p className="notes-content">{prescription.notes}</p>
              </div>
            )}
          </div>

          {/* 4. Official Footer & Verification QR Code */}
          <div className="rx-footer">
            <div className="rx-contact-info">
              <div className="rx-meta-row">
                <MapPin size={13} />
                <span>{clinic.address}</span>
              </div>
              <div className="rx-meta-row">
                <Phone size={13} />
                <span>الهاتف / الطوارئ: {clinic.phone}</span>
              </div>
              <div className="rx-security-seal">
                <ShieldCheck size={14} color="#10B981" />
                <span>روشتة طبية معتمدة رقمياً عبر منظومة ClinicFlow</span>
              </div>
            </div>

            <div className="rx-signature-box">
              <div className="signature-line"></div>
              <span className="sig-label">توقيع وخاتم الطبيب المعالج</span>
              <span className="sig-doctor">{doctor.name}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
