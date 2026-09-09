import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../AppContext';

describe('appReducer Clinical Lifecycle', () => {
  it('adds an appointment and records an in-app notification', () => {
    const newAppt = {
      id: 'appt-1',
      patientId: 'p-1',
      patientName: 'محمد سعيد',
      date: '2026-08-24',
      time: '05:00 م',
      status: 'booked'
    };

    const nextState = appReducer(initialState, {
      type: 'ADD_APPOINTMENT',
      payload: newAppt
    });

    expect(nextState.appointments).toHaveLength(1);
    expect(nextState.appointments[0]).toEqual(newAppt);
    expect(nextState.notifications).toHaveLength(1);
    expect(nextState.notifications[0].title).toBe('حجز موعد جديد');
  });

  it('adds an expense and calculates total expenses correctly', () => {
    const expense = {
      id: 'exp-1',
      title: 'شراء مستلزمات طبية',
      amount: 450,
      category: 'مستلزمات وأدوية',
      date: '2026-08-25'
    };

    const nextState = appReducer(initialState, {
      type: 'ADD_EXPENSE',
      payload: expense
    });

    expect(nextState.expenses).toHaveLength(1);
    expect(nextState.expenses[0].amount).toBe(450);
    expect(nextState.notifications[0].title).toBe('تسجيل مصروف جديد');
  });

  it('adds and updates patient recall status', () => {
    const recall = {
      id: 'rec-1',
      patientId: 'p-1',
      patientName: 'محمد سعيد',
      reason: 'متابعة سكر تراكمي',
      dueDate: '2026-11-25',
      status: 'pending'
    };

    let state = appReducer(initialState, {
      type: 'ADD_RECALL',
      payload: recall
    });

    expect(state.recalls).toHaveLength(1);
    expect(state.recalls[0].status).toBe('pending');

    state = appReducer(state, {
      type: 'UPDATE_RECALL_STATUS',
      payload: { id: 'rec-1', status: 'contacted' }
    });

    expect(state.recalls[0].status).toBe('contacted');
  });

  it('records checkedInAt timestamp when appointment status transitions to waiting', () => {
    const baseState = {
      ...initialState,
      appointments: [
        { id: 'appt-1', patientName: 'أحمد علي', status: 'booked' }
      ]
    };

    const nextState = appReducer(baseState, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: 'appt-1', status: 'waiting' }
    });

    expect(nextState.appointments[0].status).toBe('waiting');
    expect(nextState.appointments[0].checkedInAt).toBeDefined();
  });

  it('records consultationStartedAt timestamp when appointment status transitions to in_progress', () => {
    const baseState = {
      ...initialState,
      appointments: [
        { id: 'appt-1', patientName: 'أحمد علي', status: 'waiting', checkedInAt: '2026-08-24T10:00:00Z' }
      ]
    };

    const nextState = appReducer(baseState, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: 'appt-1', status: 'in_progress' }
    });

    expect(nextState.appointments[0].status).toBe('in_progress');
    expect(nextState.appointments[0].consultationStartedAt).toBeDefined();
    expect(nextState.appointments[0].checkedInAt).toBe('2026-08-24T10:00:00Z');
  });

  it('increments patient totalVisits and updates lastVisit on completed status', () => {
    const baseState = {
      ...initialState,
      patients: [
        { id: 'p-1', name: 'سارة كمال', totalVisits: 2, lastVisit: '2026-08-01' }
      ],
      appointments: [
        { id: 'appt-1', patientId: 'p-1', date: '2026-08-24', status: 'in_progress' }
      ]
    };

    const nextState = appReducer(baseState, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: 'appt-1', status: 'completed' }
    });

    expect(nextState.appointments[0].status).toBe('completed');
    expect(nextState.patients[0].totalVisits).toBe(3);
    expect(nextState.patients[0].lastVisit).toBe('2026-08-24');
    expect(nextState.notifications[0].title).toBe('إتمام كشف ');
  });

  it('caps in-memory notifications to a maximum of 100 items under rapid booking', () => {
    let state = {
      ...initialState,
      notifications: Array.from({ length: 99 }, (_, i) => ({
        id: `notif-${i}`,
        title: `إشعار ${i}`
      }))
    };

    // Add 10 more appointments
    for (let i = 1; i <= 10; i++) {
      state = appReducer(state, {
        type: 'ADD_APPOINTMENT',
        payload: { id: `appt-${i}`, patientName: `مريض ${i}`, date: '2026-08-24', time: '05:00 م' }
      });
    }

    expect(state.notifications.length).toBe(100);
  });

  it('resets all appointments, patients, and notifications on RESET_ALL_DATA', () => {
    const loadedState = {
      ...initialState,
      patients: [{ id: 'p-1', name: 'مريض' }],
      appointments: [{ id: 'a-1', patientName: 'مريض' }],
      notifications: [{ id: 'n-1', title: 'إشعار' }]
    };

    const clearedState = appReducer(loadedState, { type: 'RESET_ALL_DATA' });

    expect(clearedState.patients).toHaveLength(0);
    expect(clearedState.appointments).toHaveLength(0);
    expect(clearedState.notifications).toHaveLength(0);
  });
});
