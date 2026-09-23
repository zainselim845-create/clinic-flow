import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAiConfig, saveAiConfig, testAiConnection, askDoctorAiAssistant, DEFAULT_AI_MODEL } from '../services/aiAssistantService';
import { calculateHaversineDistanceKm } from '../pages/superadmin/components/SaasGeographicAnalytics';
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
});
