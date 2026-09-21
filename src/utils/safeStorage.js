/**
 * Safe Web Storage Utility (safeStorage)
 * Provides fault-tolerant, zero-silent-failure wrappers for localStorage and sessionStorage.
 * Gracefully handles QuotaExceededError, SSR/Window unavailability, and JSON parsing errors
 * while logging structured diagnostics to the central error telemetry service.
 */

import { captureSystemError } from '../services/systemErrorService';

const memoryStore = new Map();
const sessionMemoryStore = new Map();

function parseStoredValue(val, defaultValue) {
  if (val === null || val === undefined) return defaultValue;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const shouldTryJson = (defaultValue !== null && typeof defaultValue === 'object') ||
      (defaultValue === null && (trimmed.startsWith('{') || trimmed.startsWith('[')));

    if (shouldTryJson) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed !== null && parsed !== undefined ? parsed : defaultValue;
      } catch (err) {
        console.warn('[SafeStorage] JSON parse fallback:', err);
        return defaultValue !== null ? defaultValue : val;
      }
    }
  }
  return val;
}

function getGlobalStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (err) {
    console.warn('[SafeStorage] Failed to access localStorage:', err);
    return null;
  }
  return null;
}

function getGlobalSessionStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
    if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) return globalThis.sessionStorage;
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch (err) {
    console.warn('[SafeStorage] Failed to access sessionStorage:', err);
    return null;
  }
  return null;
}

export const safeStorage = {
  getItem: (key, defaultValue = null) => {
    const storage = getGlobalStorage();
    if (storage) {
      try {
        const val = storage.getItem(key);
        if (val !== null && val !== undefined) {
          return parseStoredValue(val, defaultValue);
        }
      } catch (err) {
        console.warn(`[SafeStorage] Failed to read "${key}" from storage:`, err);
        captureSystemError({
          type: 'storage_read_failure',
          message: `Failed to read localStorage key: ${key}`,
          severity: 'low',
          context: { key, error: err?.message }
        });
      }
    }
    const memVal = memoryStore.get(key);
    return parseStoredValue(memVal, defaultValue);
  },

  setItem: (key, value) => {
    if (value === undefined) {
      safeStorage.removeItem(key);
      return false;
    }
    const stringVal = (value !== null && typeof value === 'object') 
      ? JSON.stringify(value) 
      : String(value);

    memoryStore.set(key, stringVal);

    const storage = getGlobalStorage();
    if (storage) {
      try {
        storage.setItem(key, stringVal);
        return true;
      } catch (err) {
        const isQuota = err?.name === 'QuotaExceededError' || err?.code === 22 || err?.number === -2147024882;
        console.warn(`[SafeStorage] Failed to write "${key}" to storage (${isQuota ? 'Quota Exceeded' : 'Error'}):`, err);
        captureSystemError({
          type: isQuota ? 'storage_quota_exceeded' : 'storage_write_failure',
          message: `Failed to write localStorage key: ${key}`,
          severity: isQuota ? 'high' : 'medium',
          context: { key, isQuota, error: err?.message }
        });
        return false;
      }
    }
    return true;
  },

  removeItem: (key) => {
    memoryStore.delete(key);
    const storage = getGlobalStorage();
    if (storage) {
      try {
        storage.removeItem(key);
        return true;
      } catch (err) {
        console.warn(`[SafeStorage] Failed to remove "${key}" from storage:`, err);
        captureSystemError({
          type: 'storage_remove_failure',
          message: `Failed to remove localStorage key: ${key}`,
          severity: 'low',
          context: { key, error: err?.message }
        });
        return false;
      }
    }
    return true;
  },

  clear: () => {
    memoryStore.clear();
    const storage = getGlobalStorage();
    if (storage) {
      try {
        storage.clear();
        return true;
      } catch (err) {
        console.warn('[SafeStorage] Failed to clear storage:', err);
        return false;
      }
    }
    return true;
  }
};

/**
 * Safely get a raw string or value item from localStorage
 */
export function safeGetItem(key, fallback = null) {
  const res = safeStorage.getItem(key, fallback);
  return res !== null && res !== undefined ? res : fallback;
}

/**
 * Safely parse and retrieve a JSON item from localStorage
 */
export function safeGetJSON(key, fallback = null) {
  const res = safeStorage.getItem(key, fallback);
  if (res === null || res === undefined) return fallback;
  if (typeof res === 'object') return res;
  try {
    return JSON.parse(res);
  } catch (err) {
    console.warn(`[SafeStorage] Failed to parse JSON for key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safely set a raw string or serializable item in localStorage
 */
export function safeSetItem(key, value) {
  return safeStorage.setItem(key, value);
}

/**
 * Safely serialize and store a JSON item in localStorage
 */
export function safeSetJSON(key, value) {
  return safeStorage.setItem(key, value);
}

/**
 * Safely remove an item from localStorage
 */
export function safeRemoveItem(key) {
  return safeStorage.removeItem(key);
}

/**
 * Safely get a raw string item from sessionStorage
 */
export function safeSessionGetItem(key, fallback = null) {
  const storage = getGlobalSessionStorage();
  if (storage) {
    try {
      const val = storage.getItem(key);
      return val !== null ? val : fallback;
    } catch (err) {
      console.warn(`[SafeStorage] Failed to read sessionStorage key "${key}":`, err);
    }
  }
  const memVal = sessionMemoryStore.get(key);
  return memVal !== undefined ? memVal : fallback;
}

/**
 * Safely parse and retrieve a JSON item from sessionStorage
 */
export function safeSessionGetJSON(key, fallback = null) {
  const raw = safeSessionGetItem(key, null);
  if (raw === null) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[SafeStorage] Failed to parse JSON for sessionStorage key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safely set a raw string item in sessionStorage
 */
export function safeSessionSetItem(key, value) {
  const stringVal = (value !== null && typeof value === 'object') ? JSON.stringify(value) : String(value);
  sessionMemoryStore.set(key, stringVal);
  const storage = getGlobalSessionStorage();
  if (storage) {
    try {
      storage.setItem(key, stringVal);
      return true;
    } catch (err) {
      console.warn(`[SafeStorage] Failed to write sessionStorage key "${key}":`, err);
      return false;
    }
  }
  return true;
}

/**
 * Safely serialize and store a JSON item in sessionStorage
 */
export function safeSessionSetJSON(key, value) {
  return safeSessionSetItem(key, value);
}

/**
 * Safely remove an item from sessionStorage
 */
export function safeSessionRemoveItem(key) {
  sessionMemoryStore.delete(key);
  const storage = getGlobalSessionStorage();
  if (storage) {
    try {
      storage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[SafeStorage] Failed to remove sessionStorage key "${key}":`, err);
      return false;
    }
  }
  return true;
}

export default safeStorage;
