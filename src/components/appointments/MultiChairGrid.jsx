import React, { useState, useMemo } from 'react';
import { 
  Armchair, User, Clock, Stethoscope, CheckCircle2, 
  AlertCircle, ArrowRightLeft, Sparkles 
} from 'lucide-react';
import './MultiChairGrid.css';

const DEFAULT_CLINIC_CHAIRS = [
  { id: 'chair_1', name: 'كرسي 1 (رئيسي)', doctor: 'د. محمد عبد الرحمن', specialty: 'حشو وعلاج جذور', color: '#3b82f6' },
  { id: 'chair_2', name: 'كرسي 2 (تجميل)', doctor: 'د. سارة المنشاوي', specialty: 'تقويم وتركيبات', color: '#10b981' },
  { id: 'chair_3', name: 'كرسي 3 (جراحة)', doctor: 'د. أحمد توفيق', specialty: 'خلع جراحي وزراعة', color: '#8b5cf6' },
  { id: 'room_xray', name: 'غرفة الأشعة والبانوراما', doctor: 'فني الأشعة', specialty: 'Panoramic & CBCT', color: '#f59e0b' }
];

export default function MultiChairGrid({
  appointments = [],
  selectedDate,
  onAppointmentClick,
  onReassignChair
}) {
  const [activeChairFilter, setActiveChairFilter] = useState('all');

  // Distribute appointments to chairs (assign deterministically if not explicitly set)
  const appointmentsByChair = useMemo(() => {
    const map = {};
    DEFAULT_CLINIC_CHAIRS.forEach(c => { map[c.id] = []; });

    appointments.forEach((appt, idx) => {
      // If appointment already has chairId use it, otherwise balance across chairs
      const assignedChairId = appt.chairId || DEFAULT_CLINIC_CHAIRS[idx % DEFAULT_CLINIC_CHAIRS.length].id;
      if (!map[assignedChairId]) map[assignedChairId] = [];
      map[assignedChairId].push({ ...appt, assignedChairId });
    });

    // Sort each chair's appointments by time
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });

    return map;
  }, [appointments]);

  return (
    <div className="multi-chair-grid-container">
      
      {/* Header Overview Banner */}
      <div className="chair-grid-header">
        <div className="title-area">
          <Armchair className="text-primary" size={22} />
          <div>
            <h4>مخطط الكراسي والعيادات المتزامنة (Simultaneous Chair-Grid View)</h4>
            <span className="subtitle">إدارة تدفق ومواعيد الكراسي لليوم: {selectedDate}</span>
          </div>
        </div>

        <div className="chair-stats-summary">
          {DEFAULT_CLINIC_CHAIRS.map(c => {
            const count = (appointmentsByChair[c.id] || []).length;
            return (
              <div key={c.id} className="chair-mini-badge" style={{ borderRightColor: c.color }}>
                <span className="name">{c.name.split(' ')[0]}</span>
                <strong className="count">{count} مريض</strong>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Column Synchronized Grid */}
      <div className="chairs-columns-wrapper">
        {DEFAULT_CLINIC_CHAIRS.map(chair => {
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
                  <span>{chair.doctor}</span>
                  <span className="specialty-pill">{chair.specialty}</span>
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
                    <span>الكرسي شاغر لهذا اليوم</span>
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
                          <span className="pat-type">{appt.type || 'كشف أسنان'}</span>
                        </div>

                        <div className="appt-footer-row">
                          <span className={`status-tag ${appt.status || 'confirmed'}`}>
                            {appt.status === 'completed' ? 'تم الكشف' : appt.status === 'in_progress' ? 'على الكرسي الآن' : 'مؤكد'}
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
