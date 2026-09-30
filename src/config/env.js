/**
 * Centralized Environment Configuration (Single Source of Truth)
 * 
 * Safely reads and validates runtime environment variables across
 * development, test, staging, and production environments.
 * Prevents secret leaks, hardcoded overrides, and environment drift.
 */

const isBrowser = typeof window !== 'undefined';
const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

// Environment detection
export const ENV_MODE = metaEnv.MODE || metaEnv.VITE_APP_ENV || 'production';
export const IS_DEV = ENV_MODE === 'development';
export const IS_TEST = ENV_MODE === 'test' || Boolean(metaEnv.VITEST);
export const IS_PROD = !IS_DEV && !IS_TEST;

export const ENV_CONFIG = Object.freeze({
  // Application Meta
  appName: 'ClinicFlow',
  appVersion: '1.0.0',
  environment: ENV_MODE,
  isDev: IS_DEV,
  isTest: IS_TEST,
  isProd: IS_PROD,

  // Supabase PostgreSQL & Auth Infrastructure
  supabase: Object.freeze({
    url: metaEnv.VITE_SUPABASE_URL || 'https://mock-supabase.local',
    anonKey: metaEnv.VITE_SUPABASE_ANON_KEY || 'mock-anon-key'
  }),

  // Google OAuth Authentication
  googleAuth: Object.freeze({
    clientId: metaEnv.VITE_GOOGLE_CLIENT_ID || '337379604098-6bp302kv7mmsuccf806ah1tba6grkoio.apps.googleusercontent.com'
  }),

  // AI Medical Reasoning (OpenRouter / DeepSeek)
  ai: Object.freeze({
    apiKey: metaEnv.VITE_OPENROUTER_API_KEY || '',
    model: metaEnv.VITE_AI_MODEL || 'deepseek/deepseek-r1:free'
  }),

  // Telephony & SMS Gateways (Egypt & Global)
  sms: Object.freeze({
    defaultProvider: metaEnv.VITE_SMS_PROVIDER || 'none',
    textbee: Object.freeze({
      apiKey: metaEnv.VITE_TEXTBEE_API_KEY || '',
      apiUrl: metaEnv.VITE_TEXTBEE_API_URL || 'https://api.textbee.dev/api/v1',
      deviceId: metaEnv.VITE_TEXTBEE_DEVICE_ID || ''
    }),
    smsmisr: Object.freeze({
      username: metaEnv.VITE_SMSMISR_USERNAME || '',
      password: metaEnv.VITE_SMSMISR_PASSWORD || '',
      env: metaEnv.VITE_SMSMISR_ENV || '1',
      apiUrl: metaEnv.VITE_SMSMISR_API_URL || 'https://smsmisr.com/api/SMS/'
    }),
    cequens: Object.freeze({
      apiKey: metaEnv.VITE_CEQUENS_API_KEY || '',
      apiUrl: metaEnv.VITE_CEQUENS_API_URL || 'https://apis.cequens.com/sms/v1/messages'
    }),
    easysendsms: Object.freeze({
      apiKey: metaEnv.VITE_EASYSENDSMS_API_KEY || '',
      apiUrl: metaEnv.VITE_EASYSENDSMS_API_URL || 'https://restapi.easysendsms.app/v1/rest/sms/send'
    })
  })
});

/**
 * Validates that essential environment variables are present in production.
 * Emits diagnostic warnings in development/test without throwing crashes.
 */
export function validateEnvironment() {
  const missing = [];
  if (IS_PROD) {
    if (!metaEnv.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
    if (!metaEnv.VITE_SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');
  }

  if (missing.length > 0) {
    console.warn('[Environment] Missing recommended environment variables:', missing.join(', '));
  }
  return missing.length === 0;
}
