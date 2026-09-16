import { describe, it, expect } from 'vitest';
import React from 'react';
import DoctorAiFloatingWidget from '../components/DoctorAiFloatingWidget';
import fs from 'fs';
import path from 'path';
import { processDoctorIntent } from '../utils/clinicalAssistantActions';

describe('DoctorAiFloatingWidget & Ubiquitous Copilot Access', () => {
  it('exports DoctorAiFloatingWidget as a valid React component', () => {
    expect(DoctorAiFloatingWidget).toBeDefined();
    expect(typeof DoctorAiFloatingWidget).toBe('function');
  });

  it('creates a valid React element with isOpen and onToggle props', () => {
    const onToggleMock = () => {};
    const element = React.createElement(DoctorAiFloatingWidget, {
      isOpen: false,
      onToggle: onToggleMock
    });
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.isOpen).toBe(false);
    expect(element.props.onToggle).toBe(onToggleMock);
  });

  it('verifies DoctorAiFloatingWidget.jsx source includes shortcut Alt+A, floating FAB, and essential quick pills', () => {
    const filePath = path.resolve(__dirname, '../components/DoctorAiFloatingWidget.jsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // FAB button & Alt+A keyboard shortcut
    expect(content).toContain('Alt+A');
    expect(content).toContain('ai-copilot-fab');
    expect(content).toContain('ai-copilot-drawer');

    // Essential clinical quick pills
    expect(content).toContain('كشوفات اليوم وصالة الانتظار');
    expect(content).toContain('حجز موعد');
    expect(content).toContain('المديونيات المعلقة');
    expect(content).toContain('جدول الإجازات');

    // Database action synchronization
    expect(content).toContain('processDoctorIntent');
    expect(content).toContain('appointmentsService.addAppointment');
    expect(content).toContain('clinicflow_doctor_chat_history');
  });

  it('verifies that floating clutter is removed from App.jsx and Header.jsx for clean UX', () => {
    const appPath = path.resolve(__dirname, '../App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');
    expect(appContent).not.toContain('<DoctorAiFloatingWidget');

    const headerPath = path.resolve(__dirname, '../components/Header.jsx');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');
    expect(headerContent).not.toContain('header-ai-copilot-btn');
  });

  it('verifies that secondary modules (Labs, Radiology, Inventory) are marked as optional in clinicalAssistantActions', () => {
    const state = {
      patients: [],
      appointments: [],
      invoices: [],
      inventory: [],
      dentalLabOrders: []
    };

    const labResult = processDoctorIntent('عايز اشوف شغل المعامل والتركيبات', state);
    expect(labResult.replyText).toContain('وحدة اختيارية بالعيادة');

    const invResult = processDoctorIntent('عايز اعرف المخزون والمستلزمات', state);
    expect(invResult.replyText).toContain('وحدة اختيارية بالعيادة');
  });
});
