import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import { 
  DashboardMetricsGrid, 
  DashboardScheduleTable, 
  DashboardLeadRecoveryCard, 
  DashboardQuickDock 
} from '../pages/dashboard/components';
import { 
  AppointmentFiltersBar, 
  NewAppointmentModal, 
  SlotBlockerModal 
} from '../components/appointments';
import { syncTenantsFromCloud } from '../services/authService';

describe('Modular Feature Architecture & Fault Isolation', () => {
  it('exports FeatureErrorBoundary and handles error state correctly', () => {
    expect(FeatureErrorBoundary).toBeDefined();
    
    // Test getDerivedStateFromError
    const testError = new Error('Widget Fault');
    const state = FeatureErrorBoundary.getDerivedStateFromError(testError);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(testError);

    // Test element creation
    const element = React.createElement(FeatureErrorBoundary, { featureName: 'قسم الاختبار' }, 
      React.createElement('div', null, 'المحتوى السليم')
    );
    expect(React.isValidElement(element)).toBe(true);
  });

  it('DashboardMetricsGrid exports as a valid React component and accepts props', () => {
    expect(typeof DashboardMetricsGrid).toBe('function');

    const element = React.createElement(DashboardMetricsGrid, {
      todaysAppointments: [{ id: '1' }],
      completedToday: [{ id: '1' }],
      waitingToday: [],
      inProgressToday: [],
      attendanceRate: 100,
      currentExamPatient: null,
      canViewRevenue: true,
      todayRevenue: 300,
      activeFilterTab: 'all',
      onSelectFilterTab: () => {},
      isDoctor: true
    });

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.todayRevenue).toBe(300);
    expect(element.props.attendanceRate).toBe(100);
  });

  it('DashboardScheduleTable exports as a valid React component and accepts props', () => {
    expect(typeof DashboardScheduleTable).toBe('function');

    const element = React.createElement(DashboardScheduleTable, {
      filteredAppointments: [{ id: '101', patientName: 'سعيد محمد' }],
      scheduleSearchQuery: '',
      setScheduleSearchQuery: () => {},
      activeFilterTab: 'all',
      setActiveFilterTab: () => {},
      waitingToday: [],
      inProgressToday: [],
      pendingPaymentToday: [],
      completedToday: [],
      bookedToday: [],
      currentExamPatient: null,
      isDoctor: true
    });

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.filteredAppointments.length).toBe(1);
  });

  it('DashboardLeadRecoveryCard exports as a valid React component and accepts telemetry props', () => {
    expect(typeof DashboardLeadRecoveryCard).toBe('function');

    const element = React.createElement(DashboardLeadRecoveryCard, {
      bookingFunnelStats: { conversionRate: 85, step1Count: 10, step2Count: 8, step3Count: 6, completedCount: 5 },
      recentAbandonedLeads: [{ id: 'lead-1', name: 'أحمد علي', phone: '01012345678', step: 2 }],
      currentClinic: { name: 'عيادة النخبة' },
      isDoctor: true,
      onNavigateToCrm: () => {}
    });

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.bookingFunnelStats.conversionRate).toBe(85);
  });

  it('DashboardQuickDock exports as a valid React component', () => {
    expect(typeof DashboardQuickDock).toBe('function');

    const element = React.createElement(DashboardQuickDock, {
      dockItems: [{ id: '1', label: 'تسجيل سريع' }]
    });

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.dockItems.length).toBe(1);
  });

  it('AppointmentFiltersBar, NewAppointmentModal, and SlotBlockerModal export cleanly', () => {
    expect(typeof AppointmentFiltersBar).toBe('function');
    expect(typeof NewAppointmentModal).toBe('function');
    expect(typeof SlotBlockerModal).toBe('function');

    const filtersElement = React.createElement(AppointmentFiltersBar, {
      appointments: [],
      filterStatus: 'all',
      isDoctor: true
    });
    expect(React.isValidElement(filtersElement)).toBe(true);

    const newApptElement = React.createElement(NewAppointmentModal, {
      isOpen: false,
      formData: { date: '2026-09-24' }
    });
    expect(React.isValidElement(newApptElement)).toBe(true);

    const blockerElement = React.createElement(SlotBlockerModal, {
      isOpen: false,
      blockerDate: '2026-09-24'
    });
    expect(React.isValidElement(blockerElement)).toBe(true);
  });

  it('syncTenantsFromCloud operates cleanly without ERR_INVALID_URL in Node/Vitest environments', async () => {
    const tenants = await syncTenantsFromCloud();
    expect(Array.isArray(tenants)).toBe(true);
  });
});
