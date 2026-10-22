import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import {
  mapPostgresChangeToDomainAction,
  createClinicRealtimeManager,
  REALTIME_STATUS,
  BROADCAST_EVENTS
} from '@/features/platform/services/realtimeSyncService';
import { financeReducer } from '@/context/reducers/financeReducer';
import { systemReducer } from '@/context/reducers/systemReducer';
import ApiIntegrationsTab from '@/pages/settings/ApiIntegrationsTab';
import { testR2Connection } from '@/features/platform/services/r2StorageService';
import { testAiConnection } from '@/features/clinical/services/aiAssistantService';
import fs from 'fs';
import path from 'path';

describe('Real-Time Instant Reactivity & API Integrations Suite', () => {

  describe('1. Realtime Sync Service & Postgres Changes Mapping', () => {
    it('maps incoming invoices INSERT/UPDATE/DELETE to proper domain actions', () => {
      const invoiceRow = {
        id: 'inv-101',
        clinic_id: 'clinic-cairo',
        patient_name: 'محمد فتحي',
        total: 1200,
        paid_amount: 1000,
        payment_status: 'partial'
      };

      const insertAction = mapPostgresChangeToDomainAction('invoices', {
        eventType: 'INSERT',
        new: invoiceRow
      });
      expect(insertAction).toBeTruthy();
      expect(insertAction.type).toBe('ADD_INVOICE');
      expect(insertAction.payload.id).toBe('inv-101');
      expect(insertAction.payload.patientName).toBe('محمد فتحي');
      expect(insertAction.payload.total).toBe(1200);

      const updateAction = mapPostgresChangeToDomainAction('invoices', {
        eventType: 'UPDATE',
        new: { ...invoiceRow, payment_status: 'paid', paid_amount: 1200 }
      });
      expect(updateAction.type).toBe('UPDATE_INVOICE');
      expect(updateAction.payload.paymentStatus).toBe('paid');

      const deleteAction = mapPostgresChangeToDomainAction('invoices', {
        eventType: 'DELETE',
        old: { id: 'inv-101' }
      });
      expect(deleteAction.type).toBe('DELETE_INVOICE');
      expect(deleteAction.payload).toBe('inv-101');
    });

    it('maps incoming clinics UPDATE and INSERT to UPDATE_CLINIC_INFO', () => {
      const clinicRow = {
        id: 'clinic-cairo',
        name: 'عيادة القاهرة التخصصية',
        phone: '01012345678',
        specialty: 'طب الأسنان'
      };

      const updateAction = mapPostgresChangeToDomainAction('clinics', {
        eventType: 'UPDATE',
        new: clinicRow
      });
      expect(updateAction).toBeTruthy();
      expect(updateAction.type).toBe('UPDATE_CLINIC_INFO');
      expect(updateAction.payload.name).toBe('عيادة القاهرة التخصصية');
      expect(updateAction.payload.specialty).toBe('طب الأسنان');

      const insertAction = mapPostgresChangeToDomainAction('clinics', {
        eventType: 'INSERT',
        new: clinicRow
      });
      expect(insertAction.type).toBe('UPDATE_CLINIC_INFO');
    });

    it('subscribes to both invoices and clinics tables with clinic filtering', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((cb) => { cb?.('SUBSCRIBED'); return mockChannel; }),
        send: vi.fn().mockResolvedValue('ok')
      };
      const mockSupabase = {
        channel: vi.fn(() => mockChannel),
        removeChannel: vi.fn()
      };

      const manager = createClinicRealtimeManager({
        supabaseClient: mockSupabase,
        clinicId: 'clinic-target-id',
        onDispatch: vi.fn()
      });

      expect(manager.status).toBe(REALTIME_STATUS.SUBSCRIBED);

      // Verify that postgres_changes listeners were registered
      const registeredTables = mockChannel.on.mock.calls
        .filter(call => call[0] === 'postgres_changes')
        .map(call => call[1].table);

      expect(registeredTables).toContain('invoices');
      expect(registeredTables).toContain('clinics');
      expect(registeredTables).toContain('appointments');
      expect(registeredTables).toContain('patients');
      expect(registeredTables).toContain('expenses');
    });
  });

  describe('2. Finance Reducer & State Aggregation', () => {
    it('handles ADD_INVOICE and creates an instant notification', () => {
      const state = { invoices: [], notifications: [] };
      const newInvoice = { id: 'inv-1', patientName: 'سارة أحمد', total: 500, paidAmount: 500 };

      const next = financeReducer(state, {
        type: 'ADD_INVOICE',
        payload: newInvoice
      });

      expect(next.invoices.length).toBe(1);
      expect(next.invoices[0].id).toBe('inv-1');
      expect(next.notifications.length).toBe(1);
      expect(next.notifications[0].type).toBe('invoice');
      expect(next.notifications[0].message).toContain('سارة أحمد');
    });

    it('updates existing invoice idempotently without duplicate insertions', () => {
      const state = {
        invoices: [{ id: 'inv-1', patientName: 'سارة', total: 500 }],
        notifications: []
      };

      const updated = { id: 'inv-1', patientName: 'سارة', total: 600 };
      const next = financeReducer(state, {
        type: 'ADD_INVOICE',
        payload: updated
      });

      expect(next.invoices.length).toBe(1);
      expect(next.invoices[0].total).toBe(600);
    });

    it('handles UPDATE_INVOICE and DELETE_INVOICE correctly', () => {
      let state = {
        invoices: [
          { id: 'inv-1', total: 300, paymentStatus: 'unpaid' },
          { id: 'inv-2', total: 400, paymentStatus: 'unpaid' }
        ]
      };

      state = financeReducer(state, {
        type: 'UPDATE_INVOICE',
        payload: { id: 'inv-1', total: 300, paymentStatus: 'paid' }
      });
      expect(state.invoices.find(i => i.id === 'inv-1').paymentStatus).toBe('paid');

      state = financeReducer(state, {
        type: 'DELETE_INVOICE',
        payload: 'inv-2'
      });
      expect(state.invoices.length).toBe(1);
      expect(state.invoices[0].id).toBe('inv-1');
    });

    it('resets invoices on SWITCH_TENANT_START in systemReducer', () => {
      const state = {
        invoices: [{ id: 'inv-1' }],
        patients: [{ id: 'p-1' }],
        appointments: [{ id: 'a-1' }]
      };
      const next = systemReducer(state, {
        type: 'SWITCH_TENANT_START',
        payload: { tenantSlug: 'new-clinic' }
      });
      expect(next.invoices).toEqual([]);
      expect(next.currentTenantSlug).toBe('new-clinic');
    });
  });

  describe('3. Settings Registration & Tab Architecture', () => {
    it('verifies Settings.jsx includes "apis" in VALID_TABS and CLIENT_TABS', () => {
      const settingsContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Settings.jsx'), 'utf8');
      expect(settingsContent).toContain("'apis'");
      expect(settingsContent).toMatch(/<Tabs\.Trigger\s+value="apis"/);
      expect(settingsContent).toContain('<Tabs.Content value="apis">');
      expect(settingsContent).toContain('<ApiIntegrationsTab />');
    });

    it('verifies ApiIntegrationsTab is exported as a valid React component', () => {
      expect(typeof ApiIntegrationsTab).toBe('function');
      const compStr = ApiIntegrationsTab.toString();
      expect(compStr).toContain('canManageApis');
      expect(compStr).toContain('handleTestR2');
      expect(compStr).toContain('handleTestAi');
      expect(compStr).toContain('handleTestSms');
      expect(compStr).toContain('handleTestWebhook');
    });

    it('verifies AppContext includes invoices and BroadcastChannel cross-tab dispatching', () => {
      const appContextContent = fs.readFileSync(path.resolve(process.cwd(), 'src/context/AppContext.jsx'), 'utf8');
      expect(appContextContent).toContain('BroadcastChannel');
      expect(appContextContent).toContain('clinicflow_app_actions_');
      expect(appContextContent).toContain('_remote: true');
      expect(appContextContent).toContain('invoices: invoicesRes?.data || []');
      expect(appContextContent).toContain('totalRevenue');
    });
  });

});
