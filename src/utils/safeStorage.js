const memoryStore = new Map();

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
      } catch {
        return defaultValue;
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
  } catch {
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
      } catch {
        // Fall through to memoryStore
      }
    }
    const memVal = memoryStore.get(key);
    return parseStoredValue(memVal, defaultValue);
  },

  setItem: (key, value) => {
    if (value === undefined) {
      safeStorage.removeItem(key);
      return;
    }
    const stringVal = (value !== null && typeof value === 'object') 
      ? JSON.stringify(value) 
      : String(value);

    memoryStore.set(key, stringVal);

    const storage = getGlobalStorage();
    if (storage) {
      try {
        storage.setItem(key, stringVal);
      } catch {
        // Keep memoryStore value as fallback
      }
    }
  },

  removeItem: (key) => {
    memoryStore.delete(key);
    const storage = getGlobalStorage();
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignored
      }
    }
  },

  clear: () => {
    memoryStore.clear();
    const storage = getGlobalStorage();
    if (storage) {
      try {
        storage.clear();
      } catch {
        // Ignored
      }
    }
  }
};

