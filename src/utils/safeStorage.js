const memoryStore = new Map();

function parseStoredValue(val, defaultValue) {
  if (val === null || val === undefined) return defaultValue;
  if (defaultValue !== null && typeof defaultValue === 'object') {
    if (typeof val !== 'string') return val;
    try {
      const parsed = JSON.parse(val);
      return parsed !== null && parsed !== undefined ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  return val;
}

export const safeStorage = {
  getItem: (key, defaultValue = null) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
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

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, stringVal);
      } catch {
        // Keep memoryStore value as fallback
      }
    }
  },

  removeItem: (key) => {
    memoryStore.delete(key);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignored
      }
    }
  },

  clear: () => {
    memoryStore.clear();
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
      } catch {
        // Ignored
      }
    }
  }
};

