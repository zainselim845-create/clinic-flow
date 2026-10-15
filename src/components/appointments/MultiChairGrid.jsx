import React, { useMemo } from 'react';
import { Armchair, Clock } from 'lucide-react';
import './MultiChairGrid.css';

/**
 * MultiChairGrid - Dynamic Clinic Chair & Doctor Grid
 * Strictly derives chairs from the tenant's actual doctors and configured rooms.
 * Zero hardcoded mock doctors or fake templates.
 */
export default function MultiChairGrid({
  appointments = [],
  selectedDate,
  onAppointmentClick,
  doctors = [],
  clinicInfo = {}
}) {
  // Dynamically resolve chairs from actual clinic doctors or configuration
  const activeChairs = useMemo(() => {
    // 1. If clinic has configured explicit chairs in settings
    if (Array.isArray(clinicInfo?.chairs) && clinicInfo.chairs.length > 0) {
      return clinicInfo.chairs;
    }

    // 2. If clinic has real doctors registered
    if (Array.isArray(doctors) && doctors.length > 0) {
      const colors = ['#09090B', '#2563EB', '#059669', '#7C3AED', '#D97706'];
      return doctors.map((doc, idx) => ({
        id: doc.id || `chair_${idx + 1}`,
        name: doc.chairName || (doctors.length === 1 ? 'عيادة الكشف' : `كرسي ${idx + 1}`),
        doctor: doc.name || 'طبيب العيادة',
        specialty: doc.specialty || clinicInfo?.specialty || 'كشف واستشارة',
        color: colors[idx % colors.length]
      }));
    }

    // 3. Fallback: Single chair bound to the current clinic doctor
    const docName = clinicInfo?.doctorName || 'طبيب العيادة';
    return [
      {
        id: 'chair_primary',
        name: 'عيادة الكشف الرئيسية',
        doctor: docName,
        specialty: clinicInfo?.specialty || 'كشف واستشارة طبية',
        color: '#09090B'
      }
    ];
  }, [clinicInfo, doctors]);

  // Distribute appointments strictly to available chairs
  const appointmentsByChair = useMemo(() => {
    const map = {};
    activeChairs.forEach(c => { map[c.id] = []; });

    appointments.forEach((appt, idx) => {
      // If appointment specifies chairId and it exists, use it
      let assignedChairId = appt.chairId;
      if (!assignedChairId || !map[assignedChairId]) {
        // Assign to doctor's chair if doctor matches
        const docChair = activeChairs.find(c => c.doctor === appt.doctorName || c.id === appt.doctorId);
        assignedChairId = docChair ? docChair.id : activeChairs[idx % activeChairs.length]?.id;
      }

      if (assignedChairId && map[assignedChairId]) {
        map[assignedChairId].push({ ...appt, assignedChairId });
      }
    });

    // Sort appointments on each chair by time
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });

    return map;
  }, [appointments, activeChairs]);

  return (
    <div className="multi-chair-grid-container">
      
      {/* Header Overview Banner */}
      <div className="chair-grid-header">
        <div className="title-area">
          <Armchair className="text-primary" size={20} />
          <div>
            <h4>مخطط الكراسي والعيادات</h4>
            <span className="subtitle">متابعة الكشوفات لليوم: {selectedDate}</span>
          </div>
        </div>

        <div className="chair-stats-summary">
          {activeChairs.map(c => {
            const count = (appointmentsByChair[c.id] || []).length;
            return (
              <div key={c.id} className="chair-mini-badge" style={{ borderRightColor: c.color }}>
                <span className="name">{c.name}</span>
                <strong className="count">{count} مريض</strong>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Column Synchronized Grid */}
      <div 
        className="chairs-columns-wrapper"
        style={{
          gridTemplateColumns: activeChairs.length === 1 ? '1fr' : `repeat(${Math.min(activeChairs.length, 4)}, 1fr)`
        }}
      >
        {activeChairs.map(chair => {
          const chairAppts = appointmentsByChair[chair.id] || [];

          return (
            <div key={chair.id} className="chair-column-card">
              
              {/* Column Header */}
              <div className="chair-col-header" style={{ borderTopColor: chair.color }}>
                <div className="chair-name-row">
                  <span className="chair-dot" style={{ background: chair.color }}></span>
                  <span className="chair-title">{chair.name}</span>
                </div>
                <div className="chair-doctor-row">
                  <span className="chair-doc-name">{chair.doctor}</span>
                  {chair.specialty && <span className="specialty-pill">{chair.specialty}</span>}
                </div>
                <div className="chair-load-bar">
                  <div 
                    className="chair-load-fill" 
                    style={{ 
                      width: `${Math.min(100, (chairAppts.length / 8) * 100)}%`,
                      background: chair.color 
                    }}
                  ></div>
                </div>
              </div>

              {/* Appointments List on this chair */}
              <div className="chair-appts-body">
                {chairAppts.length === 0 ? (
                  <div className="chair-empty-state">
                    <span>لا توجد كشوفات مسجلة على هذه العيادة اليوم</span>
                  </div>
                ) : (
                  chairAppts.map(appt => {
                    const isCompleted = appt.status === 'completed';
                    const isInProgress = appt.status === 'in_progress';

                    return (
                      <div 
                        key={appt.id} 
                        className={`chair-appt-card ${isInProgress ? 'in-progress' : ''} ${isCompleted ? 'completed' : ''}`}
                        onClick={() => onAppointmentClick && onAppointmentClick(appt)}
                      >
                        <div className="appt-time-pill">
                          <Clock size={12} />
                          <span>{appt.time || '18:00'}</span>
                        </div>

                        <div className="appt-patient-info">
                          <strong className="pat-name">{appt.patientName}</strong>
                          <span className="pat-type">{appt.type || 'كشف عيادة'}</span>
                        </div>

                        <div className="appt-footer-row">
                          <span className={`status-tag ${appt.status || 'confirmed'}`}>
                            {appt.status === 'completed' ? 'تم الكشف' : appt.status === 'in_progress' ? 'في الكشف الآن' : 'مؤكد'}
                          </span>
                          {appt.fee && <span className="fee-tag">{appt.fee}</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
