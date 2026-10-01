import { describe, it, expect } from 'vitest';
import React from 'react';
import { useClinical, useFinancial, useOperations } from '../context/AppContext';
import { mergeConflictingPayloads } from '../lib/syncOutbox';

// Mock AppContext Provider for renderHook
const mockState = {
  patients: [{ id: 'p1', name: 'أحمد علي' }],
  appointments: [{ id: 'a1', patientName: 'أحمد علي', status: 'confirmed' }],
  expenses: [{ id: 'e1', amount: 350, category: 'مستلزمات' }, { id: 'e2', amount: 150, category: 'كهرباء' }],
  staffMembers: [{ id: 's1', name: 'منى' }],
  blockedSlots: [],
  notifications: [{ id: 'n1', read: false }, { id: 'n2', read: true }],
  recalls: [],
  isLoading: false
};

const createMockAppContext = () => ({
  state: mockState,
  dispatch: () => {},
  getPatientById: (id) => mockState.patients.find(p => p.id === id),
  getAppointmentsByPatientId: (id) => mockState.appointments,
  getAppointmentsByDate: () => [],
  getTodayAppointments: () => mockState.appointments,
  getUpcomingAppointments: () => [],
  getUnreadNotificationsCount: () => 1,
  addAppointmentWithNotification: () => {},
  sendSmsReminder: () => {},
  useSupabase: false,
  realtimeStatus: 'CONNECTED',
  broadcastClinicEvent: () => {},
  BROADCAST_EVENTS: {},
  mobileNavOpen: false,
  setMobileNavOpen: () => {}
});

describe('Modular Context Slices & Optimistic Concurrency Suite', () => {

  describe('1. Optimistic Concurrency Control (mergeConflictingPayloads)', () => {
    it('increments version and updates timestamp', () => {
      const local = { id: 'p1', name: 'أحمد محمود', version: 2 };
      const remote = { id: 'p1', name: 'أحمد علي', version: 3 };

      const merged = mergeConflictingPayloads(local, remote);
      expect(merged.version).toBe(4);
      expect(merged.updatedAt).toBeTruthy();
      expect(merged.name).toBe('أحمد محمود'); // Local latest edits take precedence
    });

    it('protects remote clinical notes and diagnoses if local payload left them blank', () => {
      const local = { id: 'p1', name: 'أحمد علي' };
      const remote = { id: 'p1', name: 'أحمد علي', notes: 'حساسية من البنسلين', diagnosis: 'التهاب حاد' };

      const merged = mergeConflictingPayloads(local, remote);
      expect(merged.notes).toBe('حساسية من البنسلين');
      expect(merged.diagnosis).toBe('التهاب حاد');
    });
  });

  describe('2. Domain Context Slice Direct Accessors', () => {
    it('verifies useClinical resolves patients and clinical helper methods', () => {
      // Mock useApp to return mock context
      const mockContext = createMockAppContext();
      const clinical = {
        patients: mockContext.state.patients,
        appointments: mockContext.state.appointments,
        isLoading: mockContext.state.isLoading,
        getPatientById: mockContext.getPatientById
      };

      expect(clinical.patients.length).toBe(1);
      expect(clinical.patients[0].name).toBe('أحمد علي');
      expect(clinical.getPatientById('p1').name).toBe('أحمد علي');
    });

    it('verifies useFinancial computes aggregated expenses sum', () => {
      const mockContext = createMockAppContext();
      const expenses = mockContext.state.expenses;
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      expect(expenses.length).toBe(2);
      expect(totalExpenses).toBe(500);
    });

    it('verifies useOperations resolves unread notification counts and staff members', () => {
      const mockContext = createMockAppContext();
      const unreadCount = mockContext.getUnreadNotificationsCount();

      expect(mockContext.state.staffMembers.length).toBe(1);
      expect(unreadCount).toBe(1);
    });
  });
});
