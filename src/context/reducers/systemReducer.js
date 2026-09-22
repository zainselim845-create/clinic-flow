import { getInitialData, getInitialDataForTenant } from '../../data/demoData';
import { getTodayDateStr } from '../../utils/timeSlots';

export function systemReducer(state, action) {
  switch (action.type) {
    case 'SWITCH_TENANT_START':
      return {
        ...state,
        isLoading: true,
        currentTenantSlug: action.payload.tenantSlug,
        patients: [],
        appointments: [],
        notifications: [],
        blockedSlots: [],
        expenses: [],
        recalls: []
      };

    case 'INIT_DATA':
      return { 
        ...state, 
        ...action.payload, 
        currentTenantSlug: action.payload.currentTenantSlug || state.currentTenantSlug,
        isLoading: false 
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'RESET_TO_FRESH_START': {
      const fresh = getInitialData();
      return {
        ...state,
        ...fresh,
        _freshReset: Date.now(),
        isLoading: false
      };
    }

    case 'WIPE_ALL_DATA_CLEAN': {
      const initial = getInitialData();
      const cleanEmpty = {
        patients: [],
        appointments: [],
        expenses: [],
        recalls: [],
        invoices: [],
        notifications: [
          {
            id: 'notif-fresh-start',
            type: 'system',
            title: 'بدء تشغيل العيادة',
            message: 'تم مسح البيانات القديمة وإعادة تهيئة النظام بحالة نظيفة جاهزة لاستقبال المرضى.',
            timestamp: new Date().toISOString(),
            read: false
          }
        ],
        blockedSlots: [],
        staffMembers: (state.staffMembers && state.staffMembers.length > 0) ? state.staffMembers : initial.staffMembers,
        clinicInfo: state.clinicInfo || initial.clinicInfo
      };
      return {
        ...state,
        ...cleanEmpty,
        _freshReset: Date.now(),
        isLoading: false
      };
    }

    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'REFRESH_TODAY_DEMO_DATA': {
      return state;
    }

    case 'RESET_ALL_DATA': {
      if (typeof window !== 'undefined') {
        const slug = state.currentTenantSlug || '';
        if (slug) localStorage.removeItem(`clinicflow_data_${slug}`);
        localStorage.removeItem('clinicflow_data');
      }
      return {
        ...state,
        patients: [],
        appointments: [],
        notifications: [],
        blockedSlots: [],
        expenses: [],
        recalls: []
      };
    }

    default:
      return state;
  }
}
