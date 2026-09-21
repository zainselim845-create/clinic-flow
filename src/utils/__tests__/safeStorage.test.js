import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeGetJSON,
  safeSetJSON,
  safeSessionGetItem,
  safeSessionSetItem,
  safeSessionRemoveItem,
  safeSessionGetJSON,
  safeSessionSetJSON
} from '../safeStorage';

describe('SafeStorage Utility', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = String(value); },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    global.window = {
      location: { pathname: '/test' }
    };
    global.localStorage = storageMock;
    global.sessionStorage = storageMock;
    global.window.localStorage = storageMock;
    global.window.sessionStorage = storageMock;
    vi.restoreAllMocks();
  });

  it('reads and writes raw strings to localStorage safely', () => {
    expect(safeGetItem('test_key')).toBeNull();
    expect(safeSetItem('test_key', 'hello_world')).toBe(true);
    expect(safeGetItem('test_key')).toBe('hello_world');
    expect(safeRemoveItem('test_key')).toBe(true);
    expect(safeGetItem('test_key')).toBeNull();
  });

  it('reads and writes JSON objects safely', () => {
    const data = { name: 'Dr. Test', quota: 500 };
    expect(safeSetJSON('test_json', data)).toBe(true);
    expect(safeGetJSON('test_json')).toEqual(data);
  });

  it('returns fallback gracefully when JSON parsing fails', () => {
    localStorage.setItem('corrupt_json', '{bad_json: true');
    const result = safeGetJSON('corrupt_json', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  it('handles localStorage throwing errors gracefully without crashing', () => {
    const originalSet = global.localStorage.setItem;
    global.localStorage.setItem = () => {
      const err = new Error('Quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    };

    const success = safeSetItem('overflow_key', 'large_payload');
    expect(success).toBe(false);
    global.localStorage.setItem = originalSet;
  });

  it('reads and writes to sessionStorage safely', () => {
    expect(safeSessionGetItem('sess_key')).toBeNull();
    expect(safeSessionSetItem('sess_key', 'session_val')).toBe(true);
    expect(safeSessionGetItem('sess_key')).toBe('session_val');
    expect(safeSessionSetJSON('sess_json', { id: 123 })).toBe(true);
    expect(safeSessionGetJSON('sess_json')).toEqual({ id: 123 });
    expect(safeSessionRemoveItem('sess_key')).toBe(true);
    expect(safeSessionGetItem('sess_key')).toBeNull();
  });
});
