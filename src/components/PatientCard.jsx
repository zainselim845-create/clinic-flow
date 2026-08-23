import React from 'react';
import { Phone, Calendar, Hash } from 'lucide-react';
import './PatientCard.css';

const PatientCard = ({ patient, onClick }) => {
  const initials = patient.name.split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <div className="patient-card" onClick={() => onClick && onClick(patient)}>
      <div className="patient-card-header">
        <div className="patient-avatar">{initials}</div>
        <div className="patient-main-info">
          <h3>{patient.name}</h3>
          <span>{patient.gender} • {patient.age} سنة</span>
        </div>
      </div>
      
      <div className="patient-card-body">
        <div className="info-row">
          <Phone size={16} />
          <span>{patient.phone}</span>
        </div>
        <div className="info-row">
          <Calendar size={16} />
          <span>آخر زيارة: {patient.lastVisit}</span>
        </div>
        <div className="info-row">
          <Hash size={16} />
          <span>إجمالي الزيارات: {patient.totalVisits}</span>
        </div>
      </div>

      <div className="patient-card-footer">
        {patient.diagnosis && (
          <span className="diagnosis-badge">{patient.diagnosis}</span>
        )}
      </div>
    </div>
  );
};

export default PatientCard;
