import React, { useState } from 'react';
import { 
  Calendar, Lock, Unlock, Clock, CheckCircle2, 
  CalendarDays, ChevronRight, ChevronLeft, Save 
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
    slotDuration: 30
  };

  const workingDays = scheduleConfig.workingDays || [6, 0, 1, 2, 3, 4];
  const startTime = scheduleConfig.startTime || '17:00';
  const endTime = scheduleConfig.endTime || '22:00';
  const slotDuration = scheduleConfig.slotDuration || 30;

  const dynamicSlots = generateDynamicSlots(startTime, endTime, slotDuration);

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
        slotDuration
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
        const isCurrentlyBlocked = blockedSlotsList.some(
          b => b.date === selectedBlockDate && b.time === slotTime
        );
        if (isCurrentlyBlocked) {
          await blockedSlotsService.unblockSlotInDb(selectedBlockDate, slotTime);
        } else {
          await blockedSlotsService.blockSlotInDb(selectedBlockDate, slotTime, reason, false);
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

    if (isBlocked) {
      dispatch({
        type: 'UNBLOCK_FULL_DAY',
        payload: { date: dateToToggle }
      });
      if (isSupabaseConfigured()) {
        await blockedSlotsService.unblockFullDayInDb(dateToToggle).catch(console.error);
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
        await blockedSlotsService.blockSlotInDb(dateToToggle, 'FULL_DAY', reason, true).catch(console.error);
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

        {/* Live Slots Preview */}
        <div className="slots-live-preview">
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
