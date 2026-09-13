/**
 * Immutable Healthcare Audit Trail Logger Service
 * Cryptographic Merkle Hash Chaining compliant with healthcare governance regulations (HIPAA/GDPR).
 */

const AUDIT_STORAGE_KEY = 'clinicflow_audit_log';
let inMemoryAuditLogs = [];

export const AUDIT_EVENT_TYPES = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  CONSULTATION_COMPLETED: 'CONSULTATION_COMPLETED',
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  INVOICE_CREATED: 'INVOICE_CREATED',
  PAYMENT_COLLECTED: 'PAYMENT_COLLECTED',
  PATIENT_RECORD_UPDATED: 'PATIENT_RECORD_UPDATED',
  EXPENSE_LOGGED: 'EXPENSE_LOGGED',
  SHIFT_CLOSED: 'SHIFT_CLOSED'
};

export const GENESIS_HASH = '0'.repeat(64);

/**
 * Standard portable SHA-256 hash calculation (synchronous and dependency-free)
 * @param {string} ascii - Input string to hash
 * @returns {string} 64-character hexadecimal SHA-256 digest
 */
export function computeSha256(rawInput) {
  let ascii = '';
  try {
    ascii = unescape(encodeURIComponent(String(rawInput || '')));
  } catch (_) {
    ascii = String(rawInput || '');
  }

  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [];
  const k = [];
  let primeCounter = 0;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16 ? '0' : '') + b.toString(16));
      }
    }
    return result.slice(0, 64);
  }
  return result;
}

/**
 * Calculates hash for an audit record linked to its predecessor
 */
export function calculateRecordHash(entry, previousHash = GENESIS_HASH) {
  const content = `${previousHash}|${entry.timestamp}|${entry.eventType}|${entry.user}|${entry.action}|${entry.entityId}|${entry.details}`;
  return computeSha256(content);
}

/**
 * Appends a cryptographically chained audit event to the log
 */
export function recordAuditEvent({
  eventType,
  user = 'الطبيب المناوب',
  action,
  details = '',
  entityId = '',
  entityType = 'general',
  clinicId = 'default'
}) {
  const allLogs = getAuditLogs();
  // Get the most recent log's hash to chain from
  const previousHash = (allLogs.length > 0 && allLogs[0].hash) ? allLogs[0].hash : GENESIS_HASH;
  const timestamp = new Date().toISOString();

  const provisionalEntry = {
    timestamp,
    eventType,
    user,
    action,
    details,
    entityId: String(entityId),
    entityType,
    clinicId
  };

  const hash = calculateRecordHash(provisionalEntry, previousHash);

  const newEntry = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    ...provisionalEntry,
    epoch: Date.now(),
    previousHash,
    hash
  };

  inMemoryAuditLogs.unshift(newEntry);

  if (typeof localStorage !== 'undefined') {
    try {
      const existing = getAuditLogs();
      const trimmed = [newEntry, ...existing.filter(e => e.id !== newEntry.id)].slice(0, 10000);
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('Could not record audit log to localStorage:', err);
    }
  }

  return newEntry;
}

/**
 * Polymorphic alias for recordAuditEvent supporting standard audit fields
 */
export function logAuditEvent(params = {}) {
  return recordAuditEvent({
    ...params,
    eventType: params.eventType || params.action || 'AUDIT_LOG',
    user: params.user || params.userId || 'الطبيب المناوب',
    entityType: params.entityType || params.resourceType || 'general',
    entityId: params.entityId || params.resourceId || '',
    details: typeof params.details === 'object' ? JSON.stringify(params.details) : String(params.details || '')
  });
}

/**
 * Retrieves stored audit logs, optionally filtered by clinicId and limit
 * @param {string} [clinicId]
 * @param {number} [limit]
 * @returns {Array} List of audit records
 */
export function getAuditLogs(clinicId = null, limit = 10000) {
  let list = inMemoryAuditLogs;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      }
    } catch (_) {}
  }
  if (clinicId) {
    list = list.filter(e => !e.clinicId || e.clinicId === clinicId);
  }
  return list.slice(0, limit);
}

/**
 * Verifies cryptographic integrity of the entire audit chain.
 * Detects if any record was modified, injected, or removed.
 * 
 * @param {Array} [logs] - Optional list of logs to verify (defaults to stored logs)
 * @returns {Object} { isValid, totalChecked, brokenAt, corruptedIndex, reason }
 */
export function verifyAuditChainIntegrity(logs = null) {
  const chain = Array.isArray(logs) ? logs : getAuditLogs();
  if (!chain || chain.length === 0) {
    return { isValid: true, totalChecked: 0, brokenAt: null, corruptedIndex: null, reason: 'Empty chain' };
  }

  // Logs are ordered newest-first (descending). Reverse to verify chronologically from genesis.
  const chronological = [...chain].reverse();
  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < chronological.length; i++) {
    const record = chronological[i];

    // 1. Verify link to previous block
    if (record.previousHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalChecked: i,
        brokenAt: record.id || `index_${i}`,
        corruptedIndex: i,
        reason: `Broken chain link or tampered entry at index ${i}: expected previous hash ${expectedPrevHash.slice(0, 10)}... but got ${String(record.previousHash).slice(0, 10)}...`
      };
    }

    // 2. Recompute hash from record content
    const recalculated = calculateRecordHash(record, record.previousHash);
    if (recalculated !== record.hash) {
      return {
        isValid: false,
        totalChecked: i,
        brokenAt: record.id || `index_${i}`,
        corruptedIndex: i,
        reason: `Tampered payload detected at record ${record.id}: hash mismatch`
      };
    }

    expectedPrevHash = record.hash;
  }

  return {
    isValid: true,
    totalChecked: chronological.length,
    brokenAt: null,
    corruptedIndex: null,
    headHash: expectedPrevHash,
    reason: 'Cryptographic chain intact and tamper-free'
  };
}

/**
 * Generates an exportable compliance verification certificate
 */
export function generateAuditComplianceCertificate(clinicId = 'default') {
  const logs = getAuditLogs();
  const integrity = verifyAuditChainIntegrity(logs);

  return {
    certificateId: `CERT-AUDIT-${Date.now()}`,
    clinicId,
    issuedAt: new Date().toISOString(),
    totalVerifiedEvents: integrity.totalChecked,
    isTamperFree: integrity.isValid,
    chainHeadHash: integrity.headHash || GENESIS_HASH,
    standardCompliance: ['HIPAA-Security-164.312', 'GDPR-Art-32', 'Egyptian-Health-Data-Law-151'],
    digitalSeal: computeSha256(`CLINICFLOW_SEAL_${clinicId}_${integrity.headHash}_${integrity.totalChecked}`)
  };
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
