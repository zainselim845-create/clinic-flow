import React, { useMemo, useState, useDeferredValue, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import AppointmentCard from '@/components/AppointmentCard';
import {
  MultiChairGrid,
  AppointmentFiltersBar,
  NewAppointmentModal,
  SlotBlockerModal
} from '@/components/appointments';
import PatientRecallModal from '@/components/PatientRecallModal';
import FeatureErrorBoundary from '@/components/FeatureErrorBoundary';
import { getTodayDateStr, generateDynamicSlots } from '@/utils/timeSlots';
import * as appointmentsService from '@/features/appointments/services/appointmentsService';
import * as blockedSlotsService from '@/features/appointments/services/blockedSlotsService';
import { isDoctorRole } from '@/utils/permissions';
import { syncOutbox } from '@/lib/syncOutbox';
import useDebounce from '@/hooks/useDebounce';
import './Appointments.css';

const Appointments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch, useSupabase } = useApp();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const isDoctor = isDoctorRole(user);
  const { appointments = [], patients = [], blockedSlots = [] } = state;

  const activeScheduleConfig = tenant?.scheduleConfig || state.clinicInfo?.scheduleConfig;
  const availableSlots = useMemo(() => {
    const start = activeScheduleConfig?.startTime || activeScheduleConfig?.workingHours?.start || '17:00';
    const end = activeScheduleConfig?.endTime || activeScheduleConfig?.workingHours?.end || '22:00';
    const duration = activeScheduleConfig?.slotDuration || 30;
    const breakTime = activeScheduleConfig?.breakTime || null;
    return generateDynamicSlots(start, end, duration, breakTime);
  }, [activeScheduleConfig]);
  const currentClinicId = tenant?.id || state.clinicInfo?.id;

  const todayStr = getTodayDateStr();

  const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, completed, cancelled
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 200);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'chairs'
  const PAGE_SIZE = 18;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [pendingRecallId, setPendingRecallId] = useState(null);
  const [blockerDate, setBlockerDate] = useState(todayStr);

  const dueRecallsCount = useMemo(() => {
    return (state?.recalls || []).filter(r => {
      if (!r) return false;
      const rClinicId = r.clinicId || r.clinic_id;
      if (rClinicId && currentClinicId && rClinicId !== currentClinicId) return false;
      return r.dueDate <= todayStr && r.status !== 'completed';
    }).length;
  }, [state?.recalls, currentClinicId, todayStr]);

  const currentClinic = state.clinicInfo;
  const defaultFee = currentClinic?.regularFee || '0 ج.م';

  const availableDoctors = useMemo(() => {
    const list = [...(state.doctors || [])];
    if (currentClinic?.doctorName && !list.some(d => d.name === currentClinic.doctorName)) {
      list.unshift({
        id: currentClinic.doctorId || "primary-doctor",
        name: currentClinic.doctorName,
        specialty: currentClinic.specialty || "طبيب المركز الأساسي",
        commissionRate: 100
      });
    }
    return list;
  }, [state.doctors, currentClinic]);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    doctorName: '',
    date: todayStr,
    time: '',
    type: 'كشف عيادة',
    fee: defaultFee,
    paymentMethod: 'cash',
    notes: ''
  });

  // Deep-linking from Command Palette or external actions
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      const patientIdParam = params.get('patientId') || '';
      const dateParam = params.get('date') || '';
      const typeParam = params.get('type') || '';
      const recallIdParam = params.get('recallId') || '';

      if (patientIdParam || dateParam || typeParam || recallIdParam) {
        setFormData(prev => ({
          ...prev,
          patientId: patientIdParam || prev.patientId,
          date: (dateParam && dateParam >= todayStr) ? dateParam : todayStr,
          type: typeParam || prev.type,
          notes: recallIdParam ? `استدعاء دوري وتأكيد مع العميل: ${typeParam}` : prev.notes
        }));
        if (recallIdParam) {
          setPendingRecallId(recallIdParam);
        }
      }
      setIsModalOpen(true);
    } else if (params.get('action') === 'block') {
      setIsBlockerModalOpen(true);
    } else if (params.get('action') === 'recalls') {
      setIsRecallModalOpen(true);
    }
  }, [location.search, todayStr]);

  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (useSupabase) {
      try {
        const res = await appointmentsService.updateAppointmentStatus(id, newStatus, {}, currentClinicId);
        if (res?.error) {
          console.warn('[Appointments] Remote status update failed, queueing to outbox:', res.error);
          syncOutbox.enqueue({
            entityType: 'appointment',
            action: 'updateStatus',
            payload: { id, status: newStatus },
            clinicId: currentClinicId
          });
        }
      } catch (err) {
        console.warn('[Appointments] Remote status update error, queueing to outbox:', err);
        syncOutbox.enqueue({
          entityType: 'appointment',
          action: 'updateStatus',
          payload: { id, status: newStatus },
          clinicId: currentClinicId
        });
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
      if (!appt) return false;
      // Strict multi-tenant isolation
      if (appt.clinicId && currentClinicId && appt.clinicId !== currentClinicId) return false;

      let matchesStatus = true;
      if (filterStatus === 'waiting') matchesStatus = appt.status === 'waiting';
      else if (filterStatus === 'in_progress') matchesStatus = appt.status === 'in_progress';
      else if (filterStatus === 'booked') matchesStatus = appt.status === 'booked' || appt.status === 'upcoming' || appt.status === 'confirmed' || appt.status === 'pending';
      else if (filterStatus === 'completed') matchesStatus = appt.status === 'completed';
      else if (filterStatus === 'cancelled') matchesStatus = appt.status === 'cancelled';

      if (!matchesStatus) return false;
      if (filterDate && appt.date !== filterDate) return false;
      if (!query) return true;

      const patient = patientMap.get(appt.patientId);
      const pName = patient?.name ? String(patient.name).toLowerCase() : '';
      const aName = appt.patientName ? String(appt.patientName).toLowerCase() : '';
      const aPhone = appt.patientPhone ? String(appt.patientPhone) : '';
      const aCode = appt.bookingCode ? String(appt.bookingCode).toLowerCase() : '';

      return (
        pName.includes(query) ||
        aName.includes(query) ||
        aPhone.includes(query) ||
        aCode.includes(query)
      );
    });
  }, [appointments, patientMap, filterStatus, filterDate, deferredQuery, currentClinicId]);

  const totalPages = Math.ceil(filteredAppointments.length / PAGE_SIZE) || 1;
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(start, start + PAGE_SIZE);
  }, [filteredAppointments, currentPage, PAGE_SIZE]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientId || !formData.date || !formData.time) return;

    const patient = patients.find(p => p.id === formData.patientId);
    const determinedFee = formData.fee?.trim() || currentClinic.regularFee || '0 ج.م';

    const newAppointment = {
      id: Date.now().toString(),
      clinicId: currentClinicId,
      clinic_id: currentClinicId,
      doctorId: formData.doctorId || availableDoctors[0]?.id || null,
      doctorName: formData.doctorName || availableDoctors[0]?.name || null,
      patientId: formData.patientId,
      patientName: patient ? patient.name : 'مريض العيادة',
      patientPhone: patient ? patient.phone : '',
      governorate: patient?.governorate || '',
      paymentMethod: formData.paymentMethod || 'cash',
      date: formData.date,
      time: formData.time,
      type: formData.type || 'كشف عيادة',
      fee: determinedFee,
      notes: formData.notes,
      status: 'booked',
      reminderSent: false
    };

    if (useSupabase) {
      try {
        const res = await appointmentsService.addAppointment(newAppointment);
        if (res?.data?.id) {
          newAppointment.id = res.data.id;
        } else if (res?.error) {
          console.warn('[Appointments] Remote table sync unavailable, saving locally and queuing to outbox:', res.error.message);
          syncOutbox.enqueue({
            entityType: 'appointment',
            action: 'create',
            payload: newAppointment,
            clinicId: currentClinicId
          });
        }
      } catch (err) {
        console.warn('[Appointments] Remote sync error, saving locally and queuing to outbox:', err);
        syncOutbox.enqueue({
          entityType: 'appointment',
          action: 'create',
          payload: newAppointment,
          clinicId: currentClinicId
        });
      }
    }


    dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
    if (pendingRecallId) {
      dispatch({
        type: 'UPDATE_RECALL_STATUS',
        payload: { id: pendingRecallId, status: 'scheduled' }
      });
      setPendingRecallId(null);
    }
    showToast('تم حجز وتأكيد الموعد بنجاح', 'success');
    setIsModalOpen(false);
    setFormData({ patientId: '', date: todayStr, time: '', type: 'كشف عيادة', fee: defaultFee, paymentMethod: 'cash', notes: '' });
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
        await blockedSlotsService.blockSlotInDb(date, 'FULL_DAY', reason, true, currentClinicId);
      } catch (err) {
        console.error('Failed to block full day in Supabase:', err);
      }
    }
    dispatch({ type: 'BLOCK_FULL_DAY', payload: { date, reason } });
    showToast('تم إغلاق اليوم كاملاً وحظر الحجوزات بنجاح', 'warning');
  };

  const handleUnblockFullDay = async (date) => {
    if (useSupabase) {
      try {
        await blockedSlotsService.unblockFullDayInDb(date, currentClinicId);
      } catch (err) {
        console.error('Failed to unblock full day in Supabase:', err);
      }
    }
    dispatch({ type: 'UNBLOCK_FULL_DAY', payload: { date } });
    showToast('تم فتح اليوم واستقبال الحجوزات بنجاح', 'success');
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
      a.fee || '0 ج.م',
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
    showToast('تم تصدير ملف المواعيد (CSV) بنجاح', 'success');
  };

  return (
    <div className="appointments-page">
      {toastMessage && (
        <div className={`appointments-toast-banner ${toastMessage.type}`}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <FeatureErrorBoundary featureName="شريط تصفية المواعيد">
        <AppointmentFiltersBar
          appointments={appointments}
          filterStatus={filterStatus}
          onSelectFilterStatus={(status) => { setFilterStatus(status); setCurrentPage(1); }}
          filterDate={filterDate}
          onChangeFilterDate={(date) => { setFilterDate(date); setCurrentPage(1); }}
          searchQuery={searchQuery}
          onChangeSearchQuery={(q) => { setSearchQuery(q); setCurrentPage(1); }}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          isDoctor={isDoctor}
          onExportCsv={handleExportAppointmentsCSV}
          onOpenBlockerModal={() => setIsBlockerModalOpen(true)}
          onOpenNewAppointmentModal={() => setIsModalOpen(true)}
          onOpenRecallModal={() => setIsRecallModalOpen(true)}
          dueRecallsCount={dueRecallsCount}
        />
      </FeatureErrorBoundary>

      {viewMode === 'chairs' ? (
        <MultiChairGrid 
          appointments={filteredAppointments} 
          selectedDate={filterDate || todayStr} 
          onAppointmentClick={() => {}}
          doctors={availableDoctors}
          clinicInfo={currentClinic}
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
                <Calendar size={48} className="empty-state-icon" aria-hidden="true" />
                <h3 className="empty-state-title">
                  {searchQuery || filterStatus !== 'all' || filterDate
                    ? 'لا توجد مواعيد مطابقة لمعايير البحث والتصفية'
                    : 'لا توجد مواعيد مسجلة حتى الآن'}
                </h3>
                <p className="empty-state-desc">
                  {searchQuery || filterStatus !== 'all' || filterDate
                    ? 'جرّب تغيير حالة الفلتر أو اختيار تاريخ مختلف أو مسح خانة البحث.'
                    : 'ابدأ بإضافة موعد جديد وتحديد المريض والوقت المناسب لحجز الكشف.'}
                </p>
                <div className="empty-state-action">
                  {searchQuery || filterStatus !== 'all' || filterDate ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterStatus('all');
                        setFilterDate('');
                        setCurrentPage(1);
                      }}
                    >
                      إعادة ضبط الفلاتر
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setIsModalOpen(true)}
                    >
                      <Plus size={18} />
                      <span>حجز موعد جديد</span>
                    </button>
                  )}
                </div>
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
      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        patients={patients}
        appointments={appointments}
        blockedSlots={blockedSlots}
        availableSlots={availableSlots}
        scheduleConfig={activeScheduleConfig}
        doctors={availableDoctors}
        onNavigateToNewPatient={() => {
          setIsModalOpen(false);
          navigate('/patients?action=new');
        }}
      />

      {/* Modal 2: Secretary Slot Blocker */}
      <SlotBlockerModal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        blockerDate={blockerDate}
        setBlockerDate={setBlockerDate}
        isBlockerDateFullDayBlocked={isBlockerDateFullDayBlocked}
        onBlockFullDay={handleBlockFullDay}
        onUnblockFullDay={handleUnblockFullDay}
        availableSlots={availableSlots}
        scheduleConfig={activeScheduleConfig}
        getSlotInfoForBlocker={getSlotInfoForBlocker}
        onToggleBlockSlot={handleToggleBlockSlot}
        onUnblockFullDaySlot={(date) => dispatch({ type: 'UNBLOCK_FULL_DAY', payload: { date } })}
      />

      {/* Modal 3: Patient Recall & Followup */}
      <FeatureErrorBoundary featureName="نافذة استدعاء ومتابعة المرضى">
        <PatientRecallModal
          isOpen={isRecallModalOpen}
          onClose={() => setIsRecallModalOpen(false)}
          onScheduleAppointment={(recall) => {
            setFormData(prev => ({
              ...prev,
              patientId: recall.patientId,
              date: recall.dueDate && recall.dueDate >= todayStr ? recall.dueDate : todayStr,
              type: recall.reason || 'متابعة دورية',
              notes: `استدعاء دوري وتأكيد مع العميل: ${recall.reason}`
            }));
            setPendingRecallId(recall.id);
            setIsRecallModalOpen(false);
            setIsModalOpen(true);
          }}
        />
      </FeatureErrorBoundary>
    </div>
  );
};

export default Appointments;
