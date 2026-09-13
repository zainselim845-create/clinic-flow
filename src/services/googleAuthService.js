import { safeStorage } from '../utils/safeStorage';

const STORAGE_KEY = 'clinicflow_google_client_id';

/**
 * Retrieves the configured Google OAuth 2.0 Client ID
 */
export const getGoogleClientId = () => {
  const stored = safeStorage.getItem(STORAGE_KEY, null);
  if (stored && stored.trim().length > 10) {
    return stored.trim();
  }
  const envKey = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (envKey && envKey.trim().length > 10) {
    return envKey.trim();
  }
  return '';
};

/**
 * Saves or clears the Google OAuth Client ID
 */
export const saveGoogleClientId = (clientId) => {
  if (clientId && clientId.trim().length > 0) {
    safeStorage.setItem(STORAGE_KEY, clientId.trim());
  } else {
    safeStorage.removeItem(STORAGE_KEY);
  }
};

/**
 * Checks if Google Client ID is configured
 */
export const isGoogleAuthAvailable = () => {
  const id = getGoogleClientId();
  return Boolean(id && id.length > 15);
};

/**
 * Safely decodes a Google ID Token (JWT) payload
 */
export const decodeGoogleCredential = (credential) => {
  if (!credential || typeof credential !== 'string') {
    throw new Error('رمز تعريف Google (Credential) مفقود أو غير صالح.');
  }

  try {
    const base64Url = credential.split('.')[1];
    if (!base64Url) throw new Error('JWT payload missing');
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload;
    if (typeof atob === 'function') {
      try {
        jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      } catch {
        jsonPayload = atob(base64);
      }
    } else if (typeof Buffer !== 'undefined') {
      jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    } else {
      throw new Error('Base64 decoder is not available.');
    }

    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to decode Google credential:', err);
    throw new Error('تعذر فك شفرة بيانات اعتماد حساب Google.');
  }
};

/**
 * Triggers Google OAuth 2.0 flow via Token Client (Popup window from accounts.google.com)
 */
export const triggerGoogleOAuthPopup = () => {
  return new Promise((resolve, reject) => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      return reject(new Error('يرجى ضبط معرّف عميل Google (Client ID) أولاً'));
    }

    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      return reject(new Error('خدمات Google Identity Services غير محملة بعد، يرجى تحديث الصفحة والمحاولة ثانية.'));
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error || 'تم إلغاء تسجيل الدخول عبر Google'));
          }

          try {
            // Fetch real user profile from Google UserInfo endpoint
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`
              }
            });

            if (!res.ok) {
              throw new Error('تعذر استلام ملف التعريف الشخصي من خوادم Google');
            }

            const userInfo = await res.json();
            resolve({
              id: userInfo.sub,
              sub: userInfo.sub,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
              email_verified: userInfo.email_verified,
              accessToken: tokenResponse.access_token
            });
          } catch (err) {
            reject(err);
          }
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'فشلت نافذة تسجيل دخول Google'));
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Initializes Google One-Tap or native prompt
 */
export const initGoogleOneTap = ({ onCredential, onError }) => {
  const clientId = getGoogleClientId();
  if (!clientId || typeof window === 'undefined' || !window.google?.accounts?.id) {
    return false;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        try {
          const profile = decodeGoogleCredential(response.credential);
          if (onCredential) {
            onCredential({
              id: profile.sub,
              sub: profile.sub,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
              email_verified: profile.email_verified,
              credential: response.credential
            });
          }
        } catch (err) {
          if (onError) onError(err);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    window.google.accounts.id.prompt();
    return true;
  } catch (err) {
    console.warn('Google One Tap init failed:', err);
    if (onError) onError(err);
    return false;
  }
};

/**
 * Provides current domain instructions for Google Cloud Console setup
 */
export const getGoogleOAuthSetupInfo = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow-lh3g.vercel.app';
  return {
    origin,
    loginRedirect: `${origin}/login`,
    dashboardRedirect: `${origin}/dashboard`,
    authorizedOrigins: [
      origin,
      'https://clinic-flow-lh3g.vercel.app',
      'http://localhost:5173',
      'http://localhost:4173'
    ],
    authorizedRedirects: [
      `${origin}/login`,
      'https://clinic-flow-lh3g.vercel.app/login',
      'http://localhost:5173/login',
      'http://localhost:4173/login'
    ]
  };
};
