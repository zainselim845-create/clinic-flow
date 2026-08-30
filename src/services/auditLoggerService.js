/**
 * Immutable Healthcare Audit Trail Logger Service
 * Compliant with healthcare governance and data protection regulations.
 */

const AUDIT_STORAGE_KEY = 'clinicflow_audit_log';

export const AUDIT_EVENT_TYPES = {
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  INVOICE_CREATED: 'INVOICE_CREATED',
  PAYMENT_COLLECTED: 'PAYMENT_COLLECTED',
  PRESCRIPTION_ISSUED: 'PRESCRIPTION_ISSUED',
  PATIENT_RECORD_UPDATED: 'PATIENT_RECORD_UPDATED',
  EXPENSE_LOGGED: 'EXPENSE_LOGGED',
  SHIFT_CLOSED: 'SHIFT_CLOSED'
};

/**
 * Appends an immutable audit event to the log
 * @param {object} event - { eventType, user, action, details, entityId, entityType }
 */
export function recordAuditEvent({
  eventType,
  user = 'الطبيب المناوب',
  action,
  details = '',
  entityId = '',
  entityType = 'general'
}) {
  const newEntry = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    epoch: Date.now(),
    eventType,
    user,
    action,
    details,
    entityId: String(entityId),
    entityType
  };

  try {
    const existing = getAuditLogs();
    existing.unshift(newEntry);
    // Keep last 10,000 audit records in browser storage
    const trimmed = existing.slice(0, 10000);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Could not record audit log to localStorage:', err);
  }

  return newEntry;
}

/**
 * Retrieves all stored audit logs
 * @returns {Array} List of audit records
 */
export function getAuditLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/**
 * Filters audit logs by query or date range
 */
export function filterAuditLogs({ query = '', eventType = 'all', startDate = '', endDate = '' } = {}) {
  const allLogs = getAuditLogs();
  const q = query.trim().toLowerCase();

  return allLogs.filter(log => {
    if (eventType !== 'all' && log.eventType !== eventType) return false;
    if (startDate && log.timestamp < startDate) return false;
    if (endDate && log.timestamp > endDate) return false;

    if (q) {
      const matchAction = log.action && log.action.toLowerCase().includes(q);
      const matchDetails = log.details && log.details.toLowerCase().includes(q);
      const matchUser = log.user && log.user.toLowerCase().includes(q);
      const matchEntity = log.entityId && log.entityId.toLowerCase().includes(q);
      return matchAction || matchDetails || matchUser || matchEntity;
    }

    return true;
  });
}
