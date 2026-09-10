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
  if (nextState !== state) return nextState;

  nextState = patientsReducer(state, action);
  if (nextState !== state) return nextState;

  nextState = appointmentsReducer(state, action);
  if (nextState !== state) return nextState;

  nextState = financeReducer(state, action);
  if (nextState !== state) return nextState;

  nextState = settingsReducer(state, action);
  if (nextState !== state) return nextState;

  nextState = notificationsReducer(state, action);
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
