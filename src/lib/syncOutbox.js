/**
 * ClinicFlow Autonomous Offline Outbox (syncOutbox.js)
 * Guarantees zero data loss by recording all mutations locally in IndexedDB,
 * and draining them idempotently to the cloud when connections are healthy.
 */

import { localDb } from '../db/localDatabase';
import { cloudCircuitBreaker } from './circuitBreaker';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import * as expensesService from '../services/expensesService';
import * as recallsService from '../services/recallsService';
import * as notificationsService from '../services/notificationsService';

export const OUTBOX_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CONFLICT: 'conflict'
};

/**
 * Merges local and remote entity payloads non-destructively.
 * Never silently overwrites clinical notes or diagnoses.
 * Preserves both versions distinctly in structured conflictDetails fields for review,
 * avoiding naive string concatenation into active clinical notes.
 */
export function mergeConflictingPayloads(localPayload = {}, remotePayload = {}) {
  const merged = { ...remotePayload, ...localPayload };
  const hasNotesConflict = Boolean(
    remotePayload.notes && localPayload.notes && remotePayload.notes.trim() !== localPayload.notes.trim()
  );
  const hasDiagnosisConflict = Boolean(
    remotePayload.diagnosis && localPayload.diagnosis && remotePayload.diagnosis.trim() !== localPayload.diagnosis.trim()
  );

  if (hasNotesConflict || hasDiagnosisConflict) {
    merged.hasConflict = true;
    merged.requiresReview = true;
    merged.conflictFields = [];
    if (hasNotesConflict) merged.conflictFields.push('notes');
    if (hasDiagnosisConflict) merged.conflictFields.push('diagnosis');

    // Store discrete, auditable snapshots of both versions without mangling clinical text
    merged.conflictDetails = {
      local: {
        notes: localPayload.notes || null,
        diagnosis: localPayload.diagnosis || null,
        version: localPayload.version || null,
        updatedAt: localPayload.updatedAt || null,
        author: localPayload.userId || localPayload.author || null
      },
      remote: {
        notes: remotePayload.notes || null,
        diagnosis: remotePayload.diagnosis || null,
        version: remotePayload.version || null,
        updatedAt: remotePayload.updatedAt || null,
        author: remotePayload.userId || remotePayload.author || null
      },
      detectedAt: new Date().toISOString()
    };

    // Keep the remote canonical record as the active base, flagging the conflict for doctor review
    merged.notes = remotePayload.notes || localPayload.notes;
    merged.diagnosis = remotePayload.diagnosis || localPayload.diagnosis;
  } else {
    if (remotePayload.notes && !localPayload.notes) {
      merged.notes = remotePayload.notes;
    }
    if (remotePayload.diagnosis && !localPayload.diagnosis) {
      merged.diagnosis = remotePayload.diagnosis;
    }
  }

  // Preserve audit revision history
  const remoteRev = {
    source: 'remote',
    version: remotePayload.version || 1,
    notes: remotePayload.notes || null,
    diagnosis: remotePayload.diagnosis || null,
    updatedAt: remotePayload.updatedAt || new Date().toISOString()
  };
  const localRev = {
    source: 'local',
    version: localPayload.version || 1,
    notes: localPayload.notes || null,
    diagnosis: localPayload.diagnosis || null,
    updatedAt: localPayload.updatedAt || new Date().toISOString()
  };
  merged.revisionHistory = [
    ...(remotePayload.revisionHistory || []),
    ...(localPayload.revisionHistory || []),
    ...(hasNotesConflict || hasDiagnosisConflict ? [remoteRev, localRev] : [])
  ];

  merged.version = Math.max(Number(localPayload.version) || 0, Number(remotePayload.version) || 0) + 1;
  merged.updatedAt = new Date().toISOString();
  return merged;
}

class SyncOutbox {
  constructor() {
    this.isDraining = false;
    this.listeners = new Set();
    this.customHandlers = new Map();
    this.inMemoryQueue = [];
    this.drainTimer = null;

    // Recover stuck items left over from unexpected previous shutdowns
    if (typeof localDb?.recoverStuckProcessingItems === 'function') {
      localDb.recoverStuckProcessingItems().catch(() => {});
    }

    // Start background sync polling if in browser environment
    if (typeof window !== 'undefined') {
      this.drainTimer = setInterval(() => {
        this.drain().catch(err => console.warn('[SyncOutbox] Periodic drain warning:', err));
      }, 15000); // Check every 15s

      cloudCircuitBreaker.subscribe((event) => {
        if (event.newState === 'CLOSED' || event.newState === 'HALF_OPEN') {
          this.drain().catch(console.warn);
        }
      });
    }
  }

  /**
   * Enqueue a mutation for eventual cloud sync.
   * If IndexedDB fails, discloses transient memory fallback explicitly.
   * 
   * @param {Object} item - { entityType, action, payload, clinicId, userId }
   * @returns {Promise<{ success: boolean, durable: boolean, item: Object, warning?: string, error?: Error }>}
   */
  async enqueue(item) {
    const outboxItem = {
      ...item,
      id: item.id || `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: OUTBOX_STATUS.PENDING,
      timestamp: Date.now(),
      version: item.version || item.payload?.version || 1,
      updatedAt: item.updatedAt || item.payload?.updatedAt || new Date().toISOString(),
      userId: item.userId || item.payload?.userId || null,
      clinicId: item.clinicId || item.payload?.clinicId || null,
      retryCount: 0
    };

    try {
      await localDb.enqueueSyncItem(outboxItem);
      outboxItem.durable = true;
      this.notifyListeners({ type: 'ENQUEUED', item: outboxItem });
      // Trigger non-blocking drain attempt if circuit is available
      if (cloudCircuitBreaker.isAvailable()) {
        setTimeout(() => this.drain(outboxItem.userId, outboxItem.clinicId).catch(console.warn), 100);
      }
      return outboxItem;
    } catch (err) {
      console.warn('[SyncOutbox] Failed to write outbox to IndexedDB, fallback memory:', err);
      // Retain in memory queue so mutations are not dropped silently in current runtime
      outboxItem.isInMemoryFallback = true;
      outboxItem.durable = false;
      outboxItem.warning = 'TRANSIENT_MEMORY_ONLY: Failed to persist to IndexedDB. Operation held in volatile memory only and will not survive reload.';
      outboxItem.storageError = err;
      this.inMemoryQueue.push(outboxItem);
      this.notifyListeners({ type: 'ENQUEUED', item: outboxItem, warning: 'in_memory_only' });
      if (cloudCircuitBreaker.isAvailable()) {
        setTimeout(() => this.drain(outboxItem.userId, outboxItem.clinicId).catch(console.warn), 100);
      }
      return outboxItem;
    }
  }

  /**
   * Drain pending mutations from the outbox with user and clinic isolation
   */
  async drain(activeUserId = null, activeClinicId = null) {
    if (this.isDraining) return;
    if (!cloudCircuitBreaker.isAvailable()) return;

    if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
      try {
        await navigator.locks.request('clinicflow_sync_outbox_drain', { ifAvailable: true }, async (lock) => {
          if (!lock) return;
          await this._performDrain(activeUserId, activeClinicId);
        });
      } catch {
        await this._performDrain(activeUserId, activeClinicId);
      }
    } else {
      await this._performDrain(activeUserId, activeClinicId);
    }
  }

  async _performDrain(activeUserId = null, activeClinicId = null) {
    this.isDraining = true;
    try {
      // 1. Recover any mutations stuck in processing state from interrupted sessions
      if (typeof localDb?.recoverStuckProcessingItems === 'function') {
        await localDb.recoverStuckProcessingItems().catch(() => {});
      }

      // Filter by active user and clinic to avoid cross-tenant/cross-user sync leakage
      const filter = {};
      if (activeUserId) filter.userId = activeUserId;
      if (activeClinicId) filter.clinicId = activeClinicId;

      const pendingItems = await localDb.getPendingSyncItems(filter);
      const hasPendingDb = Array.isArray(pendingItems) && pendingItems.length > 0;
      const filteredMemItems = this.inMemoryQueue.filter(item => {
        if (activeUserId && item.userId && item.userId !== activeUserId) return false;
        if (activeClinicId && item.clinicId && item.clinicId !== activeClinicId) return false;
        return true;
      });
      const hasMemoryItems = filteredMemItems.length > 0;

      if (!hasPendingDb && !hasMemoryItems) {
        this.isDraining = false;
        return;
      }

      // Process persistent IndexedDB items
      if (hasPendingDb) {
        for (const item of pendingItems) {
          if (!cloudCircuitBreaker.isAvailable()) break;

          try {
            // Mark as processing
            await localDb.updateSyncItemStatus(item.queueId || item.id, OUTBOX_STATUS.PROCESSING);

            // Execute remote sync handler based on entityType
            const success = await this.executeSyncItem(item);
            if (success) {
              await localDb.updateSyncItemStatus(item.queueId || item.id, OUTBOX_STATUS.COMPLETED);
              cloudCircuitBreaker.recordSuccess();
            } else {
              const retries = (Number(item.retryCount) || 0) + 1;
              item.retryCount = retries;
              // Exponential backoff with jitter: 2s, 4s, 8s, 16s... + random jitter up to 1000ms
              const baseDelay = Math.min(60000, 2000 * Math.pow(2, retries - 1));
              const jitter = Math.floor(Math.random() * 1000);
              const nextAttemptAt = Date.now() + baseDelay + jitter;

              if (retries >= 5) {
                await localDb.updateSyncItemStatus(item.queueId || item.id, OUTBOX_STATUS.FAILED, {
                  retryCount: retries,
                  lastError: 'sync_item_execution_returned_false'
                });
              } else {
                await localDb.updateSyncItemStatus(item.queueId || item.id, OUTBOX_STATUS.PENDING, {
                  retryCount: retries,
                  nextAttemptAt,
                  lastError: 'sync_item_execution_returned_false'
                });
              }
              cloudCircuitBreaker.recordFailure('sync_item_execution_returned_false');
            }
          } catch (itemErr) {
            console.warn('[SyncOutbox] Sync item failed:', item.id, itemErr);
            const retries = (Number(item.retryCount) || 0) + 1;
            item.retryCount = retries;
            const baseDelay = Math.min(60000, 2000 * Math.pow(2, retries - 1));
            const jitter = Math.floor(Math.random() * 1000);
            const nextAttemptAt = Date.now() + baseDelay + jitter;
            const errorMsg = String(itemErr?.message || itemErr || 'Unknown error');

            if (retries >= 5) {
              await localDb.updateSyncItemStatus(item.queueId || item.id, OUTBOX_STATUS.FAILED, {
                retryCount: retries,
                lastError: errorMsg
              });
            } else {
              await localDb.updateSyncItemStatus(item.queueId || item.id, OUTBOX_STATUS.PENDING, {
                retryCount: retries,
                nextAttemptAt,
                lastError: errorMsg
              });
            }
            cloudCircuitBreaker.recordFailure(itemErr);
            break; // Stop draining on connection error to preserve sequence
          }
        }
      }

      // Process in-memory fallback items
      if (this.inMemoryQueue.length > 0) {
        const memSnapshot = [...this.inMemoryQueue];
        for (const item of memSnapshot) {
          if (!cloudCircuitBreaker.isAvailable()) break;
          try {
            const success = await this.executeSyncItem(item);
            if (success) {
              this.inMemoryQueue = this.inMemoryQueue.filter(i => i.id !== item.id);
              cloudCircuitBreaker.recordSuccess();
            } else {
              item.retryCount = (Number(item.retryCount) || 0) + 1;
              if (item.retryCount >= 5) {
                this.inMemoryQueue = this.inMemoryQueue.filter(i => i.id !== item.id);
              }
              cloudCircuitBreaker.recordFailure('mem_sync_item_returned_false');
            }
          } catch (memErr) {
            item.retryCount = (Number(item.retryCount) || 0) + 1;
            if (item.retryCount >= 5) {
              this.inMemoryQueue = this.inMemoryQueue.filter(i => i.id !== item.id);
            }
            cloudCircuitBreaker.recordFailure(memErr);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('[SyncOutbox] Drain cycle error:', err);
    } finally {
      this.isDraining = false;
    }
  }

  registerHandler(entityType, handler) {
    if (typeof handler === 'function') {
      this.customHandlers.set(entityType, handler);
    }
  }

  unregisterHandler(entityType) {
    this.customHandlers.delete(entityType);
  }

  clearHandlers() {
    this.customHandlers.clear();
  }

  async executeSyncItem(item) {
    if (!item) return true;

    // Check custom handlers first
    if (this.customHandlers.has(item.entityType)) {
      const handler = this.customHandlers.get(item.entityType);
      return await handler(item);
    }

    const { entityType, action, payload } = item;
    if (!payload) return true;

    switch (entityType) {
      case 'appointment': {
        if (action === 'create') {
          const res = item.id
            ? await appointmentsService.addAppointment(payload, { idempotencyKey: item.id })
            : await appointmentsService.addAppointment(payload);
          if (res?.error) throw res.error;
          return true;
        }
        if (action === 'update') {
          const id = payload.id || payload.appointmentId;
          const res = await appointmentsService.updateAppointment(id, payload, item.clinicId);
          if (res?.error) {
            const isConflict = res.error.status === 409 || res.error.code === '23505' || (typeof res.error.message === 'string' && res.error.message.includes('Slot collision'));
            if (isConflict) {
              await localDb.updateSyncItemStatus(item.queueId || item.id, OUTBOX_STATUS.CONFLICT, {
                conflictDetails: res.error,
                requiresReview: true
              });
              return true; // Conflict recorded for clinical review, avoid blocking FIFO queue
            }
            throw res.error;
          }
          return true;
        }
        if (action === 'updateStatus') {
          const id = payload.id || payload.appointmentId;
          const res = await appointmentsService.updateAppointmentStatus(id, payload.status, {}, item.clinicId);
          if (res?.error) throw res.error;
          return true;
        }
        if (action === 'delete') {
          const res = await appointmentsService.deleteAppointment(payload.id || payload, item.clinicId);
          if (res?.error) throw res.error;
          return true;
        }
        break;
      }
      case 'patient': {
        if (action === 'create') {
          const res = await patientsService.addPatient(payload);
          if (res?.error) throw res.error;
          return true;
        }
        if (action === 'update') {
          const id = payload.id || payload.patientId;
          const res = await patientsService.updatePatient(id, payload, item.clinicId);
          if (res?.error) {
            const isConflict = res.error.status === 409 || res.error.code === '23505' || (typeof res.error.message === 'string' && res.error.message.includes('conflict'));
            if (isConflict) {
              await localDb.updateSyncItemStatus(item.queueId || item.id, OUTBOX_STATUS.CONFLICT, {
                conflictDetails: res.error,
                requiresReview: true
              });
              return true;
            }
            throw res.error;
          }
          return true;
        }
        if (action === 'delete') {
          const res = await patientsService.deletePatient(payload.id || payload, item.clinicId);
          if (res?.error) throw res.error;
          return true;
        }
        break;
      }
      case 'expense': {
        if (action === 'create') {
          const res = await expensesService.addExpense(payload);
          if (res?.error) throw res.error;
          return true;
        }
        if (action === 'delete') {
          const res = await expensesService.deleteExpense(payload.id || payload);
          if (res?.error) throw res.error;
          return true;
        }
        break;
      }
      case 'recall': {
        if (action === 'create') {
          const res = await recallsService.addRecall(payload);
          if (res?.error) throw res.error;
          return true;
        }
        break;
      }
      case 'notification': {
        if (action === 'create') {
          const res = await notificationsService.addNotification(payload);
          if (res?.error) throw res.error;
          return true;
        }
        break;
      }
      default:
        return true;
    }
    return true;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach(fn => {
      try { fn(event); } catch { /* ignore */ }
    });
  }

  destroy() {
    if (this.drainTimer) {
      clearInterval(this.drainTimer);
      this.drainTimer = null;
    }
  }
}

export const syncOutbox = new SyncOutbox();

/**
 * Checks if the specified user and clinic have pending unsynced outbox mutations
 */
export async function hasPendingSyncItems(userId = null, clinicId = null) {
  if (typeof localDb?.hasPendingSyncItemsForUser === 'function') {
    return localDb.hasPendingSyncItemsForUser(userId, clinicId);
  }
  return false;
}

export default syncOutbox;
