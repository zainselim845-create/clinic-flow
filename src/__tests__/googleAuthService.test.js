import { describe, it, expect, beforeEach } from 'vitest';
import { safeStorage } from '../utils/safeStorage';
import { 
  getGoogleClientId, 
  saveGoogleClientId, 
  isGoogleAuthAvailable, 
  decodeGoogleCredential, 
  getGoogleOAuthSetupInfo 
} from '../services/googleAuthService';

describe('googleAuthService', () => {
  beforeEach(() => {
    safeStorage.clear();
  });

  it('retrieves default preconfigured Google Client ID out of the box', () => {
    expect(getGoogleClientId()).toBe('337379604098-6bp302kv7mmsuccf806ah1tba6grkoio.apps.googleusercontent.com');
    expect(isGoogleAuthAvailable()).toBe(true);
  });

  it('saves and retrieves Google Client ID correctly', () => {
    const mockId = '1234567890-testabc123.apps.googleusercontent.com';
    saveGoogleClientId(mockId);
    expect(getGoogleClientId()).toBe(mockId);
    expect(isGoogleAuthAvailable()).toBe(true);
  });

  it('clears Google Client ID when empty string passed', () => {
    saveGoogleClientId('1234567890-testabc123.apps.googleusercontent.com');
    saveGoogleClientId('');
    expect(getGoogleClientId()).toBe('');
    expect(isGoogleAuthAvailable()).toBe(false);
  });

  it('decodes standard Google JWT credential correctly', () => {
    const payload = {
      sub: 'google-uid-999',
      email: 'doctor.test@gmail.com',
      name: 'د. محمد علي',
      picture: 'https://example.com/avatar.jpg',
      email_verified: true
    };
    const b64Payload = typeof Buffer !== 'undefined' 
      ? Buffer.from(JSON.stringify(payload)).toString('base64')
      : btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const fakeJwt = `header.${b64Payload}.signature`;

    const decoded = decodeGoogleCredential(fakeJwt);
    expect(decoded.email).toBe('doctor.test@gmail.com');
    expect(decoded.name).toBe('د. محمد علي');
    expect(decoded.sub).toBe('google-uid-999');
    expect(decoded.email_verified).toBe(true);
  });

  it('throws error when decoding invalid credential', () => {
    expect(() => decodeGoogleCredential(null)).toThrow();
    expect(() => decodeGoogleCredential('invalid-jwt')).toThrow();
  });

  it('returns valid setup info and URIs', () => {
    const setupInfo = getGoogleOAuthSetupInfo();
    expect(setupInfo).toHaveProperty('origin');
    expect(setupInfo).toHaveProperty('loginRedirect');
    expect(Array.isArray(setupInfo.authorizedOrigins)).toBe(true);
    expect(Array.isArray(setupInfo.authorizedRedirects)).toBe(true);
  });
});

describe('Cloud-First Registration and Google Auth Sync', () => {
  beforeEach(() => {
    safeStorage.clear();
  });

  it('syncTenantAndUserToCloud queues payload if fetch is rejected or unavailable', async () => {
    const { syncTenantAndUserToCloud, flushPendingCloudSyncQueue } = await import('../services/authService');
    
    // Simulate network error
    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error('Network offline'));

    const testTenant = { id: 'clinic-google-test', slug: 'dr-google', name: 'عيادة د. تجربة' };
    const testUser = { id: 'google-usr-1', email: 'test.google@gmail.com', name: 'د. تجربة' };

    const result = await syncTenantAndUserToCloud(testTenant, testUser);
    expect(result).toBe(false);

    // Verify it was queued in safeStorage
    const pending = safeStorage.getItem('clinicflow_pending_cloud_sync');
    expect(pending).toBeTruthy();
    const parsed = typeof pending === 'string' ? JSON.parse(pending) : pending;
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].tenant.id).toBe('clinic-google-test');
    expect(parsed[0].user.email).toBe('test.google@gmail.com');

    // Now restore fetch and flush
    global.fetch = () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await flushPendingCloudSyncQueue();
    expect(safeStorage.getItem('clinicflow_pending_cloud_sync')).toBeNull();

    global.fetch = originalFetch;
  });

  it('syncTenantAndUserToCloud succeeds immediately when cloud API returns ok', async () => {
    const { syncTenantAndUserToCloud } = await import('../services/authService');
    const originalFetch = global.fetch;
    global.fetch = () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Saved to cloud' })
    });

    const testTenant = { id: 'clinic-google-live', slug: 'dr-live', name: 'عيادة د. لايف' };
    const testUser = { id: 'google-usr-2', email: 'live.google@gmail.com', name: 'د. لايف' };

    const ok = await syncTenantAndUserToCloud(testTenant, testUser);
    expect(ok).toBe(true);

    global.fetch = originalFetch;
  });
});
