import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '@/lib/logger';
import { getSystemErrors, clearSystemErrors } from '@/features/platform/services/systemErrorService';
import { getAuditLogs, AUDIT_EVENT_TYPES } from '@/features/auth/services/auditLoggerService';

describe('Structured Logger & Audit Pipeline Verification', () => {
  beforeEach(() => {
    clearSystemErrors();
    vi.restoreAllMocks();
  });

  it('logs info and warn messages without throwing', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.info('BillingService', 'Invoice #102 created', { amount: 500 });
    logger.warn('InventoryService', 'Stock level low for amoxicillin', { remaining: 3 });

    expect(consoleInfoSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('redacts sensitive data like passwords and bearer tokens from logs', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.info('AuthService', 'User login attempt', {
      email: 'doctor@clinicflow.com',
      password: 'SuperSecretPassword123!',
      token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.signature'
    });

    expect(consoleInfoSpy).toHaveBeenCalled();
    const loggedPayload = consoleInfoSpy.mock.calls[0][2];
    expect(loggedPayload.password).toBe('[REDACTED]');
    expect(loggedPayload.token).toBe('[REDACTED]');
  });

  it('automatically captures and forwards errors to the central system telemetry registry', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const testError = new Error('Database connection timed out');
    logger.error('DatabaseSync', 'Failed to connect to primary replica', testError);

    expect(consoleErrorSpy).toHaveBeenCalled();

    const errors = getSystemErrors();
    expect(errors.length).toBeGreaterThan(0);
    const latestError = errors[0];
    expect(latestError.message).toContain('Database connection timed out');
    expect(latestError.type).toBe('DatabaseSync_error');
    expect(latestError.severity).toBe('high');
  });

  it('handles circular references and non-serializable objects gracefully', () => {
    const circularObj = { name: 'Patient Record' };
    circularObj.self = circularObj;

    expect(() => {
      logger.info('ClinicalDossier', 'Circular inspection', circularObj);
    }).not.toThrow();
  });

  it('integrates with cryptographic audit trail for compliance events', async () => {
    const event = await logger.audit(AUDIT_EVENT_TYPES.INVOICE_CREATED, {
      clinicId: 'clinic-zain',
      userId: 'doc-zain',
      details: { invoiceId: 'inv-9988', total: 1200 }
    });

    expect(event).toBeDefined();
    expect(event.hash).toBeDefined();
    expect(event.hash.length).toBe(64); // SHA-256 hex digest
    expect(event.eventType).toBe('INVOICE_CREATED');
  });
});
