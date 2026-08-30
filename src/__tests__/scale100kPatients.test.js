import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientIndexEngine, debounce } from '../services/indexedSearchService';
import { getPatientsPaginated } from '../services/patientsService';
import * as supabaseLib from '../lib/supabase';

describe('Scale 100,000 Patients Stress & Architecture Suite (test-guard compliant)', () => {
  let engine;

  beforeEach(() => {
    engine = new PatientIndexEngine();
  });

  it('builds index of 100,000 synthetic patient records and performs O(1) lookup in under 5ms', () => {
    // Generate 100,000 realistic patient records
    const TOTAL_RECORDS = 100000;
    const syntheticPatients = new Array(TOTAL_RECORDS);

    for (let i = 0; i < TOTAL_RECORDS; i++) {
      // Pad to valid 11-digit Egyptian phone (01000000000 to 01099999999)
      const phoneSuffix = String(i).padStart(8, '0');
      syntheticPatients[i] = {
        id: `p_100k_${i}`,
        name: `مريض تجريبي رقم ${i}`,
        phone: `010${phoneSuffix}`,
        age: '32',
        diagnosis: i % 10 === 0 ? 'تسوس عميق ضرس 16' : 'كشف وقائي',
        visitsCount: 1 + (i % 5)
      };
    }

    // Measure indexing performance
    const indexStart = performance.now();
    engine.buildIndex(syntheticPatients);
    const indexDuration = performance.now() - indexStart;

    expect(engine.isIndexed).toBe(true);
    expect(engine.patientCount).toBe(TOTAL_RECORDS);
    expect(indexDuration).toBeLessThan(2000); // 100k indexed in < 2 seconds

    // Test O(1) lookup speed for arbitrary targets (start, middle, end)
    const targets = ['01000000000', '01000050000', '01000099999'];
    for (const targetPhone of targets) {
      const lookupStart = performance.now();
      const found = engine.findByPhone(targetPhone);
      const lookupDuration = performance.now() - lookupStart;

      expect(found).not.toBeNull();
      expect(found.phone).toBe(targetPhone);
      expect(lookupDuration).toBeLessThan(5); // Sub-5ms O(1) lookup
    }
  });

  describe('phone format variants resolution across indexed records', () => {
    const testCases = [
      { input: '01012345678', expectedId: 'p_target' },
      { input: '+201012345678', expectedId: 'p_target' },
      { input: '00201012345678', expectedId: 'p_target' },
      { input: '010-1234-5678', expectedId: 'p_target' },
      { input: '010 1234 5678', expectedId: 'p_target' }
    ];

    it.each(testCases)(
      'resolves patient for Egyptian phone format %s with zero scanning overhead',
      ({ input, expectedId }) => {
        const pool = [
          { id: 'p_other_1', name: 'سارة', phone: '01123456789' },
          { id: 'p_target', name: 'أحمد محمود', phone: '01012345678' },
          { id: 'p_other_2', name: 'خالد', phone: '01298765432' }
        ];

        engine.buildIndex(pool);
        const result = engine.findByPhone(input);

        expect(result).not.toBeNull();
        expect(result.id).toBe(expectedId);
      }
    );
  });

  it('paginates across large dataset returning exact slice and correct total metadata', () => {
    const patientsList = Array.from({ length: 500 }, (_, idx) => ({
      id: `patient_${idx}`,
      name: `المريض رقم ${idx}`,
      phone: `010${String(idx).padStart(8, '0')}`,
      diagnosis: idx % 2 === 0 ? 'علاج عصب' : 'تنظيف جير'
    }));

    // Page 2 with pageSize 25 -> items 25 to 49
    const page2 = engine.search('', 2, 25, patientsList);

    expect(page2.total).toBe(500);
    expect(page2.page).toBe(2);
    expect(page2.pageSize).toBe(25);
    expect(page2.totalPages).toBe(20);
    expect(page2.items).toHaveLength(25);
    expect(page2.items[0].id).toBe('patient_25');
    expect(page2.items[24].id).toBe('patient_49');
  });

  it('filters by query and recalculates total pages correctly', () => {
    const patientsList = [
      { id: '1', name: 'أحمد علي', phone: '01011111111', diagnosis: 'علاج عصب ضرس' },
      { id: '2', name: 'محمود حسن', phone: '01022222222', diagnosis: 'طربوش زيركون' },
      { id: '3', name: 'أحمد إبراهيم', phone: '01033333333', diagnosis: 'تقويم أسنان' },
      { id: '4', name: 'منى خليل', phone: '01044444444', diagnosis: 'علاج عصب أمامي' }
    ];

    const result = engine.search('عصب', 1, 10, patientsList);

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items.map(p => p.id)).toEqual(['1', '4']);
  });

  it('debounces rapid search input executing only the trailing call', async () => {
    vi.useFakeTimers();
    const queryFn = vi.fn();
    const debouncedSearch = debounce(queryFn, 300);

    // Simulate fast typing of 11 characters in 100ms
    const phoneChars = '01012345678'.split('');
    let accumulated = '';
    for (const char of phoneChars) {
      accumulated += char;
      debouncedSearch(accumulated);
      vi.advanceTimersByTime(10);
    }

    // Before timer fires, function should not have been called
    expect(queryFn).toHaveBeenCalledTimes(0);

    // Advance remaining time past 300ms
    vi.advanceTimersByTime(310);

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledWith('01012345678');

    vi.useRealTimers();
  });

  describe('server-side range calculation for Supabase large table queries', () => {
    it('returns error when Supabase is unconfigured', async () => {
      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(false);

      const result = await getPatientsPaginated({ clinicId: 'c1', page: 1, pageSize: 25 });
      expect(result.data).toEqual([]);
      expect(result.error).toBe(supabaseLib.NOT_CONFIGURED_ERROR);

      vi.restoreAllMocks();
    });
  });
});
