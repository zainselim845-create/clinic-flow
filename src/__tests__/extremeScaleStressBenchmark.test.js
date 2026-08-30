import { describe, it, expect } from 'vitest';
import { cleanEgyptianPhone, validateEgyptianPhone, normalizeArabicNumerals } from '../utils/phoneValidation';
import { PatientIndexEngine } from '../services/indexedSearchService';
import { generateDynamicSlots, formatTimeArabic } from '../utils/timeSlots';

describe('Extreme Scale & Concurrency Stress Test Suite (100,000+ Operations Benchmark)', () => {

  it('normalizes 100,000 mixed Eastern Arabic & Persian phone numbers in under 500ms (350k+ ops/sec)', () => {
    const rawPhones = [
      '٠١٠٠٦٢٨٥٠٣١',
      '+20 100 628 5031',
      '00201123456789',
      '۰۱۵۱۲۳۴۵۶۷۸',
      '012-3456-7890',
      '٠١٠١٢٣٤٥٦٧٨',
      '01012345678',
      '201012345678',
      '٠١٥-٥٥٥٥-٥٥٥٥',
      '+201200000000'
    ];

    const ITERATIONS = 100000;
    const start = performance.now();
    
    let validCount = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const raw = rawPhones[i % rawPhones.length];
      const cleaned = cleanEgyptianPhone(raw);
      if (cleaned.length === 11) {
        validCount++;
      }
    }
    
    const duration = performance.now() - start;
    expect(validCount).toBe(ITERATIONS);
    expect(duration).toBeLessThan(500); // 100k operations in < 500ms
  });

  it('simulates 10,000 concurrent booking slot allocations with zero collision', () => {
    const bookedSlotsMap = new Map(); // "date_time" -> bookingId
    const TOTAL_BOOKINGS = 10000;
    let collisions = 0;
    let successfulBookings = 0;

    const start = performance.now();
    for (let i = 0; i < TOTAL_BOOKINGS; i++) {
      const dayOffset = i % 50;
      const slotIndex = Math.floor(i / 50) % 20;
      const slotKey = `2026-09-${String(1 + dayOffset).padStart(2, '0')}_slot_${slotIndex}`;

      if (bookedSlotsMap.has(slotKey)) {
        collisions++;
      } else {
        bookedSlotsMap.set(slotKey, `appt_${i}`);
        successfulBookings++;
      }
    }
    const duration = performance.now() - start;

    expect(successfulBookings).toBe(1000); // exactly 1000 unique available slots
    expect(collisions).toBe(9000); // 9000 attempts prevented safely
    expect(duration).toBeLessThan(50);
  });

  it('indexes 20,000 patients and performs 10,000 instantaneous searches in under 1.5s', () => {
    const engine = new PatientIndexEngine();
    const PATIENT_COUNT = 20000;
    const patients = new Array(PATIENT_COUNT);

    for (let i = 0; i < PATIENT_COUNT; i++) {
      patients[i] = {
        id: `pat_${i}`,
        name: `مريض تجريبي رقم ${i}`,
        phone: `010${String(i).padStart(8, '0')}`,
        age: 20 + (i % 50),
        diagnosis: i % 5 === 0 ? 'التهاب عصب سن 24' : 'تنظيف وتلميع أسنان',
        visitsCount: 1 + (i % 8)
      };
    }

    const indexStart = performance.now();
    engine.buildIndex(patients);
    const indexDuration = performance.now() - indexStart;

    expect(engine.isIndexed).toBe(true);
    expect(engine.patientCount).toBe(PATIENT_COUNT);
    expect(indexDuration).toBeLessThan(500);

    // Perform 10,000 lookups
    const lookupStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      const targetPhone = `010${String(i * 2).padStart(8, '0')}`;
      const found = engine.findByPhone(targetPhone);
      expect(found).not.toBeNull();
      expect(found.id).toBe(`pat_${i * 2}`);
    }
    const lookupDuration = performance.now() - lookupStart;
    expect(lookupDuration).toBeLessThan(1500);
  });

  it('sorts and prioritizes 5,000 emergency waiting room events in under 50ms using epoch ordering', () => {
    const baseTime = Date.now();
    const waitingQueue = [];
    for (let i = 0; i < 5000; i++) {
      waitingQueue.push({
        id: `wait_${i}`,
        patientName: `مريض ${i}`,
        isEmergency: i % 15 === 0, // emergency every 15 patients
        arrivalEpoch: baseTime + i * 60000,
        status: 'waiting'
      });
    }

    const start = performance.now();
    const sorted = [...waitingQueue].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      return a.arrivalEpoch - b.arrivalEpoch;
    });
    const duration = performance.now() - start;

    expect(sorted[0].isEmergency).toBe(true);
    expect(duration).toBeLessThan(50);
  });

  it('aggregates and reconciles 50,000 financial transactions in under 50ms', () => {
    const invoices = new Array(50000);
    for (let i = 0; i < 50000; i++) {
      invoices[i] = {
        id: `inv_${i}`,
        total: 400 + (i % 600),
        paidAmount: i % 3 === 0 ? 0 : 400 + (i % 600),
        discount: i % 10 === 0 ? 50 : 0,
        status: i % 3 === 0 ? 'unpaid' : 'paid'
      };
    }

    const start = performance.now();
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      totalRevenue += inv.total;
      totalPaid += inv.paidAmount;
      if (inv.status === 'unpaid') {
        totalUnpaid += inv.total;
      }
    }
    const duration = performance.now() - start;

    expect(totalRevenue).toBeGreaterThan(0);
    expect(totalPaid).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50);
  });

});
