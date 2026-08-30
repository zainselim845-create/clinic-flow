import React from 'react';
import { Stethoscope, Clock, Check, ArrowRight, UserPlus, FolderOpen, AlertCircle, Pill } from 'lucide-react';

export default function WaitingRoomQueue({
  currentExamPatient,
  waitingToday,
  onStartExam,
  onOpenFinishModal,
  onOpenDossier,
  onOpenWalkInModal,
  onOpenPrescription
}) {
  const calculateWaitMinutes = (checkedInAt) => {
    if (!checkedInAt) return 0;
    const diffMs = Date.now() - new Date(checkedInAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  return (
    <div className="waiting-room-section">
      <div className="section-title-row">
        <div className="title-with-badge">
          <Stethoscope className="icon-main text-primary" size={22} />
          <h3>غرفة الكشف وصالة الانتظار الحية</h3>
          <span className="live-pill">مباشر الآن </span>
        </div>
        <button type="button" onClick={onOpenWalkInModal} className="btn btn-outline-primary btn-sm">
          <UserPlus size={16} />
          <span>تسجيل حضور مباشر (Walk-in)</span>
        </button>
      </div>

      <div className="clinic-floor-grid">
        {/* 1. Active Examination Room */}
        <div className={`exam-room-card ${currentExamPatient ? 'in-session' : 'vacant'}`}>
          <div className="exam-card-header">
            <span className="room-badge">غرفة الكشف الرئيسية </span>
            <span className={`occupancy-tag ${currentExamPatient ? 'occupied' : 'empty'}`}>
              {currentExamPatient ? 'جاري الكشف' : 'الغرفة شاغرة'}
            </span>
          </div>

          {currentExamPatient ? (
            <div className="active-patient-box">
              <div className="patient-avatar-large">
                {currentExamPatient.patientName?.charAt(0) || 'م'}
              </div>
              <div className="patient-meta">
                <h4>{currentExamPatient.patientName}</h4>
                <div className="sub-tags">
                  <span className="type-tag">{currentExamPatient.type || 'كشف عادي'}</span>
                  <span className="phone-tag">{currentExamPatient.patientPhone}</span>
                </div>
                {currentExamPatient.notes && (
                  <p className="clinical-notes-preview"> {currentExamPatient.notes}</p>
                )}
              </div>

              <div className="exam-actions">
                <button
                  type="button"
                  onClick={() => onOpenPrescription && onOpenPrescription(currentExamPatient)}
                  className="btn btn-primary btn-sm"
                  title="كتابة وطباعة روشتة طبية إلكترونية"
                  style={{ background: 'var(--primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Pill size={16} />
                  <span>روشتة إلكترونية</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenFinishModal(currentExamPatient)}
                  className="btn btn-success btn-finish-exam"
                >
                  <Check size={18} />
                  <span>إنهاء الكشف</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDossier(currentExamPatient)}
                  className="btn btn-outline btn-sm"
                >
                  <FolderOpen size={16} />
                  <span>السجل الطبي</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="vacant-state-box">
              <p>لا يوجد مريض داخل غرفة الكشف حالياً.</p>
              {waitingToday.length > 0 && (
                <button
                  type="button"
                  onClick={() => onStartExam(waitingToday[0])}
                  className="btn btn-primary"
                >
                  <ArrowRight size={18} />
                  <span>إدخال المريض التالي ({waitingToday[0].patientName})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. Waiting Room Live Queue */}
        <div className="queue-container-card">
          <div className="queue-header">
            <h4>
              <Clock size={18} />
              <span>قائمة الانتظار بالعيادة ({waitingToday.length})</span>
            </h4>
            <small>مرتبة بأولوية الحالات الطارئة ثم أسبقية الوصول</small>
          </div>

          {waitingToday.length === 0 ? (
            <div className="empty-queue-box">
              <p>صالة الانتظار فارغة حالياً — لا يوجد مرضى مسجلين بالانتظار.</p>
            </div>
          ) : (
            <div className="queue-list">
              {waitingToday.map((appt, idx) => {
                const waitMins = calculateWaitMinutes(appt.checkedInAt);
                const isEmergency = appt.isEmergency || appt.type === 'طوارئ' || (appt.type || '').includes('طوارئ');

                return (
                  <div key={appt.id || idx} className={`queue-item-card ${isEmergency ? 'emergency-priority' : ''}`}>
                    <div className="queue-number">#{idx + 1}</div>
                    <div className="patient-info">
                      <div className="name-row">
                        <strong>{appt.patientName}</strong>
                        {isEmergency && <span className="emergency-badge"> طوارئ</span>}
                      </div>
                      <div className="time-details">
                        <span>{appt.time}</span>
                        <span className="wait-timer"> ينتظر منذ {waitMins} دقيقة</span>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button
                        type="button"
                        onClick={() => onStartExam(appt)}
                        className="btn btn-primary btn-sm"
                        title="إدخال لغرفة الكشف"
                      >
                        <span>إدخال للكشف</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
