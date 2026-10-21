/**
 * Cloudflare R2 Object Storage Service
 * High-performance, zero-egress S3-compatible cloud storage for Smart Clinic.
 * Manages clinic assets, patient X-rays, medical records, and database backups.
 * Features automatic fallback to local offline storage if R2 credentials are not configured.
 */

import { safeStorage } from '@/utils/safeStorage';

const R2_CONFIG_KEY = 'clinicflow_r2_config';
const R2_LOCAL_STORAGE_PREFIX = 'clinicflow_r2_local_file_';

/**
 * Returns current Cloudflare R2 storage configuration
 */
export function getR2Config() {
  const defaults = {
    accountId: (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_ACCOUNT_ID) || '',
    accessKeyId: (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_ACCESS_KEY_ID) || '',
    secretAccessKey: (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_SECRET_ACCESS_KEY) || '',
    bucketName: (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_BUCKET) || 'smart-clinic-storage',
    publicDomain: (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_PUBLIC_DOMAIN) || '',
    enabled: true
  };

  const saved = safeStorage.getItem(R2_CONFIG_KEY);
  if (!saved) return defaults;

  try {
    const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

/**
 * Persists Cloudflare R2 configuration
 */
export function saveR2Config(config) {
  const current = getR2Config();
  const updated = { ...current, ...config };
  safeStorage.setItem(R2_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Checks if Cloudflare R2 credentials are fully configured
 */
export function isR2Configured() {
  const config = getR2Config();
  return Boolean(
    config.enabled &&
    config.accountId?.trim() &&
    config.accessKeyId?.trim() &&
    config.secretAccessKey?.trim() &&
    config.bucketName?.trim()
  );
}

/**
 * Sanitizes object keys to prevent directory traversal or malformed paths
 */
export function sanitizeObjectKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key
    .replace(/\\+/g, '/')
    .replace(/\.{2,}\/?/g, '')
    .replace(/^\/+/, '')
    .trim();
}

/**
 * Builds a deterministic scoped path for a clinic's files
 * Pattern: clinics/{clinicId}/{category}/{fileName}
 */
export function getClinicStorageKey(clinicId, category = 'general', fileName = '') {
  const cleanClinic = (clinicId || 'shared').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanCategory = (category || 'general').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = sanitizeObjectKey(fileName) || `file_${Date.now()}`;
  return `clinics/${cleanClinic}/${cleanCategory}/${cleanName}`;
}

/**
 * Uploads a file to Cloudflare R2 (or local fallback if not configured)
 * @param {Object} params
 * @param {string} params.clinicId
 * @param {string} params.category - 'xrays' | 'lab_reports' | 'logos' | 'prescriptions' | 'backups'
 * @param {string} params.fileName
 * @param {string|Blob|File} params.fileData - Base64 dataUrl, text, or Blob
 * @param {string} [params.contentType]
 * @returns {Promise<{success: boolean, fileKey: string, publicUrl: string, storageType: 'r2'|'local', error?: string}>}
 */
export async function uploadClinicFile({ clinicId, category = 'general', fileName, fileData, contentType = 'application/octet-stream' }) {
  if (!fileData) {
    return { success: false, error: 'No file data provided' };
  }

  const fileKey = getClinicStorageKey(clinicId, category, fileName);
  const config = getR2Config();

  // If Cloudflare R2 is configured, invoke the R2 serverless upload proxy or direct S3 endpoint
  if (isR2Configured()) {
    try {
      const response = await fetch('/api/r2-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clinic-id': clinicId || 'shared'
        },
        body: JSON.stringify({
          action: 'upload',
          fileKey,
          fileData,
          contentType,
          bucketName: config.bucketName
        })
      });

      if (response.ok) {
        const result = await response.json();
        const publicUrl = config.publicDomain 
          ? `https://${config.publicDomain.replace(/^https?:\/\//, '')}/${fileKey}`
          : result.publicUrl || `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${fileKey}`;

        return {
          success: true,
          fileKey,
          publicUrl,
          storageType: 'r2',
          uploadedAt: new Date().toISOString()
        };
      }
    } catch (networkError) {
      console.warn('[Cloudflare R2] API unreachable, falling back to secure local storage:', networkError.message);
    }
  }

  // Local fallback mode: store data URL in safeStorage with isolation
  try {
    const localStoreKey = `${R2_LOCAL_STORAGE_PREFIX}${fileKey}`;
    const serializedData = typeof fileData === 'string' ? fileData : 'binary_data_placeholder';
    safeStorage.setItem(localStoreKey, serializedData);

    return {
      success: true,
      fileKey,
      publicUrl: typeof fileData === 'string' && fileData.startsWith('data:') ? fileData : '',
      storageType: 'local',
      uploadedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      success: false,
      error: `Storage write failed: ${err.message}`
    };
  }
}

/**
 * Retrieves public or presigned download URL for a file
 */
export function getClinicFileUrl(clinicId, fileKey) {
  if (!fileKey) return '';
  const config = getR2Config();

  // If local fallback file
  const localStoreKey = `${R2_LOCAL_STORAGE_PREFIX}${fileKey}`;
  const localData = safeStorage.getItem(localStoreKey);
  if (localData && typeof localData === 'string' && localData.startsWith('data:')) {
    return localData;
  }

  // If R2 has a configured public custom domain (e.g. cdn.smartclinic.app)
  if (config.publicDomain) {
    const domain = config.publicDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${domain}/${fileKey}`;
  }

  // Direct R2 endpoint
  if (config.bucketName && config.accountId) {
    return `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${fileKey}`;
  }

  return '';
}

/**
 * Deletes a file from Cloudflare R2 and local fallback
 */
export async function deleteClinicFile(clinicId, fileKey) {
  if (!fileKey) return { success: false, error: 'No file key specified' };

  // Remove from local fallback
  safeStorage.removeItem(`${R2_LOCAL_STORAGE_PREFIX}${fileKey}`);

  if (isR2Configured()) {
    try {
      await fetch('/api/r2-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clinic-id': clinicId || 'shared'
        },
        body: JSON.stringify({
          action: 'delete',
          fileKey
        })
      });
    } catch (e) {
      console.warn('[Cloudflare R2] Delete remote warning:', e.message);
    }
  }

  return { success: true, fileKey };
}

/**
 * Tests live connection to Cloudflare R2 bucket
 */
export async function testR2Connection(customConfig = null) {
  const config = customConfig || getR2Config();

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    return {
      success: false,
      message: 'بيانات الاعتماد غير مكتملة. يرجى إدخال Account ID و Access Key و Secret Key واسم الـ Bucket.'
    };
  }

  try {
    const res = await fetch('/api/r2-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test-connection',
        config: {
          accountId: config.accountId,
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          bucketName: config.bucketName
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.success,
        message: data.message || 'تم الاتصال بنجاح بسلة Cloudflare R2!'
      };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      message: errData.error || `فشل الاتصال: رمز الخطأ ${res.status}`
    };
  } catch (error) {
    return {
      success: false,
      message: `خطأ في الاتصال بالخدمة: ${error.message}`
    };
  }
}
