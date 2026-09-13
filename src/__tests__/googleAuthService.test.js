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

  it('retrieves empty string when no client ID configured', () => {
    expect(getGoogleClientId()).toBe('');
    expect(isGoogleAuthAvailable()).toBe(false);
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
