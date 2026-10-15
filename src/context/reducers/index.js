import { systemReducer } from '@/context/reducers/systemReducer';
import { patientsReducer } from '@/context/reducers/patientsReducer';
import { appointmentsReducer } from '@/context/reducers/appointmentsReducer';
import { financeReducer } from '@/context/reducers/financeReducer';
import { settingsReducer } from '@/context/reducers/settingsReducer';
import { notificationsReducer } from '@/context/reducers/notificationsReducer';

/**
 * Clean Root Reducer composing specialized domain sub-reducers.
 * Complies with Single Responsibility Principle (SRP) and Clean Code architecture.
 */
export function combinedAppReducer(state, action) {
  let nextState = systemReducer(state, action);
  nextState = patientsReducer(nextState, action);
  nextState = appointmentsReducer(nextState, action);
  nextState = financeReducer(nextState, action);
  nextState = settingsReducer(nextState, action);
  nextState = notificationsReducer(nextState, action);
  return nextState;
}

export {
  systemReducer,
  patientsReducer,
  appointmentsReducer,
  financeReducer,
  settingsReducer,
  notificationsReducer
};
