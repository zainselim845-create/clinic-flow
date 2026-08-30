import React from 'react';
import { Phone, Calendar, Hash, MessageCircle } from 'lucide-react';
import './PatientCard.css';

const formatLastVisit = (dateStr) => {
  if (!dateStr) return 'لا يوجد';
  if (typeof dateStr !== 'string') return 'لا يوجد';
  return dateStr.split('T')[0] || 'لا يوجد';
};

const PatientCard = ({ patient, onClick }) => {
  if (!patient) return null;

  const name = patient.name || 'مريض بدون اسم';
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('') || 'م';

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    if (!patient.phone) return;
    const cleanPhone = (patient.phone || '').replace(/^0/, '20').replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً أ/ ${name}، نتواصل معك من عيادة د. أحمد الشريف`)}`, '_blank');
  };

  return (
    <div className="patient-card" onClick={() => onClick && onClick(patient)}>
      
      {/* Header */}
      <div className="patient-card-header">
        <div className="patient-avatar">{initials}</div>
        <div className="patient-main-info">
          <h3 title={name}>{name}</h3>
          <span className="patient-sub-meta">
            {patient.gender || 'ذكر'} • {patient.age || '—'} سنة
          </span>
        </div>

        {patient.phone && (
          <button 
            type="button"
            className="patient-card-wa-btn"
            onClick={handleWhatsApp}
            title="محادثة واتساب سريعة"
          >
            <MessageCircle size={15} />
          </button>
        )}
      </div>
      
      {/* Body */}
      <div className="patient-card-body">
        <div className="patient-info-item">
          <Phone size={14} className="info-icon" />
          <span className="info-label">الهاتف:</span>
          <span dir="ltr" className="info-value phone-value">{patient.phone || 'بدون هاتف'}</span>
        </div>

        <div className="patient-info-item">
          <Calendar size={14} className="info-icon" />
          <span className="info-label">آخر زيارة:</span>
          <span dir="ltr" className="info-value date-value">{formatLastVisit(patient.lastVisit)}</span>
        </div>

        <div className="patient-info-item">
          <Hash size={14} className="info-icon" />
          <span className="info-label">إجمالي الزيارات:</span>
          <span className="info-value">{patient.totalVisits || patient.visitsCount || 1} زيارات</span>
        </div>
      </div>

      {/* Footer / Diagnosis Badge */}
      {patient.diagnosis && (
        <div className="patient-card-footer">
          <span className="diagnosis-pill" title={patient.diagnosis}>
            {patient.diagnosis}
          </span>
        </div>
      )}
    </div>
  );
};

export default PatientCard;
