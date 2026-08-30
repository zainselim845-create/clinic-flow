import { cleanEgyptianPhone } from '../utils/phoneValidation';

/**
 * High-performance In-Memory Index for 100,000+ Records
 * Provides O(1) phone lookups and fast prefix matching
 */
export class PatientIndexEngine {
  constructor() {
    this.phoneMap = new Map(); // normalizedPhone -> Patient
    this.idMap = new Map();    // patientId -> Patient
    this.isIndexed = false;
    this.patientCount = 0;
  }

  /**
   * Build index from a list of patients (e.g. 100k items)
   */
  buildIndex(patients = []) {
    this.phoneMap.clear();
    this.idMap.clear();

    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      if (!p) continue;

      if (p.id) {
        this.idMap.set(String(p.id), p);
      }

      if (p.phone) {
        const clean = cleanEgyptianPhone(p.phone);
        if (clean) {
          this.phoneMap.set(clean, p);
          // Also index last 9 digits to match without leading zero
          if (clean.length === 11 && clean.startsWith('0')) {
            this.phoneMap.set(clean.substring(1), p);
          }
        }
      }
    }

    this.patientCount = patients.length;
    this.isIndexed = true;
    return this;
  }

  /**
   * O(1) Instantaneous Phone Lookup
   */
  findByPhone(phoneInput) {
    if (!phoneInput) return null;
    const clean = cleanEgyptianPhone(phoneInput);
    if (this.phoneMap.has(clean)) {
      return this.phoneMap.get(clean);
    }
    // Try without leading 0 if 10 digits
    const digitsOnly = String(phoneInput).replace(/\\D/g, '');
    if (this.phoneMap.has(digitsOnly)) {
      return this.phoneMap.get(digitsOnly);
    }
    return null;
  }

  /**
   * Fast paginated search across in-memory records
   */
  search(query = '', page = 1, pageSize = 25, allPatients = []) {
    const q = (query || '').trim().toLowerCase();
    const source = allPatients.length > 0 ? allPatients : Array.from(this.idMap.values());

    if (!q) {
      const start = (page - 1) * pageSize;
      return {
        total: source.length,
        page,
        pageSize,
        totalPages: Math.ceil(source.length / pageSize) || 1,
        items: source.slice(start, start + pageSize)
      };
    }

    // Filter matching items
    const matches = [];
    for (let i = 0; i < source.length; i++) {
      const p = source[i];
      if (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(q))
      ) {
        matches.push(p);
      }
    }

    const start = (page - 1) * pageSize;
    return {
      total: matches.length,
      page,
      pageSize,
      totalPages: Math.ceil(matches.length / pageSize) || 1,
      items: matches.slice(start, start + pageSize)
    };
  }
}

// Global Singleton Index
export const patientIndex = new PatientIndexEngine();

/**
 * Debounce helper to prevent UI lag on rapid search input
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
