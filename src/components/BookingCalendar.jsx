import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateDynamicSlots, formatLocalDate, parseLocalDate, getTodayDateStr } from '../utils/timeSlots';
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
  
  // Dynamic slots based on doctor config
  const dynamicSlots = (availableSlots && availableSlots.length > 0)
    ? availableSlots
    : generateDynamicSlots(
        scheduleConfig?.startTime || '17:00', 
        scheduleConfig?.endTime || '22:00', 
        scheduleConfig?.slotDuration || 30
      );

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
    
    // Check if day is active in clinic working days
    const jsDay = dateObj.getDay();
    const isDayOff = !workingDays.includes(jsDay);

    // Check if whole day is blocked by doctor vacation
    const isFullDayBlocked = blockedSlots.some(b => b.date === dateStr && (b.isFullDay || b.time === 'FULL_DAY' || b.time === 'ALL'));

    // Count available slots
    const dayAppointments = appointments.filter(a => a.date === dateStr && a.status !== 'cancelled');
    const dayBlockedSlots = blockedSlots.filter(b => b.date === dateStr);

    const openSlotsCount = dynamicSlots.filter(slot => {
      const isBooked = dayAppointments.some(a => a.time === slot);
      const isBlocked = dayBlockedSlots.some(b => b.time === slot || b.isFullDay || b.time === 'FULL_DAY');
      return !isBooked && !isBlocked;
    }).length;

    const isFullyBooked = !isPast && !isDayOff && !isFullDayBlocked && openSlotsCount === 0;

    return {
      dateStr,
      isPast,
      isDayOff,
      isFullDayBlocked,
      openSlotsCount,
      isFullyBooked,
      isAvailable: !isPast && !isDayOff && !isFullDayBlocked && openSlotsCount > 0
    };
  };

  // Get available slots for the selected date
  const isSelectedDateBlocked = blockedSlots.some(b => b.date === selectedDate && (b.isFullDay || b.time === 'FULL_DAY'));
  const isSelectedDateDayOff = selectedDate && !workingDays.includes(parseLocalDate(selectedDate).getDay());

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
              onClick={handlePrevMonth} 
              className="nav-arrow-btn"
              title="الشهر السابق"
              aria-label="الشهر السابق"
            >
              <ChevronRight size={18} />
            </button>
            <button 
              type="button" 
              onClick={handleNextMonth} 
              className="nav-arrow-btn"
              title="الشهر القادم"
              aria-label="الشهر القادم"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* Weekday Labels Header */}
        <div className="weekdays-grid">
          {ARABIC_WEEKDAYS.map((dayName, idx) => (
            <span key={idx} className={`weekday-cell ${idx === 6 ? 'friday' : ''}`}>
              {dayName}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="days-grid">
          {/* Empty offset days for start of month */}
          {Array.from({ length: startDayOffset }).map((_, idx) => (
            <div key={`empty-${idx}`} className="day-cell empty"></div>
          ))}

          {/* Actual days of current month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const status = getDayStatus(dayNum);
            const isSelected = selectedDate === status.dateStr;
            const isToday = status.dateStr === todayStr;

            let cellClass = 'day-cell';
            if (status.isPast) cellClass += ' past';
            else if (status.isDayOff) cellClass += ' holiday';
            else if (status.isFullDayBlocked) cellClass += ' blocked';
            else if (status.isFullyBooked) cellClass += ' full';
            else if (status.isAvailable) cellClass += ' available';

            if (isSelected) cellClass += ' selected';
            if (isToday) cellClass += ' today';

            return (
              <button
                key={dayNum}
                type="button"
                className={cellClass}
                disabled={status.isPast || status.isDayOff || status.isFullDayBlocked || status.isFullyBooked}
                onClick={() => handleDateSelect(status.dateStr)}

                title={
                  status.isDayOff ? 'عطلة العيادة الأسبوعية' :
                  status.isFullDayBlocked ? 'العيادة مغلقة / إجازة طبيب' :
                  status.isFullyBooked ? 'جميع المواعيد محجوزة بالكامل' :
                  `${status.openSlotsCount} موعد متاح`
                }
              >
                <span className="day-number">{dayNum}</span>
                {status.isAvailable && (
                  <span className="day-badge-text available">{status.openSlotsCount} متاح</span>
                )}
                {status.isDayOff && (
                  <span className="day-badge-text holiday">عطلة</span>
                )}
                {status.isFullDayBlocked && (
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
        ) : isSelectedDateBlocked ? (
          <div className="day-off-alert">
            <AlertCircle size={20} color="#F59E0B" />
            <div>
              <strong>إجازة العيادة</strong>
              <p>العيادة مغلقة في هذا التاريخ (إجازة رسمية أو استثنائية للطبيب).</p>
            </div>
          </div>
        ) : (
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
        )}
      </div>

    </div>
  );
};

export default BookingCalendar;
