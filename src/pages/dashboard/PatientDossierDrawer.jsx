import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Phone, Calendar, Stethoscope, FileText, X, MessageCircle, 
  Pill, Printer, Send, Clock, User, Sparkles, FileSpreadsheet, Activity
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DentalChart from '../../components/DentalChart';
import ClinicalNotesPanel from '../../components/ClinicalNotesPanel';
import TreatmentPlanModal from '../../components/TreatmentPlanModal';
import { getPatientDentalChart } from '../../services/dentalChartService';
import { getPatientClinicalNotes } from '../../services/clinicalNotesService';
import { getPatientTreatmentPlans } from '../../services/treatmentPlansService';

export default function PatientDossierDrawer({
  patient,
  patientAppointments = [],
  onClose,
  onIssuePrescription
}) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'chart' | 'notes' | 'plans' | 'prescriptions'

  const [dentalChartEntries, setDentalChartEntries] = useState([]);
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
        const { data: chartData } = await getPatientDentalChart(patientId);
        if (chartData) setDentalChartEntries(chartData);

        const { data: notesData } = await getPatientClinicalNotes(patientId);
        if (notesData) setClinicalNotes(notesData);

        const { data: plansData } = await getPatientTreatmentPlans(patientId);
        if (plansData) setTreatmentPlans(plansData);
      }
    }
    loadData();
  }, [patientId]);

  if (!patient) return null;

  // Get patient's prescriptions
  const patientPrescriptions = (state.prescriptions || []).filter(
    rx => (patient.id && rx.patientId === patient.id) ||
          (patientPhone && rx.patientPhone === patientPhone) ||
          (patientName && rx.patientName === patientName)
  );

  const clinicSpecialty = state.clinicInfo?.specialty || '';
  const isDental = !clinicSpecialty || clinicSpecialty.includes('أسنان') || clinicSpecialty.includes('Dental');

  return (
    <div className="modal-backdrop">
      <div className="modal-content dossier-drawer" style={{ maxWidth: '880px', width: '95%' }}>
        
        {/* Drawer Header */}
        <div className="modal-header" style={{ background: '#012757', color: '#FFFFFF' }}>
          <div className="title-row">
            <FolderOpen className="text-nebras-orange" size={22} />
            <div>
              <h3 style={{ color: '#FFFFFF', margin: 0 }}>الملف الطبي السريري: {patientName}</h3>
              <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>رقم الملف: #{patient.fileNumber || patient.id?.slice(0, 8) || 'D-101'}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-close" style={{ color: '#FFFFFF' }}>×</button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#F8FAFC', padding: '0.6rem 1.25rem', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-dossier-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{
              background: activeTab === 'overview' ? '#012757' : '#FFFFFF',
              color: activeTab === 'overview' ? '#FFFFFF' : '#334155',
              border: '1px solid #CBD5E1',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            نظرة عامة والزيارات
          </button>

          {isDental && (
            <button
              type="button"
              className={`btn-dossier-tab ${activeTab === 'chart' ? 'active' : ''}`}
              onClick={() => setActiveTab('chart')}
              style={{
                background: activeTab === 'chart' ? '#012757' : '#FFFFFF',
                color: activeTab === 'chart' ? '#FFFFFF' : '#334155',
                border: '1px solid #CBD5E1',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <Sparkles size={14} className="text-nebras-orange" />
              <span>مخطط الأسنان FDI ({dentalChartEntries.length})</span>
            </button>
          )}


          <button
            type="button"
            className={`btn-dossier-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
            style={{
              background: activeTab === 'notes' ? '#012757' : '#FFFFFF',
              color: activeTab === 'notes' ? '#FFFFFF' : '#334155',
              border: '1px solid #CBD5E1',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
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
              background: activeTab === 'plans' ? '#012757' : '#FFFFFF',
              color: activeTab === 'plans' ? '#FFFFFF' : '#334155',
              border: '1px solid #CBD5E1',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
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
              background: activeTab === 'prescriptions' ? '#012757' : '#FFFFFF',
              color: activeTab === 'prescriptions' ? '#FFFFFF' : '#334155',
              border: '1px solid #CBD5E1',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Pill size={14} />
            <span>الروشتات ({patientPrescriptions.length})</span>
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
                      href={`https://wa.me/2${patientPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-contact whatsapp"
                    >
                      <MessageCircle size={14} />
                      <span>محادثة واتساب</span>
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

          {/* TAB 2: DENTAL CHART */}
          {activeTab === 'chart' && (
            <DentalChart 
              patientId={patientId}
              chartEntries={dentalChartEntries}
              onChartUpdate={setDentalChartEntries}
            />
          )}

          {/* TAB 3: CLINICAL NOTES */}
          {activeTab === 'notes' && (
            <ClinicalNotesPanel
              patientId={patientId}
              doctorName={state.clinicInfo?.doctorName || 'د. أحمد الشريف'}
              notes={clinicalNotes}
              onNotesUpdate={setClinicalNotes}
            />
          )}

          {/* TAB 4: TREATMENT PLANS */}
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
                    <div key={plan.id} style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem', color: '#012757' }}>{plan.title}</strong>
                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {plan.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
                        <span>عدد الإجراءات: <strong>{plan.items?.length || 0}</strong></span>
                        <span>الصافي المطلوب: <strong style={{ color: '#0D9488' }}>{plan.netCost || plan.totalCost} ج.م</strong></span>
                        <span>بتاريخ: {new Date(plan.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <div className="prescriptions-archive-section">
              {patientPrescriptions.length === 0 ? (
                <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  لا توجد روشتات إلكترونية مسجلة لهذا المريض بعد.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {patientPrescriptions.map((rx) => (
                    <div key={rx.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          بتاريخ: <strong>{rx.date}</strong> | التشخيص: {rx.diagnosis || 'كشف ومتابعة'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>بواسطة: {rx.doctorName}</span>
                      </div>

                      <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <strong>الأدوية الموصوفة:</strong>
                        <ul style={{ margin: '0.3rem 1.2rem 0 0', padding: 0 }}>
                          {(rx.medications || []).map((m, idx) => (
                            <li key={idx} style={{ marginBottom: '0.2rem' }}>
                              <strong>{m.name}</strong> — {m.dose} ({m.freq} - {m.duration})
                            </li>
                          ))}
                        </ul>
                      </div>

                      {rx.labTests && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.3rem 0' }}>
                          <strong>تحاليل مطلوبة:</strong> {rx.labTests}
                        </p>
                      )}
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

    </div>
  );
}
