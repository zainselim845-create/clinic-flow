export function financeReducer(state, action) {
  switch (action.type) {
    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: [action.payload, ...(state.expenses || [])],
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'expense',
            title: 'تسجيل مصروف جديد',
            message: `تم تسجيل مصروف بقيمة ${action.payload.amount} ج.م [${action.payload.title}]`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };

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
