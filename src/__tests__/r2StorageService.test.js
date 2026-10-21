import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getR2Config, 
  saveR2Config, 
  isR2Configured, 
  getClinicStorageKey, 
  sanitizeObjectKey, 
  uploadClinicFile, 
  getClinicFileUrl, 
  deleteClinicFile, 
  testR2Connection 
} from '../features/platform/services/r2StorageService';
import { safeStorage } from '../utils/safeStorage';

describe('Cloudflare R2 Object Storage Service Unit Tests', () => {
  beforeEach(() => {
    safeStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Configuration & Security Validation', () => {
    it('returns default configuration with enabled flag and default bucket', () => {
      const config = getR2Config();
      expect(config.bucketName).toBe('smart-clinic-storage');
      expect(config.enabled).toBe(true);
      expect(config.accountId).toBeDefined();
    });

    it('persists and retrieves custom R2 configuration safely', () => {
      saveR2Config({
        accountId: 'test-account-12345',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        bucketName: 'custom-medical-bucket',
        publicDomain: 'cdn.smartclinic.app'
      });

      const config = getR2Config();
      expect(config.accountId).toBe('test-account-12345');
      expect(config.accessKeyId).toBe('test-access-key');
      expect(config.secretAccessKey).toBe('test-secret-key');
      expect(config.bucketName).toBe('custom-medical-bucket');
      expect(config.publicDomain).toBe('cdn.smartclinic.app');
    });

    it('correctly determines whether R2 is fully configured', () => {
      expect(isR2Configured()).toBe(false);

      saveR2Config({
        accountId: 'acc-1',
        accessKeyId: 'key-1',
        secretAccessKey: 'sec-1',
        bucketName: 'bucket-1'
      });

      expect(isR2Configured()).toBe(true);
    });

    it('sanitizes object keys to protect against directory traversal vulnerabilities', () => {
      expect(sanitizeObjectKey('../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizeObjectKey('\\windows\\system32\\cmd.exe')).toBe('windows/system32/cmd.exe');
      expect(sanitizeObjectKey('/root/secret/file.pdf')).toBe('root/secret/file.pdf');
    });
  });

  describe('2. Multi-Tenant Scoped Key Generation', () => {
    it('generates strictly isolated paths per clinic and medical category', () => {
      const xrayKey = getClinicStorageKey('clinic-alpha', 'xrays', 'chest_xray_patient_99.png');
      expect(xrayKey).toBe('clinics/clinic-alpha/xrays/chest_xray_patient_99.png');

      const logoKey = getClinicStorageKey('dr-sara', 'logos', 'clinic_banner.webp');
      expect(logoKey).toBe('clinics/dr-sara/logos/clinic_banner.webp');

      const backupKey = getClinicStorageKey('clinic-cairo', 'backups', 'db_2026_10_21.json');
      expect(backupKey).toBe('clinics/clinic-cairo/backups/db_2026_10_21.json');
    });

    it('handles missing clinicId or fileName gracefully with deterministic fallbacks', () => {
      const key = getClinicStorageKey(null, null, '');
      expect(key).toMatch(/^clinics\/shared\/general\/file_\d+$/);
    });
  });

  describe('3. File Upload & Storage Operations', () => {
    it('returns error when attempting to upload with no file data', async () => {
      const result = await uploadClinicFile({
        clinicId: 'clinic-1',
        fileName: 'empty.txt',
        fileData: null
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No file data');
    });

    it('successfully uploads file using local fallback storage when R2 is offline or unconfigured', async () => {
      const fileData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = await uploadClinicFile({
        clinicId: 'dr-ahmed',
        category: 'logos',
        fileName: 'logo.png',
        fileData,
        contentType: 'image/png'
      });

      expect(result.success).toBe(true);
      expect(result.storageType).toBe('local');
      expect(result.fileKey).toBe('clinics/dr-ahmed/logos/logo.png');
      expect(result.publicUrl).toBe(fileData);

      // Verify URL retrieval from fallback
      const retrievedUrl = getClinicFileUrl('dr-ahmed', result.fileKey);
      expect(retrievedUrl).toBe(fileData);
    });

    it('generates public domain CDN URL when publicDomain is configured', () => {
      saveR2Config({
        accountId: 'acc',
        accessKeyId: 'key',
        secretAccessKey: 'sec',
        bucketName: 'bucket',
        publicDomain: 'https://cdn.smartclinic.app'
      });

      const url = getClinicFileUrl('dr-ahmed', 'clinics/dr_ahmed/xrays/scan_1.jpg');
      expect(url).toBe('https://cdn.smartclinic.app/clinics/dr_ahmed/xrays/scan_1.jpg');
    });

    it('deletes file from storage cleanly', async () => {
      const fileData = 'data:text/plain;base64,SGVsbG8gU21hcnQgQ2xpbmlj';
      const upload = await uploadClinicFile({
        clinicId: 'dr-tamer',
        category: 'prescriptions',
        fileName: 'rx_1001.txt',
        fileData
      });

      expect(upload.success).toBe(true);
      expect(getClinicFileUrl('dr-tamer', upload.fileKey)).toBe(fileData);

      const deleteRes = await deleteClinicFile('dr-tamer', upload.fileKey);
      expect(deleteRes.success).toBe(true);
      expect(getClinicFileUrl('dr-tamer', upload.fileKey)).toBe('');
    });
  });

  describe('4. Connectivity Testing & Guardrails', () => {
    it('fails fast when testing connection without complete credentials', async () => {
      const res = await testR2Connection({
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        bucketName: ''
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('بيانات الاعتماد غير مكتملة');
    });
  });
});
