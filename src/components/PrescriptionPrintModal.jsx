import React from 'react';
import { Dialog } from './ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { Printer, MessageCircle, X, ShieldCheck, Stethoscope, QrCode } from 'lucide-react';
import { formatPrescriptionForWhatsApp } from '../services/prescriptionService';
import { getWhatsAppUri } from '../services/smsService';
import './PrescriptionPrintModal.css';

export default function PrescriptionPrintModal({
  isOpen,
  prescription,
  onClose
}) {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const formattedText = formatPrescriptionForWhatsApp(prescription);
    const url = getWhatsAppUri(prescription.patientPhone, formattedText);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const isModalOpen = isOpen !== undefined ? isOpen : !!prescription;

  return (
    <Dialog.Root open={isModalOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <Dialog.Content className="modal-content prescription-modal-sheet">
            <Dialog.Title className="sr-only">الروشتة الطبية الرسمية</Dialog.Title>
            <Dialog.Description className="sr-only">عرض وطباعة الروشتة الطبية المعتمدة ومشاركتها عبر واتساب</Dialog.Description>
            {/* Top Toolbar (Hidden on print) */}
            <div className="prescription-action-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Stethoscope size={18} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>الروشتة الطبية الرسمية (e-Prescription)</span>
              </div>
              <div className="prescription-actions-group">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="btn-rx-action btn-rx-whatsapp"
                  title="إرسال الروشتة للمريض على واتساب"
                >
                  <MessageCircle size={16} />
                  <span>إرسال واتساب</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn-rx-action btn-rx-print"
                  title="طباعة الروشتة أو الحفظ كـ PDF"
                >
                  <Printer size={16} />
                  <span>طباعة الروشتة (A4 / PDF)</span>
                </button>
                <Dialog.CloseTrigger asChild>
                  <button type="button" onClick={onClose} className="btn-rx-action btn-rx-close" aria-label="إغلاق">
                    <X size={16} />
                    <span>إغلاق</span>
                  </button>
                </Dialog.CloseTrigger>
              </div>
            </div>

            {/* Printable Prescription Paper (Visible on print & on screen) */}
            <div className="printable-prescription-sheet">
              {/* Official Header */}
              <div className="rx-paper-header">
                <div className="rx-doctor-meta">
                  <h2 className="rx-doctor-name">{prescription.doctorName || 'د. استشاري العيادة'}</h2>
                  <div className="rx-doctor-title">{prescription.doctorTitle || 'استشاري ورئيس القسم'}</div>
                  <div className="rx-syndicate-num">{prescription.syndicateNumber || 'ترخيص مزاولة مهنة معتمد'}</div>
                </div>

                <div className="rx-clinic-branding">
                  <div className="rx-clinic-name">{prescription.clinicName || 'كلينيك فلو'}</div>
                  <div className="rx-clinic-contact">
                    <div>{prescription.clinicSpecialty || 'عيادة تخصصية'}</div>
                    <div>{prescription.clinicPhone || 'هاتف العيادة'}</div>
                    <div>{prescription.clinicAddress || 'جمهورية مصر العربية'}</div>
                  </div>
                </div>
              </div>

              {/* Patient Info Strip */}
              <div className="rx-patient-strip">
                <div className="rx-strip-item">
                  <span className="rx-strip-label">اسم المريض:</span>
                  <strong className="rx-strip-value">{prescription.patientName}</strong>
                </div>
                <div className="rx-strip-item">
                  <span className="rx-strip-label">السن:</span>
                  <span className="rx-strip-value">{prescription.patientAge ? `${prescription.patientAge} سنة` : 'غير محدد'}</span>
                </div>
                <div className="rx-strip-item">
                  <span className="rx-strip-label">التاريخ:</span>
                  <span className="rx-strip-value" style={{ direction: 'ltr' }}>{prescription.date}</span>
                </div>
                <div className="rx-strip-item">
                  <span className="rx-strip-label">رقم الملف:</span>
                  <span className="rx-strip-value" style={{ direction: 'ltr' }}>#{prescription.patientId?.slice(-6) || 'RX-01'}</span>
                </div>
              </div>

              {/* Rx Body */}
              <div className="rx-paper-body">
                <div className="rx-watermark-symbol">℞</div>

                {prescription.diagnosis && (
                  <div className="rx-diagnosis-line">
                    <span style={{ fontWeight: 700, color: '#0F766E' }}>التشخيص الطبي: </span>
                    <span>{prescription.diagnosis}</span>
                  </div>
                )}

                {/* Medication Items */}
                <ol className="rx-medications-list">
                  {(prescription.medications || []).map((med, index) => (
                    <li key={med.id || index} className="rx-med-item">
                      <div className="rx-med-name-row">
                        <span className="rx-med-name">{index + 1}. {med.name}</span>
                        {med.duration && <span className="rx-med-duration">{med.duration}</span>}
                      </div>
                      <div className="rx-med-details-row">
                        <span><strong>الجرعة:</strong> {med.dose || 'حسب الإرشاد'}</span>
                        <span><strong>المواعيد:</strong> {med.frequency || 'يومياً'}</span>
                      </div>
                      {med.instructions && (
                        <div className="rx-med-instruction">💡 {med.instructions}</div>
                      )}
                    </li>
                  ))}
                </ol>

                {/* General Advice */}
                {prescription.generalInstructions && (
                  <div className="rx-general-advice">
                    <strong>توصيات وتعليمات الطبيب: </strong>
                    <span>{prescription.generalInstructions}</span>
                  </div>
                )}
              </div>

              {/* Official Footer with QR verification & Signature */}
              <div className="rx-paper-footer">
                <div className="rx-security-box">
                  <div className="rx-qr-placeholder">
                    <QrCode size={40} style={{ color: '#0F766E' }} />
                  </div>
                  <div className="rx-verification-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, color: '#0F766E' }}>
                      <ShieldCheck size={14} />
                      <span>روشتة إلكترونية معتمدة</span>
                    </div>
                    <div>كود التحقق: <strong style={{ direction: 'ltr', display: 'inline-block' }}>{prescription.verificationCode}</strong></div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>صادرة عبر منظومة ClinicFlow السحابية</div>
                  </div>
                </div>

                <div className="rx-stamp-box">
                  <div className="rx-stamp-label">توقيع وخاتم الطبيب المعالج</div>
                  <div className="rx-stamp-line">
                    <span>{prescription.doctorName}</span>
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
