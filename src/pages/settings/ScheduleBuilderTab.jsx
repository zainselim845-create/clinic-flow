import React, { useState } from 'react';
import { 
  Calendar, Lock, Unlock, Clock, CheckCircle2, 
  CalendarDays, ChevronRight, ChevronLeft, Save,
  Coffee, Plus, Trash2, Palmtree, SlidersHorizontal 
} from 'lucide-react';

import { 
  ARABIC_DAYS_MAP, generateDynamicSlots, formatTimeToArabic, 
  formatLocalDate, parseLocalDate, getTodayDateStr 
} from '../../utils/timeSlots';
import { isSupabaseConfigured } from '../../lib/supabase';
import * as blockedSlotsService from '../../services/blockedSlotsService';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ARABIC_WEEKDAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function ScheduleBuilderTab({ state, dispatch, clinicForm, setClinicForm }) {
  const [selectedBlockDate, setSelectedBlockDate] = useState(getTodayDateStr());
  const [blockReason, setBlockReason] = useState('');
  const [blockFeedback, setBlockFeedback] = useState(null);
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState(false);
  const [newVacation, setNewVacation] = useState({ title: '', startDate: '', endDate: '' });

  // Month navigation for interactive calendar
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getTodayDateStr();

  const [currentMonth, setCurrentMonth] = useState(() => {
    return selectedBlockDate ? parseLocalDate(selectedBlockDate) : new Date();
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const blockedSlotsList = state.blockedSlots || [];

  // Schedule Config
  const scheduleConfig = clinicForm?.scheduleConfig || state.clinicInfo?.scheduleConfig || {
    workingDays: [6, 0, 1, 2, 3, 4],
    startTime: '17:00',
    endTime: '22:00',
    slotDuration: 30,
    enableCustomDayShifts: false,
    dayShifts: {},
    breakTime: { enabled: false, start: '19:30', end: '20:00', label: 'استراحة الطبيب وصلاة العشاء' },
    vacations: []
  };

  const workingDays = scheduleConfig.workingDays || [6, 0, 1, 2, 3, 4];
  const startTime = scheduleConfig.startTime || '17:00';
  const endTime = scheduleConfig.endTime || '22:00';
  const slotDuration = scheduleConfig.slotDuration || 30;
  const enableCustomDayShifts = Boolean(scheduleConfig.enableCustomDayShifts);
  const dayShifts = scheduleConfig.dayShifts || {};
  const breakTime = scheduleConfig.breakTime || { enabled: false, start: '19:30', end: '20:00', label: 'استراحة الطبيب وصلاة العشاء' };
  const vacations = scheduleConfig.vacations || [];

  const dynamicSlots = generateDynamicSlots(startTime, endTime, slotDuration, breakTime);

  // Check if selected date is blocked
  const isSelectedDateFullDayBlocked = blockedSlotsList.some(
    b => b.date === selectedBlockDate && (b.isFullDay || b.time === 'FULL_DAY' || b.time === 'ALL')
  );

  // Save Schedule Config
  const handleSaveScheduleConfig = (e) => {
    e?.preventDefault();
    const updatedInfo = {
      ...(clinicForm || state.clinicInfo),
      scheduleConfig: {
        workingDays,
        startTime,
        endTime,
        slotDuration,
        enableCustomDayShifts,
        dayShifts,
        breakTime,
        vacations
      }
    };
    if (setClinicForm) setClinicForm(updatedInfo);
    dispatch({
      type: 'UPDATE_CLINIC_INFO',
      payload: updatedInfo
    });
    setScheduleSaveSuccess(true);
    setTimeout(() => setScheduleSaveSuccess(false), 3000);
  };

  const handleUpdateScheduleConfig = (partial) => {
    const updatedConfig = { ...scheduleConfig, ...partial };
    if (setClinicForm && clinicForm) {
      setClinicForm({ ...clinicForm, scheduleConfig: updatedConfig });
    }
    dispatch({
      type: 'UPDATE_CLINIC_INFO',
      payload: {
        ...(clinicForm || state.clinicInfo),
        scheduleConfig: updatedConfig
      }
    });
  };

  const handleAddVacation = (e) => {
    e?.preventDefault();
    if (!newVacation.startDate || !newVacation.endDate) return;
    const v = {
      id: 'vac_' + Date.now(),
      title: newVacation.title.trim() || 'إجازة رسمية',
      startDate: newVacation.startDate,
      endDate: newVacation.endDate
    };
    handleUpdateScheduleConfig({
      vacations: [...vacations, v]
    });
    setNewVacation({ title: '', startDate: '', endDate: '' });
  };

  const handleRemoveVacation = (vacId) => {
    handleUpdateScheduleConfig({
      vacations: vacations.filter(v => v.id !== vacId)
    });
  };

  // Toggle Day of Week
  const handleToggleWorkingDay = (dayId) => {
    const isCurrentlyWorking = workingDays.includes(dayId);
    const updatedDays = isCurrentlyWorking
      ? workingDays.filter(d => d !== dayId)
      : [...workingDays, dayId];

    const updatedConfig = {
      ...scheduleConfig,
      workingDays: updatedDays
    };

    if (setClinicForm && clinicForm) {
      setClinicForm({ ...clinicForm, scheduleConfig: updatedConfig });
    }

    dispatch({
      type: 'UPDATE_CLINIC_INFO',
      payload: {
        ...(clinicForm || state.clinicInfo),
        scheduleConfig: updatedConfig
      }
    });
  };

  // Slot blocking handler
  const handleToggleSlotBlock = async (slotTime) => {
    const reason = blockReason.trim() || 'حظر مخصص من الطبيب';
    dispatch({
      type: 'TOGGLE_BLOCK_SLOT',
      payload: { date: selectedBlockDate, time: slotTime, reason }
    });

    if (isSupabaseConfigured()) {
      try {
        const clinicId = clinicForm?.id || state.clinicInfo?.id || null;
        const isCurrentlyBlocked = blockedSlotsList.some(
          b => b.date === selectedBlockDate && b.time === slotTime
        );
        if (isCurrentlyBlocked) {
          await blockedSlotsService.unblockSlotInDb(selectedBlockDate, slotTime, clinicId);
        } else {
          await blockedSlotsService.blockSlotInDb(selectedBlockDate, slotTime, reason, false, clinicId);
        }
      } catch (err) {
        console.error('Failed to sync slot block with Supabase:', err);
      }
    }

    const wasBlocked = blockedSlotsList.some(b => b.date === selectedBlockDate && b.time === slotTime);
    setBlockFeedback({
      type: wasBlocked ? 'unblock' : 'block',
      message: wasBlocked 
        ? `تم فتح موعد (${slotTime}) ليوم ${selectedBlockDate} بنجاح! `
        : `تم حظر موعد (${slotTime}) ليوم ${selectedBlockDate} بنجاح! `
    });
    setTimeout(() => setBlockFeedback(null), 3000);
  };

  // Full Day blocking handler
  const handleToggleFullDayBlock = async (targetDate) => {
    const dateToToggle = targetDate || selectedBlockDate;
    const isBlocked = blockedSlotsList.some(
      b => b.date === dateToToggle && (b.isFullDay || b.time === 'FULL_DAY' || b.time === 'ALL')
    );
    const reason = blockReason.trim() || 'إجازة الطبيب بالكامل';
    const clinicId = clinicForm?.id || state.clinicInfo?.id || null;

    if (isBlocked) {
      dispatch({
        type: 'UNBLOCK_FULL_DAY',
        payload: { date: dateToToggle }
      });
      if (isSupabaseConfigured()) {
        await blockedSlotsService.unblockFullDayInDb(dateToToggle, clinicId).catch(console.error);
      }
      setBlockFeedback({
        type: 'unblock',
        message: `تم إلغاء الإجازة وفتح يوم ${dateToToggle} بالكامل للمرضى! `
      });
    } else {
      dispatch({
        type: 'BLOCK_FULL_DAY',
        payload: { date: dateToToggle, reason }
      });
      if (isSupabaseConfigured()) {
        await blockedSlotsService.blockSlotInDb(dateToToggle, 'FULL_DAY', reason, true, clinicId).catch(console.error);
      }
      setBlockFeedback({
        type: 'block',
        message: `تم إغلاق وحظر يوم ${dateToToggle} بالكامل بنجاح كإجازة للطبيب! `
      });
    }

    setBlockReason('');
    setTimeout(() => setBlockFeedback(null), 3500);
  };

  // Calendar Calculation
  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = (firstDayOfMonth.getDay() + 1) % 7; // Saturday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [];

  for (let i = 0; i < startDay; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <div className="settings-section schedule-builder-tab">
      <div className="section-header">
        <div>
          <h3>منشئ الجدول والتقويم التفاعلي وإدارة الإجازات</h3>
          <p>تحكم كامل في أيام وساعات العمل الأسبوعية، والتقويم التفاعلي لحظر الأيام والمواعيد</p>
        </div>
        <button type="button" onClick={handleSaveScheduleConfig} className="btn btn-primary btn-save">
          <Save size={18} />
          <span>حفظ جدول العمل الأسبوعي</span>
        </button>
      </div>

      {scheduleSaveSuccess && (
        <div className="settings-alert success">
          <CheckCircle2 size={18} />
          <span>تم حفظ جدول وساعات عمل العيادة بنجاح!</span>
        </div>
      )}

      {blockFeedback && (
        <div className={`settings-alert ${blockFeedback.type === 'block' ? 'error' : 'success'}`}>
          {blockFeedback.type === 'block' ? <Lock size={18} /> : <CheckCircle2 size={18} />}
          <span>{blockFeedback.message}</span>
        </div>
      )}

      {/* 1. Weekly Schedule Config Box */}
      <div className="vacation-dates-manager-box">
        <div className="schedule-builder-header">
          <CalendarDays size={22} className="text-primary" />
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.2rem 0' }}>
              ١. أيام وساعات العمل الأسبوعية للعيادة:
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              حدد أيام العمل الأسبوعية، وساعات البدء والانتهاء، وسيقوم النظام بتوليد مواعيد الكشف للمرضى تلقائياً.
            </p>
          </div>
        </div>

        {/* Working Days Selector */}
        <div className="days-selector-wrapper">
          <span className="days-label">أيام العمل الأسبوعية (اضغط على اليوم لتفعيله أو إغلاقه كعطلة):</span>
          <div className="days-toggle-row">
            {ARABIC_DAYS_MAP.map((day) => {
              const isWorking = workingDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  className={`day-toggle-chip ${isWorking ? 'active' : 'off'}`}
                  onClick={() => handleToggleWorkingDay(day.id)}
                  title={isWorking ? `اضغط لتعطيل يوم ${day.name}` : `اضغط لتفعيل يوم ${day.name}`}
                >
                  <span className="day-name">{day.name}</span>
                  <span className="day-badge">{isWorking ? ' مفتوح' : ' عطلة'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start & End Times + Slot Duration */}
        <div className="form-grid-3col">
          <div className="form-group">
            <label>وقت بدء الاستقبال:</label>
            <input 
              type="time" 
              className="input-field" 
              value={startTime} 
              onChange={(e) => {
                const newConfig = { ...scheduleConfig, startTime: e.target.value };
                if (setClinicForm && clinicForm) setClinicForm({ ...clinicForm, scheduleConfig: newConfig });
                dispatch({ type: 'UPDATE_CLINIC_INFO', payload: { ...(clinicForm || state.clinicInfo), scheduleConfig: newConfig } });
              }} 
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              المقابل: {formatTimeToArabic(startTime)}
            </small>
          </div>

          <div className="form-group">
            <label>وقت انتهاء الاستقبال:</label>
            <input 
              type="time" 
              className="input-field" 
              value={endTime} 
              onChange={(e) => {
                const newConfig = { ...scheduleConfig, endTime: e.target.value };
                if (setClinicForm && clinicForm) setClinicForm({ ...clinicForm, scheduleConfig: newConfig });
                dispatch({ type: 'UPDATE_CLINIC_INFO', payload: { ...(clinicForm || state.clinicInfo), scheduleConfig: newConfig } });
              }} 
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              المقابل: {formatTimeToArabic(endTime)}
            </small>
          </div>

          <div className="form-group">
            <label>مدة كل كشف / موعد:</label>
            <select 
              className="input-field" 
              value={slotDuration} 
              onChange={(e) => {
                const newConfig = { ...scheduleConfig, slotDuration: Number(e.target.value) };
                if (setClinicForm && clinicForm) setClinicForm({ ...clinicForm, scheduleConfig: newConfig });
                dispatch({ type: 'UPDATE_CLINIC_INFO', payload: { ...(clinicForm || state.clinicInfo), scheduleConfig: newConfig } });
              }}
            >
              <option value={10}>10 دقائق (كشف سريع)</option>
              <option value={15}>15 دقيقة</option>
              <option value={20}>20 دقيقة</option>
              <option value={25}>25 دقيقة</option>
              <option value={30}>30 دقيقة (افتراضي)</option>
              <option value={40}>40 دقيقة</option>
              <option value={45}>45 دقيقة</option>
              <option value={50}>50 دقيقة</option>
              <option value={60}>60 دقيقة (ساعة كاملة)</option>
            </select>
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              فارق الوقت بين الموعد والآخر
            </small>
          </div>
        </div>

        {/* 1.1 Daily Break Time Box */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coffee size={18} style={{ color: '#F59E0B' }} />
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>فترة الراحة اليومية (Daily Break / Prayer Time):</strong>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={Boolean(breakTime.enabled)} 
                onChange={(e) => handleUpdateScheduleConfig({ breakTime: { ...breakTime, enabled: e.target.checked } })}
              />
              <span>تفعيل استراحة أثناء اليوم</span>
            </label>
          </div>

          {breakTime.enabled && (
            <div className="form-grid-3col" style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="form-group">
                <label>بدء الاستراحة:</label>
                <input 
                  type="time" 
                  className="input-field" 
                  value={breakTime.start || '19:30'} 
                  onChange={(e) => handleUpdateScheduleConfig({ breakTime: { ...breakTime, start: e.target.value } })}
                />
              </div>
              <div className="form-group">
                <label>انتهاء الاستراحة:</label>
                <input 
                  type="time" 
                  className="input-field" 
                  value={breakTime.end || '20:00'} 
                  onChange={(e) => handleUpdateScheduleConfig({ breakTime: { ...breakTime, end: e.target.value } })}
                />
              </div>
              <div className="form-group">
                <label>سبب / مسمى الاستراحة:</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={breakTime.label || 'استراحة الطبيب وصلاة العشاء'} 
                  onChange={(e) => handleUpdateScheduleConfig({ breakTime: { ...breakTime, label: e.target.value } })}
                  placeholder="استراحة الطبيب / صلاة"
                />
              </div>
            </div>
          )}
        </div>

        {/* 1.2 Per-Day Custom Working Shifts Box */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={18} className="text-primary" />
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>ساعات عمل مخصصة لكل يوم (Per-Day Custom Hours):</strong>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={enableCustomDayShifts} 
                onChange={(e) => handleUpdateScheduleConfig({ enableCustomDayShifts: e.target.checked })}
              />
              <span>تخصيص ساعات مختلفة لكل يوم عمل</span>
            </label>
          </div>

          {enableCustomDayShifts ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
              {ARABIC_DAYS_MAP.filter(d => workingDays.includes(d.id)).map(day => {
                const shift = dayShifts[day.id] || { startTime, endTime };
                return (
                  <div key={day.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>يوم {day.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {formatTimeToArabic(shift.startTime)} - {formatTimeToArabic(shift.endTime)}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>من:</label>
                        <input 
                          type="time" 
                          className="input-field"
                          value={shift.startTime}
                          onChange={(e) => {
                            const updatedDayShifts = {
                              ...dayShifts,
                              [day.id]: { ...(dayShifts[day.id] || { startTime, endTime }), startTime: e.target.value }
                            };
                            handleUpdateScheduleConfig({ dayShifts: updatedDayShifts });
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>إلى:</label>
                        <input 
                          type="time" 
                          className="input-field"
                          value={shift.endTime}
                          onChange={(e) => {
                            const updatedDayShifts = {
                              ...dayShifts,
                              [day.id]: { ...(dayShifts[day.id] || { startTime, endTime }), endTime: e.target.value }
                            };
                            handleUpdateScheduleConfig({ dayShifts: updatedDayShifts });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              يتم تطبيق ساعات العمل العامة ({formatTimeToArabic(startTime)} إلى {formatTimeToArabic(endTime)}) على كافة أيام الأسبوع المفتوحة. فعّل الخيار بالأعلى لتخصيص ساعات محددة لكل يوم كشف.
            </p>
          )}
        </div>

        {/* 1.3 Annual Vacations & Holiday Ranges Box */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Palmtree size={18} style={{ color: '#10B981' }} />
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>الإجازات السنوية والرسمية ومؤتمرات الطبيب (Vacation Ranges):</strong>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
            حدد فترات الإجازات الممتدة، وسيتم حظر وقفل الحجز التلقائي في جميع أيام الفترة فوراً عبر كل بوابات المرضى.
          </p>

          {/* Add Vacation Form */}
          <form onSubmit={handleAddVacation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 120px', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.85rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>مسمى الإجازة / السبب:</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="مثال: إجازة عيد الفطر، مؤتمر دولي..." 
                value={newVacation.title} 
                onChange={(e) => setNewVacation({ ...newVacation, title: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>من تاريخ:</label>
              <input 
                type="date" 
                className="input-field" 
                value={newVacation.startDate} 
                onChange={(e) => setNewVacation({ ...newVacation, startDate: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem' }}>إلى تاريخ:</label>
              <input 
                type="date" 
                className="input-field" 
                value={newVacation.endDate} 
                onChange={(e) => setNewVacation({ ...newVacation, endDate: e.target.value })} 
                required 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }}>
                <Plus size={16} />
                <span>إضافة إجازة</span>
              </button>
            </div>
          </form>

          {/* Active Vacations List */}
          {vacations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {vacations.map(vac => (
                <div key={vac.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></span>
                    <strong style={{ fontSize: '0.85rem' }}>{vac.title}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      (من {vac.startDate} إلى {vac.endDate})
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveVacation(vac.id)}
                    style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
                    title="حذف الإجازة وفتح المواعيد"
                  >
                    <Trash2 size={15} />
                    <span>إلغاء</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
              لا توجد إجازات سنوية أو رسمية مضافة حالياً.
            </div>
          )}
        </div>

        {/* Live Slots Preview */}
        <div className="slots-live-preview" style={{ marginTop: '1.25rem' }}>
          <span className="preview-label">
             مواعيد الكشف المتولدة يومياً ({dynamicSlots.length} موعد متاح في اليوم):
          </span>
          <div className="preview-pills-row">
            {dynamicSlots.map((slot, idx) => (
              <span key={idx} className="slot-preview-pill">{slot}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive Visual Calendar & Date Blocker */}
      <div className="vacation-dates-manager-box">
        <div className="schedule-builder-header">
          <Calendar size={22} className="text-primary" />
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.2rem 0' }}>
              ٢. التقويم التفاعلي المباشر لإدارة الإجازات وحظر الأيام والمواعيد:
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              اضغط على أي يوم في التقويم لاختياره، ثم حدد ما إذا كنت ترغب في إغلاقه بالكامل أو قفل مواعيد محددة بالساعة.
            </p>
          </div>
        </div>

        {/* Month Navigator Header */}
        <div className="calendar-nav-header">
          <button type="button" onClick={handlePrevMonth} className="btn-month-nav" title="الشهر السابق">
            <ChevronRight size={20} />
            <span>الشهر السابق</span>
          </button>
          
          <div className="current-month-display">
            <Calendar size={20} className="text-primary" />
            <h3>{ARABIC_MONTHS[month]} {year}</h3>
          </div>

          <button type="button" onClick={handleNextMonth} className="btn-month-nav" title="الشهر التالي">
            <span>الشهر التالي</span>
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Interactive Calendar Grid */}
        <div className="interactive-calendar-grid">
          {ARABIC_WEEKDAYS.map((wd, i) => (
            <div key={i} className="weekday-col-header">{wd}</div>
          ))}

          {calendarCells.map((dayNum, idx) => {
            if (!dayNum) {
              return <div key={`empty-${idx}`} className="calendar-day-cell empty"></div>;
            }

            const cellDateStr = formatLocalDate(year, month, dayNum);
            const cellDateObj = new Date(year, month, dayNum);
            const jsDay = cellDateObj.getDay();
            const isWeeklyDayOff = !workingDays.includes(jsDay);
            const isFullDayBlocked = blockedSlotsList.some(
              b => b.date === cellDateStr && (b.isFullDay || b.time === 'FULL_DAY' || b.time === 'ALL')
            );
            const hasBlockedSlots = blockedSlotsList.some(
              b => b.date === cellDateStr && !b.isFullDay && b.time !== 'FULL_DAY' && b.time !== 'ALL'
            );
            const isSelected = selectedBlockDate === cellDateStr;
            const isToday = cellDateStr === todayStr;

            let statusClass = 'open';
            let badgeText = 'مفتوح ';
            if (isFullDayBlocked) {
              statusClass = 'doctor-blocked';
              badgeText = ' إجازة';
            } else if (isWeeklyDayOff) {
              statusClass = 'weekly-off';
              badgeText = 'عطلة ';
            } else if (hasBlockedSlots) {
              statusClass = 'partial-blocked';
              badgeText = 'مواعيد محظورة ';
            }

            return (
              <div
                key={`day-${dayNum}`}
                className={`calendar-day-cell ${statusClass} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedBlockDate(cellDateStr)}
              >
                <div className="cell-top">
                  <span className="day-number">{dayNum}</span>
                  {isToday && <span className="today-badge">اليوم</span>}
                </div>
                <span className={`cell-status-badge ${statusClass}`}>{badgeText}</span>
              </div>
            );
          })}
        </div>

        {/* Selected Date Actions Panel */}
        <div className="selected-date-control-card">
          <div className="date-control-header">
            <div className="selected-date-title">
              <CalendarDays size={20} className="text-primary" />
              <div>
                <h4>اليوم المحدد: <strong>{selectedBlockDate}</strong></h4>
                <p>
                  {isSelectedDateFullDayBlocked 
                    ? ' هذا اليوم محظور بالكامل ومسجل كإجازة للطبيب.' 
                    : ' هذا اليوم متاح لاستقبال حجوزات المرضى.'}
                </p>
              </div>
            </div>

            <div className="date-action-buttons">
              {isSelectedDateFullDayBlocked ? (
                <button
                  type="button"
                  onClick={() => handleToggleFullDayBlock(selectedBlockDate)}
                  className="btn btn-success"
                >
                  <Unlock size={18} />
                  <span>إلغاء الإجازة وفتح اليوم للمرضى </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleFullDayBlock(selectedBlockDate)}
                  className="btn btn-danger"
                >
                  <Lock size={18} />
                  <span>إغلاق وحظر هذا اليوم بالكامل (إجازة) </span>
                </button>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label>سبب الإجازة أو الحظر (اختياري):</label>
            <input
              type="text"
              className="input-field"
              placeholder="مثال: مؤتمر طبي، سفر، صيانة العيادة..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>

          {/* Interactive Hourly Slots Grid for the selected day */}
          {!isSelectedDateFullDayBlocked && (
            <div className="slots-grid-section" style={{ marginTop: '1rem' }}>
              <div className="slots-header">
                <h4>
                  <Clock size={16} className="text-primary" />
                  <span>مواعيد يوم ({selectedBlockDate}) بالساعة — اضغط على أي موعد لقفله أو فتحه:</span>
                </h4>
                <small style={{ color: 'var(--text-secondary)' }}>
                  المواعيد المغلقة تظهر باللون الأحمر ولن يتمكن المرضى من حجزها أونلاين.
                </small>
              </div>

              <div className="slots-toggle-grid">
                {dynamicSlots.map((slot) => {
                  const isBlocked = blockedSlotsList.some(
                    b => b.date === selectedBlockDate && b.time === slot
                  );

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleToggleSlotBlock(slot)}
                      className={`slot-toggle-chip ${isBlocked ? 'blocked' : 'available'}`}
                      title={isBlocked ? `اضغط لفتح موعد ${slot}` : `اضغط لحظر موعد ${slot}`}
                    >
                      <span className="slot-time">{slot}</span>
                      <span className="slot-status">{isBlocked ? ' مغلق' : ' متاح'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* List of currently blocked dates & slots */}
        {blockedSlotsList.length > 0 && (
          <div className="blocked-dates-list-section">
            <span className="blocked-list-title">
               جدول الإجازات والمواعيد المغلقة حالياً في السيستم ({blockedSlotsList.length} حظر مسجل):
            </span>
            <div className="blocked-dates-chips-grid">
              {blockedSlotsList.map((blockedItem, idx) => {
                const isFull = blockedItem.isFullDay || blockedItem.time === 'FULL_DAY' || blockedItem.time === 'ALL';
                return (
                  <div key={idx} className={`blocked-date-card ${isFull ? 'full-day' : 'single-slot'}`}>
                    <div className="blocked-date-info">
                      {isFull ? <Calendar size={18} className="text-danger" /> : <Clock size={18} className="text-warning" />}
                      <div>
                        <strong className="blocked-date-str">
                          {blockedItem.date} {isFull ? '(يوم كامل)' : `(${blockedItem.time})`}
                        </strong>
                        <span className="blocked-reason-badge">{blockedItem.reason || (isFull ? 'إجازة الطبيب' : 'موعد مغلق')}</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-quick-unblock" 
                      onClick={() => isFull ? handleToggleFullDayBlock(blockedItem.date) : handleToggleSlotBlock(blockedItem.time)}
                      title="إلغاء الحظر فوراً"
                    >
                      <Unlock size={14} />
                      <span>إلغاء الحظر </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
