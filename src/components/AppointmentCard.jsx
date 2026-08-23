import React from 'react';
import { CheckCircle, XCircle, Edit3, Calendar, Clock, User, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './AppointmentCard.css';

const AppointmentCard = ({ appointment, onEdit }) => {
  const { dispatch } = useApp();

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'var(--color-primary)';
      case 'completed': return 'var(--color-success)';
      case 'cancelled': return 'var(--color-error)';
      default: return 'var(--color-border)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'upcoming': return 'قادم';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغى';
      default: return status;
    }
  };

  const handleComplete = () => {
    dispatch({ type: 'UPDATE_APPOINTMENT_STATUS', payload: { id: appointment.id, status: 'completed' } });
  };

  const handleCancel = () => {
    dispatch({ type: 'UPDATE_APPOINTMENT_STATUS', payload: { id: appointment.id, status: 'cancelled' } });
  };

  return (
    <div className="appointment-card" style={{ '--status-color': getStatusColor(appointment.status) }}>
      <div className="appointment-header">
        <div className="patient-name">
          <User size={18} />
          <span>{appointment.patientName}</span>
        </div>
        <span className={`status-badge ${appointment.status}`}>
          {getStatusText(appointment.status)}
        </span>
      </div>

      <div className="appointment-details">
        <div className="detail-item">
          <span className="label">نوع الزيارة:</span>
          <span>{appointment.type}</span>
        </div>
        <div className="detail-item">
          <Calendar size={16} />
          <span>{appointment.date}</span>
        </div>
        <div className="detail-item">
          <Clock size={16} />
          <span>{appointment.time}</span>
        </div>
        <div className="detail-item fee-tag" style={{ color: '#10b981', fontWeight: 'bold' }}>
          <span>{appointment.fee || '300 ج.م'}</span>
        </div>
      </div>

      <div className="appointment-actions">
        {appointment.patientPhone && (
          <button 
            className="action-btn whatsapp" 
            onClick={() => {
              const cleanPhone = appointment.patientPhone.replace(/^0/, '20').replace(/\D/g, '');
              const msg = `مرحباً ${appointment.patientName}، نذكركم بموعدكم في العيادة يوم ${appointment.date} الساعة ${appointment.time}. نتمنى لكم السلامة! ✨`;
              window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
            }} 
            title="تذكير المريض عبر واتساب"
            style={{ color: '#25D366' }}
          >
            <MessageCircle size={18} />
          </button>
        )}
        {appointment.status === 'upcoming' && (
          <>
            <button className="action-btn success" onClick={handleComplete} title="إكمال">
              <CheckCircle size={18} />
            </button>
            <button className="action-btn error" onClick={handleCancel} title="إلغاء">
              <XCircle size={18} />
            </button>
            {onEdit && (
              <button className="action-btn primary" onClick={() => onEdit(appointment)} title="تعديل">
                <Edit3 size={18} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;
