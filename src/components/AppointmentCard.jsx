import React from 'react';
import { XCircle, Clock, MessageCircle, Check, Stethoscope, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './AppointmentCard.css';

const AppointmentCard = ({ appointment, onUpdateStatus }) => {
  const { dispatch } = useApp();

  const getStatusText = (status) => {
    switch (status) {
      case 'in_progress': return 'في الكشف ';
      case 'waiting': return 'في صالة الانتظار ';
      case 'booked':
      case 'upcoming': return 'محجوز ';
      case 'completed': return 'تم الكشف ';
      case 'cancelled': return 'ملغى ';
      default: return status;
    }
  };

  const handleStatusChange = (newStatus) => {
    if (onUpdateStatus) {
      onUpdateStatus(appointment.id, newStatus);
    } else {
      dispatch({ type: 'UPDATE_APPOINTMENT_STATUS', payload: { id: appointment.id, status: newStatus } });
    }
  };

  const handleCancel = () => {
    if (window.confirm('هل أنت متأكد من إلغاء هذا الموعد؟')) {
      handleStatusChange('cancelled');
    }
  };

  // Generate clean initials for patient avatar
  const initials = (appointment.patientName || 'م')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('');

  const isEmergency = appointment.isEmergency || appointment.type === 'طوارئ' || (appointment.type || '').includes('طوارئ');

  return (
    <div className={`modern-appointment-card glass-card ${appointment.status} ${isEmergency ? 'emergency-card' : ''}`}>
      <div className="appt-card-top">
        <div className="appt-patient-avatar" style={isEmergency ? { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFF' } : {}}>
          {initials}
        </div>
        <div className="appt-patient-details">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <h4 className="appt-patient-name">{appointment.patientName}</h4>
            {appointment.bookingCode && <span className="appt-code-pill">{appointment.bookingCode}</span>}
            {isEmergency && <span className="appt-emergency-badge"> طوارئ</span>}
          </div>
          <span className="appt-patient-phone">{appointment.patientPhone || 'بدون هاتف'}</span>
        </div>
        <span className={`appt-status-pill ${appointment.status}`}>
          {appointment.status === 'completed' && <Check size={12} />}
          {getStatusText(appointment.status)}
        </span>
      </div>

      <div className="appt-meta-chips-row">
        <div className="appt-chip time-chip">
          <Clock size={13} />
          <span>{appointment.date} • {appointment.time}</span>
        </div>
        <div className="appt-chip type-chip">
          <span>{appointment.type || 'كشف عادي'}</span>
        </div>
        <div className="appt-chip fee-chip">
          <span>{appointment.fee || '300 ج.م'}</span>
        </div>
      </div>

      {appointment.notes && (
        <div className="appt-notes-box">
          <p>{appointment.notes}</p>
        </div>
      )}

      <div className="appt-card-bottom-actions">
        {appointment.patientPhone && (
          <button 
            type="button"
            className="appt-btn-wa" 
            onClick={() => {
              const cleanPhone = appointment.patientPhone.replace(/^0/, '20').replace(/\D/g, '');
              const msg = `مرحباً أ/ ${appointment.patientName}، نذكركم بموعدكم في عيادة د. أحمد الشريف يوم ${appointment.date} الساعة ${appointment.time}. نتمنى لكم السلامة! `;
              window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
            }} 
            title="تذكير المريض عبر واتساب"
          >
            <MessageCircle size={15} />
            <span>واتساب</span>
          </button>
        )}

        <div className="appt-actions-right">
          {/* Quick Lifecycle Progress Action */}
          {(appointment.status === 'booked' || appointment.status === 'upcoming') && (
            <button 
              type="button"
              className="btn-status-advance checkin"
              onClick={() => handleStatusChange('waiting')}
              title="تسجيل حضور المريض"
            >
              <UserPlus size={13} />
              <span>تسجيل وصول </span>
            </button>
          )}

          {appointment.status === 'waiting' && (
            <button 
              type="button"
              className="btn-status-advance inexam"
              onClick={() => handleStatusChange('in_progress')}
              title="إدخال لغرفة الكشف"
            >
              <Stethoscope size={13} />
              <span>دخول الكشف </span>
            </button>
          )}

          {appointment.status === 'in_progress' && (
            <button 
              type="button"
              className="btn-status-advance finish"
              onClick={() => handleStatusChange('completed')}
              title="إنهاء الكشف وتسجيل الزيارة"
            >
              <Check size={13} />
              <span>إتمام الكشف </span>
            </button>
          )}

          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
            <button 
              type="button"
              className="appt-action-icon-btn cancel-btn" 
              onClick={handleCancel} 
              title="إلغاء الموعد"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
