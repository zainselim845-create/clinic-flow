import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getAiConfig, 
  saveAiConfig, 
  askDoctorAiAssistant, 
  DEFAULT_OPENROUTER_KEY, 
  DEFAULT_AI_MODEL 
} from '../aiAssistantService';

describe('OpenRouter AI Assistant Service', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    const localStorageMock = {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, value) => { mockStorage[key] = value.toString(); }),
      clear: vi.fn(() => { mockStorage = {}; }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; })
    };

    global.localStorage = localStorageMock;
    global.window = { localStorage: localStorageMock };
    vi.restoreAllMocks();
  });

  describe('Config Management', () => {
    it('returns default OpenRouter config when localStorage is empty or contains corrupted JSON', () => {
      mockStorage['clinic_flow_ai_config'] = '{invalid-json';
      const config = getAiConfig();
      expect(config.apiKey).toBe(DEFAULT_OPENROUTER_KEY);
      expect(config.model).toBe(DEFAULT_AI_MODEL);
      expect(config.enabled).toBe(true);
    });

    it('saves and retrieves updated AI config from localStorage', () => {
      const customConfig = {
        apiKey: 'sk-or-v1-custom-key',
        model: 'openai/gpt-4o-mini',
        enabled: true
      };
      saveAiConfig(customConfig);
      const retrieved = getAiConfig();
      expect(retrieved.apiKey).toBe('sk-or-v1-custom-key');
      expect(retrieved.model).toBe('openai/gpt-4o-mini');
    });
  });

  describe('askDoctorAiAssistant Calling Logic', () => {
    it('returns successful parsed content when OpenRouter responds with HTTP 200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'أهلاً بك يا دكتور، أنا جاهز لمساعدتك في رعاية المرضى.' } }]
        })
      });

      const res = await askDoctorAiAssistant(
        [{ role: 'user', content: 'مرحبا' }],
        { doctorName: 'د. أحمد الشريف', name: 'عيادة كلينك فلو' },
        []
      );

      expect(res.success).toBe(true);
      expect(res.content).toContain('أهلاً بك يا دكتور');
      expect(res.model).toBe(DEFAULT_AI_MODEL);
    });

    it('handles network failure gracefully and returns error message', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network connection failed'));

      const res = await askDoctorAiAssistant(
        [{ role: 'user', content: 'مرحبا' }],
        {},
        []
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe('Network connection failed');
    });
  });
});
