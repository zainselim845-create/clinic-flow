import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, Search, Lock, Unlock } from 'lucide-react';
import AppointmentCard from '../components/AppointmentCard';
import { availableSlots } from '../data/demoData';
import './Appointments.css';

const Appointments = () => {
  const { state, dispatch } = useApp();
  const { appointments = [], patients = [], blockedSlots = [] } = state;

  const todayStr = new Date().toISOString().split('T')[0];

  const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, completed, cancelled
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [blockerDate, setBlockerDate] = useState(todayStr);

  const [formData, setFormData] = useState({
    patientId: '',
    date: todayStr,
    time: '',
    type: 'كشف عادي',
    notes: ''
  });

  const handleUpdateStatus = (id, newStatus) => {
    dispatch({
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id, status: newStatus }
    });
  };

  const handleToggleBlockSlot = (date, time) => {
    dispatch({
      type: 'TOGGLE_BLOCK_SLOT',
      payload: { date, time }
    });
  };

  const filteredAppointments = appointments.filter(appt => {
    const patient = patients.find(p => p.id === appt.patientId);
    const matchesStatus = filterStatus === 'all' || appt.status === filterStatus;
    const matchesDate = !filterDate || appt.date === filterDate;
    const matchesSearch = !searchQuery || 
      (patient && patient.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (appt.patientName && appt.patientName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesDate && matchesSearch;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.patientId || !formData.date || !formData.time) return;

    const patient = patients.find(p => p.id === formData.patientId);

    const newAppointment = {
      id: Date.now().toString(),
      patientId: formData.patientId,
      patientName: patient ? patient.name : 'مريض العيادة',
      patientPhone: patient ? patient.phone : '',
      date: formData.date,
      time: formData.time,
      type: formData.type,
      fee: formData.type === 'استشارة' ? '150 ج.م' : '300 ج.م',
      notes: formData.notes,
      status: 'upcoming',
      reminderSent: false
    };

    dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
    setIsModalOpen(false);
    setFormData({ patientId: '', date: todayStr, time: '', type: 'كشف عادي', notes: '' });
  };

  // Get slot status info for the Blocker Modal
  const getSlotInfoForBlocker = (time) => {
    const activeAppointment = appointments.find(a => a.date === blockerDate && a.time === time && a.status !== 'cancelled');
    const isBlocked = blockedSlots.some(b => b.date === blockerDate && b.time === time);

    return {
      appointment: activeAppointment,
      isBlocked,
      isBooked: !!activeAppointment
    };
  };

  return (
    <div className="appointments-page">
      <div className="page-header">
        <h2>إدارة المواعيد (لوحة السكرتير والأطباء)</h2>
        <div className="header-actions-btns">
          <button className="btn-secondary" onClick={() => setIsBlockerModalOpen(true)} title="إغلاق/فتح مواعيد العيادة">
            <Lock size={18} />
            إغلاق / حظر مواعيد
          </button>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            إضافة موعد
          </button>
        </div>
      </div>

      <div className="filters-bar glass-card">
        <div className="status-filters">
          <button className={filterStatus === 'all' ? 'active' : ''} onClick={() => setFilterStatus('all')}>الكل</button>
          <button className={filterStatus === 'upcoming' ? 'active' : ''} onClick={() => setFilterStatus('upcoming')}>قادم</button>
          <button className={filterStatus === 'completed' ? 'active' : ''} onClick={() => setFilterStatus('completed')}>مكتمل</button>
          <button className={filterStatus === 'cancelled' ? 'active' : ''} onClick={() => setFilterStatus('cancelled')}>ملغي</button>
        </div>
        
        <div className="other-filters">
          <input 
            type="date" 
            className="input-field" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="بحث باسم المريض..." 
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="appointments-grid">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map(appt => {
            const patient = patients.find(p => p.id === appt.patientId);
            return (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                patient={patient}
                onUpdateStatus={handleUpdateStatus}
              />
            );
          })
        ) : (
          <div className="empty-state">
            <p>لا توجد مواعيد مطابقة للبحث.</p>
          </div>
        )}
      </div>

      {/* Modal 1: Add Appointment */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>إضافة موعد جديد في العيادة</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>اسم المريض *</label>
                <select 
                  className="input-field"
                  value={formData.patientId}
                  onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                  required
                >
                  <option value="">اختر المريض...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>التاريخ *</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>الوقت *</label>
                  <select 
                    className="input-field"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    required
                  >
                    <option value="">اختر الوقت...</option>
                    {availableSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>نوع الزيارة</label>
                <select 
                  className="input-field"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="كشف عادي">كشف عادي</option>
                  <option value="متابعة">متابعة</option>
                  <option value="استشارة">استشارة</option>
                  <option value="طوارئ">طوارئ</option>
                  <option value="أشعة">أشعة</option>
                </select>
              </div>

              <div className="form-group">
                <label>ملاحظات</label>
                <textarea 
                  className="input-field"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn-primary">حفظ وتأكيد الموعد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Secretary Slot Blocker */}
      {isBlockerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card blocker-modal">
            <div className="modal-header">
              <h3>🔒 إغلاق / حظر مواعيد العيادة (للسكرتارية)</h3>
              <button className="close-btn" onClick={() => setIsBlockerModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="blocker-body">
              <p className="blocker-desc">
                يمكن للسكرتير حظر الأوقات لمنع المرضى من حجزها أونلاين (مثل: حجز مباشر بالعيادة أو استراحة الطبيب).
              </p>

              <div className="form-group">
                <label>اختر اليوم للتعديل:</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={blockerDate}
                  onChange={(e) => setBlockerDate(e.target.value)}
                />
              </div>

              <div className="blocker-slots-list">
                {availableSlots.map(slot => {
                  const info = getSlotInfoForBlocker(slot);

                  return (
                    <div key={slot} className={`blocker-slot-item ${info.isBooked ? 'is-booked' : info.isBlocked ? 'is-blocked' : 'is-available'}`}>
                      <div className="slot-item-info">
                        <span className="slot-time-badge">{slot}</span>
                        {info.isBooked && (
                          <span className="slot-patient-note">
                            محجوز للمريض: <strong>{info.appointment.patientName || 'مريض عيادة'}</strong>
                          </span>
                        )}
                        {!info.isBooked && info.isBlocked && (
                          <span className="slot-blocked-note">🔒 مغلق من السكرتارية</span>
                        )}
                        {!info.isBooked && !info.isBlocked && (
                          <span className="slot-available-note">✅ متاح للحجز الإلكتروني</span>
                        )}
                      </div>

                      <div className="slot-item-action">
                        {info.isBooked ? (
                          <span className="badge-booked">حجز قائم</span>
                        ) : info.isBlocked ? (
                          <button 
                            className="btn-unlock" 
                            onClick={() => handleToggleBlockSlot(blockerDate, slot)}
                          >
                            <Unlock size={16} /> إلغاء الحظر (فتح)
                          </button>
                        ) : (
                          <button 
                            className="btn-lock" 
                            onClick={() => handleToggleBlockSlot(blockerDate, slot)}
                          >
                            <Lock size={16} /> إغلاق الموعد
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setIsBlockerModalOpen(false)}>تم الانتهاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
