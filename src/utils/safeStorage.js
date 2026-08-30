const memoryStore = new Map();

export const safeStorage = {
  getItem: (key) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch {
        return memoryStore.get(key) || null;
      }
    }
    return memoryStore.get(key) || null;
  },
  setItem: (key, value) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        // fallback
      }
    }
    memoryStore.set(key, String(value));
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
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
      } catch {
        // fallback
      }
    }
    memoryStore.clear();
  }
};
