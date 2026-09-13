import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Building2, Users, CalendarDays, CreditCard, Stethoscope, Globe, Database, Bot, Smartphone
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
import DatabaseSyncTab from './settings/DatabaseSyncTab';
import AiAssistantConfigTab from './settings/AiAssistantConfigTab';
import SmsConfigTab from './settings/SmsConfigTab';
import { useTenant } from '../context/TenantContext';
import { clinicInfo as defaultClinicInfo } from '../data/demoData';
import { Tabs } from '../components/ui/tabs';
import './Settings.css';

const VALID_TABS = ['clinic', 'schedule', 'visitTypes', 'staff', 'sms', 'subscription', 'customDomain', 'database', 'aiAssistant'];

const Settings = () => {
  const { state, dispatch } = useApp();
  const { updateClinicInfo } = useAuth();
  const { tenant, tenantSlug } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'clinic'
  );

  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

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
        onValueChange={(details) => handleTabChange(details.value)}
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
            value="sms"
            className={`tab-btn ${activeTab === 'sms' ? 'active' : ''}`}
          >
            <Smartphone size={18} />
            <span>رسائل الـ SMS واسم المرسل</span>
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

          <Tabs.Trigger 
            value="database"
            className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
          >
            <Database size={18} />
            <span>الربط السحابي والنسخ</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="aiAssistant"
            className={`tab-btn ${activeTab === 'aiAssistant' ? 'active' : ''}`}
          >
            <Bot size={18} />
            <span>المساعد الذكي (AI)</span>
          </Tabs.Trigger>
        </Tabs.List>

        <div className="settings-content-wrapper">
          <Tabs.Content value="clinic">
            <GeneralSettingsTab
              clinicForm={clinicForm}
              setClinicForm={setClinicForm}
              handleSaveClinic={handleSaveClinic}
              clinicSaveSuccess={clinicSaveSuccess}
              onNavigateToSchedule={() => handleTabChange('schedule')}
              onNavigateToVisitTypes={() => handleTabChange('visitTypes')}
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

          <Tabs.Content value="sms">
            <SmsConfigTab />
          </Tabs.Content>

          <Tabs.Content value="subscription">
            <SubscriptionPlanTab />
          </Tabs.Content>

          <Tabs.Content value="customDomain">
            <CustomDomainTab />
          </Tabs.Content>

          <Tabs.Content value="database">
            <DatabaseSyncTab state={state} dispatch={dispatch} />
          </Tabs.Content>

          <Tabs.Content value="aiAssistant">
            <AiAssistantConfigTab />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
};

export default Settings;
