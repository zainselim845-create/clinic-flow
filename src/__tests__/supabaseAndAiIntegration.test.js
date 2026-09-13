import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  isSupabaseConfigured, 
  getSupabase, 
  supabase, 
  NOT_CONFIGURED_ERROR 
} from '../lib/supabase';
import { 
  getAiConfig, 
  saveAiConfig, 
  askDoctorAiAssistant, 
  DEFAULT_AI_MODEL, 
  FALLBACK_AI_MODEL 
} from '../services/aiAssistantService';
import { processDoctorIntent } from '../utils/clinicalAssistantActions';
import { createClinicRealtimeManager, REALTIME_STATUS } from '../services/realtimeSyncService';

describe('Supabase Connection & Fallback Resilience Test Suite', () => {
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
    saveSupabaseConfig(null, null);
    vi.restoreAllMocks();
  });

  it('correctly handles unconfigured Supabase credentials', () => {
    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabase()).toBeNull();
  });

  it('saves and recognizes valid Supabase credentials (>20 chars)', () => {
    const validKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.valid-key-signature-12345';
    const validUrl = 'https://myclinic-test.supabase.co';

    saveSupabaseConfig(validUrl, validKey);
    const cfg = getSupabaseConfig();
    expect(cfg.url).toBe(validUrl);
    expect(cfg.key).toBe(validKey);
    expect(isSupabaseConfigured()).toBe(true);

    const client = getSupabase();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('rejects short or empty keys as unconfigured', () => {
    saveSupabaseConfig('https://myclinic-test.supabase.co', 'short-key');
    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabase()).toBeNull();
  });

  it('provides safe offline query builder chain without crashing on unconfigured supabase.from', async () => {
    saveSupabaseConfig(null, null);
    expect(isSupabaseConfigured()).toBe(false);

    const query = supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', 'test-clinic')
      .order('date', { ascending: true });

    expect(query).toBeDefined();
    expect(typeof query.then).toBe('function');

    const result = await query;
    expect(result.data).toBeNull();
    expect(result.error).toBe(NOT_CONFIGURED_ERROR);
  });

  it('provides safe offline realtime channel fallback without crashing', async () => {
    saveSupabaseConfig(null, null);
    const channel = supabase.channel('clinic-realtime-test');
    expect(channel).toBeDefined();

    let receivedStatus = null;
    channel.subscribe((status) => {
      receivedStatus = status;
    });
    expect(receivedStatus).toBe('CLOSED');

    const sendRes = await channel.send();
    expect(sendRes).toBe('error');
  });

  it('createClinicRealtimeManager gracefully disconnects when client is null', () => {
    const manager = createClinicRealtimeManager({
      supabaseClient: null,
      clinicId: 'clinic-123'
    });

    expect(manager.status).toBe(REALTIME_STATUS.DISCONNECTED);
    expect(typeof manager.broadcast).toBe('function');
    expect(typeof manager.unsubscribe).toBe('function');
  });
});

describe('Doctor AI Assistant (OpenRouter & Local Engine) Test Suite', () => {
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

  it('configures and persists AI model settings', () => {
    const customConfig = {
      apiKey: 'sk-or-v1-test-key',
      model: 'google/gemini-2.0-flash-exp:free',
      enabled: true
    };
    saveAiConfig(customConfig);
    const loaded = getAiConfig();
    expect(loaded.apiKey).toBe('sk-or-v1-test-key');
    expect(loaded.model).toBe('google/gemini-2.0-flash-exp:free');
  });

  it('handles successful OpenRouter response with clinical system prompt and context', async () => {
    saveAiConfig({ apiKey: 'sk-or-v1-test-key', model: DEFAULT_AI_MODEL });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: 'تم إعداد خطة المتابعة لمرضى الاستشارة بنجاح.' } }
        ]
      })
    });

    const res = await askDoctorAiAssistant(
      [{ sender: 'doctor', text: 'ما هي مواعيد المتابعة المقترحة؟' }],
      { doctorName: 'د. أحمد الشريف', specialty: 'أسنان', name: 'عيادة كلينك فلو' },
      [{ id: 'p1', name: 'سامي علي' }],
      { blockedSlots: [{ date: '2026-09-20', time: 'FULL_DAY' }] }
    );

    expect(res.success).toBe(true);
    expect(res.content).toBe('تم إعداد خطة المتابعة لمرضى الاستشارة بنجاح.');
    expect(res.model).toBe(DEFAULT_AI_MODEL);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(fetchBody.messages[0].role).toBe('system');
    expect(fetchBody.messages[0].content).toContain('د. أحمد الشريف');
    expect(fetchBody.messages[0].content).toContain('2026-09-20');
  });

  it('automatically falls back to FALLBACK_AI_MODEL when primary model returns 429 rate limit', async () => {
    saveAiConfig({ apiKey: 'sk-or-v1-test-key', model: 'nvidia/nemotron-3-super-120b-a12b:free' });

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Rate limit exceeded for free tier' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: 'مرحباً دكتور، استجابة من نموذج النسخ الاحتياطي Auto.' } }
          ]
        })
      });

    const res = await askDoctorAiAssistant(
      [{ sender: 'doctor', text: 'أريد تقرير سريع' }],
      { doctorName: 'د. أحمد' }
    );

    expect(res.success).toBe(true);
    expect(res.model).toBe(FALLBACK_AI_MODEL);
    expect(res.content).toContain('استجابة من نموذج النسخ الاحتياطي');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('executes local administrative actions when doctor enters schedule commands (Zero API key needed)', () => {
    const mockState = {
      appointments: [
        { id: 'a1', date: '2026-09-15', status: 'booked' }
      ],
      patients: [
        { id: 'p1', name: 'أحمد محمود' }
      ],
      blockedSlots: []
    };

    const blockIntent = processDoctorIntent('اقفل يوم 2026-09-25 إجازة', mockState);
    expect(blockIntent.isAction).toBe(true);
    expect(blockIntent.actionType).toBe('BLOCK_FULL_DAY');
    expect(blockIntent.payload.date).toBe('2026-09-25');

    const unblockIntent = processDoctorIntent('افتح يوم 2026-09-25', mockState);
    expect(unblockIntent.isAction).toBe(true);
    expect(unblockIntent.actionType).toBe('UNBLOCK_FULL_DAY');
    expect(unblockIntent.payload.date).toBe('2026-09-25');

    const slotIntent = processDoctorIntent('حظر موعد 2026-09-25 06:00 م', mockState);
    expect(slotIntent.isAction).toBe(true);
    expect(slotIntent.actionType).toBe('BLOCK_SLOT');
    expect(slotIntent.payload.date).toBe('2026-09-25');
    expect(slotIntent.payload.time).toBe('06:00 م');
  });
});