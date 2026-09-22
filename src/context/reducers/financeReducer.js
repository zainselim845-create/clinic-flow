export function financeReducer(state, action) {
  switch (action.type) {
    case 'ADD_EXPENSE': {
      const incoming = action.payload;
      if (!incoming) return state;

      const exists = (state.expenses || []).some(e => incoming.id && e.id === incoming.id);
      if (exists) {
        return {
          ...state,
          expenses: (state.expenses || []).map(e => e.id === incoming.id ? incoming : e)
        };
      }

      return {
        ...state,
        expenses: [incoming, ...(state.expenses || [])],
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'expense',
            title: 'تسجيل مصروف جديد',
            message: `تم تسجيل مصروف بقيمة ${incoming.amount} ج.م [${incoming.title}]`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    }

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: (state.expenses || []).map(e => e.id === action.payload.id ? action.payload : e)
      };

    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: (state.expenses || []).filter(e => e.id !== action.payload)
      };

    default:
      return state;
  }
}
