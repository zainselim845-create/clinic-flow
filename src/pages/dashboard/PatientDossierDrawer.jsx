import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderOpen, Phone, Calendar, FileText, MessageCircle, 
  FileSpreadsheet, Pill, Printer
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ClinicalNotesPanel from '../../components/ClinicalNotesPanel';
import TreatmentPlanModal from '../../components/TreatmentPlanModal';
import PrescriptionModal from '../../components/PrescriptionModal';
import { getPatientClinicalNotes } from '../../services/clinicalNotesService';
import { getPatientTreatmentPlans } from '../../services/treatmentPlansService';

export default function PatientDossierDrawer({
  patient,
  patientAppointments = [],
  onClose
}) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'notes' | 'plans' | 'prescriptions'
  const [selectedRx, setSelectedRx] = useState(null);

  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const patientName = patient?.name || patient?.patientName || '';
  const patientPhone = patient?.phone || patient?.patientPhone || '';
  const patientId = patient?.id || patient?.patientId || (patientPhone ? 'pat_' + patientPhone.replace(/\D/g, '') : '');

  // Load clinical records
  useEffect(() => {
    async function loadData() {
      if (patientId) {
        const { data: notesData } = await getPatientClinicalNotes(patientId);
        if (notesData) setClinicalNotes(notesData);

        const { data: plansData } = await getPatientTreatmentPlans(patientId);
        if (plansData) setTreatmentPlans(plansData);
      }
    }
    loadData();
  }, [patientId]);

  const patientPrescriptions = useMemo(() => {
    const list = state.prescriptions || [];
    const directMatches = list.filter(rx => 
      (rx.patientId && String(rx.patientId) === String(patientId)) || 
      (patientPhone && rx.patientPhone && rx.patientPhone.replace(/\D/g, '') === patientPhone.replace(/\D/g, '')) ||
      (rx.patientName && patientName && rx.patientName.trim() === patientName.trim())
    );
    const attachedToPatient = patient.prescriptions || [];
    const map = new Map();
    [...attachedToPatient, ...directMatches].forEach(rx => {
      if (rx && (rx.id || rx.rxNumber)) {
        map.set(rx.id || rx.rxNumber, rx);
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
  }, [state.prescriptions, patientId, patientPhone, patientName, patient.prescriptions]);

  if (!patient) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content dossier-drawer" style={{ maxWidth: '880px', width: '95%' }}>
        
        {/* Drawer Header */}
        <div className="modal-header" style={{ background: 'var(--primary)', color: '#FFFFFF' }}>
          <div className="title-row">
            <FolderOpen style={{ color: 'var(--accent)' }} size={22} />
            <div>
              <h3 style={{ color: '#FFFFFF', margin: 0 }}>الملف الطبي السريري: {patientName}</h3>
              <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>رقم الملف: #{patient.fileNumber || patient.id?.slice(0, 8) || 'D-101'}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-close" style={{ color: '#FFFFFF' }}>×</button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-dossier-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{
              background: activeTab === 'overview' ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === 'overview' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            نظرة عامة والزيارات
          </button>

          <button
            type="button"
            className={`btn-dossier-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
            style={{
              background: activeTab === 'notes' ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === 'notes' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <FileText size={14} />
            <span>الملاحظات السريرية ({clinicalNotes.length})</span>
          </button>

          <button
            type="button"
            className={`btn-dossier-tab ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
            style={{
              background: activeTab === 'plans' ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === 'plans' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <FileSpreadsheet size={14} />
            <span>خطط العلاج ({treatmentPlans.length})</span>
          </button>

          <button
            type="button"
            className={`btn-dossier-tab ${activeTab === 'prescriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescriptions')}
            style={{
              background: activeTab === 'prescriptions' ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === 'prescriptions' ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Pill size={14} />
            <span>الروشتات الطبية ℞ ({patientPrescriptions.length})</span>
          </button>
        </div>

        <div className="dossier-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '1.25rem' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Patient Main Card */}
              <div className="patient-main-card">
                <div className="avatar-circle">
                  {patientName.charAt(0) || 'م'}
                </div>
                <div className="meta">
                  <h4>{patientName}</h4>
                  <div className="contact-row">
                    <a href={`tel:${patientPhone}`} className="btn-contact">
                      <Phone size={14} />
                      <span dir="ltr">{patientPhone}</span>
                    </a>
                    <a
                      href={`sms:+2${patientPhone.replace(/\D/g, '')}`}
                      className="btn-contact sms"
                    >
                      <MessageCircle size={14} />
                      <span>إرسال SMS</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="dossier-stats-row">
                <div className="dossier-stat">
                  <span>السن والنوع:</span>
                  <strong>{patient.age ? `${patient.age} سنة` : 'غير محدد'} • {patient.gender || 'ذكر'}</strong>
                </div>
                <div className="dossier-stat">
                  <span>فصيلة الدم:</span>
                  <strong>{patient.bloodType || 'غير محددة'}</strong>
                </div>
                <div className="dossier-stat">
                  <span>إجمالي الزيارات:</span>
                  <strong>{patient.visitsCount || patient.totalVisits || patientAppointments.length || 1} زيارات</strong>
                </div>
                <div className="dossier-stat">
                  <span>آخر زيارة:</span>
                  <strong>{patient.lastVisit || patient.date || 'اليوم'}</strong>
                </div>
              </div>

              {patient.medicalAlerts && (
                <div className="clinical-history-box" style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
                  <h5 style={{ color: '#991B1B' }}>تنبيهات طبية وحساسيات (Medical Alerts):</h5>
                  <p style={{ color: '#7F1D1D' }}>{patient.medicalAlerts}</p>
                </div>
              )}

              {patient.diagnosis && (
                <div className="clinical-history-box">
                  <h5>التشخيص الطبي الأولي:</h5>
                  <p>{patient.diagnosis}</p>
                </div>
              )}

              {patient.notes && (
                <div className="clinical-history-box">
                  <h5>ملاحظات إضافية:</h5>
                  <p>{patient.notes}</p>
                </div>
              )}

              {/* Past Appointments Timeline */}
              <div className="past-appointments-history" style={{ marginTop: '1.25rem' }}>
                <h5 style={{ margin: '0 0 0.75rem 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={16} className="text-primary" />
                  <span>سجل المواعيد والزيارات السابقة:</span>
                </h5>
                {patientAppointments.length === 0 ? (
                  <p className="no-history-text">لا توجد زيارات سابقة مسجلة لهذا المريض.</p>
                ) : (
                  <div className="appointments-history-list">
                    {patientAppointments.map((appt, i) => (
                      <div key={appt.id || i} className="history-item">
                        <div className="history-date">
                          <Calendar size={14} />
                          <span>{appt.date} - {appt.time}</span>
                        </div>
                        <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                        <span className="type-badge">{appt.type || 'كشف'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: CLINICAL NOTES */}
          {activeTab === 'notes' && (
            <ClinicalNotesPanel
              patientId={patientId}
              doctorName={state.clinicInfo?.doctorName || 'الطبيب المعالج'}
              notes={clinicalNotes}
              onNotesUpdate={setClinicalNotes}
            />
          )}

          {/* TAB 3: TREATMENT PLANS */}
          {activeTab === 'plans' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontWeight: 800 }}>خطط العلاج المسجلة للمريض ({treatmentPlans.length})</h4>
                <button
                  type="button"
                  onClick={() => setShowPlansModal(true)}
                  style={{
                    background: '#F7931E',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  فتح إدارة خطط العلاج
                </button>
              </div>

              {treatmentPlans.length === 0 ? (
                <div style={{ background: '#F8FAFC', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: '#64748B' }}>
                  لا توجد خطط علاج بعد. اضغط "فتح إدارة خطط العلاج" لإنشاء أول خطة.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {treatmentPlans.map(plan => (
                    <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.15rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{plan.title}</strong>
                        <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {plan.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>عدد الإجراءات: <strong>{plan.items?.length || 0}</strong></span>
                        <span>الصافي المطلوب: <strong style={{ color: 'var(--primary)' }}>{plan.netCost || plan.totalCost} ج.م</strong></span>
                        <span>بتاريخ: {new Date(plan.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRESCRIPTIONS (الروشتات الطبية الإلكترونية) */}
          {activeTab === 'prescriptions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontWeight: 800 }}>الروشتات الطبية الصادرة ({patientPrescriptions.length})</h4>
              </div>

              {patientPrescriptions.length === 0 ? (
                <div style={{ background: '#F8FAFC', padding: '2.5rem', borderRadius: '12px', textAlign: 'center', color: '#64748B' }}>
                  <Pill size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3, color: 'var(--primary)' }} />
                  <p style={{ margin: '0 0 0.35rem 0', fontWeight: 700, fontSize: '0.95rem' }}>لم تصدر أي روشتة طبية لهذا المريض حتى الآن.</p>
                  <span style={{ fontSize: '0.82rem', opacity: 0.8 }}>يتم إنشاء الروشتات الإلكترونية وطباعتها تلقائياً عند إنهاء الكشف الطبي.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {patientPrescriptions.map((rx) => (
                    <div 
                      key={rx.id || rx.rxNumber} 
                      style={{ 
                        background: 'var(--surface)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-lg)', 
                        padding: '1.1rem 1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ background: 'rgba(0, 113, 227, 0.1)', color: 'var(--primary)', padding: '3px 9px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800 }}>
                            {rx.rxNumber || 'RX-MED'}
                          </span>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {rx.diagnosis ? `تشخيص: ${rx.diagnosis}` : 'روشتة علاجية'}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                          <span>التاريخ: {rx.date || (rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('ar-EG') : 'اليوم')}</span>
                          <span>الأدوية الموصوفة: <strong style={{ color: 'var(--text-primary)' }}>{rx.medications?.length || 0} أصناف</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedRx(rx)}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', padding: '0.5rem 0.95rem', whiteSpace: 'nowrap' }}
                      >
                        <Printer size={15} />
                        <span>عرض وطباعة ℞</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '0.75rem 1.25rem', borderTop: '1px solid #E2E8F0' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            إغلاق الملف
          </button>
        </div>

      </div>

      {/* Treatment Plan Management Modal */}
      {showPlansModal && (
        <TreatmentPlanModal
          patientId={patientId}
          plans={treatmentPlans}
          onPlansUpdate={setTreatmentPlans}
          onClose={() => setShowPlansModal(false)}
        />
      )}

      {/* Printable E-Prescription Modal */}
      {selectedRx && (
        <PrescriptionModal
          isOpen={!!selectedRx}
          prescription={selectedRx}
          onClose={() => setSelectedRx(null)}
        />
      )}

    </div>
  );
}
