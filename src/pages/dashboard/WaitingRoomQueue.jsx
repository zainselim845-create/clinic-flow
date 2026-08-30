import React from 'react';
import { Stethoscope, Clock, Check, ArrowRight, UserPlus, FolderOpen, Pill, Sparkles } from 'lucide-react';

function WaitingRoomQueue({
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
          <span className="live-pill">
            <span className="live-pulse-dot" style={{ width: 6, height: 6 }}></span>
            <span>مباشر الآن</span>
          </span>
        </div>
        <button type="button" onClick={onOpenWalkInModal} className="btn-hero-action secondary btn-sm">
          <UserPlus size={15} />
          <span>تسجيل حضور مباشر (Walk-in)</span>
        </button>
      </div>

      <div className="clinic-floor-grid">
        {/* 1. Active Examination Room */}
        <div className={`exam-room-card ${currentExamPatient ? 'in-session' : 'vacant'}`}>
          <div className="exam-card-header">
            <span className="room-badge">غرفة الكشف الرئيسية</span>
            <span className={`occupancy-tag ${currentExamPatient ? 'occupied' : 'empty'}`}>
              {currentExamPatient ? 'جاري الكشف' : 'الغرفة شاغرة ومستعدة'}
            </span>
          </div>

          {currentExamPatient ? (
            <div className="active-patient-box">
              <div className="active-patient-top">
                <div className="patient-avatar-large">
                  {currentExamPatient.patientName?.charAt(0) || 'م'}
                </div>
                <div className="patient-meta">
                  <h4>{currentExamPatient.patientName}</h4>
                  <div className="sub-tags">
                    <span className="type-tag">{currentExamPatient.type || 'كشف عادي'}</span>
                    <span className="phone-tag">{currentExamPatient.patientPhone}</span>
                    <span className="wait-badge-timer">
                      <Clock size={12} />
                      <span>{calculateWaitMinutes(currentExamPatient.checkedInAt)} دقيقة</span>
                    </span>
                  </div>
                </div>
              </div>

              {currentExamPatient.notes && (
                <p className="clinical-notes-preview">{currentExamPatient.notes}</p>
              )}

              <div className="exam-actions">
                <button
                  type="button"
                  onClick={() => onOpenPrescription && onOpenPrescription(currentExamPatient)}
                  className="btn-exam-action primary"
                  title="كتابة وطباعة روشتة طبية إلكترونية"
                >
                  <Pill size={15} />
                  <span>روشتة ذكية</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenFinishModal(currentExamPatient)}
                  className="btn-exam-action success"
                  title="إنهاء الكشف واعتماد التشخيص"
                >
                  <Check size={16} />
                  <span>إنهاء وحفظ الكشف</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDossier(currentExamPatient)}
                  className="btn-exam-action outline"
                  title="فتح ملف المريض والسجل التاريخي"
                >
                  <FolderOpen size={15} />
                  <span>الملف الطبي</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="vacant-state-box">
              <div className="vacant-icon-beacon">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h4>غرفة الكشف جاهزة ومستعدة</h4>
              <p>
                {waitingToday.length > 0
                  ? `يوجد ${waitingToday.length} مريض في صالة الانتظار بانتظار الدخول.`
                  : 'صالة الانتظار فارغة حالياً — بانتظار وصول الحالات.'}
              </p>
              {waitingToday.length > 0 && (
                <button
                  type="button"
                  onClick={() => onStartExam(waitingToday[0])}
                  className="btn-call-next-patient"
                >
                  <ArrowRight size={18} />
                  <span>استدعاء المريض التالي فوراً: {waitingToday[0].patientName}</span>
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

export default React.memo(WaitingRoomQueue);
