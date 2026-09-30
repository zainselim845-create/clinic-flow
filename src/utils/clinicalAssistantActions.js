/**
 * Clinical Assistant Action & Intelligence Engine for ClinicFlow
 * Modular Orchestrator decoupling presentation, domain actions, and infrastructure
 * Strict Zero Emojis compliance
 */
import { 
  resolveDateFromText, 
  resolveTimeFromText, 
  findPatientInText, 
  extractCandidateName,
  evaluateScheduleBlockActions,
  evaluateAppointmentActions,
  evaluatePatientDossierActions,
  evaluateTreasuryActions,
  evaluateServicesAndStaffActions
} from './clinical';

// Re-export NLP extraction utilities for direct consumers and test suites
export {
  resolveDateFromText,
  resolveTimeFromText,
  findPatientInText,
  extractCandidateName
};

/**
 * Analyzes the doctor's message to detect administrative actions.
 * Evaluates domain modules in strict architectural priority order.
 * @param {string} message - Doctor message
 * @param {Object} state - Current AppContext state
 * @returns {Object} { isAction: boolean, actionType?: string, payload?: any, replyText?: string }
 */
export function processDoctorIntent(message, state = {}) {
  const text = (message || '').trim();
  if (!text) return { isAction: false };

  // 1. Staff roster & Schedule blocks/unblocks
  const scheduleRes = evaluateScheduleBlockActions(text, state);
  if (scheduleRes.handled) return scheduleRes.result;

  // 2. Appointments (Cancel, Reschedule, Status Workflow, Instant Booking, Schedule queries)
  const apptRes = evaluateAppointmentActions(text, state);
  if (apptRes.handled) return apptRes.result;

  // 3. Patient Dossiers (Registration, Allergies/Diagnosis updates, Patient Profile search)
  const patientRes = evaluatePatientDossierActions(text, state);
  if (patientRes.handled) return patientRes.result;

  // 4. Treasury & Cash Flow (Expenses, Inflow Payments, Real-time Balances, Invoices/Debts)
  const treasuryRes = evaluateTreasuryActions(text, state);
  if (treasuryRes.handled) return treasuryRes.result;

  // 5. Services, Multi-Clinic Branches, Optional Modules, WhatsApp Agent, Navigation & Summaries
  const servicesRes = evaluateServicesAndStaffActions(text, state);
  if (servicesRes.handled) return servicesRes.result;

  return { isAction: false };
}
