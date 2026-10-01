import React, { createContext, useContext, useMemo } from 'react';
import { useApp } from '../AppContext';

const ClinicalContext = createContext(null);

export const ClinicalProvider = ({ children }) => {
  const {
    state,
    dispatch,
    getPatientById,
    getAppointmentsByPatientId,
    getAppointmentsByDate,
    getTodayAppointments,
    getUpcomingAppointments,
    addAppointmentWithNotification,
    sendSmsReminder
  } = useApp();

  const value = useMemo(() => ({
    patients: state.patients || [],
    appointments: state.appointments || [],
    isLoading: state.isLoading,
    getPatientById,
    getAppointmentsByPatientId,
    getAppointmentsByDate,
    getTodayAppointments,
    getUpcomingAppointments,
    addAppointmentWithNotification,
    sendSmsReminder,
    dispatch
  }), [
    state.patients,
    state.appointments,
    state.isLoading,
    getPatientById,
    getAppointmentsByPatientId,
    getAppointmentsByDate,
    getTodayAppointments,
    getUpcomingAppointments,
    addAppointmentWithNotification,
    sendSmsReminder,
    dispatch
  ]);

  return (
    <ClinicalContext.Provider value={value}>
      {children}
    </ClinicalContext.Provider>
  );
};

export const useClinical = () => {
  const context = useContext(ClinicalContext);
  const app = useApp();
  if (context) return context;

  return {
    patients: app.state.patients || [],
    appointments: app.state.appointments || [],
    isLoading: app.state.isLoading,
    getPatientById: app.getPatientById,
    getAppointmentsByPatientId: app.getAppointmentsByPatientId,
    getAppointmentsByDate: app.getAppointmentsByDate,
    getTodayAppointments: app.getTodayAppointments,
    getUpcomingAppointments: app.getUpcomingAppointments,
    addAppointmentWithNotification: app.addAppointmentWithNotification,
    sendSmsReminder: app.sendSmsReminder,
    dispatch: app.dispatch
  };
};

export default ClinicalContext;
