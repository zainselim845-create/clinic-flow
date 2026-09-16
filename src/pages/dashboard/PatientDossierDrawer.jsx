import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { Tabs } from '@ark-ui/react/tabs';
import { 
  FolderOpen, Phone, Calendar, FileText, MessageCircle, 
  FileSpreadsheet, X, Edit3, Wallet, Pill, Layers, Printer, Eye 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTenant } from '../../context/TenantContext';
import ClinicalNotesPanel from '../../components/ClinicalNotesPanel';
import TreatmentPlanModal from '../../components/TreatmentPlanModal';
import PatientWalletPanel from '../../components/PatientWalletPanel';
import PrescriptionPrintModal from '../../components/PrescriptionPrintModal';
import { getPatientClinicalNotes } from '../../services/clinicalNotesService';
import { getPatientTreatmentPlans } from '../../services/treatmentPlansService';
import { getPatientPrescriptionsFromStorage, formatPrescriptionForWhatsApp } from '../../services/prescriptionService';
import { getWhatsAppUri } from '../../services/smsService';
import './PatientDossierDrawer.css';

const STATUS_LABELS = {
  waiting: 'في الانتظار',
  in_progress: 'جاري الكشف',
  pending_payment: 'في انتظار التحصيل',
  completed: 'تم الكشف',
  confirmed: 'مؤكد',
  scheduled: 'مجدول',
  cancelled: 'ملغي'
};

export default function PatientDossierDrawer({
  patient,
  patientAppointments = [],
  onClose,
  onEdit
}) {
  const { state } = useApp();
  const { tenant } = useTenant();
  const currentClinicId = tenant?.id || state?.clinicInfo?.id;
  const currentSlug = tenant?.slug || state?.clinicInfo?.slug || 'dr-ahmed';

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'notes' | 'plans' | 'wallet' | 'prescriptions' | 'labs'

  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [patientLabOrders, setPatientLabOrders] = useState([]);
  const [selectedRxToPrint, setSelectedRxToPrint] = useState(null);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const patientName = patient?.name || patient?.patientName || '';
  const patientPhone = patient?.phone || patient?.patientPhone || '';
  const patientId = patient?.id || patient?.patientId || (patientPhone ? 'pat_' + String(patientPhone).replace(/\D/g, '') : '');

  // Load clinical records, prescriptions & lab orders
  useEffect(() => {
    async function loadData() {
      if (patientId) {
        const { data: notesData } = await getPatientClinicalNotes(patientId);
        if (notesData) setClinicalNotes(notesData);

        const { data: plansData } = await getPatientTreatmentPlans(patientId);
        if (plansData) setTreatmentPlans(plansData);

        const rxList = getPatientPrescriptionsFromStorage(patientId, currentClinicId);
        setPrescriptions(rxList || []);

        try {
          const storedLabs = localStorage.getItem(`clinicflow_labs_${currentSlug}`);
          if (storedLabs) {
            const parsed = JSON.parse(storedLabs);
            if (Array.isArray(parsed)) {
              const matches = parsed.filter(l => 
                (l.patientName && patientName && l.patientName.trim().toLowerCase() === patientName.trim().toLowerCase()) ||
                (patientPhone && l.patientPhone && l.patientPhone === patientPhone)
              );
              setPatientLabOrders(matches);
            }
          }
        } catch (_) {}
      }
    }
    loadData();
  }, [patientId, patientName, patientPhone, currentClinicId, currentSlug]);

  return (
    <Dialog.Root open={!!patient} onOpenChange={(details) => !details.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content className="modal-content dossier-drawer" style={{ maxWidth: '880px', width: '95%' }}>
            
            {/* Drawer Header */}
            <div className="modal-header" style={{ background: 'var(--primary)', color: '#FFFFFF' }}>
              <div className="title-row">
                <FolderOpen style={{ color: 'var(--accent)' }} size={22} />
                <div>
                  <Dialog.Title asChild>
                    <h3 style={{ color: '#FFFFFF', margin: 0 }}>الملف الطبي السريري: {patientName}</h3>
                  </Dialog.Title>
                  <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>رقم الملف: #{patient?.fileNumber || patient?.id?.slice(0, 8) || 'D-101'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => window.print()}
                  className="btn-print-dossier"
                  title="طباعة السجل والتقرير الطبي"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    color: '#FFFFFF',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Printer size={14} />
                  <span>طباعة التقرير</span>
                </button>
                {onEdit && (
                  <button 
                    type="button" 
                    onClick={() => { onClose(); onEdit(patient); }}
                    className="btn-edit-dossier"
                    title="تعديل بيانات المريض"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      color: '#FFFFFF',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit3 size={14} />
                    <span>تعديل البيانات</span>
                  </button>
                )}
                <Dialog.CloseTrigger asChild>
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="btn-close-dossier" 
                    aria-label="إغلاق الملف"
                  >
                    <X size={18} />
                  </button>
                </Dialog.CloseTrigger>
              </div>
            </div>

            {/* Ark UI Tabs Root */}
            <Tabs.Root 
              value={activeTab} 
              onValueChange={(details) => setActiveTab(details.value)}
              style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {/* Tab Navigation */}
              <Tabs.List style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <Tabs.Trigger value="overview" asChild>
                  <button
                    type="button"
                    className={`btn-dossier-tab ${activeTab === 'overview' ? 'active' : ''}`}
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
                </Tabs.Trigger>

                <Tabs.Trigger value="notes" asChild>
                  <button
                    type="button"
                    className={`btn-dossier-tab ${activeTab === 'notes' ? 'active' : ''}`}
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
                </Tabs.Trigger>

                <Tabs.Trigger value="plans" asChild>
                  <button
                    type="button"
                    className={`btn-dossier-tab ${activeTab === 'plans' ? 'active' : ''}`}
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
                </Tabs.Trigger>

                <Tabs.Trigger value="wallet" asChild>
                  <button
                    type="button"
                    className={`btn-dossier-tab ${activeTab === 'wallet' ? 'active' : ''}`}
                    style={{
                      background: activeTab === 'wallet' ? 'var(--primary)' : 'var(--surface)',
                      color: activeTab === 'wallet' ? '#FFFFFF' : 'var(--text-primary)',
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
                    <Wallet size={14} />
                    <span>المحفظة الرقمية</span>
                  </button>
                </Tabs.Trigger>

                <Tabs.Trigger value="prescriptions" asChild>
                  <button
                    type="button"
                    className={`btn-dossier-tab ${activeTab === 'prescriptions' ? 'active' : ''}`}
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
                    <span>الروشتات الطبية ({prescriptions.length})</span>
                  </button>
                </Tabs.Trigger>

                <Tabs.Trigger value="labs" asChild>
                  <button
                    type="button"
                    className={`btn-dossier-tab ${activeTab === 'labs' ? 'active' : ''}`}
                    style={{
                      background: activeTab === 'labs' ? 'var(--primary)' : 'var(--surface)',
                      color: activeTab === 'labs' ? '#FFFFFF' : 'var(--text-primary)',
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
                    <Layers size={14} />
                    <span>أعمال المعمل والتركيبات ({patientLabOrders.length})</span>
                  </button>
                </Tabs.Trigger>
              </Tabs.List>

        <div className="dossier-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '1.25rem' }}>
          
          {/* TAB 1: OVERVIEW */}
          <Tabs.Content value="overview">
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
                    href={`sms:+2${String(patientPhone).replace(/\D/g, '')}`}
                    className="btn-contact sms"
                  >
                    <MessageCircle size={14} />
                    <span>إرسال SMS</span>
                  </a>
                  <a
                    href={getWhatsAppUri(patientPhone, `مرحباً أ/ ${patientName}، معك عيادة ${state.activeClinic?.name || 'كلينيك فلو'}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-contact whatsapp"
                    title="مراسلة المريض عبر واتساب"
                  >
                    <MessageSquare size={14} />
                    <span>واتساب</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="dossier-stats-row">
              <div className="dossier-stat">
                <span>السن والنوع:</span>
                <strong>{patient?.age ? `${patient.age} سنة` : 'غير محدد'} • {patient?.gender || 'ذكر'}</strong>
              </div>
              <div className="dossier-stat">
                <span>فصيلة الدم:</span>
                <strong>{patient?.bloodType || 'غير محددة'}</strong>
              </div>
              <div className="dossier-stat">
                <span>إجمالي الزيارات:</span>
                <strong>{patient?.visitsCount || patient?.totalVisits || patientAppointments.length || 1} زيارات</strong>
              </div>
              <div className="dossier-stat">
                <span>آخر زيارة:</span>
                <strong>{patient?.lastVisit || patient?.date || 'اليوم'}</strong>
              </div>
            </div>

            {patient?.medicalAlerts && (
              <div className="clinical-history-box" style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
                <h5 style={{ color: '#991B1B' }}>تنبيهات طبية وحساسيات (Medical Alerts):</h5>
                <p style={{ color: '#7F1D1D' }}>{patient.medicalAlerts}</p>
              </div>
            )}

            {patient?.diagnosis && (
              <div className="clinical-history-box">
                <h5>التشخيص الطبي الأولي:</h5>
                <p>{patient.diagnosis}</p>
              </div>
            )}

            {patient?.notes && (
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
                      <span className={`status-badge ${appt.status}`}>
                        {STATUS_LABELS[appt.status] || appt.status}
                      </span>
                      <span className="type-badge">{appt.type || 'كشف'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* TAB 2: CLINICAL NOTES */}
          <Tabs.Content value="notes">
            <ClinicalNotesPanel
              patientId={patientId}
              doctorName={state.clinicInfo?.doctorName || 'الطبيب المعالج'}
              notes={clinicalNotes}
              onNotesUpdate={setClinicalNotes}
            />
          </Tabs.Content>

          {/* TAB 3: TREATMENT PLANS */}
          <Tabs.Content value="plans">
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
                        <span>بتاريخ: {plan.createdAt && !isNaN(new Date(plan.createdAt).getTime()) ? new Date(plan.createdAt).toISOString().split('T')[0] : 'تاريخ الزيارة'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* TAB 4: DIGITAL WALLET */}
          <Tabs.Content value="wallet">
            <div style={{ padding: '0.5rem 0' }}>
              <PatientWalletPanel patientId={patientId} patientName={patientName} />
            </div>
          </Tabs.Content>

          {/* TAB 5: E-PRESCRIPTIONS */}
          <Tabs.Content value="prescriptions">
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  سجل الروشتات والوصفات الطبية الصادرة للمريض
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  إجمالي الروشتات: <strong>{prescriptions.length}</strong>
                </span>
              </div>

              {prescriptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <Pill size={36} style={{ color: 'var(--text-secondary)', opacity: 0.4, margin: '0 auto 0.75rem' }} />
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    لا توجد روشتات إلكترونية مسجلة لهذا المريض حتى الآن.
                  </p>
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem', opacity: 0.8 }}>
                    يتم إصدار الروشتة وتوثيقها تلقائياً أثناء فحص الطبيب من خلال نافذة الكشف.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Pill size={16} color="var(--primary)" />
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {rx.diagnosis || 'روشتة علاجية واستشارة'}
                            </strong>
                            <span style={{ fontSize: '0.72rem', background: '#F4F4F5', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                              {rx.verificationCode}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            تاريخ الإصدار: {rx.date} • الطبيب: {rx.doctorName || 'طبيب العيادة'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedRxToPrint(rx)}
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          >
                            <Printer size={13} />
                            <span>طباعة / معاينة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const msg = formatPrescriptionForWhatsApp(rx);
                              const url = getWhatsAppUri(patientPhone, msg);
                              if (url) window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: '#047857' }}
                          >
                            <MessageCircle size={13} />
                            <span>واتساب</span>
                          </button>
                        </div>
                      </div>

                      {/* Medications list */}
                      {Array.isArray(rx.medications) && rx.medications.length > 0 && (
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '0.6rem 0.8rem', marginTop: '0.5rem' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>الأدوية المقررة:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.4rem' }}>
                            {rx.medications.map((m, idx) => (
                              <div key={idx} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>•</span>
                                <strong>{m.name}</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>({m.dose || ''} - {m.frequency || ''})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* TAB 6: LAB ORDERS */}
          <Tabs.Content value="labs">
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  سجل طلبات وأعمال المعمل والتركيبات الخارجية
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  إجمالي الطلبات: <strong>{patientLabOrders.length}</strong>
                </span>
              </div>

              {patientLabOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <Layers size={36} style={{ color: 'var(--text-secondary)', opacity: 0.4, margin: '0 auto 0.75rem' }} />
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    لا توجد أعمال معمل أو تركيبات مسجلة لهذا المريض.
                  </p>
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem', opacity: 0.8 }}>
                    يمكنك إرسال طلب جديد للمعمل مباشرة عبر قسم "معمل التركيبات والتحاليل" في القائمة الرئيسية.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {patientLabOrders.map((lab) => (
                    <div
                      key={lab.id}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Layers size={16} color="var(--primary)" />
                          <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                            {lab.workType}
                          </strong>
                          {lab.toothNumber && (
                            <span style={{ fontSize: '0.74rem', background: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              سن #{lab.toothNumber}
                            </span>
                          )}
                          {lab.shade && (
                            <span style={{ fontSize: '0.74rem', background: '#F4F4F5', padding: '2px 6px', borderRadius: '4px' }}>
                              درجة اللون: {lab.shade}
                            </span>
                          )}
                        </div>

                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          background: lab.status === 'delivered' ? '#ECFDF5' : lab.status === 'received' ? '#EFF6FF' : '#FEF3C7',
                          color: lab.status === 'delivered' ? '#047857' : lab.status === 'received' ? '#1D4ED8' : '#B45309'
                        }}>
                          {lab.status === 'delivered' ? 'تم التسليم للمريض ✓' : lab.status === 'received' ? 'تم الاستلام بالعيادة' : lab.status === 'first_try' ? 'بروفة أولى' : 'مرسل للمعمل'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span>المعمل: <strong>{lab.labName}</strong></span>
                        <span>تاريخ الإرسال: {lab.sentDate || '-'}</span>
                        <span>تاريخ الاستحقاق: <strong style={{ color: '#D97706' }}>{lab.dueDate || '-'}</strong></span>
                        {lab.cost && <span>التكلفة: <strong>{lab.cost} ج.م</strong></span>}
                      </div>

                      {lab.notes && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
                          💡 ملاحظات: {lab.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

        </div>
            </Tabs.Root>

            {/* Footer */}
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '0.75rem 1.25rem', borderTop: '1px solid #E2E8F0' }}>
              <Dialog.CloseTrigger asChild>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  إغلاق الملف
                </button>
              </Dialog.CloseTrigger>
            </div>

          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>

      {/* Treatment Plan Management Modal */}
      {showPlansModal && (
        <TreatmentPlanModal
          patientId={patientId}
          plans={treatmentPlans}
          onPlansUpdate={setTreatmentPlans}
          onClose={() => setShowPlansModal(false)}
        />
      )}

      {selectedRxToPrint && (
        <PrescriptionPrintModal
          isOpen={!!selectedRxToPrint}
          prescription={selectedRxToPrint}
          onClose={() => setSelectedRxToPrint(null)}
        />
      )}
    </Dialog.Root>
  );
}
