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

    // Invoices Management
    case 'ADD_INVOICE': {
      const incoming = action.payload;
      if (!incoming) return state;

      const currentInvoices = state.invoices || [];
      const exists = currentInvoices.some(inv => incoming.id && inv.id === incoming.id);
      if (exists) {
        return {
          ...state,
          invoices: currentInvoices.map(inv => inv.id === incoming.id ? incoming : inv)
        };
      }

      return {
        ...state,
        invoices: [incoming, ...currentInvoices],
        notifications: [
          {
            id: 'notif-inv-' + Date.now(),
            type: 'invoice',
            title: 'إصدار فاتورة جديدة',
            message: `تم إصدار فاتورة جديدة بقيمة ${incoming.total || 0} ج.م [${incoming.patientName || 'مريض'}]`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    }

    case 'UPDATE_INVOICE':
      return {
        ...state,
        invoices: (state.invoices || []).map(inv => inv.id === action.payload.id ? action.payload : inv)
      };

    case 'DELETE_INVOICE':
      return {
        ...state,
        invoices: (state.invoices || []).filter(inv => inv.id !== action.payload)
      };

    default:
      return state;
  }
}
