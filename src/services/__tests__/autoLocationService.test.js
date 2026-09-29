import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateDistanceKm, formatDistanceAr, getAutoUserLocation } from '../autoLocationService';

describe('autoLocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateDistanceKm', () => {
    it('calculates distance between Cairo and Giza accurately', () => {
      // Cairo ~ (30.0444, 31.2357), Giza ~ (30.0131, 31.2089)
      const dist = calculateDistanceKm(30.0444, 31.2357, 30.0131, 31.2089);
      expect(dist).toBeGreaterThan(3);
      expect(dist).toBeLessThan(6);
    });

    it('returns null for missing coordinates', () => {
      expect(calculateDistanceKm(null, 31.2, 30.0, 31.1)).toBeNull();
      expect(calculateDistanceKm(30.0, null, 30.0, 31.1)).toBeNull();
      expect(calculateDistanceKm(30.0, 31.2, undefined, 31.1)).toBeNull();
    });

    it('returns 0 for identical coordinates', () => {
      expect(calculateDistanceKm(30.0444, 31.2357, 30.0444, 31.2357)).toBe(0);
    });
  });

  describe('formatDistanceAr', () => {
    it('formats kilometers correctly', () => {
      expect(formatDistanceAr(4.2)).toBe('على بعد 4.2 كم تقريباً');
    });

    it('formats meters for sub-kilometer distances', () => {
      expect(formatDistanceAr(0.45)).toBe('على بعد 450 متر تقريباً');
    });

    it('returns empty string for null or undefined', () => {
      expect(formatDistanceAr(null)).toBe('');
      expect(formatDistanceAr(undefined)).toBe('');
    });
  });

  describe('getAutoUserLocation', () => {
    it('executes safely without throwing or rejecting', async () => {
      const loc = await getAutoUserLocation({ timeoutMs: 50 });
      // In test environment without network/gps, returns null or fallback object without throwing
      expect(loc === null || typeof loc === 'object').toBe(true);
    });
  });
});
