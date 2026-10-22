import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveAiConfig, testAiConnection, askDoctorAiAssistant, DEFAULT_AI_MODEL } from '../services/aiAssistantService';
import { 
  calculateHaversineDistanceKm, 
  detectClinicLocation, 
  getClinicCoordinates, 
  extractOwnerCoordinates 
} from '../data/saasGeoData';
describe('Geo Maps & AI Integration Suite', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    const localStorageMock = {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, value) => { mockStorage[key] = value.toString(); }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { mockStorage = {}; })
    };
    global.localStorage = localStorageMock;
    global.window = { localStorage: localStorageMock };
    vi.restoreAllMocks();
  });

  describe('SaasGeographicAnalytics Haversine Calculation', () => {
    it('calculates correct distance between Cairo and Alexandria', () => {
      // Cairo: 30.0444, 31.2357
      // Alexandria: 31.2001, 29.9187
      const distance = calculateHaversineDistanceKm(30.0444, 31.2357, 31.2001, 29.9187);
      expect(distance).toBeGreaterThan(170);
      expect(distance).toBeLessThan(190);
    });

    it('returns zero for identical coordinates', () => {
      const distance = calculateHaversineDistanceKm(30.0444, 31.2357, 30.0444, 31.2357);
      expect(distance).toBe(0);
    });

    it('handles negative or invalid coordinates safely without throwing', () => {
      expect(() => calculateHaversineDistanceKm(null, undefined, 30, 31)).not.toThrow();
    });
  });

  describe('Doctor AI Assistant Service Enhanced Functions', () => {
    it('testAiConnection successfully calculates latency on valid response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Pong' } }]
        })
      });

      const res = await testAiConnection('test-key-123', 'google/gemini-2.0-flash-exp:free', mockFetch);
      expect(res.success).toBe(true);
      expect(typeof res.latencyMs).toBe('number');
      expect(res.response).toBe('Pong');
    });

    it('testAiConnection reports structured error on HTTP 401/403', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid API key provided' }
        })
      });

      const res = await testAiConnection('invalid-key', 'google/gemini-2.0-flash-exp:free', mockFetch);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid API key');
    });

    it('injects doctor custom clinical instructions into system prompt', async () => {
      saveAiConfig({
        apiKey: 'test-key',
        model: DEFAULT_AI_MODEL,
        enabled: true,
        customInstructions: 'يجب التنبيه دائما بفحص ضغط الدم لمرضى السكري'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'حاضر دكتور' } }]
        })
      });

      await askDoctorAiAssistant(
        [{ sender: 'doctor', text: 'ما هي التوصية لمريض السكري؟' }],
        { name: 'عيادة النخبة' }
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const reqBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      const systemMessage = reqBody.messages.find(m => m.role === 'system');
      expect(systemMessage.content).toContain('يجب التنبيه دائما بفحص ضغط الدم لمرضى السكري');
    });

    it('returns friendly disabled notice when AI is toggled off in settings', async () => {
      saveAiConfig({
        apiKey: 'test-key',
        model: DEFAULT_AI_MODEL,
        enabled: false
      });

      const res = await askDoctorAiAssistant(
        [{ sender: 'doctor', text: 'هل يمكنك المساعدة؟' }]
      );

      expect(res.success).toBe(false);
      expect(res.isDisabled).toBe(true);
      expect(res.error).toContain('معطل في إعدادات العيادة');
    });
  });

  describe('National Geographic Intelligence - Clinic Owner Device Location Priority', () => {
    it('strictly assigns clinic to Dakahlia (Mansoura) based on owner device coordinates even if address says Cairo', () => {
      const clinic = {
        id: 'clinic-mansoura-1',
        name: 'مركز النخبة للعيون',
        address: 'شارع التسعين - التجمع الخامس - القاهرة الجديدة', // Deliberately misleading user typed text
        ownerLocation: {
          lat: 31.0409,
          lng: 31.3785,
          source: 'gps',
          accuracyKm: 0.05,
          capturedAt: '2026-10-22T10:00:00Z'
        }
      };

      const loc = detectClinicLocation(clinic);
      expect(loc.governorateId).toBe('dakahlia');
      expect(loc.governorateName).toBe('الدقهلية (المنصورة)');
      expect(loc.regionCluster).toBe('delta');
      expect(loc.isOwnerDeviceLocation).toBe(true);
      expect(loc.detectionSource).toBe('gps');
      expect(loc.deviceCoordinates).toEqual({ lat: 31.0409, lng: 31.3785 });
      expect(loc.distanceToGovCentroidKm).toBeLessThan(1); // Within 1 km of Mansoura centroid
    });

    it('assigns clinic to Alexandria based on owner coordinates even if address says Sohag', () => {
      const clinic = {
        id: 'clinic-alex-1',
        name: 'عيادة الشفاء',
        address: 'محافظة سوهاج - مركز طهطا', // Misleading user typed text
        coordinates: {
          lat: 31.2001,
          lng: 29.9187,
          source: 'owner_device_gps'
        }
      };

      const loc = detectClinicLocation(clinic);
      expect(loc.governorateId).toBe('alexandria');
      expect(loc.governorateName).toBe('الإسكندرية');
      expect(loc.regionCluster).toBe('alex_coast');
      expect(loc.isOwnerDeviceLocation).toBe(true);
    });

    it('assigns clinic to Gharbia (Tanta) from raw lat/lng properties', () => {
      const clinic = {
        id: 'clinic-tanta-1',
        name: 'عيادة الدلتا التخصصية',
        address: 'طنطا',
        lat: 30.7865,
        lng: 31.0004
      };

      const loc = detectClinicLocation(clinic);
      expect(loc.governorateId).toBe('gharbia');
      expect(loc.governorateName).toBe('الغربية (طنطا)');
      expect(loc.isOwnerDeviceLocation).toBe(true);
    });

    it('assigns clinic to Riyadh and Gulf region when device coordinates are located in Saudi Arabia', () => {
      const clinic = {
        id: 'clinic-riyadh-1',
        name: 'مجمع الرياض الطبي',
        ownerLocation: {
          lat: 24.7136,
          lng: 46.6753,
          source: 'device_network'
        }
      };

      const loc = detectClinicLocation(clinic);
      expect(loc.governorateId).toBe('riyadh');
      expect(loc.regionCluster).toBe('gulf_international');
      expect(loc.isOwnerDeviceLocation).toBe(true);
    });

    it('correctly falls back to text heuristic and flags as unverified when no device coordinates exist', () => {
      const clinic = {
        id: 'clinic-cairo-unverified',
        name: 'عيادة مدينة نصر التخصصية',
        address: 'حي السفارات - مدينة نصر - القاهرة'
      };

      const loc = detectClinicLocation(clinic);
      expect(loc.governorateId).toBe('cairo');
      expect(loc.isOwnerDeviceLocation).toBe(false);
      expect(loc.detectionSource).toBe('manual_text_fallback');
      expect(loc.deviceCoordinates).toBeNull();
    });

    it('extractOwnerCoordinates properly parses valid coordinates from all supported sources', () => {
      // 1. ownerLocation object
      expect(extractOwnerCoordinates({ ownerLocation: { lat: 30.5, lng: 31.5 } })).toMatchObject({
        lat: 30.5,
        lng: 31.5,
        isOwnerDevice: true
      });

      // 2. coordinates object
      expect(extractOwnerCoordinates({ coordinates: { lat: 29.9, lng: 32.5 } })).toMatchObject({
        lat: 29.9,
        lng: 32.5,
        isOwnerDevice: true
      });

      // 3. googleMapsUrl query pin
      expect(extractOwnerCoordinates({ googleMapsUrl: 'https://maps.google.com/?q=31.0409,31.3785' })).toMatchObject({
        lat: 31.0409,
        lng: 31.3785,
        isOwnerDevice: true
      });

      // 4. empty or invalid returns null
      expect(extractOwnerCoordinates(null)).toBeNull();
      expect(extractOwnerCoordinates({})).toBeNull();
      expect(extractOwnerCoordinates({ lat: 'invalid', lng: NaN })).toBeNull();
    });

    it('getClinicCoordinates returns isOwnerDeviceLocation: true when coordinates exist', () => {
      const clinic = {
        id: 'c1',
        ownerLocation: { lat: 31.04, lng: 31.38 }
      };

      const coords = getClinicCoordinates(clinic, { lat: 30.0, lng: 31.0 });
      expect(coords.isExactGps).toBe(true);
      expect(coords.isOwnerDeviceLocation).toBe(true);
      expect(coords.lat).toBe(31.04);
      expect(coords.lng).toBe(31.38);
    });
  });
});
