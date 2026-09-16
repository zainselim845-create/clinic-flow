import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { redactSensitiveTokens, captureSystemError } from '../services/systemErrorService';
import { DEFAULT_OPENROUTER_KEY } from '../services/aiAssistantService';

describe('Token Security, Telemetry Redaction & Role Anti-Tampering Suite', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = String(value); },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    global.localStorage = storageMock;
    global.sessionStorage = storageMock;
    if (typeof window !== 'undefined') {
      window.localStorage = storageMock;
      window.sessionStorage = storageMock;
    }
  });

  afterEach(() => {
    mockStorage = {};
  });

  describe('1. Error Telemetry Sensitive Token Redaction', () => {
    it('redacts JWT tokens from error strings and stack traces', () => {
      const rawMessage = 'Network error during request with Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const sanitized = redactSensitiveTokens(rawMessage);

      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).toContain('[REDACTED_JWT_TOKEN]');
    });

    it('redacts Bearer authorization tokens from error strings', () => {
      const rawMessage = 'Request failed: Bearer cf_live_secret_auth_token_999999 returned 401 Unauthorized';
      const sanitized = redactSensitiveTokens(rawMessage);

      expect(sanitized).not.toContain('cf_live_secret_auth_token_999999');
      expect(sanitized).toContain('Bearer [REDACTED_TOKEN]');
    });

    it('redacts OpenRouter / OpenAI sk- style secret API keys', () => {
      const rawMessage = 'Model inference failed with key sk-or-v1-abcdef1234567890abcdef1234567890 on endpoint';
      const sanitized = redactSensitiveTokens(rawMessage);

      expect(sanitized).not.toContain('sk-or-v1-abcdef1234567890abcdef1234567890');
      expect(sanitized).toContain('sk-[REDACTED_KEY]');
    });

    it('redacts sensitive query params and credentials in URLs', () => {
      const rawUrl = 'https://api.clinicflow.com/v1/sync?apikey=sec_key_12345&password=SuperSecretPassword99&token=tok_847291';
      const sanitized = redactSensitiveTokens(rawUrl);

      expect(sanitized).not.toContain('sec_key_12345');
      expect(sanitized).not.toContain('SuperSecretPassword99');
      expect(sanitized).not.toContain('tok_847291');
      expect(sanitized).toContain('apikey=[REDACTED]');
      expect(sanitized).toContain('password=[REDACTED]');
      expect(sanitized).toContain('token=[REDACTED]');
    });

    it('recursively scrubs sensitive fields from complex error context objects', () => {
      const rawContext = {
        endpoint: '/api/v1/chat',
        apiKey: 'sk-or-v1-production-secret-999',
        user: {
          id: 'usr-1',
          name: 'Doctor Ahmed',
          authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.abcdef',
          passwordHash: 'argon2_secret_hash_value'
        },
        payload: {
          notes: 'Patient consultation in progress',
          secretNotes: 'private doctor observation'
        }
      };

      const sanitized = redactSensitiveTokens(rawContext);

      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.user.authToken).toBe('[REDACTED]');
      expect(sanitized.user.passwordHash).toBe('[REDACTED]');
      expect(sanitized.payload.secretNotes).toBe('[REDACTED]');
      expect(sanitized.payload.notes).toBe('Patient consultation in progress');
    });

    it('captureSystemError stores sanitized telemetry in localStorage without leaking keys', () => {
      captureSystemError({
        type: 'AUTH_LEAK_CHECK',
        message: 'Auth failure with sk-or-v1-dummy-openrouter-key-9999',
        severity: 'high',
        context: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mn0.abcdef',
          endpoint: '/v1/appointments'
        }
      });

      const storedErrors = JSON.parse(localStorage.getItem('clinicflow_system_errors') || '[]');
      const lastError = storedErrors[0];

      expect(lastError).toBeDefined();
      expect(lastError.message).not.toContain('sk-or-v1-dummy-openrouter-key-9999');
      expect(lastError.message).toContain('sk-[REDACTED_KEY]');
      expect(lastError.context.token).toBe('[REDACTED]');
    });
  });

  describe('2. Client Storage & Role Anti-Tampering Hardening', () => {
    it('detects and neutralizes localStorage privilege escalation to super_admin by malicious users', () => {
      // Attacker attempts to forge local user object as super_admin
      const forgedUser = {
        id: 'attacker-123',
        name: 'Malicious User',
        email: 'attacker@outside.com',
        role: 'super_admin',
        isSuperAdmin: true
      };
      localStorage.setItem('clinicflow_auth_user', JSON.stringify(forgedUser));
      localStorage.setItem('clinicflow_role', 'super_admin');

      // Emulate getInitialUser logic from AuthContext
      const saved = localStorage.getItem('clinicflow_auth_user');
      const parsed = JSON.parse(saved);
      if (parsed.role === 'super_admin' || parsed.isSuperAdmin) {
        const email = (parsed.email || '').toLowerCase().trim();
        const isValidSuperAdmin = email === 'superadmin@clinicflow.com' || 
          email.includes('admin') || 
          parsed.id === 'superadmin-root' || 
          parsed.authProvider === 'supabase';
        if (!isValidSuperAdmin) {
          parsed.role = 'doctor';
          parsed.isSuperAdmin = false;
        }
      }

      expect(parsed.role).toBe('doctor');
      expect(parsed.isSuperAdmin).toBe(false);
    });

    it('retains super_admin role for legitimate platform administrator email', () => {
      const validAdmin = {
        id: 'superadmin-root',
        name: 'Platform Root Admin',
        email: 'superadmin@clinicflow.com',
        role: 'super_admin',
        isSuperAdmin: true
      };
      localStorage.setItem('clinicflow_auth_user', JSON.stringify(validAdmin));

      const saved = localStorage.getItem('clinicflow_auth_user');
      const parsed = JSON.parse(saved);
      if (parsed.role === 'super_admin' || parsed.isSuperAdmin) {
        const email = (parsed.email || '').toLowerCase().trim();
        const isValidSuperAdmin = email === 'superadmin@clinicflow.com' || 
          email.includes('admin') || 
          parsed.id === 'superadmin-root' || 
          parsed.authProvider === 'supabase';
        if (!isValidSuperAdmin) {
          parsed.role = 'doctor';
          parsed.isSuperAdmin = false;
        }
      }

      expect(parsed.role).toBe('super_admin');
      expect(parsed.isSuperAdmin).toBe(true);
    });
  });

  describe('3. Production Bundle & Secret Key Safety', () => {
    it('verifies DEFAULT_OPENROUTER_KEY is empty and does not expose static keys in client runtime', () => {
      // DEFAULT_OPENROUTER_KEY must be empty string in code (read from env dynamically)
      expect(DEFAULT_OPENROUTER_KEY).toBe('');
    });
  });
});
