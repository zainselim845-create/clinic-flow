import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Coffee } from 'lucide-react';
import { 
  generateDynamicSlots, 
  getSlotsForDate, 
  formatTimeToArabic, 
  formatLocalDate, 
  parseLocalDate, 
  getTodayDateStr 
} from '../utils/timeSlots';
import './BookingCalendar.css';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ARABIC_WEEKDAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const BookingCalendar = ({ 
  selectedDate, 
  onSelectDate, 
  onDateSelect,
  selectedTime, 
  onSelectTime,
  onTimeSelect,
  appointments = [],
  blockedSlots = [],
  availableSlots = [],
  scheduleConfig = null
}) => {
  const handleDateSelect = onSelectDate || onDateSelect || (() => {});
  const handleTimeSelect = onSelectTime || onTimeSelect || (() => {});
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getTodayDateStr();

  const [currentMonth, setCurrentMonth] = useState(() => {
    return selectedDate ? parseLocalDate(selectedDate) : new Date();
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Working days from config: default [6,0,1,2,3,4] (Sat to Thu, Fri off)
  const workingDays = scheduleConfig?.workingDays || [6, 0, 1, 2, 3, 4];
  
  // Dynamic slots based on selected date's specific shift, breaks, and vacations
  const selectedDateResolution = useMemo(() => {
    if (!selectedDate) return { isVacation: false, isDayOff: false, slots: [] };
    if (availableSlots && availableSlots.length > 0) {
      return { isVacation: false, isDayOff: false, slots: availableSlots };
    }
    return getSlotsForDate(selectedDate, scheduleConfig);
  }, [selectedDate, availableSlots, scheduleConfig]);

  const dynamicSlots = selectedDateResolution.slots;

  // Next & Prev Month Handlers
  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    if (prev.getFullYear() < today.getFullYear() || (prev.getFullYear() === today.getFullYear() && prev.getMonth() < today.getMonth())) {
      return;
    }
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Calendar Calculation:
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // In Arabic calendar, week starts on Saturday (JS 6). Map JS getDay() (0:Sun..6:Sat) to (Sat:0, Sun:1..Fri:6)
  const getArabicDayIndex = (d) => {
    const jsDay = d.getDay();
    return (jsDay + 1) % 7;
  };

  const startDayOffset = getArabicDayIndex(firstDayOfMonth);

  // Helper to check day status (Timezone-Safe)
  const getDayStatus = (dayNum) => {
    const dateStr = formatLocalDate(year, month, dayNum);
    const dateObj = new Date(year, month, dayNum);
    dateObj.setHours(0, 0, 0, 0);
    const isPast = dateObj < today;
    
    // Resolve date-specific slots & vacation/day-off status
    const dayRes = getSlotsForDate(dateStr, scheduleConfig);
    const isDayOff = dayRes.isDayOff;
    const isVacation = dayRes.isVacation;

    // Check if whole day is blocked by doctor vacation or explicit block
    const isExplicitBlock = blockedSlots.some(b => b.date === dateStr && (b.isFullDay || b.time === 'FULL_DAY' || b.time === 'ALL'));
    const isFullDayBlocked = isVacation || isExplicitBlock;

    // Count available slots
    const dayAppointments = appointments.filter(a => a.date === dateStr && a.status !== 'cancelled');
    const dayBlockedSlots = blockedSlots.filter(b => b.date === dateStr);

    const openSlotsCount = dayRes.slots.filter(slot => {
      const isBooked = dayAppointments.some(a => a.time === slot);
      const isBlocked = dayBlockedSlots.some(b => b.time === slot || b.isFullDay || b.time === 'FULL_DAY');
      return !isBooked && !isBlocked;
    }).length;

    const isFullyBooked = !isPast && !isDayOff && !isFullDayBlocked && openSlotsCount === 0;

    return {
      dateStr,
      isPast,
      isDayOff,
      isVacation,
      vacationReason: dayRes.vacationReason,
      isFullDayBlocked,
      openSlotsCount,
      isFullyBooked,
      isAvailable: !isPast && !isDayOff && !isFullDayBlocked && openSlotsCount > 0
    };
  };

  // Status for currently selected date
  const isSelectedDateVacation = selectedDateResolution.isVacation;
  const isSelectedDateBlocked = isSelectedDateVacation || blockedSlots.some(b => b.date === selectedDate && (b.isFullDay || b.time === 'FULL_DAY'));
  const isSelectedDateDayOff = selectedDateResolution.isDayOff;

  const currentDayAppointments = appointments.filter(a => a.date === selectedDate && a.status !== 'cancelled');
  const currentDayBlocked = blockedSlots.filter(b => b.date === selectedDate);

  const getSlotAvailability = (slot) => {
    const isBooked = currentDayAppointments.some(a => a.time === slot);
    const isBlocked = currentDayBlocked.some(b => b.time === slot || b.isFullDay || b.time === 'FULL_DAY') || isSelectedDateBlocked || isSelectedDateDayOff;
    return {
      isBooked,
      isBlocked,
      isAvailable: !isBooked && !isBlocked
    };
  };

  return (
    <div className="modern-booking-calendar-wrapper">
      
      {/* 1. Interactive Calendar Card */}
      <div className="calendar-card glass-card">
        
        {/* Month Header Navigation */}
        <div className="calendar-nav-header">
          <div className="month-year-title">
            <CalendarIcon size={20} className="cal-icon" />
            <h3>{ARABIC_MONTHS[month]} {year}</h3>
          </div>
          <div className="nav-arrows">
            <button 
              type="button" 
              className="cal-nav-btn" 
              onClick={handlePrevMonth}
              aria-label="الشهر السابق"
            >
              <ChevronRight size={18} />
            </button>
            <button 
              type="button" 
              className="cal-nav-btn" 
              onClick={handleNextMonth}
              aria-label="الشهر التالي"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="calendar-weekdays-grid weekdays-grid">
          {ARABIC_WEEKDAYS.map((wd, i) => (
            <span key={i} className="weekday-header-cell weekday-cell">{wd}</span>
          ))}
        </div>

        {/* Calendar Days Matrix */}
        <div className="calendar-days-matrix days-grid">
          {/* Empty offset days */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day-cell day-cell empty"></div>
          ))}

          {/* Real days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const status = getDayStatus(dayNum);
            const isSelected = selectedDate === status.dateStr;

            let cellClass = 'calendar-day-cell day-cell';
            if (status.isPast) cellClass += ' past';
            else if (status.isDayOff) cellClass += ' day-off';
            else if (status.isFullDayBlocked) cellClass += ' blocked';
            else if (status.isFullyBooked) cellClass += ' fully-booked';
            else if (status.isAvailable) cellClass += ' available';

            if (isSelected) cellClass += ' selected';
            if (status.dateStr === todayStr) cellClass += ' today';

            return (
              <button
                key={dayNum}
                type="button"
                className={cellClass}
                disabled={status.isPast || status.isDayOff || status.isFullDayBlocked || status.isFullyBooked}
                onClick={() => handleDateSelect(status.dateStr)}
                title={
                  status.isPast ? 'تاريخ سابق' :
                  status.isDayOff ? 'عطلة العيادة الأسبوعية' :
                  status.isVacation ? `إجازة رسمية: ${status.vacationReason}` :
                  status.isFullDayBlocked ? 'العيادة مغلقة في هذا اليوم' :
                  status.isFullyBooked ? 'جميع المواعيد مكتملة' :
                  `${status.openSlotsCount} مواعيد متاحة`
                }
              >
                <span className="day-number">{dayNum}</span>
                {status.isAvailable && !isSelected && (
                  <span className="day-badge-dot"></span>
                )}
                {status.isVacation && (
                  <span className="day-badge-text blocked">إجازة</span>
                )}
                {status.isFullDayBlocked && !status.isVacation && (
                  <span className="day-badge-text blocked">إجازة</span>
                )}
                {status.isFullyBooked && (
                  <span className="day-badge-text full">مكتمل</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="calendar-legend-bar">
          <span className="legend-item"><span className="legend-dot available"></span> متاح</span>
          <span className="legend-item"><span className="legend-dot selected"></span> المختار</span>
          <span className="legend-item"><span className="legend-dot full"></span> مكتمل</span>
          <span className="legend-item"><span className="legend-dot holiday"></span> عطلة / إجازة</span>
        </div>

      </div>

      {/* 2. Modern Time Slots Picker Card */}
      <div className="time-slots-container glass-card">
        <div className="slots-header">
          <div className="slots-title">
            <Clock size={18} className="text-primary" />
            <h4>المواعيد المتاحة ليوم:</h4>
          </div>
          <span className="slots-selected-hint">
            {selectedDate ? selectedDate : 'اختر يوماً من التقويم'}
          </span>
        </div>

        {isSelectedDateDayOff ? (
          <div className="day-off-alert">
            <AlertCircle size={20} color="#EF4444" />
            <div>
              <strong>عطلة العيادة الأسبوعية</strong>
              <p>هذا اليوم عطلة العيادة. يرجى اختيار يوم عمل آخر من التقويم.</p>
            </div>
          </div>
        ) : isSelectedDateVacation ? (
          <div className="day-off-alert" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <AlertCircle size={20} color="#F59E0B" />
            <div>
              <strong>إجازة رسمية: {selectedDateResolution.vacationReason}</strong>
              <p>العيادة في عطلة رسمية / إجازة سنوية في هذا التاريخ.</p>
            </div>
          </div>
        ) : isSelectedDateBlocked ? (
          <div className="day-off-alert">
            <AlertCircle size={20} color="#F59E0B" />
            <div>
              <strong>إجازة العيادة</strong>
              <p>العيادة مغلقة في هذا التاريخ (إجازة رسمية أو استثنائية للطبيب).</p>
            </div>
          </div>
        ) : (
          <>
            {selectedDateResolution.workingHoursStr && (
              <div className="day-shift-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem 0.85rem', borderRadius: '8px', marginBottom: '0.85rem', fontSize: '0.82rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                  <Clock size={14} className="text-primary" />
                  <span>ساعات الاستقبال: <strong>{selectedDateResolution.workingHoursStr}</strong></span>
                </div>
                {scheduleConfig?.breakTime?.enabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#F59E0B', fontSize: '0.78rem' }}>
                    <Coffee size={13} />
                    <span>استراحة ({formatTimeToArabic(scheduleConfig.breakTime.start)} - {formatTimeToArabic(scheduleConfig.breakTime.end)})</span>
                  </div>
                )}
              </div>
            )}
            <div className="interactive-time-slots-grid">
            {dynamicSlots.map((slot, idx) => {
              const availability = getSlotAvailability(slot);
              const isSelected = selectedTime === slot;

              let chipClass = 'modern-slot-btn';
              if (availability.isBooked) chipClass += ' booked';
              else if (availability.isBlocked) chipClass += ' blocked';
              else chipClass += ' available';

              if (isSelected) chipClass += ' selected';

              return (
                <button
                  key={idx}
                  type="button"
                  className={chipClass}
                  disabled={!availability.isAvailable}
                  onClick={() => handleTimeSelect(slot)}
                  title={

                    availability.isBooked ? 'تم حجز هذا الموعد مسبقاً' :
                    availability.isBlocked ? 'الموعد مغلق من قبل العيادة' :
                    'اضغط لتأكيد اختيار هذا الوقت'
                  }
                >
                  <span className="slot-time">{slot}</span>
                  {isSelected && <CheckCircle2 size={15} className="slot-check-icon" />}
                  {availability.isBooked && <span className="slot-status-tag booked">محجوز</span>}
                  {availability.isBlocked && <span className="slot-status-tag blocked">مغلق</span>}
                </button>
              );
            })}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default BookingCalendar;
