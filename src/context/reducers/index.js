import { systemReducer } from './systemReducer';
import { patientsReducer } from './patientsReducer';
import { appointmentsReducer } from './appointmentsReducer';
import { financeReducer } from './financeReducer';
import { settingsReducer } from './settingsReducer';
import { notificationsReducer } from './notificationsReducer';

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
