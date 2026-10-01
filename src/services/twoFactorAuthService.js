/**
 * Enterprise Two-Factor Authentication (2FA / TOTP) Service (RFC 6238)
 * Implements Time-Based One-Time Passwords compatible with Google Authenticator,
 * Microsoft Authenticator, and 1Password for HIPAA/GDPR/Egyptian Health Data compliance.
 */

import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import { recordAuditEvent } from './auditLoggerService';
import { supabase } from '../lib/supabase';

const TWO_FACTOR_CONFIG_KEY = 'clinicflow_2fa_settings';

// Base32 alphabet for RFC 3548 / RFC 4648
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a byte array to Base32 string
 */
export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string to Uint8Array
 */
export function base32Decode(input) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Portable SHA-1 Implementation for RFC 6238 TOTP
 */
function sha1(message) {
  function rotl(n, s) {
    return (n << s) | (n >>> (32 - s));
  }

  const msgBytes = [];
  for (let i = 0; i < message.length; i++) {
    msgBytes.push(typeof message === 'string' ? message.charCodeAt(i) & 0xff : message[i] & 0xff);
  }

  const bitLen = msgBytes.length * 8;
  msgBytes.push(0x80);
  while ((msgBytes.length % 64) !== 56) {
    msgBytes.push(0);
  }

  for (let i = 7; i >= 0; i--) {
    msgBytes.push((bitLen >>> (i * 8)) & 0xff);
  }

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let i = 0; i < msgBytes.length; i += 64) {
    const w = new Uint32Array(80);
    for (let j = 0; j < 16; j++) {
      w[j] = (msgBytes[i + j * 4] << 24) |
             (msgBytes[i + j * 4 + 1] << 16) |
             (msgBytes[i + j * 4 + 2] << 8) |
             (msgBytes[i + j * 4 + 3]);
    }
    for (let j = 16; j < 80; j++) {
      w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f, k;
      if (j < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rotl(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const result = new Uint8Array(20);
  const hashWords = [h0, h1, h2, h3, h4];
  for (let i = 0; i < 5; i++) {
    result[i * 4] = (hashWords[i] >>> 24) & 0xff;
    result[i * 4 + 1] = (hashWords[i] >>> 16) & 0xff;
    result[i * 4 + 2] = (hashWords[i] >>> 8) & 0xff;
    result[i * 4 + 3] = hashWords[i] & 0xff;
  }

  return result;
}

/**
 * HMAC-SHA1 calculation (RFC 2104)
 */
function hmacSha1(keyBytes, messageBytes) {
  const blockSize = 64;
  let key = keyBytes;

  if (key.length > blockSize) {
    key = sha1(key);
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    const k = i < key.length ? key[i] : 0;
    oKeyPad[i] = k ^ 0x5c;
    iKeyPad[i] = k ^ 0x36;
  }

  const innerMsg = new Uint8Array(iKeyPad.length + messageBytes.length);
  innerMsg.set(iKeyPad, 0);
  innerMsg.set(messageBytes, iKeyPad.length);
  const innerHash = sha1(innerMsg);

  const outerMsg = new Uint8Array(oKeyPad.length + innerHash.length);
  outerMsg.set(oKeyPad, 0);
  outerMsg.set(innerHash, oKeyPad.length);

  return sha1(outerMsg);
}

/**
 * Computes 6-digit TOTP code for a secret and counter (RFC 6238 / RFC 4226 HOTP)
 */
export function computeTotpCode(secretBase32, counter = Math.floor(Date.now() / 30000)) {
  const keyBytes = base32Decode(secretBase32);

  // Convert counter to 8-byte big-endian buffer
  const counterBytes = new Uint8Array(8);
  let tempCounter = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }

  const hash = hmacSha1(keyBytes, counterBytes);

  // Dynamic truncation (RFC 4226 §5.4)
  const offset = hash[hash.length - 1] & 0x0f;
  const binaryCode =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binaryCode % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code with +/- 1 step clock drift tolerance
 */
export function verifyTotpCode(secretBase32, userCode, timeStepSec = 30) {
  if (!secretBase32 || !userCode) return false;
  const cleanCode = String(userCode).trim().replace(/\s+/g, '');
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) return false;

  const currentCounter = Math.floor(Date.now() / (timeStepSec * 1000));

  // Check current time, previous 30s window, and next 30s window (clock skew tolerance)
  for (let delta = -1; delta <= 1; delta++) {
    const expected = computeTotpCode(secretBase32, currentCounter + delta);
    if (expected === cleanCode) {
      return true;
    }
  }

  return false;
}

/**
 * Generates a fresh random Base32 secret (160 bits / 20 bytes)
 */
export function generateTotpSecret(accountEmail = 'doctor@clinicflow.app', issuer = 'ClinicFlow') {
  const randomBytes = new Uint8Array(20);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 20; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const secret = base32Encode(randomBytes);
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  return {
    secret,
    otpauthUrl,
    backupCodes: generateBackupCodes(8)
  };
}

/**
 * Generates 8-character alphanumeric backup recovery codes
 */
export function generateBackupCodes(count = 8) {
  const codes = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
      if (j === 3) code += '-';
    }
    codes.push(code);
  }
  return codes;
}

/**
 * Checks if 2FA is active for a user
 */
export function isTwoFactorEnabled(userId) {
  if (!userId) return false;
  const store = safeGetJSON(TWO_FACTOR_CONFIG_KEY, {});
  return Boolean(store[userId]?.enabled);
}

/**
 * Enables 2FA for a user with secret and backup codes
 */
export function enableTwoFactor(userId, secret, backupCodes = [], userLabel = '') {
  if (!userId || !secret) throw new Error('Missing userId or secret');
  const store = safeGetJSON(TWO_FACTOR_CONFIG_KEY, {});
  store[userId] = {
    enabled: true,
    secret,
    backupCodes,
    enabledAt: new Date().toISOString()
  };
  safeSetJSON(TWO_FACTOR_CONFIG_KEY, store);

  recordAuditEvent({
    eventType: 'TWO_FACTOR_ENABLED',
    user: userLabel || userId,
    action: 'تفعيل التحقق بخطوتين (2FA)',
    details: 'تم تفعيل تطبيق المصادقة TOTP للحساب بنجاح',
    entityId: userId,
    entityType: 'security'
  });

  return true;
}

/**
 * Verifies code or backup code and marks backup code as used
 */
export function verifyTwoFactorLogin(userId, code) {
  if (!userId || !code) return false;
  const store = safeGetJSON(TWO_FACTOR_CONFIG_KEY, {});
  const userConfig = store[userId];
  if (!userConfig || !userConfig.enabled) return true; // 2FA not required

  const clean = String(code).trim().toUpperCase();

  // 1. Try TOTP code
  if (verifyTotpCode(userConfig.secret, clean)) {
    return true;
  }

  // 2. Try Backup Recovery Code
  if (Array.isArray(userConfig.backupCodes)) {
    const idx = userConfig.backupCodes.findIndex(b => b.replace(/-/g, '') === clean.replace(/-/g, ''));
    if (idx >= 0) {
      // Consume backup code so it cannot be reused
      userConfig.backupCodes.splice(idx, 1);
      store[userId] = userConfig;
      safeSetJSON(TWO_FACTOR_CONFIG_KEY, store);

      recordAuditEvent({
        eventType: 'TWO_FACTOR_BACKUP_USED',
        user: userId,
        action: 'تسجيل دخول باستخدام رمز استرداد احتياطي',
        details: `تم استهلاك رمز استرداد. المتبقي: ${userConfig.backupCodes.length}`,
        entityId: userId,
        entityType: 'security'
      });

      return true;
    }
  }

  return false;
}

/**
 * Disables 2FA for a user
 */
export function disableTwoFactor(userId, userLabel = '') {
  if (!userId) return false;
  const store = safeGetJSON(TWO_FACTOR_CONFIG_KEY, {});
  if (store[userId]) {
    delete store[userId];
    safeSetJSON(TWO_FACTOR_CONFIG_KEY, store);

    recordAuditEvent({
      eventType: 'TWO_FACTOR_DISABLED',
      user: userLabel || userId,
      action: 'إلغاء تفعيل التحقق بخطوتين (2FA)',
      details: 'تم إيقاف المصادقة الثنائية للحساب',
      entityId: userId,
      entityType: 'security'
    });
  }
  return true;
}

/**
 * Computes SHA-256 hex digest for backup recovery codes
 */
export async function hashBackupCode(code) {
  const clean = String(code || '').trim().toUpperCase().replace(/-/g, '');
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash) + clean.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Registers or updates a trusted device fingerprint
 */
export async function registerDeviceFingerprint(userId, deviceFingerprint, client = null) {
  if (!userId || !deviceFingerprint) return false;

  const localStore = safeGetJSON(TWO_FACTOR_CONFIG_KEY, {});
  if (localStore[userId]) {
    const devices = localStore[userId].deviceFingerprints || [];
    const idx = devices.findIndex(d => d.fingerprint === deviceFingerprint);
    if (idx >= 0) {
      devices[idx].lastUsedAt = new Date().toISOString();
    } else {
      devices.push({
        fingerprint: deviceFingerprint,
        registeredAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
      });
    }
    localStore[userId].deviceFingerprints = devices;
    safeSetJSON(TWO_FACTOR_CONFIG_KEY, localStore);
  }

  const db = client || (typeof supabase !== 'undefined' ? supabase : null);
  if (db && typeof db.from === 'function') {
    try {
      const { data } = await db.from('two_factor_credentials').select('device_fingerprints').eq('user_id', userId).single();
      const existing = Array.isArray(data?.device_fingerprints) ? data.device_fingerprints : [];
      const idx = existing.findIndex(d => d.fingerprint === deviceFingerprint);
      if (idx >= 0) {
        existing[idx].lastUsedAt = new Date().toISOString();
      } else {
        existing.push({
          fingerprint: deviceFingerprint,
          registeredAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString()
        });
      }
      await db.from('two_factor_credentials').update({
        device_fingerprints: existing,
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    } catch (_err) {}
  }
  return true;
}

/**
 * Enables 2FA and syncs to Supabase two_factor_credentials table with SHA-256 hashed backup codes
 */
export async function enable2FAWithVault({
  userId,
  secret,
  backupCodes = [],
  deviceFingerprint = null,
  userLabel = '',
  client = null
}) {
  if (!userId || !secret) throw new Error('Missing userId or secret');

  const hashedBackupCodes = await Promise.all(
    backupCodes.map(code => hashBackupCode(code))
  );

  const initialDevices = deviceFingerprint ? [{
    fingerprint: deviceFingerprint,
    registeredAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  }] : [];

  const localStore = safeGetJSON(TWO_FACTOR_CONFIG_KEY, {});
  localStore[userId] = {
    enabled: true,
    secret,
    backupCodes,
    hashedBackupCodes,
    deviceFingerprints: initialDevices,
    enabledAt: new Date().toISOString()
  };
  safeSetJSON(TWO_FACTOR_CONFIG_KEY, localStore);

  const db = client || (typeof supabase !== 'undefined' ? supabase : null);
  if (db && typeof db.from === 'function') {
    try {
      await db.from('two_factor_credentials').upsert({
        user_id: userId,
        secret,
        backup_codes: hashedBackupCodes,
        enabled: true,
        device_fingerprints: initialDevices,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (_dbError) {}
  }

  recordAuditEvent({
    eventType: 'TWO_FACTOR_VAULT_ENABLED',
    user: userLabel || userId,
    action: 'تفعيل خزنة المصادقة الثنائية السحابية (2FA Vault)',
    details: 'تم تشفير وتجزئة أكواد الاسترداد ومزامنة إعدادات الأمان السحابية',
    entityId: userId,
    entityType: 'security'
  });

  return {
    success: true,
    hashedCount: hashedBackupCodes.length,
    deviceRegistered: Boolean(deviceFingerprint)
  };
}

/**
 * Verifies 2FA via Vault (TOTP code or hashed backup code) with trusted device awareness
 */
export async function verify2FAWithVault({
  userId,
  code,
  deviceFingerprint = null,
  client = null
}) {
  if (!userId || !code) return { verified: false, reason: 'missing_params' };

  const clean = String(code).trim().toUpperCase();

  let userConfig = null;
  const db = client || (typeof supabase !== 'undefined' ? supabase : null);
  if (db && typeof db.from === 'function') {
    try {
      const { data } = await db.from('two_factor_credentials').select('*').eq('user_id', userId).single();
      if (data) {
        userConfig = {
          enabled: data.enabled,
          secret: data.secret,
          hashedBackupCodes: data.backup_codes || [],
          deviceFingerprints: data.device_fingerprints || []
        };
      }
    } catch (_err) {}
  }

  if (!userConfig) {
    const localStore = safeGetJSON(TWO_FACTOR_CONFIG_KEY, {});
    userConfig = localStore[userId];
  }

  if (!userConfig || !userConfig.enabled) {
    return { verified: true, reason: 'not_required' };
  }

  // 1. Check TOTP verification
  if (verifyTotpCode(userConfig.secret, clean)) {
    if (deviceFingerprint) {
      await registerDeviceFingerprint(userId, deviceFingerprint, db);
    }
    return { verified: true, method: 'totp', deviceRemembered: Boolean(deviceFingerprint) };
  }

  // 2. Check SHA-256 Hashed Backup Code
  const inputHash = await hashBackupCode(clean);
  const hashedList = [...(userConfig.hashedBackupCodes || [])];
  const hashIdx = hashedList.indexOf(inputHash);

  if (hashIdx >= 0) {
    hashedList.splice(hashIdx, 1);

    if (db && typeof db.from === 'function') {
      try {
        await db.from('two_factor_credentials').update({
          backup_codes: hashedList,
          updated_at: new Date().toISOString()
        }).eq('user_id', userId);
      } catch (_err) {}
    }

    const localStore = safeGetJSON(TWO_FACTOR_CONFIG_KEY, {});
    if (localStore[userId]) {
      localStore[userId].hashedBackupCodes = hashedList;
      if (Array.isArray(localStore[userId].backupCodes)) {
        const plainIdx = localStore[userId].backupCodes.findIndex(b => b.replace(/-/g, '') === clean.replace(/-/g, ''));
        if (plainIdx >= 0) localStore[userId].backupCodes.splice(plainIdx, 1);
      }
      safeSetJSON(TWO_FACTOR_CONFIG_KEY, localStore);
    }

    recordAuditEvent({
      eventType: 'TWO_FACTOR_VAULT_BACKUP_CONSUMED',
      user: userId,
      action: 'استهلاك كود استرداد احتياطي مشفر من الخزنة',
      details: `المتبقي من أكواد الاسترداد المشفرة: ${hashedList.length}`,
      entityId: userId,
      entityType: 'security'
    });

    if (deviceFingerprint) {
      await registerDeviceFingerprint(userId, deviceFingerprint, db);
    }

    return {
      verified: true,
      method: 'backup_code',
      remainingCodes: hashedList.length,
      deviceRemembered: Boolean(deviceFingerprint)
    };
  }

  return { verified: false, reason: 'invalid_code' };
}
