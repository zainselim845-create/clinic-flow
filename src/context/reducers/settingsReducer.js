export function settingsReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_CLINIC_INFO':
      return {
        ...state,
        clinicInfo: { ...(state.clinicInfo || {}), ...action.payload }
      };

    // Blocked Slots & Vacations
    case 'TOGGLE_BLOCK_SLOT': {
      const { date, time, reason = 'مغلق من السكرتارية', isUnblock } = action.payload;
      const exists = state.blockedSlots.some(b => b.date === date && b.time === time);
      if (isUnblock || exists) {
        return {
          ...state,
          blockedSlots: state.blockedSlots.filter(b => !(b.date === date && b.time === time))
        };
      } else {
        return {
          ...state,
          blockedSlots: [...state.blockedSlots, { date, time, reason }]
        };
      }
    }

    case 'BLOCK_FULL_DAY': {
      const { date, reason = 'إجازة الطبيب / عطلة العيادة' } = action.payload;
      const cleanList = state.blockedSlots.filter(b => b.date !== date);
      return {
        ...state,
        blockedSlots: [...cleanList, { date, time: 'FULL_DAY', isFullDay: true, reason }]
      };
    }

    case 'UNBLOCK_FULL_DAY': {
      const { date } = action.payload;
      return {
        ...state,
        blockedSlots: state.blockedSlots.filter(b => b.date !== date)
      };
    }

    case 'SET_BLOCKED_SLOTS':
      return { ...state, blockedSlots: action.payload };

    // Staff Management
    case 'ADD_STAFF': {
      const incoming = action.payload;
      if (!incoming) return state;
      const exists = (state.staffMembers || []).some(s => incoming.id && s.id === incoming.id);
      if (exists) {
        return {
          ...state,
          staffMembers: (state.staffMembers || []).map(s => s.id === incoming.id ? incoming : s)
        };
      }
      return { 
        ...state, 
        staffMembers: [incoming, ...(state.staffMembers || [])],
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'staff',
            title: 'إضافة موظف جديد ',
            message: `تم إضافة ${incoming.name} (${incoming.role}) إلى فريق العيادة`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    }

    case 'UPDATE_STAFF':
      return {
        ...state,
        staffMembers: (state.staffMembers || []).map(s => s.id === action.payload.id ? action.payload : s)
      };

    case 'DELETE_STAFF':
      return {
        ...state,
        staffMembers: (state.staffMembers || []).filter(s => s.id !== action.payload)
      };

    case 'TOGGLE_STAFF_STATUS':
      return {
        ...state,
        staffMembers: (state.staffMembers || []).map(s => 
          s.id === action.payload 
            ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } 
            : s
        )
      };

    // Services Catalog
    case 'ADD_SERVICE': {
      const existingServices = state.clinicInfo?.services || [];
      const newServices = [...existingServices, action.payload];
      return {
        ...state,
        clinicInfo: { ...(state.clinicInfo || {}), services: newServices }
      };
    }

    case 'UPDATE_SERVICE': {
      const existingServices = state.clinicInfo?.services || [];
      const newServices = existingServices.map(s => s.id === action.payload.id ? action.payload : s);
      return {
        ...state,
        clinicInfo: { ...(state.clinicInfo || {}), services: newServices }
      };
    }

    case 'DELETE_SERVICE': {
      const existingServices = state.clinicInfo?.services || [];
      const newServices = existingServices.filter(s => s.id !== action.payload);
      return {
        ...state,
        clinicInfo: { ...(state.clinicInfo || {}), services: newServices }
      };
    }

    // Patient Recalls
    case 'ADD_RECALL': {
      const incoming = action.payload;
      if (!incoming) return state;
      const exists = (state.recalls || []).some(r => incoming.id && r.id === incoming.id);
      if (exists) {
        return {
          ...state,
          recalls: (state.recalls || []).map(r => r.id === incoming.id ? incoming : r)
        };
      }
      return {
        ...state,
        recalls: [incoming, ...(state.recalls || [])],
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'recall',
            title: 'جدولة استدعاء مريض',
            message: `تمت جدولة استدعاء دوري للمريض ${incoming.patientName} (${incoming.reason})`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    }

    case 'UPDATE_RECALL_STATUS':
      return {
        ...state,
        recalls: (state.recalls || []).map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r)
      };

    case 'DELETE_RECALL':
      return {
        ...state,
        recalls: (state.recalls || []).filter(r => r.id !== action.payload)
      };

    default:
      return state;
  }
}
