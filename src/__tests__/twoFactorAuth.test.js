import { describe, it, expect, beforeEach } from 'vitest';
import {
  base32Encode,
  base32Decode,
  computeTotpCode,
  verifyTotpCode,
  generateTotpSecret,
  generateBackupCodes,
  isTwoFactorEnabled,
  enableTwoFactor,
  verifyTwoFactorLogin,
  disableTwoFactor
} from '../services/twoFactorAuthService';

const storageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = storageMock;
global.sessionStorage = storageMock;

describe('Two-Factor Authentication (2FA / TOTP RFC 6238) Suite', () => {
  beforeEach(() => {
    storageMock.clear();
  });

  describe('1. Base32 Encoding & Decoding', () => {
    it('encodes and decodes binary buffers consistently', () => {
      const original = new Uint8Array([72, 101, 108, 108, 111, 33]); // "Hello!"
      const encoded = base32Encode(original);
      expect(encoded).toBeTruthy();

      const decoded = base32Decode(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });

  describe('2. TOTP Calculation & Clock Drift Verification', () => {
    const testSecret = 'JBSWY3DPEHPK3PXP'; // Standard RFC test vector

    it('generates a 6-digit numerical code', () => {
      const code = computeTotpCode(testSecret);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('verifies a valid TOTP code for the current time window', () => {
      const currentCode = computeTotpCode(testSecret);
      const isValid = verifyTotpCode(testSecret, currentCode);
      expect(isValid).toBe(true);
    });

    it('rejects an incorrect or malformed TOTP code', () => {
      expect(verifyTotpCode(testSecret, '000000')).toBe(false);
      expect(verifyTotpCode(testSecret, 'abcdef')).toBe(false);
      expect(verifyTotpCode(testSecret, '123')).toBe(false);
    });

    it('tolerates +/- 30s clock drift', () => {
      const currentCounter = Math.floor(Date.now() / 30000);
      const prevWindowCode = computeTotpCode(testSecret, currentCounter - 1);
      const nextWindowCode = computeTotpCode(testSecret, currentCounter + 1);

      expect(verifyTotpCode(testSecret, prevWindowCode)).toBe(true);
      expect(verifyTotpCode(testSecret, nextWindowCode)).toBe(true);
    });
  });

  describe('3. Secret Generation & Setup', () => {
    it('generates secret, valid otpauth URL, and 8 backup codes', () => {
      const setup = generateTotpSecret('dr.ahmed@clinicflow.app', 'ClinicFlow');
      expect(setup.secret).toBeTruthy();
      expect(setup.otpauthUrl).toContain('otpauth://totp/ClinicFlow:dr.ahmed%40clinicflow.app');
      expect(setup.otpauthUrl).toContain('secret=' + setup.secret);
      expect(setup.backupCodes.length).toBe(8);
    });
  });

  describe('4. Lifecycle & Backup Code Recovery Flow', () => {
    const userId = 'user-dr-hany-101';

    it('initially reports 2FA as disabled', () => {
      expect(isTwoFactorEnabled(userId)).toBe(false);
    });

    it('enables 2FA and verifies with valid TOTP code', () => {
      const { secret, backupCodes } = generateTotpSecret('dr.hany@clinicflow.app');
      enableTwoFactor(userId, secret, backupCodes, 'د. هاني');

      expect(isTwoFactorEnabled(userId)).toBe(true);

      const validCode = computeTotpCode(secret);
      expect(verifyTwoFactorLogin(userId, validCode)).toBe(true);
    });

    it('allows login with a backup recovery code and consumes it', () => {
      const { secret, backupCodes } = generateTotpSecret('dr.hany@clinicflow.app');
      enableTwoFactor(userId, secret, backupCodes, 'د. هاني');

      const firstBackup = backupCodes[0];
      // First attempt: succeeds and burns the code
      expect(verifyTwoFactorLogin(userId, firstBackup)).toBe(true);

      // Second attempt with the SAME backup code: rejected (single-use)
      expect(verifyTwoFactorLogin(userId, firstBackup)).toBe(false);
    });

    it('disables 2FA correctly', () => {
      const { secret, backupCodes } = generateTotpSecret('dr.hany@clinicflow.app');
      enableTwoFactor(userId, secret, backupCodes);
      expect(isTwoFactorEnabled(userId)).toBe(true);

      disableTwoFactor(userId);
      expect(isTwoFactorEnabled(userId)).toBe(false);
    });
  });
});
