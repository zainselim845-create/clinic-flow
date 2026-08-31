import React, { useMemo, useState, useDeferredValue } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Search, Lock, Unlock, Download, ChevronLeft, ChevronRight, Armchair, LayoutGrid } from 'lucide-react';
import AppointmentCard from '../components/AppointmentCard';
import MultiChairGrid from '../components/appointments/MultiChairGrid';
import { availableSlots } from '../data/demoData';
import { getTodayDateStr } from '../utils/timeSlots';
import * as appointmentsService from '../services/appointmentsService';
import * as blockedSlotsService from '../services/blockedSlotsService';
import './Appointments.css';


const Appointments = () => {
  const { state, dispatch, useSupabase } = useApp();
  const { role, user } = useAuth();
  const isDoctor = (user?.role || role || 'doctor') === 'doctor';
  const { appointments = [], patients = [], blockedSlots = [] } = state;

  const todayStr = getTodayDateStr();

  const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, completed, cancelled
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'chairs'
  const PAGE_SIZE = 18;
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

  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (useSupabase) {
      try {
        await appointmentsService.updateAppointmentStatus(id, newStatus);
      } catch (err) {
        console.error('Failed to update status on Supabase:', err);
      }
    }
    dispatch({
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id, status: newStatus }
    });
  };



  const patientMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      if (p && p.id) map.set(p.id, p);
    }
    return map;
  }, [patients]);

  const filteredAppointments = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();
    return appointments.filter(appt => {
      let matchesStatus = true;
      if (filterStatus === 'emergency') matchesStatus = appt.isEmergency || appt.type === 'طوارئ' || (appt.type || '').includes('طوارئ');
      else if (filterStatus === 'waiting') matchesStatus = appt.status === 'waiting';
      else if (filterStatus === 'in_progress') matchesStatus = appt.status === 'in_progress';
      else if (filterStatus === 'booked') matchesStatus = appt.status === 'booked' || appt.status === 'upcoming';
      else if (filterStatus === 'completed') matchesStatus = appt.status === 'completed';
      else if (filterStatus === 'cancelled') matchesStatus = appt.status === 'cancelled';

      if (!matchesStatus) return false;
      if (filterDate && appt.date !== filterDate) return false;
      if (!query) return true;

      const patient = patientMap.get(appt.patientId);
      return (
        (patient && patient.name && patient.name.toLowerCase().includes(query)) ||
        (appt.patientName && appt.patientName.toLowerCase().includes(query)) ||
        (appt.patientPhone && appt.patientPhone.includes(query)) ||
        (appt.bookingCode && appt.bookingCode.toLowerCase().includes(query))
      );
    });
  }, [appointments, patientMap, filterStatus, filterDate, deferredQuery]);

  const totalPages = Math.ceil(filteredAppointments.length / PAGE_SIZE) || 1;
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(start, start + PAGE_SIZE);
  }, [filteredAppointments, currentPage, PAGE_SIZE]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientId || !formData.date || !formData.time) return;

    const patient = patients.find(p => p.id === formData.patientId);
    const currentClinic = state.clinicInfo || {};
    const serviceMatch = (currentClinic.services || []).find(s => s.name === formData.type || (formData.type && s.name.includes(formData.type)));
    const determinedFee = serviceMatch?.price || (
      formData.type === 'استشارة' || formData.type === 'متابعة' 
        ? (currentClinic.consultationFee || '150 ج.م')
        : formData.type === 'طوارئ'
        ? (currentClinic.emergencyFee || '400 ج.م')
        : formData.type === 'تنظيف وتلميع أسنان'
        ? '400 ج.م'
        : formData.type === 'حشو تجميلي كومبوزيت'
        ? '500 ج.م'
        : formData.type === 'علاج جذور وعصب'
        ? '900 ج.م'
        : formData.type === 'طربوش زيركون'
        ? '1800 ج.م'
        : formData.type === 'تبييض أسنان'
        ? '2000 ج.م'
        : formData.type === 'زراعة أسنان'
        ? '6500 ج.م'
        : (currentClinic.regularFee || '300 ج.م')
    );

    const newAppointment = {
      id: Date.now().toString(),
      patientId: formData.patientId,
      patientName: patient ? patient.name : 'مريض العيادة',
      patientPhone: patient ? patient.phone : '',
      date: formData.date,
      time: formData.time,
      type: formData.type,
      fee: determinedFee,
      notes: formData.notes,
      status: 'booked',
      reminderSent: false
    };

    if (useSupabase) {
      try {
        await appointmentsService.addAppointment(newAppointment);
      } catch (err) {
        console.error('Failed to sync appointment with Supabase:', err);
      }
    }

    dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
    setIsModalOpen(false);
    setFormData({ patientId: '', date: todayStr, time: '', type: 'كشف عادي', notes: '' });
  };

  const isBlockerDateFullDayBlocked = (blockedSlots || []).some(
    b => b.date === blockerDate && (b.isFullDay || b.time === 'FULL_DAY')
  );

  const handleToggleBlockSlot = async (date, time) => {
    if (useSupabase) {
      try {
        await blockedSlotsService.toggleBlockSlot(state.clinicInfo?.id, date, time);
      } catch (err) {
        console.error('Failed to toggle blocked slot in Supabase:', err);
      }
    }
    dispatch({ type: 'TOGGLE_BLOCK_SLOT', payload: { date, time, reason: 'مغلق من السكرتارية' } });
  };

  const handleBlockFullDay = async (date, reason = 'إجازة الطبيب') => {
    if (useSupabase) {
      try {
        await blockedSlotsService.blockSlotInDb(date, 'FULL_DAY', reason, true);
      } catch (err) {
        console.error('Failed to block full day in Supabase:', err);
      }
    }
    dispatch({ type: 'BLOCK_FULL_DAY', payload: { date, reason } });
    showToast('تم إغلاق اليوم كاملاً وحظر الحجوزات بنجاح ', 'warning');
  };

  const handleUnblockFullDay = async (date) => {
    if (useSupabase) {
      try {
        await blockedSlotsService.unblockFullDayInDb(date);
      } catch (err) {
        console.error('Failed to unblock full day in Supabase:', err);
      }
    }
    dispatch({ type: 'UNBLOCK_FULL_DAY', payload: { date } });
    showToast('تم فتح اليوم واستقبال الحجوزات بنجاح ', 'success');
  };

  // Get slot status info for the Blocker Modal
  const getSlotInfoForBlocker = (time) => {
    const activeAppointment = appointments.find(a => a.date === blockerDate && a.time === time && a.status !== 'cancelled');
    const isBlocked = (blockedSlots || []).some(b => b.date === blockerDate && (b.time === time || b.isFullDay || b.time === 'FULL_DAY'));

    return {
      appointment: activeAppointment,
      isBlocked,
      isBooked: !!activeAppointment
    };
  };


  const handleExportAppointmentsCSV = () => {
    if (!filteredAppointments || filteredAppointments.length === 0) {
      showToast('لا توجد مواعيد للتصدير حسب الفلتر الحالي', 'info');
      return;
    }

    const headers = ['اسم المريض', 'رقم الهاتف', 'التاريخ', 'الوقت', 'نوع الكشف', 'القيمة', 'الحالة', 'ملاحظات'];
    const rows = filteredAppointments.map(a => [
      `"${(a.patientName || '').replace(/"/g, '""')}"`,
      a.patientPhone || '',
      a.date || '',
      a.time || '',
      a.type || 'كشف عادي',
      a.fee || '300 ج.م',
      a.status === 'completed' ? 'مكتمل' : a.status === 'upcoming' ? 'قادم' : 'ملغي',
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clinicflow_appointments_${filterDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير ملف المواعيد (CSV) بنجاح ', 'success');
  };

  return (
    <div className="appointments-page">
      {toastMessage && (
        <div className={`appointments-toast-banner ${toastMessage.type}`} style={{
          background: toastMessage.type === 'warning' ? '#fef3c7' : toastMessage.type === 'success' ? '#dcfce7' : '#e0f2fe',
          border: `1px solid ${toastMessage.type === 'warning' ? '#fcd34d' : toastMessage.type === 'success' ? '#86efac' : '#7dd3fc'}`,
          color: toastMessage.type === 'warning' ? '#92400e' : toastMessage.type === 'success' ? '#166534' : '#0369a1',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="page-header">
        <h2>إدارة المواعيد (لوحة السكرتير والأطباء)</h2>
        <div className="header-actions-btns">
          <button className="btn btn-secondary" onClick={handleExportAppointmentsCSV} title="تصدير المواعيد لملف إكسيل">
            <Download size={16} />
            <span>تصدير إكسيل (CSV)</span>
          </button>
          {isDoctor && (
            <button className="btn btn-secondary" onClick={() => setIsBlockerModalOpen(true)} title="إغلاق/فتح مواعيد العيادة (مخصص للطبيب فقط)">
              <Lock size={16} />
              <span>إغلاق / حظر مواعيد</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>موعد جديد</span>
          </button>
        </div>
      </div>

      <div className="filters-bar glass-card">
        <div className="status-filters">
          <button className={filterStatus === 'all' ? 'active' : ''} onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}>الكل ({appointments.length})</button>
          <button className={`emergency-pill-filter ${filterStatus === 'emergency' ? 'active' : ''}`} onClick={() => { setFilterStatus('emergency'); setCurrentPage(1); }}> طوارئ ({appointments.filter(a => a.isEmergency || a.type === 'طوارئ' || (a.type || '').includes('طوارئ')).length})</button>
          <button className={filterStatus === 'waiting' ? 'active' : ''} onClick={() => { setFilterStatus('waiting'); setCurrentPage(1); }}>في الانتظار ({appointments.filter(a => a.status === 'waiting').length})</button>
          <button className={filterStatus === 'in_progress' ? 'active' : ''} onClick={() => { setFilterStatus('in_progress'); setCurrentPage(1); }}>في الكشف ({appointments.filter(a => a.status === 'in_progress').length})</button>
          <button className={filterStatus === 'booked' ? 'active' : ''} onClick={() => { setFilterStatus('booked'); setCurrentPage(1); }}>محجوز ({appointments.filter(a => a.status === 'booked' || a.status === 'upcoming').length})</button>
          <button className={filterStatus === 'completed' ? 'active' : ''} onClick={() => { setFilterStatus('completed'); setCurrentPage(1); }}>مكتمل ({appointments.filter(a => a.status === 'completed').length})</button>
          <button className={filterStatus === 'cancelled' ? 'active' : ''} onClick={() => { setFilterStatus('cancelled'); setCurrentPage(1); }}>ملغي ({appointments.filter(a => a.status === 'cancelled').length})</button>
        </div>
        
        <div className="other-filters" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div className="view-mode-toggle-group" style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              style={{ padding: '0.35rem 0.65rem', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700, background: viewMode === 'grid' ? 'var(--surface)' : 'transparent', color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} />
              <span>بطاقات</span>
            </button>
            <button 
              type="button"
              style={{ padding: '0.35rem 0.65rem', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700, background: viewMode === 'chairs' ? 'var(--surface)' : 'transparent', color: viewMode === 'chairs' ? 'var(--primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'chairs' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}
              onClick={() => setViewMode('chairs')}
            >
              <Armchair size={14} />
              <span>الكراسي المتزامنة</span>
            </button>
          </div>

          <input 
            type="date" 
            className="input-field" 
            style={{ width: 'auto', minWidth: '135px', padding: '0.45rem 0.75rem' }}
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

      {viewMode === 'chairs' ? (
        <MultiChairGrid 
          appointments={filteredAppointments} 
          selectedDate={filterDate || todayStr} 
          onAppointmentClick={(appt) => {
            console.log('Selected chair appt:', appt);
          }}
        />
      ) : (
        <>
          <div className="appointments-grid">
            {paginatedAppointments.length > 0 ? (
              paginatedAppointments.map(appt => {
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

          {/* High-Volume Pagination Controls */}
          {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          margin: '2rem 0',
          padding: '0.75rem 1.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          width: 'fit-content',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ChevronRight size={16} />
            <span>السابق</span>
          </button>
          
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            صفحة {currentPage} من {totalPages} ({filteredAppointments.length} موعد إجمالي)
          </span>

          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>التالي</span>
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
      </>
      )}

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
                    {availableSlots.map(slot => {
                      const isBooked = (appointments || []).some(a => a.date === formData.date && a.time === slot && a.status !== 'cancelled');
                      const isBlocked = (blockedSlots || []).some(b => b.date === formData.date && (b.time === slot || b.isFullDay || b.time === 'FULL_DAY'));
                      const isUnavailable = isBooked || isBlocked;

                      return (
                        <option key={slot} value={slot} disabled={isUnavailable}>
                          {slot} {isBooked ? '(محجوز )' : isBlocked ? '(مغلق )' : '(متاح )'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>نوع الكشف أو الخدمة</label>
                <select 
                  className="input-field"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="كشف عادي">كشف وفحص تشخيصي شامل (300 ج.م)</option>
                  <option value="استشارة">استشارة ومتابعة بعد العلاج (150 ج.م)</option>
                  <option value="تنظيف وتلميع أسنان">تنظيف وتلميع وإزالة جير (400 ج.م)</option>
                  <option value="حشو تجميلي كومبوزيت">حشو تجميلي كومبوزيت ليزر (500 ج.م)</option>
                  <option value="علاج جذور وعصب">علاج جذور وعصب السن RCT (900 ج.م)</option>
                  <option value="خلع أسنان">خلع ضرس عادي أو مخلخل (400 ج.م)</option>
                  <option value="طربوش زيركون">طربوش / تاج زيركون تجميلي (1800 ج.م)</option>
                  <option value="تبييض أسنان">تبييض أسنان احترافي بالعيادة (2000 ج.م)</option>
                  <option value="زراعة أسنان">زراعة سن تيتانيوم ألماني (6500 ج.م)</option>
                  <option value="طوارئ">حالة طارئة ومستعجلة (400 ج.م)</option>
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
              <h3> إغلاق / حظر مواعيد العيادة (للسكرتارية)</h3>
              <button className="close-btn" onClick={() => setIsBlockerModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="blocker-body">
              <p className="blocker-desc">
                يمكن للطبيب والسكرتارية إغلاق يوم كامل كإجازة/عطلة طارئة، أو حظر أوقات معينة لمنع حجزها إلكترونياً.
              </p>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>اختر اليوم للتعديل والإغلاق:</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={blockerDate}
                  onChange={(e) => setBlockerDate(e.target.value)}
                />
              </div>

              {/* Full Day Off Control Banner */}
              <div style={{
                background: isBlockerDateFullDayBlocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(37, 99, 235, 0.06)',
                border: `1px solid ${isBlockerDateFullDayBlocked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(37, 99, 235, 0.2)'}`,
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <strong style={{ display: 'block', color: isBlockerDateFullDayBlocked ? '#DC2626' : 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {isBlockerDateFullDayBlocked ? ' هذا اليوم مغلق بالكامل (إجازة للعيادة)' : ' العيادة مفتوحة وتستقبل الحجز في هذا اليوم'}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isBlockerDateFullDayBlocked 
                      ? 'لا يمكن لأي مريض حجز أي موعد في هذا اليوم من صفحة الحجز العامة.' 
                      : 'يمكنك إغلاق اليوم كاملاً بضغطة زر واحدة إذا كان الطبيب في إجازة أو مؤتمر.'}
                  </span>
                </div>

                {isBlockerDateFullDayBlocked ? (
                  <button 
                    type="button"
                    className="btn-unlock" 
                    onClick={() => handleUnblockFullDay(blockerDate)}
                    style={{ background: '#10B981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Unlock size={16} />
                    <span>فتح اليوم واستقبال الحجوزات </span>
                  </button>
                ) : (
                  <button 
                    type="button"
                    className="btn-lock" 
                    onClick={() => handleBlockFullDay(blockerDate, 'إجازة الطبيب')}
                    style={{ background: '#DC2626', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Lock size={16} />
                    <span>إغلاق اليوم بالكامل (إجازة) </span>
                  </button>
                )}

              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                أو تحكم في كل موعد على حدة ({blockerDate}):
              </h4>

              <div className="blocker-slots-list">
                {availableSlots.map(slot => {
                  const info = getSlotInfoForBlocker(slot);
                  const isBlockedByFullDay = isBlockerDateFullDayBlocked;

                  return (
                    <div key={slot} className={`blocker-slot-item ${info.isBooked ? 'is-booked' : (info.isBlocked || isBlockedByFullDay) ? 'is-blocked' : 'is-available'}`}>
                      <div className="slot-item-info">
                        <span className="slot-time-badge">{slot}</span>
                        {info.isBooked && (
                          <span className="slot-patient-note">
                            محجوز للمريض: <strong>{info.appointment.patientName || 'مريض عيادة'}</strong>
                          </span>
                        )}
                        {!info.isBooked && (info.isBlocked || isBlockedByFullDay) && (
                          <span className="slot-blocked-note"> مغلق من العيادة</span>
                        )}
                        {!info.isBooked && !info.isBlocked && !isBlockedByFullDay && (
                          <span className="slot-available-note"> متاح للحجز الإلكتروني</span>
                        )}
                      </div>

                      <div className="slot-item-action">
                        {info.isBooked ? (
                          <span className="badge-booked">حجز قائم</span>
                        ) : (info.isBlocked || isBlockedByFullDay) ? (
                          <button 
                            className="btn-unlock" 
                            onClick={() => {
                              if (isBlockedByFullDay) {
                                dispatch({ type: 'UNBLOCK_FULL_DAY', payload: { date: blockerDate } });
                              } else {
                                handleToggleBlockSlot(blockerDate, slot);
                              }
                            }}
                          >
                            <Unlock size={16} /> فتح الموعد
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
