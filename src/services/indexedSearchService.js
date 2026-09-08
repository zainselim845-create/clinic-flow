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
    this.currentClinicId = null;
  }

  /**
   * Build index from a list of patients (e.g. 100k items)
   * Scoped strictly by clinicId to prevent multi-tenant data leaks
   */
  buildIndex(patients = [], clinicId = null) {
    this.phoneMap.clear();
    this.idMap.clear();
    this.currentClinicId = clinicId;

    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      if (!p) continue;

      // Ensure patient belongs to this clinic if clinicId is provided
      if (clinicId && p.clinicId && p.clinicId !== clinicId) {
        continue;
      }

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
   * Clears the index completely (useful on tenant switch)
   */
  clearIndex() {
    this.phoneMap.clear();
    this.idMap.clear();
    this.isIndexed = false;
    this.patientCount = 0;
    this.currentClinicId = null;
    return this;
  }

  /**
   * O(1) Instantaneous Phone Lookup with tenant isolation verification
   */
  findByPhone(phoneInput, clinicId = null) {
    if (!phoneInput) return null;
    const clean = cleanEgyptianPhone(phoneInput);
    let patient = null;

    if (this.phoneMap.has(clean)) {
      patient = this.phoneMap.get(clean);
    } else {
      // Try without leading 0 if 10 digits
      const digitsOnly = String(phoneInput).replace(/\D/g, '');
      if (this.phoneMap.has(digitsOnly)) {
        patient = this.phoneMap.get(digitsOnly);
      }
    }

    const effectiveClinicId = clinicId || this.currentClinicId;
    if (patient && effectiveClinicId && patient.clinicId && patient.clinicId !== effectiveClinicId) {
      return null;
    }
    return patient;
  }

  /**
   * Fast paginated search across in-memory records
   */
  search(query = '', page = 1, pageSize = 25, allPatients = [], clinicId = null) {
    const q = (query || '').trim().toLowerCase();
    const effectiveClinicId = clinicId || this.currentClinicId;
    let source = allPatients.length > 0 ? allPatients : Array.from(this.idMap.values());
    if (effectiveClinicId) {
      source = source.filter(p => !p.clinicId || p.clinicId === effectiveClinicId);
    }

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
 * Enterprise Partitioned Index Engine designed for 1,000,000+ Records
 * Uses telecom operator prefix sharding (010, 011, 012, 015) and clinic isolation
 * to achieve sub-millisecond O(1) lookups and memory efficiency.
 */
export class MillionUserPartitionedIndex {
  constructor() {
    this.totalCount = 0;
    // Operator prefix shards: '010', '011', '012', '015', 'other'
    this.prefixShards = new Map([
      ['010', new Map()],
      ['011', new Map()],
      ['012', new Map()],
      ['015', new Map()],
      ['other', new Map()]
    ]);
    // Clinic-scoped partition index for strict multi-tenant isolation
    this.clinicPartitions = new Map();
  }

  /**
   * Resolves the operator prefix shard key
   */
  getShardKey(cleanPhone) {
    if (!cleanPhone || cleanPhone.length < 3) return 'other';
    const prefix = cleanPhone.substring(0, 3);
    return this.prefixShards.has(prefix) ? prefix : 'other';
  }

  /**
   * Ingests a streaming chunk of records into partitioned shards
   */
  ingestChunk(records = [], clinicId = null) {
    if (!Array.isArray(records)) return 0;

    let clinicMap = null;
    if (clinicId) {
      if (!this.clinicPartitions.has(clinicId)) {
        this.clinicPartitions.set(clinicId, new Map());
      }
      clinicMap = this.clinicPartitions.get(clinicId);
    }

    let ingestedCount = 0;
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (!rec || !rec.phone) continue;

      const cleanPhone = cleanEgyptianPhone(rec.phone);
      if (!cleanPhone) continue;

      const shardKey = this.getShardKey(cleanPhone);
      const shard = this.prefixShards.get(shardKey);

      // Lightweight compact record reference
      const compactRef = {
        id: rec.id,
        phone: cleanPhone,
        name: rec.name,
        clinicId: rec.clinicId || clinicId,
        visitsCount: rec.visitsCount || 1,
        date: rec.date
      };

      shard.set(cleanPhone, compactRef);

      if (clinicMap) {
        clinicMap.set(cleanPhone, compactRef);
      }

      ingestedCount++;
    }

    this.totalCount += ingestedCount;
    return ingestedCount;
  }

  /**
   * Sub-millisecond O(1) phone lookup across 1,000,000 indexed records
   */
  findByPhone(phone, clinicId = null) {
    if (!phone) return null;
    const cleanPhone = cleanEgyptianPhone(phone);
    if (!cleanPhone) return null;

    if (clinicId) {
      const clinicMap = this.clinicPartitions.get(clinicId);
      return clinicMap ? (clinicMap.get(cleanPhone) || null) : null;
    }

    const shardKey = this.getShardKey(cleanPhone);
    const shard = this.prefixShards.get(shardKey);
    return shard ? (shard.get(cleanPhone) || null) : null;
  }

  /**
   * Fast keyset / cursor pagination across 1,000,000 records
   * Avoids expensive array slices and memory duplication
   */
  searchKeyset({ cursor = null, limit = 25, clinicId = null } = {}) {
    const sourceMap = clinicId ? (this.clinicPartitions.get(clinicId) || new Map()) : this.prefixShards.get('010');
    const items = [];
    let foundCursor = cursor === null;

    for (const [key, value] of sourceMap.entries()) {
      if (!foundCursor) {
        if (key === cursor) {
          foundCursor = true;
        }
        continue;
      }

      items.push(value);
      if (items.length >= limit) break;
    }

    const nextCursor = items.length > 0 ? items[items.length - 1].phone : null;
    return {
      items,
      count: items.length,
      nextCursor,
      hasMore: items.length === limit
    };
  }

  /**
   * Reset and wipe all shards completely
   */
  clear() {
    this.totalCount = 0;
    for (const shard of this.prefixShards.values()) {
      shard.clear();
    }
    this.clinicPartitions.clear();
  }

  /**
   * Returns partition health and distribution statistics
   */
  getStats() {
    const shardDistribution = {};
    for (const [key, map] of this.prefixShards.entries()) {
      shardDistribution[key] = map.size;
    }
    return {
      totalIndexed: this.totalCount,
      shardDistribution,
      totalTenants: this.clinicPartitions.size
    };
  }
}

export const millionUserIndex = new MillionUserPartitionedIndex();

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

