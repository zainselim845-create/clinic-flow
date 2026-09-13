export function appointmentsReducer(state, action) {
  switch (action.type) {
    case 'ADD_APPOINTMENT': {
      const newNotif = {
        id: 'notif-' + Date.now(),
        type: 'appointment',
        title: 'حجز موعد جديد',
        message: `تم حجز موعد للمريض ${action.payload.patientName || 'مريض'} يوم ${action.payload.date} الساعة ${action.payload.time}`,
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: action.payload.id
      };
      return { 
        ...state, 
        appointments: [...state.appointments, action.payload],
        notifications: [newNotif, ...(state.notifications || [])].slice(0, 100)
      };
    }

    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(a => a.id === action.payload.id ? action.payload : a)
      };

    case 'DELETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.filter(a => a.id !== action.payload)
      };

    case 'UPDATE_APPOINTMENT_STATUS': {
      const { id, status, ...extraFields } = action.payload;
      const targetAppt = state.appointments.find(a => a.id === id);

      let updatedPatients = state.patients;
      let newNotifs = state.notifications || [];

      // When doctor finishes → pending_payment notification for secretary
      if (status === 'pending_payment' && targetAppt && targetAppt.status !== 'pending_payment') {
        newNotifs = [
          {
            id: 'notif-' + Date.now(),
            type: 'payment',
            title: 'في انتظار التحصيل 💰',
            message: `المريض ${targetAppt.patientName || 'مريض'} أنهى الكشف وفي انتظار المحاسبة عند السكرتيرة`,
            timestamp: new Date().toISOString(),
            read: false,
            relatedId: id
          },
          ...newNotifs
        ].slice(0, 100);
      }

      // When secretary collects payment → completed
      if (status === 'completed' && targetAppt && targetAppt.status !== 'completed') {
        if (targetAppt.patientId) {
          updatedPatients = state.patients.map(p => {
            if (p.id === targetAppt.patientId) {
              const count = (p.totalVisits || p.visitsCount || 0) + 1;
              return {
                ...p,
                lastVisit: targetAppt.date || new Date().toISOString().split('T')[0],
                totalVisits: count,
                visitsCount: count
              };
            }
            return p;
          });
        }
        newNotifs = [
          {
            id: 'notif-' + Date.now(),
            type: 'completed',
            title: 'إتمام كشف ',
            message: `تم تحصيل رسوم المريض ${targetAppt.patientName || 'مريض'} وإتمام الزيارة بالكامل`,
            timestamp: new Date().toISOString(),
            read: false,
            relatedId: id
          },
          ...newNotifs
        ].slice(0, 100);
      }

      return {
        ...state,
        patients: updatedPatients,
        notifications: newNotifs,
        appointments: state.appointments.map(a => 
          a.id === id ? { 
            ...a, 
            ...extraFields,
            status,
            ...(status === 'waiting' && !a.checkedInAt ? { checkedInAt: new Date().toISOString() } : {}),
            ...(status === 'in_progress' && !a.consultationStartedAt ? { consultationStartedAt: new Date().toISOString() } : {}),
            ...(status === 'pending_payment' && !a.consultationEndedAt ? { consultationEndedAt: new Date().toISOString() } : {})
          } : a
        )
      };
    }

    case 'SET_APPOINTMENTS':
      return { ...state, appointments: action.payload };

    default:
      return state;
  }
}
