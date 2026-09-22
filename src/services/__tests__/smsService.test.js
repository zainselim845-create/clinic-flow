import { describe, it, expect, beforeEach } from 'vitest';
import { 
  formatEgyptianPhone, 
  formatSenderId, 
  getClinicSenderId, 
  getSmsConfig, 
  sendSMS 
} from '../smsService';
import { safeStorage } from '../../utils/safeStorage';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createStorageMock();
}

describe('smsService Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    safeStorage.clear();
  });

  describe('formatEgyptianPhone', () => {
    it.each([
      ['01006285031', '+201006285031'],
      ['+201006285031', '+201006285031'],
      ['00201006285031', '+201006285031'],
      ['201006285031', '+201006285031'],
      ['011 2222 3333', '+201122223333'],
      ['012-3333-4444', '+201233334444']
    ])('formats input "%s" to E.164 standard "%s"', (rawPhone, expectedE164) => {
      expect(formatEgyptianPhone(rawPhone)).toBe(expectedE164);
    });

    it('handles empty or null values gracefully', () => {
      expect(formatEgyptianPhone('')).toBe('');
      expect(formatEgyptianPhone(null)).toBe('');
    });
  });

  describe('formatSenderId (NTRA & GSM 03.38 Compliance)', () => {
    it('strips non-alphanumeric characters like spaces, dashes, and symbols', () => {
      expect(formatSenderId('Dr-Ahmed!')).toBe('DrAhmed');
      expect(formatSenderId('Sara Derma 2026')).toBe('SaraDerma20');
      expect(formatSenderId('Clinic_Pro#1')).toBe('ClinicPro1');
    });

    it('enforces maximum 11 alphanumeric characters', () => {
      const longSender = 'SuperEliteMedicalCenterEgypt';
      const formatted = formatSenderId(longSender);
      expect(formatted).toBe('SuperEliteM');
      expect(formatted.length).toBeLessThanOrEqual(11);
    });

    it('falls back when cleaned input is less than 3 characters or invalid', () => {
      expect(formatSenderId('Dr')).toBe('ClinicFlow');
      expect(formatSenderId('')).toBe('ClinicFlow');
      expect(formatSenderId(null)).toBe('ClinicFlow');
      expect(formatSenderId('!!!')).toBe('ClinicFlow');
      expect(formatSenderId('', 'CustomFallback')).toBe('CustomFallback');
    });
  });

  describe('getClinicSenderId (Per-Client Dedicated Resolution)', () => {
    it('resolves dedicated Sender ID from saved clinic config if present', () => {
      const clinicId = 'clinic_cairo_care';
      safeStorage.setItem(`clinicflow_sms_config_${clinicId}`, {
        senderId: 'CairoCare'
      });

      expect(getClinicSenderId(clinicId)).toBe('CairoCare');
    });

    it('resolves dedicated Sender ID from registered tenants in localStorage', () => {
      const customClinicId = 'clinic_elite_99';
      safeStorage.setItem('clinicflow_registered_tenants', [
        {
          id: customClinicId,
          slug: 'elite-dental',
          senderId: 'EliteDental'
        }
      ]);

      expect(getClinicSenderId(customClinicId)).toBe('EliteDental');
      expect(getClinicSenderId('elite-dental')).toBe('EliteDental');
    });

    it('returns empty string when no custom sender ID is set for unknown clinic', () => {
      expect(getClinicSenderId('nile-smile-care')).toBe('');
      expect(getClinicSenderId('alpha-clinic')).toBe('');
    });

    it('returns platform default for empty or default clinic ID', () => {
      expect(getClinicSenderId(null)).toBe('ClinicFlow');
      expect(getClinicSenderId('default')).toBe('ClinicFlow');
    });
  });

  describe('getSmsConfig with Clinic Scoping', () => {
    it('binds clinic dedicated senderId to the resolved config', () => {
      safeStorage.setItem('clinicflow_registered_tenants', [
        {
          id: 'clinic-custom',
          slug: 'custom-clinic',
          senderId: 'CustomCare'
        }
      ]);

      const config = getSmsConfig('custom-clinic');
      expect(config.senderId).toBe('CustomCare');
      expect(config.easysendsmsSender).toBe('CustomCare');
      expect(config.smsmisrSender).toBe('CustomCare');
    });
  });

  describe('sendSMS unconfigured behavior and audit ledger metadata', () => {
    it('returns honest unconfigured status when no credentials are provided', async () => {
      const result = await sendSMS('01006285031', 'رسالة اختبار', 'test-clinic');
      expect(result.success).toBe(false);
      expect(result.isConfigured).toBe(false);
      expect(result.error).toContain('لم يتم ربط مزود خدمة SMS');
    });
  });
});
