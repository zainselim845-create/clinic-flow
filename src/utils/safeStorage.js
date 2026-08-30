const memoryStore = new Map();

export const safeStorage = {
  getItem: (key, defaultValue = null) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        if (val === null || val === undefined) return defaultValue;
        if (defaultValue !== null && typeof defaultValue === 'object') {
          try {
            const parsed = JSON.parse(val);
            return parsed ?? defaultValue;
          } catch {
            return defaultValue;
          }
        }
        return val;
      } catch {
        return memoryStore.get(key) ?? defaultValue;
      }
    }
    return memoryStore.get(key) ?? defaultValue;
  },
  setItem: (key, value) => {
    const stringVal = (value !== null && typeof value === 'object') 
      ? JSON.stringify(value) 
      : String(value);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, stringVal);
        return;
      } catch {
        // fallback to memoryStore
      }
    }
    memoryStore.set(key, stringVal);
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
        return;
      } catch {
        // fallback
      }
    }
    memoryStore.delete(key);
  },
  clear: () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
        return;
      } catch {
        // fallback
      }
    }
    memoryStore.clear();
  }
};
