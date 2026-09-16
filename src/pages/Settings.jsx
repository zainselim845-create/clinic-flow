import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Building2, Users, CalendarDays, CreditCard, Stethoscope, Globe, Smartphone
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
import SmsConfigTab from './settings/SmsConfigTab';
import { useTenant } from '../context/TenantContext';
import { clinicInfo as defaultClinicInfo } from '../data/demoData';
import { Tabs } from '../components/ui/tabs';
import './Settings.css';

const VALID_TABS = ['clinic', 'schedule', 'visitTypes', 'staff', 'sms', 'subscription', 'customDomain'];
const CLIENT_TABS = ['clinic', 'schedule', 'visitTypes', 'staff'];

const Settings = () => {
  const { state, dispatch } = useApp();
  const { user, updateClinicInfo } = useAuth();
  const { tenant, tenantSlug, updateTenantInfo } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  
  const isSuperAdmin = user?.role === 'super_admin' || user?.isSuperAdmin === true;
  const allowedTabs = isSuperAdmin ? VALID_TABS : CLIENT_TABS;

  const [activeTab, setActiveTab] = useState(() => {
    if (tabFromUrl && allowedTabs.includes(tabFromUrl)) return tabFromUrl;
    return 'clinic';
  });

  useEffect(() => {
    if (tabFromUrl) {
      if (allowedTabs.includes(tabFromUrl)) {
        setActiveTab((prev) => (prev !== tabFromUrl ? tabFromUrl : prev));
      } else {
        setActiveTab('clinic');
        setSearchParams({ tab: 'clinic' }, { replace: true });
      }
    }
  }, [tabFromUrl, isSuperAdmin, allowedTabs]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const useSupabase = isSupabaseConfigured();

  // Clinic Profile State
  const initialClinicInfo = state.clinicInfo || tenant || defaultClinicInfo;

  const [clinicForm, setClinicForm] = useState(initialClinicInfo);
  const [clinicSaveSuccess, setClinicSaveSuccess] = useState(false);

  // Sync clinicForm when active tenant identity changes (switch clinic or initial load)
  useEffect(() => {
    const source = tenant || state.clinicInfo;
    if (source) {
      setClinicForm(prev => {
        // Only initialize or preserve local user edits
        if (!prev || prev.id !== source.id || prev.slug !== source.slug) {
          return source;
        }
        return {
          ...source,
          ...prev,
          branding: {
            ...(source.branding || {}),
            ...(prev.branding || {})
          }
        };
      });
    }
  }, [state.clinicInfo?.id, tenant?.id, tenant?.slug]);

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
    if (updateTenantInfo) {
      updateTenantInfo(clinicForm);
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>مركز إعدادات العيادة والنظام </h1>
          <p>إدارة هوية العيادة، مواعيد العمل والورديات، أنواع الزيارات والأسعار، وطاقم العمل</p>
        </div>
        {isSuperAdmin && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#047857',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <span>⚙️ وضع مدير الساس (Super Admin)</span>
            <a 
              href="/super-admin"
              style={{ color: '#047857', textDecoration: 'underline', fontWeight: 800 }}
            >
              الذهاب إلى لوحة إدارة الساس ↗
            </a>
          </div>
        )}
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
            <span>ملف العيادة</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="schedule"
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          >
            <CalendarDays size={18} />
            <span>مواعيد العمل</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="visitTypes"
            className={`tab-btn ${activeTab === 'visitTypes' ? 'active' : ''}`}
          >
            <Stethoscope size={18} />
            <span>أنواع الزيارات</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="staff"
            className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>طاقم العمل</span>
          </Tabs.Trigger>

          {/* Platform Infrastructure Tabs - Strictly Isolated to Platform SuperAdmin */}
          {isSuperAdmin && (
            <>
              <Tabs.Trigger 
                value="sms"
                className={`tab-btn admin-badge-tab ${activeTab === 'sms' ? 'active' : ''}`}
                title="إعدادات بوابات الرسائل واسم المرسل (إدارة الساس فقط)"
              >
                <Smartphone size={18} />
                <span>رسائل الـ SMS واسم المرسل</span>
              </Tabs.Trigger>

              <Tabs.Trigger 
                value="subscription"
                className={`tab-btn admin-badge-tab ${activeTab === 'subscription' ? 'active' : ''}`}
                title="إدارة الباقة والترخيص والحصص (إدارة الساس فقط)"
              >
                <CreditCard size={18} />
                <span>الاشتراك والباقة</span>
              </Tabs.Trigger>

              <Tabs.Trigger 
                value="customDomain"
                className={`tab-btn admin-badge-tab ${activeTab === 'customDomain' ? 'active' : ''}`}
                title="إدارة الدومين الخاص والـ SSL (إدارة الساس فقط)"
              >
                <Globe size={18} />
                <span>الدومين الخاص</span>
              </Tabs.Trigger>
            </>
          )}
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
              visitTypes={clinicForm?.services || state.clinicInfo?.services || []}
              onUpdateVisitTypes={(newTypes) => {
                const currentSlug = tenantSlug || tenant?.slug || 'dr-ahmed';
                const updated = {
                  ...(clinicForm || state.clinicInfo),
                  services: newTypes
                };
                setClinicForm(updated);
                dispatch({
                  type: 'UPDATE_CLINIC_INFO',
                  payload: { services: newTypes }
                });
                if (updateTenantInfo) {
                  updateTenantInfo({ services: newTypes });
                }
                try {
                  const scopedKey = `clinicflow_data_${currentSlug}`;
                  const stored = localStorage.getItem(scopedKey);
                  const parsed = stored ? JSON.parse(stored) : {};
                  parsed.clinicInfo = updated;
                  parsed.services = newTypes;
                  localStorage.setItem(scopedKey, JSON.stringify(parsed));
                  if (currentSlug === 'dr-ahmed') {
                    localStorage.setItem('clinicflow_data', JSON.stringify(parsed));
                  }
                } catch (_) {}
              }}
            />
          </Tabs.Content>

          <Tabs.Content value="staff">
            <StaffManagementTab
              staffMembers={state.staffMembers || []}
              dispatch={dispatch}
            />
          </Tabs.Content>

          {isSuperAdmin && (
            <>
              <Tabs.Content value="sms">
                <SmsConfigTab />
              </Tabs.Content>

              <Tabs.Content value="subscription">
                <SubscriptionPlanTab />
              </Tabs.Content>

              <Tabs.Content value="customDomain">
                <CustomDomainTab />
              </Tabs.Content>
            </>
          )}
        </div>
      </Tabs.Root>
    </div>
  );
};

export default Settings;
