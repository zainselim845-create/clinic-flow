import { describe, it, expect } from 'vitest';
import { hasPermission, canAccessRoute, SYSTEM_PERMISSIONS } from '../permissions';

describe('ClinicFlow Permissions & Access Control Engine (test-guard compliant)', () => {
  const doctorUser = {
    id: 'doc-1',
    name: 'د. أحمد الشريف',
    role: 'doctor'
  };

  const adminUser = {
    id: 'admin-1',
    name: 'المدير العام',
    role: 'admin'
  };

  const receptionStaff = {
    id: 'staff-1',
    name: 'سارة كمال',
    role: 'staff',
    permissions: ['appointments', 'patients', 'sms']
  };

  const financeStaff = {
    id: 'staff-2',
    name: 'محمود طارق',
    role: 'staff',
    permissions: ['invoices', 'inventory']
  };

  describe('1. SYSTEM_PERMISSIONS definitions', () => {
    it('has valid structure and Arabic descriptions for all permissions', () => {
      expect(SYSTEM_PERMISSIONS.length).toBeGreaterThanOrEqual(6);
      SYSTEM_PERMISSIONS.forEach(perm => {
        expect(perm.id).toBeDefined();
        expect(perm.name).toBeDefined();
        expect(perm.badgeColor).toBeDefined();
      });
    });
  });

  describe('2. Doctor / Admin Privileges', () => {
    it('grants doctor full access to all system permissions and routes', () => {
      expect(hasPermission(doctorUser, 'appointments')).toBe(true);
      expect(hasPermission(doctorUser, 'invoices')).toBe(true);
      expect(hasPermission(doctorUser, 'doctor_only')).toBe(true);
      expect(canAccessRoute(doctorUser, '/settings')).toBe(true);
      expect(canAccessRoute(doctorUser, '/doctor-agent')).toBe(true);
      expect(canAccessRoute(doctorUser, '/invoices')).toBe(true);
    });

    it('grants admin full access to all system permissions and routes', () => {
      expect(hasPermission(adminUser, 'appointments')).toBe(true);
      expect(canAccessRoute(adminUser, '/settings')).toBe(true);
    });
  });

  describe('3. Staff Role-Based Access Control', () => {
    it('grants staff access only to their assigned permissions', () => {
      expect(hasPermission(receptionStaff, 'appointments')).toBe(true);
      expect(hasPermission(receptionStaff, 'patients')).toBe(true);
      expect(hasPermission(receptionStaff, 'sms')).toBe(true);
      expect(hasPermission(receptionStaff, 'invoices')).toBe(false);
      expect(hasPermission(receptionStaff, 'inventory')).toBe(false);
      expect(hasPermission(receptionStaff, 'doctor_only')).toBe(false);
    });

    it('correctly validates route access for reception staff', () => {
      expect(canAccessRoute(receptionStaff, '/appointments')).toBe(true);
      expect(canAccessRoute(receptionStaff, '/patients')).toBe(true);
      expect(canAccessRoute(receptionStaff, '/')).toBe(true); // Dashboard accessible
      expect(canAccessRoute(receptionStaff, '/invoices')).toBe(false);
      expect(canAccessRoute(receptionStaff, '/doctor-agent')).toBe(false);
      expect(canAccessRoute(receptionStaff, '/settings')).toBe(false);
    });

    it('correctly validates route access for finance/inventory staff', () => {
      expect(canAccessRoute(financeStaff, '/invoices')).toBe(true);
      expect(canAccessRoute(financeStaff, '/inventory')).toBe(true);
      expect(canAccessRoute(financeStaff, '/appointments')).toBe(false);
      expect(canAccessRoute(financeStaff, '/patients')).toBe(false);
    });

    it('denies access when user is null or undefined', () => {
      expect(hasPermission(null, 'appointments')).toBe(false);
      expect(canAccessRoute(undefined, '/appointments')).toBe(false);
    });
  });
});
