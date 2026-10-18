import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateEtaTlvQrCode, 
  validateEgyptianVatNumber, 
  formatEgyptianVatNumber, 
  buildCompliantInvoiceData 
} from '@/features/billing/services/etaInvoiceCompliance';
import { 
  verifyNonDestructiveMigration, 
  isValidPostgresUuid 
} from '@/features/platform/services/schemaEvolutionGuard';
import { 
  getClinicChairs, 
  addClinicChair, 
  fromDbChair, 
  toDbChair 
} from '@/features/appointments/services/clinicChairsService';
import { safeSetJSON, safeGetJSON } from '@/utils/safeStorage';

describe('Enterprise Scale & Production Resilience Suite (Phase 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Egyptian Tax Authority (ETA) & E-Invoicing TLV QR Invariants
  // =========================================================================
  describe('ETA E-Invoicing & TLV Base64 QR Generator', () => {
    it('validates 9-digit Egyptian tax registration numbers correctly', () => {
      expect(validateEgyptianVatNumber('123456789')).toBe(true);
      expect(validateEgyptianVatNumber('123-456-789')).toBe(true);
      expect(validateEgyptianVatNumber('12345678')).toBe(false); // 8 digits
      expect(validateEgyptianVatNumber('1234567890')).toBe(false); // 10 digits
      expect(validateEgyptianVatNumber('')).toBe(false);
      expect(validateEgyptianVatNumber(null)).toBe(false);
    });

    it('formats Egyptian VAT number to standard XXX-XXX-XXX', () => {
      expect(formatEgyptianVatNumber('123456789')).toBe('123-456-789');
      expect(formatEgyptianVatNumber('123-456-789')).toBe('123-456-789');
      expect(formatEgyptianVatNumber('')).toBe('');
    });

    it('generates non-empty valid Base64 TLV payload for compliant invoices', () => {
      const qrPayload = generateEtaTlvQrCode({
        sellerName: 'عيادة الزين التخصصية',
        vatNumber: '123456789',
        timestamp: '2026-10-18T10:00:00Z',
        total: 750.00,
        taxAmount: 92.11
      });

      expect(typeof qrPayload).toBe('string');
      expect(qrPayload.length).toBeGreaterThan(20);

      // Verify it decodes from Base64 into binary buffer with Tag 1 at index 0
      const buffer = Buffer.from(qrPayload, 'base64');
      expect(buffer[0]).toBe(1); // Tag 1 (Seller Name)
      const sellerLen = buffer[1];
      expect(sellerLen).toBeGreaterThan(0);
      const seller = buffer.subarray(2, 2 + sellerLen).toString('utf8');
      expect(seller).toBe('عيادة الزين التخصصية');
    });

    it('builds compliant Egyptian invoice metadata with calculated net and tax', () => {
      const invoice = {
        id: 'inv-101',
        invoiceNumber: 'INV-2026-001',
        total: 1000,
        paidAmount: 600,
        createdAt: '2026-10-18T10:00:00Z'
      };

      const clinic = {
        name: 'عيادة د. زين سليم',
        taxRegistered: true,
        vatNumber: '987654321',
        vatRate: 0.14
      };

      const result = buildCompliantInvoiceData(invoice, clinic);
      expect(result.invoiceNumber).toBe('INV-2026-001');
      expect(result.isTaxRegistered).toBe(true);
      expect(result.vatNumber).toBe('987-654-321');
      expect(result.total).toBe(1000);
      expect(result.paidAmount).toBe(600);
      expect(result.remainingBalance).toBe(400);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.netBeforeTax + result.taxAmount).toBeCloseTo(1000, 1);
      expect(result.qrPayload).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. Schema Evolution & Non-Destructive Data Preservation
  // =========================================================================
  describe('Non-Destructive Schema Evolution & Data Safety', () => {
    it('approves additive and backward-compatible schema changes', () => {
      const current = {
        patients: ['id', 'clinic_id', 'name', 'phone', 'created_at'],
        appointments: ['id', 'clinic_id', 'date', 'time', 'status', 'created_at']
      };

      const target = {
        patients: ['id', 'clinic_id', 'name', 'phone', 'created_at', 'blood_type', 'deleted_at'],
        appointments: ['id', 'clinic_id', 'date', 'time', 'status', 'created_at', 'chair_id', 'version']
      };

      const verification = verifyNonDestructiveMigration(current, target);
      expect(verification.isSafe).toBe(true);
      expect(verification.violations).toHaveLength(0);
    });

    it('rejects destructive migrations that drop existing tables or columns', () => {
      const current = {
        invoices: ['id', 'clinic_id', 'total', 'paid_amount', 'created_at'],
        expenses: ['id', 'clinic_id', 'amount', 'category', 'created_at']
      };

      // Attempting to drop table 'expenses' and drop column 'paid_amount'
      const destructiveTarget = {
        invoices: ['id', 'clinic_id', 'total', 'created_at']
      };

      const verification = verifyNonDestructiveMigration(current, destructiveTarget);
      expect(verification.isSafe).toBe(false);
      expect(verification.violations.some(v => v.includes('DESTRUCTIVE_TABLE_DROP'))).toBe(true);
      expect(verification.violations.some(v => v.includes('DESTRUCTIVE_COLUMN_DROP'))).toBe(true);
    });

    it('validates UUID syntax strictly and rejects non-UUID tenant slugs', () => {
      expect(isValidPostgresUuid('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')).toBe(true);
      expect(isValidPostgresUuid('tenant-zain-selim')).toBe(false);
      expect(isValidPostgresUuid('c-1')).toBe(false);
      expect(isValidPostgresUuid('')).toBe(false);
      expect(isValidPostgresUuid(null)).toBe(false);
    });
  });

  // =========================================================================
  // 3. Multi-Chair Decoupling & First-Class Resource Management
  // =========================================================================
  describe('Clinic Chairs Service & Multi-Chair Decoupling', () => {
    it('refuses to fetch chairs without clinicId to prevent multi-tenant leaks', async () => {
      const result = await getClinicChairs(null);
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('returns default primary chair for un-synced or offline clinic slugs', async () => {
      const result = await getClinicChairs('tenant-dental-1');
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].clinicId).toBe('tenant-dental-1');
      expect(result.data[0].name).toContain('كرسي');
    });

    it('allows adding and retrieving multiple chairs with explicit sort order', async () => {
      const clinicId = 'clinic-chair-test-123';
      
      const chair1 = await addClinicChair({
        clinicId,
        name: 'كرسي العيادة أ (تقويم)',
        roomLabel: 'غرفة 1',
        sortOrder: 1
      });

      const chair2 = await addClinicChair({
        clinicId,
        name: 'كرسي العيادة ب (زراعة)',
        roomLabel: 'غرفة 2',
        sortOrder: 2
      });

      expect(chair1.data.name).toBe('كرسي العيادة أ (تقويم)');
      expect(chair2.data.name).toBe('كرسي العيادة ب (زراعة)');

      const fetched = await getClinicChairs(clinicId);
      expect(fetched.data.length).toBeGreaterThanOrEqual(2);
      expect(fetched.data.some(c => c.name.includes('تقويم'))).toBe(true);
      expect(fetched.data.some(c => c.name.includes('زراعة'))).toBe(true);
    });

    it('correctly maps chair model to and from DB format', () => {
      const clientModel = {
        clinicId: 'c-uuid-1',
        name: 'كرسي 1',
        roomLabel: 'غرفة الفحص',
        assignedDoctorId: 'doc-1',
        color: '#10B981',
        isActive: true,
        sortOrder: 3
      };

      const dbPayload = toDbChair(clientModel);
      expect(dbPayload.clinic_id).toBe('c-uuid-1');
      expect(dbPayload.room_label).toBe('غرفة الفحص');
      expect(dbPayload.assigned_doctor_id).toBe('doc-1');
      expect(dbPayload.is_active).toBe(true);
      expect(dbPayload.sort_order).toBe(3);

      const dbRow = {
        id: 'chair-uuid-99',
        clinic_id: 'c-uuid-1',
        name: 'كرسي 1',
        room_label: 'غرفة الفحص',
        assigned_doctor_id: 'doc-1',
        color: '#10B981',
        is_active: true,
        sort_order: 3,
        created_at: '2026-10-18T10:00:00Z'
      };

      const transformed = fromDbChair(dbRow);
      expect(transformed.id).toBe('chair-uuid-99');
      expect(transformed.clinicId).toBe('c-uuid-1');
      expect(transformed.roomLabel).toBe('غرفة الفحص');
      expect(transformed.sortOrder).toBe(3);
    });
  });

  // =========================================================================
  // 4. Zero-Mock Purity & Production Guardrails
  // =========================================================================
  describe('Zero-Mock Purity & Integrity Invariants', () => {
    it('verifies that no source file has hardcoded 300 fee fallbacks', async () => {
      const fs = await import('fs');
      const path = await import('path');

      // Check critical files
      const filesToCheck = [
        path.resolve(__dirname, '../pages/dashboard/ConsultationModal.jsx'),
        path.resolve(__dirname, '../features/appointments/services/appointmentsService.js'),
        path.resolve(__dirname, '../data/demoData.js'),
        path.resolve(__dirname, '../data/specialtiesData.js')
      ];

      for (const filePath of filesToCheck) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          expect(content).not.toContain("fee || '300 ج.م'");
          expect(content).not.toContain("appointment?.fee || '300 ج.م'");
        }
      }
    });
  });
});
