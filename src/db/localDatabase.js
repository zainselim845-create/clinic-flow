/**
 * ClinicFlow Local Database Engine (IndexedDB)
 * High-capacity offline-first storage exceeding the 5MB localStorage limit.
 * Stores Patients, Appointments, Invoices, and an offline Sync Queue.
 */

const DB_NAME = 'ClinicFlow_LocalDB';
const DB_VERSION = 1;

let dbPromise = null;

export function openLocalDatabase() {
  if (dbPromise) return dbPromise;

  if (typeof window === 'undefined' || !window.indexedDB) {
    // Fallback for SSR / headless / testing environments without indexedDB
    return Promise.resolve(null);
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Patients Store
      if (!db.objectStoreNames.contains('patients')) {
        const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
        patientsStore.createIndex('by_clinic', 'clinicId', { unique: false });
        patientsStore.createIndex('by_phone', 'phone', { unique: false });
      }

      // 2. Appointments Store
      if (!db.objectStoreNames.contains('appointments')) {
        const apptsStore = db.createObjectStore('appointments', { keyPath: 'id' });
        apptsStore.createIndex('by_clinic', 'clinicId', { unique: false });
        apptsStore.createIndex('by_date', 'date', { unique: false });
        apptsStore.createIndex('by_status', 'status', { unique: false });
      }

      // 3. Invoices Store
      if (!db.objectStoreNames.contains('invoices')) {
        const invStore = db.createObjectStore('invoices', { keyPath: 'id' });
        invStore.createIndex('by_clinic', 'clinicId', { unique: false });
        invStore.createIndex('by_patient', 'patientId', { unique: false });
      }

      // 4. Offline Sync Queue Store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'queueId', autoIncrement: true });
        syncStore.createIndex('by_status', 'status', { unique: false });
        syncStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB opening error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Generic helper to perform an IndexedDB transaction
 */
async function performTransaction(storeName, mode, callback) {
  const db = await openLocalDatabase();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);

      transaction.oncomplete = () => {
        resolve(request ? request.result : true);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================================
// Public Database API
// ============================================================================

export const localDb = {
  // --- Patients ---
  savePatient: async (patient) => {
    if (!patient || !patient.id) return null;
    return performTransaction('patients', 'readwrite', (store) => store.put(patient));
  },

  getPatient: async (id) => {
    return performTransaction('patients', 'readonly', (store) => store.get(id));
  },

  getAllPatients: async (clinicId) => {
    const db = await openLocalDatabase();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('patients', 'readonly');
      const store = transaction.objectStore('patients');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result || [];
        if (!clinicId) return resolve([]);
        resolve(all.filter(p => p.clinicId === clinicId));
      };
      request.onerror = () => reject(request.error);
    });
  },

  deletePatient: async (id) => {
    return performTransaction('patients', 'readwrite', (store) => store.delete(id));
  },

  // --- Appointments ---
  saveAppointment: async (appointment) => {
    if (!appointment || !appointment.id) return null;
    return performTransaction('appointments', 'readwrite', (store) => store.put(appointment));
  },

  getAllAppointments: async (clinicId) => {
    const db = await openLocalDatabase();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('appointments', 'readonly');
      const store = transaction.objectStore('appointments');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result || [];
        if (!clinicId) return resolve([]);
        resolve(all.filter(a => a.clinicId === clinicId));
      };
      request.onerror = () => reject(request.error);
    });
  },

  // --- Offline Sync Queue ---
  enqueueSyncAction: async (actionType, payload, clinicId) => {
    const action = {
      actionType,
      payload,
      clinicId,
      status: 'pending',
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    return performTransaction('sync_queue', 'readwrite', (store) => store.add(action));
  },

  getPendingSyncActions: async () => {
    const db = await openLocalDatabase();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result || [];
        resolve(all.filter(item => item.status === 'pending'));
      };
      request.onerror = () => reject(request.error);
    });
  },

  markActionSynced: async (queueId) => {
    return performTransaction('sync_queue', 'readwrite', (store) => store.delete(queueId));
  }
};
