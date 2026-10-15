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

// In-memory fallback dictionary for Node.js test runners, SSR, or environments without indexedDB
const memoryFallback = {
  patients: new Map(),
  appointments: new Map(),
  invoices: new Map(),
  sync_queue: []
};
let syncQueueAutoId = 1;

/**
 * Generic helper for executing transactions
 */
async function performTransaction(storeName, mode, callback) {
  const db = await openLocalDatabase();
  if (!db) {
    const mockStore = {
      get: (id) => ({ result: memoryFallback[storeName]?.get?.(id) || null }),
      put: (item) => {
        if (memoryFallback[storeName]?.set && item?.id) memoryFallback[storeName].set(item.id, item);
        return { result: true };
      },
      add: (item) => {
        if (storeName === 'sync_queue') {
          const qItem = { ...item, queueId: item.queueId || syncQueueAutoId++ };
          if (item && typeof item === 'object') item.queueId = qItem.queueId;
          memoryFallback.sync_queue.push(qItem);
          return { result: true };
        }
        if (memoryFallback[storeName]?.set && item?.id) memoryFallback[storeName].set(item.id, item);
        return { result: true };
      },
      delete: (id) => {
        if (memoryFallback[storeName]?.delete) memoryFallback[storeName].delete(id);
        if (storeName === 'sync_queue') {
          memoryFallback.sync_queue = memoryFallback.sync_queue.filter(i => i.queueId !== id && i.id !== id);
        }
        return { result: true };
      }
    };
    try {
      const res = callback(mockStore);
      return res?.result !== undefined ? res.result : true;
    } catch {
      return null;
    }
  }

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

  getPendingSyncItems: async (filter = {}) => {
    const { userId = null, clinicId = null } = (typeof filter === 'object' && filter !== null) ? filter : {};
    const db = await openLocalDatabase();
    if (!db) {
      const now = Date.now();
      const pending = memoryFallback.sync_queue.filter(item => {
        if (item.status !== 'pending') return false;
        if (item.nextAttemptAt && item.nextAttemptAt > now) return false;
        if (userId && item.userId && item.userId !== userId) return false;
        if (clinicId && item.clinicId && item.clinicId !== clinicId) return false;
        return true;
      });
      pending.sort((a, b) => {
        const timeDiff = (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0);
        if (timeDiff !== 0) return timeDiff;
        return (Number(a.sequence) || 0) - (Number(b.sequence) || 0);
      });
      return pending;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.indexNames && store.indexNames.contains('by_status')
        ? store.index('by_status').getAll('pending')
        : store.getAll();

      request.onsuccess = () => {
        const all = request.result || [];
        const now = Date.now();
        const pending = all.filter(item => {
          if (item.status !== 'pending') return false;
          // Honor nextAttemptAt backoff delay
          if (item.nextAttemptAt && item.nextAttemptAt > now) return false;
          if (userId && item.userId && item.userId !== userId) return false;
          if (clinicId && item.clinicId && item.clinicId !== clinicId) return false;
          return true;
        });
        // Enforce strict deterministic FIFO chronological order
        pending.sort((a, b) => {
          const timeDiff = (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0);
          if (timeDiff !== 0) return timeDiff;
          return (Number(a.sequence) || 0) - (Number(b.sequence) || 0);
        });
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  },

  hasPendingSyncItemsForUser: async (userId, clinicId = null) => {
    const db = await openLocalDatabase();
    if (!db) {
      return memoryFallback.sync_queue.some(i => {
        const matchesUser = !userId || !i.userId || i.userId === userId;
        const matchesClinic = !clinicId || !i.clinicId || i.clinicId === clinicId;
        const isPending = i.status === 'pending' || i.status === 'processing';
        return matchesUser && matchesClinic && isPending;
      });
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.getAll();
        req.onsuccess = () => {
          const items = req.result || [];
          const hasPending = items.some(i => {
            const matchesUser = !userId || !i.userId || i.userId === userId;
            const matchesClinic = !clinicId || !i.clinicId || i.clinicId === clinicId;
            const isPending = i.status === 'pending' || i.status === 'processing';
            return matchesUser && matchesClinic && isPending;
          });
          resolve(hasPending);
        };
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  },

  updateSyncItemStatus: async (queueIdOrId, status, extraFields = {}) => {
    const db = await openLocalDatabase();
    if (!db) {
      if (status === 'completed') {
        memoryFallback.sync_queue = memoryFallback.sync_queue.filter(i => i.id !== queueIdOrId && i.queueId !== queueIdOrId);
        return true;
      }
      const match = memoryFallback.sync_queue.find(i => i.queueId === queueIdOrId || i.id === queueIdOrId);
      if (match) {
        match.status = status;
        if (extraFields && typeof extraFields === 'object') {
          Object.assign(match, extraFields);
        }
      }
      return true;
    }

    if (status === 'completed') {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('sync_queue', 'readwrite');
        const store = transaction.objectStore('sync_queue');
        if (typeof queueIdOrId === 'number') {
          store.delete(queueIdOrId);
        } else {
          const req = store.getAll();
          req.onsuccess = () => {
            const match = (req.result || []).find(i => i.id === queueIdOrId || i.queueId === queueIdOrId);
            if (match && match.queueId) store.delete(match.queueId);
          };
        }
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => {
        const match = (req.result || []).find(i => i.queueId === queueIdOrId || i.id === queueIdOrId);
        if (match) {
          match.status = status;
          if (extraFields && typeof extraFields === 'object') {
            Object.assign(match, extraFields);
          }
          store.put(match);
        }
      };
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  },

  recoverStuckProcessingItems: async () => {
    const db = await openLocalDatabase();
    if (!db) {
      let count = 0;
      memoryFallback.sync_queue.forEach(item => {
        if (item.status === 'processing') {
          item.status = 'pending';
          count++;
        }
      });
      return count;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const req = store.getAll();
      let count = 0;
      req.onsuccess = () => {
        const items = req.result || [];
        items.forEach(item => {
          if (item.status === 'processing') {
            item.status = 'pending';
            store.put(item);
            count++;
          }
        });
      };
      transaction.oncomplete = () => resolve(count);
      transaction.onerror = () => reject(transaction.error);
    });
  },

  getPendingSyncCount: async () => {
    const db = await openLocalDatabase();
    if (!db) {
      return memoryFallback.sync_queue.filter(i => i.status === 'pending' || i.status === 'processing').length;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result || []).filter(i => i.status === 'pending' || i.status === 'processing');
          resolve(items.length);
        };
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  },

  // --- Multi-Tenant Isolation & Session Cleansing ---
  clearTenantData: async (clinicId) => {
    if (!clinicId) return true;
    const db = await openLocalDatabase();
    if (!db) return true;

    const stores = ['patients', 'appointments', 'invoices'];
    return Promise.all(stores.map(storeName => {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => {
            const items = req.result || [];
            items.forEach(item => {
              if (item.clinicId === clinicId) {
                store.delete(item.id);
              }
            });
            resolve(true);
          };
          req.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }));
  },

  clearAllData: async (options = { preserveSyncQueue: true }) => {
    const db = await openLocalDatabase();
    if (!db) {
      memoryFallback.patients.clear();
      memoryFallback.appointments.clear();
      memoryFallback.invoices.clear();
      if (!options?.preserveSyncQueue) {
        memoryFallback.sync_queue = [];
      }
      return true;
    }

    const stores = ['patients', 'appointments', 'invoices'];
    if (!options?.preserveSyncQueue) {
      stores.push('sync_queue');
    }
    return Promise.all(stores.map(storeName => {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.clear();
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }));
  }
};
