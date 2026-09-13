import { 
  Building2, Users, CalendarDays, CreditCard, Stethoscope, Globe
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import * as clinicsService from '../services/clinicsService';
import { isSupabaseConfigured } from '../lib/supabase';
import GeneralSettingsTab from './settings/GeneralSettingsTab';
import { useAuth } from '../context/AuthContext';
import ScheduleBuilderTab from './settings/ScheduleBuilderTab';
import VisitTypesTab from './settings/VisitTypesTab';
import StaffManagementTab from './settings/StaffManagementTab';
import SubscriptionPlanTab from './settings/SubscriptionPlanTab';
import CustomDomainTab from './settings/CustomDomainTab';
import { useTenant } from '../context/TenantContext';
import { clinicInfo as defaultClinicInfo } from '../data/demoData';
import { Tabs } from '../components/ui/tabs';
import './Settings.css';

const Settings = () => {
  const { state, dispatch } = useApp();
  const { updateClinicInfo } = useAuth();
  const { tenant, tenantSlug } = useTenant();
  const [activeTab, setActiveTab] = useState('clinic'); // 'clinic' | 'schedule' | 'visitTypes' | 'staff' | 'subscription' | 'customDomain'

  const useSupabase = isSupabaseConfigured();

  // Clinic Profile State
  const initialClinicInfo = state.clinicInfo || tenant || defaultClinicInfo;

  const [clinicForm, setClinicForm] = useState(initialClinicInfo);
  const [clinicSaveSuccess, setClinicSaveSuccess] = useState(false);

  // Sync clinicForm whenever active tenant or state.clinicInfo updates
  useEffect(() => {
    if (state.clinicInfo) {
      setClinicForm(state.clinicInfo);
    } else if (tenant) {
      setClinicForm(tenant);
    }
  }, [state.clinicInfo, tenant]);

  const handleSaveClinic = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (useSupabase) {
      try {
        await clinicsService.updateClinicInfo(state.clinicInfo?.id, clinicForm);
      } catch (err) {
        console.error('Failed to sync clinic info to Supabase:', err);
      }
    }
    dispatch({
      type: 'UPDATE_CLINIC_INFO',
      payload: clinicForm
    });
    if (updateClinicInfo) {
      updateClinicInfo(clinicForm);
    }
    try {
      const currentSlug = tenantSlug || tenant?.slug || 'dr-ahmed';
      const scopedKey = `clinicflow_data_${currentSlug}`;
      const stored = localStorage.getItem(scopedKey);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed.clinicInfo = clinicForm;
      if (clinicForm.services) parsed.services = clinicForm.services;
      localStorage.setItem(scopedKey, JSON.stringify(parsed));
      if (currentSlug === 'dr-ahmed') {
        localStorage.setItem('clinicflow_data', JSON.stringify(parsed));
      }
    } catch (_) {}

    setClinicSaveSuccess(true);
    setTimeout(() => setClinicSaveSuccess(false), 3500);
  };



  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h2>مركز إعدادات العيادة والنظام </h2>
          <p>إدارة هوية العيادة، مواعيد العمل والإجازات، طاقم الاستقبال، والربط السحابي والذكي</p>
        </div>
      </div>

      <Tabs.Root
        value={activeTab}
        onValueChange={(details) => setActiveTab(details.value)}
        className="w-full"
      >
        <Tabs.List className="settings-tabs-nav">
          <Tabs.Trigger 
            value="clinic"
            className={`tab-btn ${activeTab === 'clinic' ? 'active' : ''}`}
          >
            <Building2 size={18} />
            <span>ملف العيادة والتسعير</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="schedule"
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          >
            <CalendarDays size={18} />
            <span>الجدول والإجازات والحظر</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="visitTypes"
            className={`tab-btn ${activeTab === 'visitTypes' ? 'active' : ''}`}
          >
            <Stethoscope size={18} />
            <span>أنواع الزيارات (Visit Types)</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="staff"
            className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>فريق العمل والاستقبال</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="subscription"
            className={`tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
          >
            <CreditCard size={18} />
            <span>الاشتراك ورصيد الباقة</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="customDomain"
            className={`tab-btn ${activeTab === 'customDomain' ? 'active' : ''}`}
          >
            <Globe size={18} />
            <span>الدومين والـ SSL</span>
          </Tabs.Trigger>
        </Tabs.List>

        <div className="settings-content-wrapper">
          <Tabs.Content value="clinic">
            <GeneralSettingsTab
              clinicForm={clinicForm}
              setClinicForm={setClinicForm}
              handleSaveClinic={handleSaveClinic}
              clinicSaveSuccess={clinicSaveSuccess}
              onNavigateToSchedule={() => setActiveTab('schedule')}
            />
          </Tabs.Content>

          <Tabs.Content value="schedule">
            <ScheduleBuilderTab
              state={state}
              dispatch={dispatch}
              clinicForm={clinicForm}
              setClinicForm={setClinicForm}
            />
          </Tabs.Content>

          <Tabs.Content value="visitTypes">
            <VisitTypesTab
              visitTypes={state.clinicInfo?.services || []}
              onUpdateVisitTypes={(newTypes) => {
                dispatch({
                  type: 'UPDATE_CLINIC_INFO',
                  payload: { services: newTypes }
                });
              }}
            />
          </Tabs.Content>

          <Tabs.Content value="staff">
            <StaffManagementTab
              staffMembers={state.staffMembers || []}
              dispatch={dispatch}
            />
          </Tabs.Content>

          <Tabs.Content value="subscription">
            <SubscriptionPlanTab />
          </Tabs.Content>

          <Tabs.Content value="customDomain">
            <CustomDomainTab />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
};

export default Settings;
