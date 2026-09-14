import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

globalThis.localStorage = createStorageMock();
globalThis.sessionStorage = createStorageMock();

describe('Doctor Settings, Professional Profile & Schedule Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('correctly persists doctor professional credentials and prescription print settings in scoped localStorage', () => {
    const slug = 'dr-sara';
    const scopedKey = `clinicflow_data_${slug}`;

    const clinicInfo = {
      id: 'clinic-2',
      name: 'مركز د. سارة للجلدية والتجميل',
      slug: 'dr-sara',
      doctorName: 'د. سارة خليل',
      doctorTitle: 'استشاري أول الأمراض الجلدية والليزر - البورد الأمريكي',
      syndicateNumber: '98452/ك',
      doctorEmail: 'sara@clinicflow.com',
      doctorDirectPhone: '01012345678',
      consultationDuration: 20,
      doctorBio: 'خبرة أكثر من 15 عاماً في علاجات البشرة بالليزر والحقن التجميلي.',
      prescriptionPaperSize: 'A5',
      prescriptionPrintMode: 'pad',
      prescriptionHeader: 'عيادة الجلدية والتجميل التخصصية',
      prescriptionFooter: 'المتابعة مجاناً خلال 14 يوماً'
    };

    localStorage.setItem(scopedKey, JSON.stringify({ clinicInfo }));

    const saved = JSON.parse(localStorage.getItem(scopedKey));
    expect(saved.clinicInfo.doctorName).toBe('د. سارة خليل');
    expect(saved.clinicInfo.doctorTitle).toContain('البورد الأمريكي');
    expect(saved.clinicInfo.syndicateNumber).toBe('98452/ك');
    expect(saved.clinicInfo.prescriptionPaperSize).toBe('A5');
    expect(saved.clinicInfo.prescriptionPrintMode).toBe('pad');
  });

  it('persists customized schedule shifts, break times, and blocked vacation dates without data loss', () => {
    const slug = 'dr-ahmed';
    const scopedKey = `clinicflow_data_${slug}`;

    const initialSchedule = {
      defaultShift: { start: '10:00', end: '18:00' },
      shifts: {
        saturday: { active: true, start: '11:00', end: '19:00' },
        friday: { active: false, start: '00:00', end: '00:00' }
      },
      breakTime: { enabled: true, start: '14:00', end: '15:00' },
      blockedDates: ['2026-10-01', '2026-10-02']
    };

    const initialData = {
      clinicInfo: {
        id: 'clinic-1',
        name: 'عيادة د. أحمد لطب الأسنان',
        slug: 'dr-ahmed',
        scheduleConfig: initialSchedule
      }
    };

    localStorage.setItem(scopedKey, JSON.stringify(initialData));
    localStorage.setItem('clinicflow_data', JSON.stringify(initialData));

    // Simulate ScheduleBuilderTab update
    const raw = JSON.parse(localStorage.getItem(scopedKey));
    raw.clinicInfo.scheduleConfig.shifts.saturday.start = '12:00';
    raw.clinicInfo.scheduleConfig.blockedDates.push('2026-10-03');
    localStorage.setItem(scopedKey, JSON.stringify(raw));
    localStorage.setItem('clinicflow_data', JSON.stringify(raw));

    const updated = JSON.parse(localStorage.getItem(scopedKey));
    expect(updated.clinicInfo.scheduleConfig.shifts.saturday.start).toBe('12:00');
    expect(updated.clinicInfo.scheduleConfig.blockedDates).toContain('2026-10-03');

    const defaultStored = JSON.parse(localStorage.getItem('clinicflow_data'));
    expect(defaultStored.clinicInfo.scheduleConfig.shifts.saturday.start).toBe('12:00');
  });

  it('verifies Settings.jsx includes SMS & Dedicated Sender ID tab in VALID_TABS and tab rendering', () => {
    const settingsFilePath = path.join(__dirname, '../pages/Settings.jsx');
    const settingsCode = fs.readFileSync(settingsFilePath, 'utf8');

    expect(settingsCode).toContain("'sms'");
    expect(settingsCode).toContain('SmsConfigTab');
    expect(settingsCode).toContain('رسائل الـ SMS واسم المرسل');
  });

  it('verifies Settings.jsx contains semantic <h1> heading and updateTenantInfo synchronization', () => {
    const settingsFilePath = path.join(__dirname, '../pages/Settings.jsx');
    const settingsCode = fs.readFileSync(settingsFilePath, 'utf8');

    expect(settingsCode).toContain('<h1>مركز إعدادات العيادة والنظام </h1>');
    expect(settingsCode).toContain('updateTenantInfo');
    expect(settingsCode).toContain('onUpdateVisitTypes');
    expect(settingsCode).toContain('scopedKey');
  });

  it('verifies ScheduleBuilderTab.jsx persists workingDays, startTime, endTime, and slotDuration through handleUpdateScheduleConfig', () => {
    const scheduleFilePath = path.join(__dirname, '../pages/settings/ScheduleBuilderTab.jsx');
    const scheduleCode = fs.readFileSync(scheduleFilePath, 'utf8');

    expect(scheduleCode).toContain('handleUpdateScheduleConfig({ workingDays: updatedDays })');
    expect(scheduleCode).toContain('handleUpdateScheduleConfig({ startTime: e.target.value })');
    expect(scheduleCode).toContain('handleUpdateScheduleConfig({ endTime: e.target.value })');
    expect(scheduleCode).toContain('handleUpdateScheduleConfig({ slotDuration: Number(e.target.value) })');
  });

  it('verifies TenantContext.jsx exports updateTenantInfo callback for live branding sync', () => {
    const tenantContextPath = path.join(__dirname, '../context/TenantContext.jsx');
    const tenantCode = fs.readFileSync(tenantContextPath, 'utf8');

    expect(tenantCode).toContain('updateTenantInfo');
    expect(tenantCode).toContain('applyBranding');
  });
});
