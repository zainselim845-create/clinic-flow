/**
 * ClinicFlow Enterprise Structured Logger
 * 
 * Provides unified, context-aware logging with:
 * - Granular levels: DEBUG, INFO, WARN, ERROR, AUDIT
 * - Automatic sensitive data redaction (passwords, JWTs, API keys)
 * - Automatic telemetry pipeline integration (routes errors to systemErrorService)
 * - Cryptographic audit trail integration for compliance events
 * - Safe serialization preventing circular references and performance degradation
 */

import { captureSystemError, redactSensitiveTokens } from '@/features/platform/services/systemErrorService';
import { recordAuditEvent } from '@/features/auth/services/auditLoggerService';

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;
const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

// Current active threshold (DEBUG in dev/test, INFO in production)
const currentLogLevel = isProd ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

function formatBadge(level, context) {
  const time = new Date().toLocaleTimeString('ar-EG', { hour12: false });
  return `[${time}] [${level}] [${context || 'App'}]`;
}

function safeClone(data) {
  if (data === undefined || data === null) return data;
  if (typeof data !== 'object') return redactSensitiveTokens(data);
  try {
    return redactSensitiveTokens(JSON.parse(JSON.stringify(data)));
  } catch {
    return '[Non-Serializable Data]';
  }
}

export const logger = {
  /**
   * Verbose debug logging (suppressed in production)
   */
  debug: (context, message, data) => {
    if (currentLogLevel > LOG_LEVELS.DEBUG) return;
    const cleanData = safeClone(data);
    if (cleanData !== undefined) {
      console.debug(formatBadge('DEBUG', context), message, cleanData);
    } else {
      console.debug(formatBadge('DEBUG', context), message);
    }
  },

  /**
   * Operational informational logs
   */
  info: (context, message, data) => {
    if (currentLogLevel > LOG_LEVELS.INFO) return;
    const cleanData = safeClone(data);
    if (cleanData !== undefined) {
      console.info(formatBadge('INFO', context), message, cleanData);
    } else {
      console.info(formatBadge('INFO', context), message);
    }
  },

  /**
   * Warning conditions and soft fallbacks
   */
  warn: (context, message, data) => {
    if (currentLogLevel > LOG_LEVELS.WARN) return;
    const cleanData = safeClone(data);
    if (cleanData !== undefined) {
      console.warn(formatBadge('WARN', context), message, cleanData);
    } else {
      console.warn(formatBadge('WARN', context), message);
    }
  },

  /**
   * Error conditions with automatic reporting to Telemetry & Bug Center
   */
  error: (context, message, errorOrData) => {
    const errorObj = errorOrData instanceof Error ? errorOrData : null;
    const errorMessage = errorObj ? errorObj.message : String(message || 'Unknown error');
    const errorStack = errorObj?.stack || '';
    const errorContext = errorObj ? {} : safeClone(errorOrData);

    // Console output
    console.error(formatBadge('ERROR', context), message, errorOrData || '');

    // Forward to central system error registry for SuperAdmin visibility
    try {
      captureSystemError({
        type: `${context || 'general'}_error`,
        message: `${context ? `[${context}] ` : ''}${errorMessage}`,
        stack: errorStack,
        severity: 'high',
        context: errorContext
      });
    } catch (e) {
      // Never crash the application inside the logger
      console.warn('[Logger] Failed to forward error to telemetry:', e);
    }
  },

  /**
   * Structured audit event logging (HIPAA/GDPR compliance trail)
   */
  audit: async (eventType, payload = {}) => {
    try {
      return await recordAuditEvent({
        eventType,
        ...payload
      });
    } catch (auditErr) {
      console.warn('[Logger] Failed to record audit event:', auditErr);
      return null;
    }
  }
};

export default logger;
