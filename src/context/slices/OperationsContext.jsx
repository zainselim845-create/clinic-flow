import React, { createContext, useContext, useMemo } from 'react';
import { useApp } from '../AppContext';

const OperationsContext = createContext(null);

export const OperationsProvider = ({ children }) => {
  const {
    state,
    dispatch,
    getUnreadNotificationsCount,
    realtimeStatus,
    broadcastClinicEvent,
    BROADCAST_EVENTS,
    mobileNavOpen,
    setMobileNavOpen
  } = useApp();

  const value = useMemo(() => ({
    staffMembers: state.staffMembers || [],
    blockedSlots: state.blockedSlots || [],
    notifications: state.notifications || [],
    recalls: state.recalls || [],
    unreadCount: getUnreadNotificationsCount ? getUnreadNotificationsCount() : 0,
    realtimeStatus,
    broadcastClinicEvent,
    BROADCAST_EVENTS,
    mobileNavOpen,
    setMobileNavOpen,
    dispatch
  }), [
    state.staffMembers,
    state.blockedSlots,
    state.notifications,
    state.recalls,
    getUnreadNotificationsCount,
    realtimeStatus,
    broadcastClinicEvent,
    BROADCAST_EVENTS,
    mobileNavOpen,
    setMobileNavOpen,
    dispatch
  ]);

  return (
    <OperationsContext.Provider value={value}>
      {children}
    </OperationsContext.Provider>
  );
};

export const useOperations = () => {
  const context = useContext(OperationsContext);
  const app = useApp();
  if (context) return context;

  return {
    staffMembers: app.state.staffMembers || [],
    blockedSlots: app.state.blockedSlots || [],
    notifications: app.state.notifications || [],
    recalls: app.state.recalls || [],
    unreadCount: app.getUnreadNotificationsCount ? app.getUnreadNotificationsCount() : 0,
    realtimeStatus: app.realtimeStatus,
    broadcastClinicEvent: app.broadcastClinicEvent,
    BROADCAST_EVENTS: app.BROADCAST_EVENTS,
    mobileNavOpen: app.mobileNavOpen,
    setMobileNavOpen: app.setMobileNavOpen,
    dispatch: app.dispatch
  };
};

export default OperationsContext;
