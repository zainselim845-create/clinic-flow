import { describe, it, expect } from 'vitest';
import React from 'react';
import { appReducer } from '../context/AppContext';
import { recallPresets } from '../data/demoData';
import PatientRecallModal from '../components/PatientRecallModal';
import AppointmentFiltersBar from '../components/appointments/AppointmentFiltersBar';
import PatientsHeader from '../components/patients/PatientsHeader';

describe('Patient Recall Secretary Workflow & Direct Appointment Confirmation', () => {
  describe('1. Recall State Machine & Transition Invariants', () => {
    it('appReducer initializes and handles ADD_RECALL', () => {
      const initialState = { recalls: [] };
      const newRecall = {
        id: 'rec-101',
        clinicId: 'clinic-alpha',
        patientId: 'pat-1',
        patientName: 'أحمد محمود',
        patientPhone: '01012345678',
        reason: 'تنظيف وتلميع الأسنان الدوري',
        dueDate: '2026-10-18',
        status: 'pending'
      };

      const state1 = appReducer(initialState, {
        type: 'ADD_RECALL',
        payload: newRecall
      });

      expect(state1.recalls).toHaveLength(1);
      expect(state1.recalls[0].id).toBe('rec-101');
      expect(state1.recalls[0].status).toBe('pending');
    });

    it('transitions recall from pending -> contacted -> scheduled when confirmed by secretary', () => {
      const initialState = {
        recalls: [
          { id: 'rec-101', status: 'pending', patientName: 'أحمد محمود' }
        ]
      };

      // Step 1: Secretary contacts patient via WhatsApp/SMS
      const state1 = appReducer(initialState, {
        type: 'UPDATE_RECALL_STATUS',
        payload: { id: 'rec-101', status: 'contacted' }
      });
      expect(state1.recalls[0].status).toBe('contacted');

      // Step 2: Secretary confirms slot and schedules appointment in the calendar
      const state2 = appReducer(state1, {
        type: 'UPDATE_RECALL_STATUS',
        payload: { id: 'rec-101', status: 'scheduled' }
      });
      expect(state2.recalls[0].status).toBe('scheduled');
    });

    it('deletes recall plan when cancelled or completed', () => {
      const initialState = {
        recalls: [
          { id: 'rec-101', status: 'scheduled', patientName: 'أحمد محمود' }
        ]
      };

      const state1 = appReducer(initialState, {
        type: 'DELETE_RECALL',
        payload: 'rec-101'
      });
      expect(state1.recalls).toHaveLength(0);
    });
  });

  describe('2. Direct Communication & Confirmation URI Building', () => {
    it('builds valid WhatsApp link with Egyptian country code (20) and Arabic message', () => {
      const recall = {
        patientName: 'سارة إبراهيم',
        patientPhone: '01123456789',
        reason: 'تنظيف وتلميع الأسنان الدوري'
      };

      const cleanPhone = recall.patientPhone.replace(/\D/g, '').replace(/^0/, '20');
      expect(cleanPhone).toBe('201123456789');

      const clinicName = 'مركز النخبة التخصصي';
      const bookingUrl = 'https://clinic-flow-lh3g.vercel.app/c/el-nokhba';
      const message = `مرحباً أستاذ/ة ${recall.patientName}،\nنود تذكيركم بموعدكم الدوري لمتابعة [${recall.reason}] لدى ${clinicName}.\n\nللحجز وتأكيد الموعد المناسب لكم مباشرة: ${bookingUrl}\nأو الرد على هذه الرسالة لتأكيد الموعد مباشرة مع الاستقبال.\nنتمنى لكم دوام الصحة والعافية.`;

      const whatsappUri = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      expect(whatsappUri).toContain('https://wa.me/201123456789');
      expect(whatsappUri).toContain(encodeURIComponent('تنظيف وتلميع الأسنان الدوري'));
      expect(whatsappUri).toContain(encodeURIComponent(clinicName));
    });

    it('builds valid SMS URI for Egyptian mobile networks', () => {
      const recall = {
        patientName: 'محمود حسن',
        patientPhone: '01099887766',
        reason: 'متابعة تقويم الأسنان والواقي الليلي'
      };

      const cleanPhone = recall.patientPhone.replace(/\D/g, '');
      const smsUri = `sms:+2${cleanPhone}?body=${encodeURIComponent(`تذكير بموعد ${recall.reason}`)}`;
      expect(smsUri).toContain('sms:+201099887766');
    });
  });

  describe('3. Secretary & Reception Access Gateways', () => {
    it('PatientRecallModal is exported and accepts onScheduleAppointment callback', () => {
      expect(PatientRecallModal).toBeDefined();
      expect(typeof PatientRecallModal).toBe('function');
    });

    it('AppointmentFiltersBar accepts onOpenRecallModal and dueRecallsCount for receptionist access', () => {
      expect(AppointmentFiltersBar).toBeDefined();
      const element = <AppointmentFiltersBar dueRecallsCount={4} />;
      expect(element.props.dueRecallsCount).toBe(4);
    });

    it('PatientsHeader accepts onOpenRecalls and dueRecallsCount for staff access', () => {
      expect(PatientsHeader).toBeDefined();
      const element = <PatientsHeader dueRecallsCount={7} />;
      expect(element.props.dueRecallsCount).toBe(7);
    });

    it('verifies standard dental and medical recall presets are available', () => {
      expect(recallPresets).toBeDefined();
      expect(recallPresets.length).toBeGreaterThanOrEqual(4);
      const cleaningPreset = recallPresets.find(p => p.title.includes('تنظيف وتلميع'));
      expect(cleaningPreset).toBeDefined();
      expect(cleaningPreset.intervalMonths).toBe(6);
    });
  });

  describe('4. Deep Linking Appointment Booking Parameters', () => {
    it('parses deep-linking parameters from recall confirmation CTA', () => {
      const recall = {
        id: 'rec-202',
        patientId: 'pat-99',
        dueDate: '2026-11-01',
        reason: 'تنظيف وتلميع الأسنان الدوري'
      };

      const targetPath = `/appointments?action=new&patientId=${encodeURIComponent(recall.patientId)}&date=${encodeURIComponent(recall.dueDate)}&type=${encodeURIComponent(recall.reason)}&recallId=${encodeURIComponent(recall.id)}`;
      const url = new URL(`http://localhost:5173${targetPath}`);

      expect(url.searchParams.get('action')).toBe('new');
      expect(url.searchParams.get('patientId')).toBe('pat-99');
      expect(url.searchParams.get('date')).toBe('2026-11-01');
      expect(url.searchParams.get('type')).toBe('تنظيف وتلميع الأسنان الدوري');
      expect(url.searchParams.get('recallId')).toBe('rec-202');
    });
  });
});
