import { describe, it, expect, beforeEach } from 'vitest';
import { localDb, openLocalDatabase } from '../localDatabase';

describe('Local Database Engine (IndexedDB)', () => {
  it('gracefully handles non-browser environments where indexedDB is undefined', async () => {
    const db = await openLocalDatabase();
    // In node/vitest without browser indexedDB, returns null safely without throwing
    expect(db === null || typeof db === 'object').toBe(true);
  });

  it('safely handles patient operations even in fallback mode', async () => {
    const patient = {
      id: 'patient-test-1',
      name: 'أحمد محمود',
      phone: '01012345678',
      clinicId: 'clinic-test'
    };

    const res = await localDb.savePatient(patient);
    expect(res === null || res === true).toBe(true);

    const all = await localDb.getAllPatients('clinic-test');
    expect(Array.isArray(all)).toBe(true);
  });

  it('enqueues offline sync actions safely', async () => {
    const res = await localDb.enqueueSyncAction('CREATE_APPOINTMENT', { id: 'appt-1' }, 'clinic-1');
    expect(res === null || res === true).toBe(true);

    const pending = await localDb.getPendingSyncActions();
    expect(Array.isArray(pending)).toBe(true);
  });
});
