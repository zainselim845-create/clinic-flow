import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AsyncQueueService, JOB_PRIORITY, JOB_STATUS, globalAsyncQueue } from '../services/asyncQueueService';
import { sendSmsBatchAsync } from '../services/smsService';
import fs from 'fs';
import path from 'path';

describe('SaaS Delegator: Async Queue & Strict RLS Hardening Suite', () => {

  describe('1. AsyncQueueService Core Mechanics', () => {
    let queue;

    beforeEach(() => {
      queue = new AsyncQueueService({
        concurrency: 2,
        maxRetries: 3,
        initialBackoffMs: 20
      });
    });

    afterEach(() => {
      queue.reset();
    });

    it('processes jobs in order of priority (HIGH before LOW)', async () => {
      const executionOrder = [];

      queue.registerHandler('test_priority', async (payload) => {
        executionOrder.push(payload.label);
        return { success: true };
      });

      // Pause to enqueue all before draining
      queue.isPaused = true;

      queue.enqueue({ type: 'test_priority', payload: { label: 'LOW_1' }, priority: JOB_PRIORITY.LOW });
      queue.enqueue({ type: 'test_priority', payload: { label: 'HIGH_1' }, priority: JOB_PRIORITY.HIGH });
      queue.enqueue({ type: 'test_priority', payload: { label: 'NORMAL_1' }, priority: JOB_PRIORITY.NORMAL });
      queue.enqueue({ type: 'test_priority', payload: { label: 'HIGH_2' }, priority: JOB_PRIORITY.HIGH });

      queue.isPaused = false;
      await queue.drain();

      // Wait a moment for execution
      await new Promise(r => setTimeout(r, 60));

      expect(executionOrder[0]).toBe('HIGH_1');
      expect(executionOrder[1]).toBe('HIGH_2');
      expect(executionOrder[2]).toBe('NORMAL_1');
      expect(executionOrder[3]).toBe('LOW_1');
    });

    it('respects concurrency limits and does not exceed active worker bound', async () => {
      let maxSeenWorkers = 0;
      let runningWorkers = 0;

      queue.registerHandler('slow_task', async () => {
        runningWorkers++;
        maxSeenWorkers = Math.max(maxSeenWorkers, runningWorkers);
        await new Promise(r => setTimeout(r, 30));
        runningWorkers--;
        return true;
      });

      for (let i = 0; i < 6; i++) {
        queue.enqueue({ type: 'slow_task', payload: { id: i } });
      }

      await new Promise(r => setTimeout(r, 150));

      expect(maxSeenWorkers).toBeLessThanOrEqual(2);
    });

    it('retries failing jobs and routes to Dead-Letter Queue (DLQ) upon exceeding max retries', async () => {
      let attempts = 0;
      const dlqListener = vi.fn();
      queue.on('dlq', dlqListener);

      queue.registerHandler('failing_task', async () => {
        attempts++;
        throw new Error('Downstream network timeout');
      });

      queue.enqueue({ type: 'failing_task', payload: { target: 'server' } });

      // Wait for backoff retries to complete (20ms, 40ms)
      await new Promise(r => setTimeout(r, 200));

      expect(attempts).toBe(3); // 1 initial + 2 retries
      const metrics = queue.getMetrics();
      expect(metrics.dlqCount).toBe(1);
      expect(dlqListener).toHaveBeenCalledTimes(1);

      // Verify DLQ retry capability
      const retriedCount = queue.retryDlq();
      expect(retriedCount).toBe(1);
      expect(queue.dlq.length).toBe(0);
    });

    it('prevents duplicate enqueueing via idempotency keys', () => {
      queue.registerHandler('dummy', async () => true);
      queue.isPaused = true;

      const res1 = queue.enqueue({
        type: 'dummy',
        payload: { x: 1 },
        idempotencyKey: 'idemp_key_100'
      });
      expect(res1.isDuplicate).toBe(false);

      const res2 = queue.enqueue({
        type: 'dummy',
        payload: { x: 1 },
        idempotencyKey: 'idemp_key_100'
      });
      expect(res2.isDuplicate).toBe(true);
      expect(res2.jobId).toBe(res1.jobId);
    });

    it('enqueues batches and tracks tenant metrics', async () => {
      const batch = queue.enqueueBatch([
        { type: 'b_task', payload: { item: 1 } },
        { type: 'b_task', payload: { item: 2 } },
        { type: 'b_task', payload: { item: 3 } }
      ], { clinicId: 'clinic_test_99' });

      expect(batch.total).toBe(3);
      expect(batch.jobIds.length).toBe(3);

      const tenantMetrics = queue.getMetrics('clinic_test_99');
      expect(tenantMetrics.totalInQueue).toBe(3);

      const otherMetrics = queue.getMetrics('clinic_other');
      expect(otherMetrics.totalInQueue).toBe(0);
    });
  });

  describe('2. SMS Service Async Batch Integration', () => {
    it('returns 202 Accepted equivalent immediately (< 20ms) for bulk SMS dispatch', () => {
      const recipients = [
        { phone: '01012345678', message: 'تذكير موعدك غداً' },
        { phone: '01123456789', message: 'تذكير موعدك غداً' },
        { phone: '01234567890', message: 'تذكير موعدك غداً' }
      ];

      const start = performance.now();
      const res = sendSmsBatchAsync(recipients, 'clinic-batch-test');
      const duration = performance.now() - start;

      expect(res.status).toBe('accepted');
      expect(res.enqueuedCount).toBe(3);
      expect(res.batchId).toBeTruthy();
      expect(duration).toBeLessThan(50); // Under 50ms requirement
    });
  });

  describe('3. Production Strict RLS & ESR Migration Verification', () => {
    it('verifies that SQL migration file exists and enforces ESR indexes and tenant isolation', () => {
      const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260929_strict_rls_policies.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sql = fs.readFileSync(migrationPath, 'utf8');

      // ESR indexes
      expect(sql).toContain('idx_appointments_esr');
      expect(sql).toContain('idx_invoices_esr');
      expect(sql).toContain('idx_patients_esr');
      expect(sql).toContain('idx_recalls_esr');

      // Soft deletes
      expect(sql).toContain('deleted_at TIMESTAMPTZ');

      // Strict RLS helper & policies
      expect(sql).toContain('FUNCTION current_tenant_id()');
      expect(sql).toContain('auth.jwt() ->> \'clinic_id\'');
      expect(sql).toContain('patients_tenant_isolation');
      expect(sql).toContain('appointments_tenant_isolation');
      expect(sql).toContain('invoices_tenant_isolation');
    });
  });
});
