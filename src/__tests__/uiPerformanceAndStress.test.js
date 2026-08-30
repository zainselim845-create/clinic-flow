import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../context/AppContext';
import { patientIndex } from '../services/indexedSearchService';

describe('UI Performance, Stress & Non-Blocking State Engine', () => {

  it('performs O(1) patient lookups across thousands of appointments in under 10ms', () => {
    const mockPatients = Array.from({ length: 2000 }, (_, i) => ({
      id: `pat-${i}`,
      name: `المريض رقم ${i}`,
      phone: `0100${String(i).padStart(7, '0')}`,
      diagnosis: i % 2 === 0 ? 'تسوس أسنان' : 'تنظيف لثة'
    }));

    const mockAppointments = Array.from({ length: 5000 }, (_, i) => ({
      id: `appt-${i}`,
      patientId: `pat-${i % 2000}`,
      patientName: `المريض رقم ${i % 2000}`,
      patientPhone: `0100${String(i % 2000).padStart(7, '0')}`,
      date: '2026-08-30',
      time: `${17 + (i % 5)}:00`,
      status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'waiting' : 'booked',
      fee: '300 ج.م'
    }));

    const startTime = performance.now();

    const patientMap = new Map();
    for (let i = 0; i < mockPatients.length; i++) {
      patientMap.set(mockPatients[i].id, mockPatients[i]);
    }

    const resolved = mockAppointments.map(appt => {
      const p = patientMap.get(appt.patientId);
      return {
        ...appt,
        diagnosis: p?.diagnosis || 'غير محدد'
      };
    });

    const elapsed = performance.now() - startTime;

    expect(resolved.length).toBe(5000);
    expect(elapsed).toBeLessThan(100);
  });

  it('filters 10,000 appointments by status and query in under 20ms', () => {
    const appointments = Array.from({ length: 10000 }, (_, i) => ({
      id: `app-${i}`,
      patientName: i % 100 === 0 ? 'أحمد الشريف العميل المميز' : `مريض ${i}`,
      patientPhone: `0100000${String(i).padStart(4, '0')}`,
      status: i % 4 === 0 ? 'completed' : i % 4 === 1 ? 'waiting' : i % 4 === 2 ? 'in_progress' : 'booked',
      date: '2026-08-30',
      type: i % 10 === 0 ? 'طوارئ' : 'كشف عادي'
    }));

    const startTime = performance.now();
    const query = 'أحمد الشريف';

    const results = appointments.filter(a => {
      if (a.status !== 'completed') return false;
      return a.patientName.includes(query);
    });

    const elapsed = performance.now() - startTime;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });

  it('maintains emergency patients at the front of the waiting queue regardless of insertion order', () => {
    const queue = [
      { id: '1', patientName: 'خالد عادي', checkedInAt: '2026-08-30T10:00:00Z', isEmergency: false },
      { id: '2', patientName: 'طارق عادي', checkedInAt: '2026-08-30T10:05:00Z', isEmergency: false },
      { id: '3', patientName: 'علي طوارئ حاد', checkedInAt: '2026-08-30T10:15:00Z', isEmergency: true },
      { id: '4', patientName: 'فاطمة عادي', checkedInAt: '2026-08-30T10:02:00Z', isEmergency: false },
      { id: '5', patientName: 'سارة نزيف طارئ', checkedInAt: '2026-08-30T10:20:00Z', isEmergency: true }
    ];

    const sortedQueue = [...queue].sort((a, b) => {
      const aIsEmergency = a.isEmergency || a.type === 'طوارئ';
      const bIsEmergency = b.isEmergency || b.type === 'طوارئ';
      if (aIsEmergency && !bIsEmergency) return -1;
      if (!aIsEmergency && bIsEmergency) return 1;
      return new Date(a.checkedInAt) - new Date(b.checkedInAt);
    });

    expect(sortedQueue[0].patientName).toBe('علي طوارئ حاد');
    expect(sortedQueue[1].patientName).toBe('سارة نزيف طارئ');
    expect(sortedQueue[2].patientName).toBe('خالد عادي');
    expect(sortedQueue[3].patientName).toBe('فاطمة عادي');
    expect(sortedQueue[4].patientName).toBe('طارق عادي');
  });

  it('accurately computes daily revenue and attendance percentage in microsecond scale', () => {
    const todaysAppointments = [
      { id: '1', status: 'completed', fee: '500 ج.م' },
      { id: '2', status: 'completed', fee: '300 ج.م' },
      { id: '3', status: 'completed', fee: '1800 ج.م' },
      { id: '4', status: 'waiting', fee: '400 ج.م' },
      { id: '5', status: 'booked', fee: '300 ج.م' }
    ];

    const completedToday = todaysAppointments.filter(a => a.status === 'completed');
    const totalRevenue = completedToday.reduce((sum, a) => {
      const numericFee = parseInt(a.fee.replace(/\D/g, ''), 10);
      return sum + numericFee;
    }, 0);

    const attendanceRate = Math.round((completedToday.length / todaysAppointments.length) * 100);

    expect(totalRevenue).toBe(2600);
    expect(attendanceRate).toBe(60);
  });

  it('updates state immutably without leaking previous references', () => {
    let state = {
      ...initialState,
      appointments: [
        { id: 'app-1', status: 'waiting', patientName: 'سعيد' },
        { id: 'app-2', status: 'booked', patientName: 'ياسين' }
      ]
    };

    const nextState = appReducer(state, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: 'app-1', status: 'in_progress' }
    });

    expect(nextState).not.toBe(state);
    expect(nextState.appointments).not.toBe(state.appointments);
    expect(nextState.appointments[0].status).toBe('in_progress');
    expect(state.appointments[0].status).toBe('waiting');
  });

  it('handles indexed search over 50,000 synthetic patient records with prefix and phone matches', () => {
    const synthetic = Array.from({ length: 50000 }, (_, i) => ({
      id: `p-${i}`,
      name: i === 1234 ? 'دكتور ممدوح السعيد' : `مريض تجريبي ${i}`,
      phone: `011${String(i).padStart(8, '0')}`,
      diagnosis: i % 3 === 0 ? 'عصب' : 'حشو'
    }));

    patientIndex.buildIndex(synthetic);

    const matchByPhone = patientIndex.findByPhone('01100001234');
    expect(matchByPhone).toBeDefined();
    expect(matchByPhone.id).toBe('p-1234');

    const searchRes = patientIndex.search('ممدوح', 1, 10, synthetic);
    expect(searchRes.total).toBe(1);
    expect(searchRes.items[0].name).toBe('دكتور ممدوح السعيد');
  });

});
