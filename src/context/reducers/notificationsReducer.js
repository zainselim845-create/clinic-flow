export function notificationsReducer(state, action) {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, read: true } : n
        )
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      };

    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case 'CLEAR_ALL_NOTIFICATIONS':
      return { ...state, notifications: [] };

    default:
      return state;
  }
}
