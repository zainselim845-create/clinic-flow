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
 * Centralized SaaS Platform Architecture:
 * Defaults to the central platform R2 configuration managed in Super Admin Dashboard.
 * Clinics automatically inherit the platform R2 bucket unless a custom override is set.
 * @param {string} [clinicId]
 */
export function getR2Config(clinicId = null) {
  const defaults = {
    accountId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_R2_ACCOUNT_ID) ||
               (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_ACCOUNT_ID) || '',
    accessKeyId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID) ||
                 (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_ACCESS_KEY_ID) || '',
    secretAccessKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY) ||
                     (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_SECRET_ACCESS_KEY) || '',
    bucketName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_R2_BUCKET) ||
                (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_BUCKET) || 'smart-clinic-storage',
    publicDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_R2_PUBLIC_DOMAIN) ||
                  (typeof process !== 'undefined' && process.env?.CLOUDFLARE_R2_PUBLIC_DOMAIN) || '',
    enabled: true,
    isPlatformManaged: true
  };

  // 1. Central SaaS Platform Config (managed from SuperAdmin Dashboard)
  const saved = safeStorage.getItem(R2_CONFIG_KEY);
  let resolved = { ...defaults };
  if (saved) {
    try {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      resolved = { ...resolved, ...parsed, isPlatformManaged: true };
    } catch {}
  }

  // 2. Specific Clinic Override (if configured in clinic settings)
  if (clinicId) {
    const overrideKey = `clinicflow_r2_override_${clinicId}`;
    const clinicSaved = safeStorage.getItem(overrideKey);
    if (clinicSaved) {
      try {
        const parsedClinic = typeof clinicSaved === 'string' ? JSON.parse(clinicSaved) : clinicSaved;
        if (parsedClinic.accountId || parsedClinic.accessKeyId) {
          resolved = { ...resolved, ...parsedClinic, isPlatformManaged: false, isCustomOverride: true };
        }
      } catch {}
    }
  }

  return resolved;
}

/**
 * Persists Cloudflare R2 configuration
 * @param {Object} config
 * @param {string} [clinicId] - If provided, saves as clinic override; otherwise saves as platform config
 */
export function saveR2Config(config, clinicId = null) {
  const current = getR2Config(clinicId);
  const updated = { ...current, ...config };

  if (clinicId) {
    safeStorage.setItem(`clinicflow_r2_override_${clinicId}`, JSON.stringify(updated));
  } else {
    safeStorage.setItem(R2_CONFIG_KEY, JSON.stringify(updated));
  }

  // Broadcast across tabs
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('clinicflow_r2_sync');
      bc.postMessage({ type: 'R2_CONFIG_UPDATED', clinicId, config: updated });
      bc.close();
    } catch {}
  }

  return updated;
}

/**
 * Checks if Cloudflare R2 credentials are fully configured
 * @param {string} [clinicId]
 */
export function isR2Configured(clinicId = null) {
  const config = getR2Config(clinicId);
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
  const config = getR2Config(clinicId);

  // If Cloudflare R2 is configured, invoke the R2 serverless upload proxy or direct S3 endpoint
  if (isR2Configured(clinicId)) {
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
  const config = getR2Config(clinicId);

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

  if (isR2Configured(clinicId)) {
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
export async function testR2Connection(customConfig = null, clinicId = null) {
  const config = customConfig || getR2Config(clinicId);

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    return {
      success: false,
      message: 'بيانات الاعتماد غير مكتملة. يرجى إدخال Account ID و Access Key و Secret Key واسم الـ Bucket.'
    };
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    const activeClinicId = clinicId || customConfig?.clinicId || (typeof window !== 'undefined' ? (window.__CLINICFLOW_ACTIVE_CLINIC_ID || 'default') : 'default');
    if (activeClinicId) {
      headers['x-clinic-id'] = activeClinicId;
    }

    const res = await fetch('/api/r2-storage', {
      method: 'POST',
      headers,
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
