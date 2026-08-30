import React, { useState, useEffect } from 'react';
import { 
  UserCheck, LogIn, LogOut, Clock, Calendar, 
  Users, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  getStaffAttendance, recordCheckIn, recordCheckOut 
} from '../services/attendanceService';
import './Attendance.css';

const Attendance = () => {
  const { state } = useApp();
  const staffList = state.staffMembers || [];

  const [attendanceRecords, setAttendanceRecords] = useState([
    {
      id: 'att-1',
      staffName: 'سارة كمال (سكرتارية أولى)',
      staffRole: 'سكرتير أول',
      checkIn: new Date(Date.now() - 4 * 3600000).toISOString(),
      checkOut: null,
      totalHours: 4.0,
      status: 'active'
    },
    {
      id: 'att-2',
      staffName: 'مينا سمير (مساعد طبيب أسنان)',
      staffRole: 'مساعد طبيب',
      checkIn: new Date(Date.now() - 6 * 3600000).toISOString(),
      checkOut: new Date(Date.now() - 1 * 3600000).toISOString(),
      totalHours: 5.0,
      status: 'completed'
    }
  ]);

  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || 'staff-1');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ar-EG'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ar-EG'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckInClick = async () => {
    const staff = staffList.find(s => s.id === selectedStaffId) || { name: 'عضو الفريق' };
    const res = await recordCheckIn(selectedStaffId, staff.name);
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
    const res = await recordCheckOut(attId, checkInTime);
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
          <h2>الحضور والانصراف لطاقم العيادة (Staff Attendance)</h2>
          <p>تسجيل مواعيد الحضور والانصراف لموظفي الاستقبال ومساعدي أطباء الأسنان (DentaLore Attendance)</p>
        </div>
      </div>

      {/* Clock-in Terminal Card */}
      <div className="clock-terminal-card">
        <div className="terminal-time-side">
          <div className="live-clock-badge">
            <Clock size={18} className="text-nebras-orange" />
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
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCheckInClick}
            className="btn-terminal-checkin"
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
                    >
                      <LogOut size={14} />
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
      </div>

    </div>
  );
};

export default Attendance;
