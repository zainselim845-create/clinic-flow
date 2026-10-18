import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogIn, LogOut, Clock 
} from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useTenant } from '@/context/TenantContext';
import { 
  getStaffAttendanceForClinic, 
  recordCheckInForClinic, 
  recordCheckOutForClinic 
} from '@/features/platform/services/attendanceService';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';
import ScreenState from '@/components/ui/ScreenState';
import './Attendance.css';

const Attendance = () => {
  const { state } = useApp();
  const { tenant } = useTenant();
  const staffList = useMemo(() => state.staffMembers || [], [state.staffMembers]);

  const currentSlug = tenant?.slug || state.clinicInfo?.slug || '';
  const clinicId = tenant?.id || currentSlug;

  const loadScopedAttendance = useCallback((slug) => {
    if (!slug) return [];
    const parsed = safeGetJSON(`clinicflow_attendance_${slug}`, null);
    if (Array.isArray(parsed)) return parsed;
    return [];
  }, []);

  const [attendanceRecords, setAttendanceRecords] = useState(() => loadScopedAttendance(currentSlug));
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ar-EG'));
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setAttendanceRecords(loadScopedAttendance(currentSlug));
  }, [currentSlug, loadScopedAttendance]);

  useEffect(() => {
    if (!selectedStaffId && staffList.length > 0) {
      setSelectedStaffId(staffList[0].id);
    }
  }, [staffList, selectedStaffId]);

  useEffect(() => {
    safeSetJSON(`clinicflow_attendance_${currentSlug}`, attendanceRecords);
  }, [attendanceRecords, currentSlug]);

  const loadAttendance = useCallback(async () => {
    if (!clinicId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await getStaffAttendanceForClinic(clinicId);
      if (error) {
        const local = loadScopedAttendance(currentSlug);
        setAttendanceRecords(local);
        if (!error.message?.includes('schema cache') && !error.message?.includes('does not exist')) {
          setLoadError('تعذر تحميل سجل الحضور والانصراف من الخادم.');
        }
      } else {
        const local = loadScopedAttendance(currentSlug);
        setAttendanceRecords(data && data.length > 0 ? data : local);
      }
    } catch (err) {
      console.warn('Could not fetch remote attendance, using local cache:', err);
      const local = loadScopedAttendance(currentSlug);
      setAttendanceRecords(local);
      if (!err?.message?.includes('schema cache') && !err?.message?.includes('does not exist')) {
        setLoadError('تعذر تحميل سجل الحضور والانصراف من الخادم.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, currentSlug, loadScopedAttendance]);

  useEffect(() => {
    loadAttendance();

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ar-EG'));
    }, 1000);
    return () => clearInterval(timer);
  }, [loadAttendance]);

  const handleCheckInClick = async () => {
    const staff = staffList.find(s => s.id === selectedStaffId) || { name: 'عضو الفريق' };
    const res = await recordCheckInForClinic(selectedStaffId, staff.name, clinicId);
    if (res.data) {
      setAttendanceRecords(prev => [
        {
          id: res.data.id,
          staffName: staff.name,
          staffRole: staff.role || 'استقبال',
          checkIn: res.data.checkIn,
          checkOut: null,
          totalHours: 0,
          status: 'active'
        },
        ...prev
      ]);
    }
  };

  const handleCheckOutClick = async (attId, checkInTime) => {
    const res = await recordCheckOutForClinic(attId, checkInTime, clinicId);
    if (res.data) {
      setAttendanceRecords(prev => prev.map(a => 
        a.id === attId 
          ? { ...a, checkOut: res.data.checkOut, totalHours: res.data.totalHours, status: 'completed' } 
          : a
      ));
    }
  };

  const activeOnDuty = attendanceRecords.filter(a => !a.checkOut);

  return (
    <div className="attendance-page">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>الحضور والانصراف لطاقم العيادة (Staff Attendance)</h1>
          <p>تسجيل مواعيد الحضور والانصراف لموظفي الاستقبال ومساعدي أطباء الأسنان (ClinicFlow Attendance)</p>
        </div>
      </div>

      {/* Clock-in Terminal Card */}
      <div className="clock-terminal-card">
        <div className="terminal-time-side">
          <div className="live-clock-badge">
            <Clock size={18} className="text-zinc-400" />
            <span className="live-time-str">{currentTime}</span>
          </div>
          <span className="live-date-str">
            {new Date().toLocaleDateString('ar-EG', { dateStyle: 'full' })}
          </span>
        </div>

        <div className="terminal-actions-side">
          <div className="staff-selector-wrap">
            <label>اختر عضو الفريق لتسجيل الحضور:</label>
            <select
              className="staff-select"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={staffList.length === 0}
            >
              {staffList.length === 0 ? (
                <option value="">لا يوجد موظفون مضافون (أضف من الإعدادات)</option>
              ) : (
                staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCheckInClick}
            className="btn-terminal-checkin"
            disabled={staffList.length === 0 || !selectedStaffId}
            style={staffList.length === 0 ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            <LogIn size={18} />
            <span>تسجيل حضور الآن (Check-In)</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="att-stats-row">
        <div className="att-stat-card">
          <span className="lbl">المتواجدون على رأس العمل الآن:</span>
          <strong className="val text-success">{activeOnDuty.length} موظفين</strong>
        </div>
        <div className="att-stat-card">
          <span className="lbl">إجمالي الحضور المسجل اليوم:</span>
          <strong className="val">{attendanceRecords.length} فرد</strong>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="glass-card table-responsive-container">
        <h4 className="log-title">سجل الحضور والانصراف اليومي:</h4>
        <ScreenState
          isLoading={isLoading}
          loadError={loadError}
          onRetry={loadAttendance}
          isEmpty={attendanceRecords.length === 0}
          emptyIcon={<Clock size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />}
          emptyTitle="لم يسجل أي موظف حضوره اليوم حتى الآن"
          emptyDescription="يمكن للموظفين والتمريض تسجيل بداية ونهاية الوردية من بطاقة تسجيل الحضور السريعة بالأعلى."
        >
          <table className="attendance-main-table">
            <thead>
              <tr>
                <th>اسم الموظف</th>
                <th>الوظيفة / الدور</th>
                <th>وقت الحضور</th>
                <th>وقت الانصراف</th>
                <th>إجمالي ساعات العمل</th>
                <th>الحالة الحالية</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map(rec => (
                <tr key={rec.id}>
                  <td><strong>{rec.staffName}</strong></td>
                  <td><span className="role-tag">{rec.staffRole || 'استقبال'}</span></td>
                  <td>{new Date(rec.checkIn).toLocaleTimeString('ar-EG')}</td>
                  <td>{rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('ar-EG') : '—'}</td>
                  <td>
                    <strong>{rec.totalHours ? `${rec.totalHours} ساعة` : 'جارية...'}</strong>
                  </td>
                  <td>
                    <span className={`att-status-pill ${rec.checkOut ? 'out' : 'in'}`}>
                      {rec.checkOut ? 'انصرف' : 'على رأس العمل'}
                    </span>
                  </td>
                  <td>
                    {!rec.checkOut ? (
                      <button
                        type="button"
                        onClick={() => handleCheckOutClick(rec.id, rec.checkIn)}
                        className="btn-checkout-action"
                        aria-label={`تسجيل انصراف الموظف ${rec.staffName}`}
                      >
                        <LogOut size={14} aria-hidden="true" />
                        <span>تسجيل انصراف</span>
                      </button>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.78rem' }}>مكتمل</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScreenState>
      </div>

    </div>
  );
};

export default Attendance;
