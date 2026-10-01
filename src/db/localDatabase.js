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
      console.warn('[LocalDB] Database open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Generic helper for executing transactions
 */
async function performTransaction(storeName, mode, callback) {
  const db = await openLocalDatabase();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);

      if (request && typeof request === 'object' && 'onsuccess' in request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      }
    } catch (err) {
      reject(err);
    }
  });
}

export const localDb = {
  // --- Patients ---
  savePatient: async (patient) => {
    if (!patient || !patient.id) return null;
    return performTransaction('patients', 'readwrite', (store) => store.put(patient));
  },

  savePatientsBulk: async (patients) => {
    if (!Array.isArray(patients) || patients.length === 0) return true;
    const db = await openLocalDatabase();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('patients', 'readwrite');
        const store = tx.objectStore('patients');
        patients.forEach(p => {
          if (p && p.id) store.put(p);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
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
      if (!clinicId) return resolve([]);

      const request = store.indexNames && store.indexNames.contains('by_clinic')
        ? store.index('by_clinic').getAll(clinicId)
        : store.getAll();

      request.onsuccess = () => {
        const result = request.result || [];
        resolve(store.indexNames && store.indexNames.contains('by_clinic')
          ? result
          : result.filter(p => p.clinicId === clinicId)
        );
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

  getAppointment: async (id) => {
    return performTransaction('appointments', 'readonly', (store) => store.get(id));
  },

  deleteAppointment: async (id) => {
    return performTransaction('appointments', 'readwrite', (store) => store.delete(id));
  },

  saveAppointmentsBulk: async (appointments) => {
    if (!Array.isArray(appointments) || appointments.length === 0) return true;
    const db = await openLocalDatabase();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('appointments', 'readwrite');
        const store = tx.objectStore('appointments');
        appointments.forEach(a => {
          if (a && a.id) store.put(a);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  getAllAppointments: async (clinicId) => {
    const db = await openLocalDatabase();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('appointments', 'readonly');
      const store = transaction.objectStore('appointments');
      if (!clinicId) return resolve([]);

      const request = store.indexNames && store.indexNames.contains('by_clinic')
        ? store.index('by_clinic').getAll(clinicId)
        : store.getAll();

      request.onsuccess = () => {
        const result = request.result || [];
        resolve(store.indexNames && store.indexNames.contains('by_clinic')
          ? result
          : result.filter(a => a.clinicId === clinicId)
        );
      };
      request.onerror = () => reject(request.error);
    });
  },

  // --- Invoices ---
  saveInvoice: async (invoice) => {
    if (!invoice || !invoice.id) return null;
    return performTransaction('invoices', 'readwrite', (store) => store.put(invoice));
  },

  getInvoice: async (id) => {
    return performTransaction('invoices', 'readonly', (store) => store.get(id));
  },

  deleteInvoice: async (id) => {
    return performTransaction('invoices', 'readwrite', (store) => store.delete(id));
  },

  getAllInvoices: async (clinicId) => {
    const db = await openLocalDatabase();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('invoices', 'readonly');
      const store = transaction.objectStore('invoices');
      if (!clinicId) return resolve([]);

      const request = store.indexNames && store.indexNames.contains('by_clinic')
        ? store.index('by_clinic').getAll(clinicId)
        : store.getAll();

      request.onsuccess = () => {
        const result = request.result || [];
        resolve(store.indexNames && store.indexNames.contains('by_clinic')
          ? result
          : result.filter(inv => inv.clinicId === clinicId)
        );
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
      timestamp: new Date().toISOString()
    };
    return performTransaction('sync_queue', 'readwrite', (store) => store.add(action));
  },

  getPendingSyncActions: async () => {
    const db = await openLocalDatabase();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.indexNames && store.indexNames.contains('by_status')
        ? store.index('by_status').getAll('pending')
        : store.getAll();

      request.onsuccess = () => {
        const all = request.result || [];
        resolve(store.indexNames && store.indexNames.contains('by_status')
          ? all
          : all.filter(item => item.status === 'pending')
        );
      };
      request.onerror = () => reject(request.error);
    });
  },

  markActionSynced: async (queueId) => {
    return performTransaction('sync_queue', 'readwrite', (store) => store.delete(queueId));
  },

  enqueueSyncItem: async (item) => {
    return performTransaction('sync_queue', 'readwrite', (store) => store.add(item));
  },

  getPendingSyncItems: async () => {
    const db = await openLocalDatabase();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.indexNames && store.indexNames.contains('by_status')
        ? store.index('by_status').getAll('pending')
        : store.getAll();

      request.onsuccess = () => {
        const all = request.result || [];
        resolve(store.indexNames && store.indexNames.contains('by_status')
          ? all
          : all.filter(item => item.status === 'pending')
        );
      };
      request.onerror = () => reject(request.error);
    });
  },

  updateSyncItemStatus: async (queueId, status) => {
    if (status === 'completed') {
      return performTransaction('sync_queue', 'readwrite', (store) => store.delete(queueId));
    }
    const db = await openLocalDatabase();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const getReq = store.get(queueId);
      getReq.onsuccess = () => {
        const row = getReq.result;
        if (row) {
          row.status = status;
          store.put(row);
        }
        resolve(true);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }
};
