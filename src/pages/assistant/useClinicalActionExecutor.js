import * as blockedSlotsService from '../../services/blockedSlotsService';
import * as appointmentsService from '../../services/appointmentsService';
import * as patientsService from '../../services/patientsService';
import * as expensesService from '../../services/expensesService';

/**
 * Executes structured clinical and administrative actions triggered by the AI assistant.
 */
export function executeDoctorAction(actionResult, { currentClinic, state, dispatch, useSupabase, switchTenant, navigate }) {
  const activeClinicId = currentClinic?.id || null;
  const payload = actionResult?.payload || {};

  switch (actionResult.actionType) {
    case 'BLOCK_FULL_DAY':
      dispatch({ type: 'BLOCK_FULL_DAY', payload });
      if (useSupabase) {
        blockedSlotsService.blockSlotInDb(payload.date, 'FULL_DAY', payload.reason || 'إجازة الطبيب', true, activeClinicId).catch(console.error);
      }
      break;

    case 'UNBLOCK_FULL_DAY':
      dispatch({ type: 'UNBLOCK_FULL_DAY', payload });
      if (useSupabase) {
        blockedSlotsService.unblockFullDayInDb(payload.date, activeClinicId).catch(console.error);
      }
      break;

    case 'BLOCK_SLOT':
      dispatch({ type: 'TOGGLE_BLOCK_SLOT', payload });
      if (useSupabase) {
        blockedSlotsService.blockSlotInDb(payload.date, payload.time, payload.reason || 'حظر مخصص', false, activeClinicId).catch(console.error);
      }
      break;

    case 'UNBLOCK_SLOT':
      dispatch({ type: 'TOGGLE_BLOCK_SLOT', payload });
      if (useSupabase) {
        blockedSlotsService.unblockSlotInDb(payload.date, payload.time, activeClinicId).catch(console.error);
      }
      break;

    case 'BOOK_APPOINTMENT':
      dispatch({ type: 'ADD_APPOINTMENT', payload });
      if (useSupabase) {
        appointmentsService.addAppointment({ ...payload, clinicId: activeClinicId }).catch(console.error);
      }
      break;

    case 'CANCEL_APPOINTMENT': {
      const apptId = payload.id || payload.appointmentId;
      dispatch({ type: 'UPDATE_APPOINTMENT_STATUS', payload: { id: apptId, status: 'cancelled' } });
      if (useSupabase) {
        appointmentsService.softDeleteAppointment(apptId, activeClinicId).catch(console.error);
      }
      break;
    }

    case 'RESCHEDULE_APPOINTMENT': {
      const apptId = payload.id || payload.appointmentId;
      const existing = (state.appointments || []).find(a => a.id === apptId);
      if (existing) {
        const updated = { ...existing, date: payload.date, time: payload.time };
        dispatch({ type: 'UPDATE_APPOINTMENT', payload: updated });
        if (useSupabase) {
          appointmentsService.updateAppointment(apptId, updated, activeClinicId).catch(console.error);
        }
      }
      break;
    }

    case 'UPDATE_APPOINTMENT_STATUS': {
      const apptId = payload.id || payload.appointmentId;
      dispatch({ type: 'UPDATE_APPOINTMENT_STATUS', payload: { id: apptId, status: payload.status } });
      if (useSupabase) {
        appointmentsService.updateAppointmentStatus(apptId, payload.status, {}, activeClinicId).catch(console.error);
      }
      break;
    }

    case 'ADD_PATIENT':
      dispatch({ type: 'ADD_PATIENT', payload });
      if (useSupabase) {
        patientsService.addPatient({ ...payload, clinicId: activeClinicId }).catch(console.error);
      }
      break;

    case 'UPDATE_PATIENT':
      dispatch({ type: 'UPDATE_PATIENT', payload });
      if (useSupabase) {
        patientsService.updatePatient(payload.id, payload, activeClinicId).catch(console.error);
      }
      break;

    case 'ADD_EXPENSE':
      dispatch({ type: 'ADD_EXPENSE', payload });
      if (useSupabase) {
        expensesService.addExpense({ ...payload, clinicId: activeClinicId }).catch(console.error);
      }
      break;

    case 'RECORD_PAYMENT':
      if (payload.patientId) {
        const targetPat = (state.patients || []).find(p => p.id === payload.patientId);
        if (targetPat) {
          const currentBal = Number(targetPat.balance) || 0;
          const updatedPat = { ...targetPat, balance: Math.max(0, currentBal - (Number(payload.amount) || 0)) };
          dispatch({ type: 'UPDATE_PATIENT', payload: updatedPat });
          if (useSupabase) {
            patientsService.updatePatient(targetPat.id, updatedPat, activeClinicId).catch(console.error);
          }
        }
      }
      break;

    case 'UPDATE_CLINIC_FEE':
      dispatch({ type: 'UPDATE_CLINIC_INFO', payload: { consultationFee: payload.fee } });
      break;

    case 'ADD_SERVICE':
      dispatch({ type: 'ADD_SERVICE', payload });
      break;

    case 'SWITCH_CLINIC':
      if (payload?.slug && typeof switchTenant === 'function') {
        switchTenant(payload.slug);
      }
      break;

    case 'NAVIGATE':
      if (payload?.path && typeof navigate === 'function') {
        navigate(payload.path);
      }
      break;

    default:
      console.warn('Unknown clinical action type:', actionResult.actionType);
  }
}
