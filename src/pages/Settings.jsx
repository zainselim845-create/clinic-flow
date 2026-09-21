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
import { isAdminRole } from '../utils/permissions';
import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import './Settings.css';

const VALID_TABS = ['clinic', 'schedule', 'visitTypes', 'staff', 'sms', 'subscription', 'customDomain'];
// const CLIENT_TABS = ['clinic', 'schedule', 'visitTypes', 'staff']
const CLIENT_TABS = ['clinic', 'schedule', 'visitTypes', 'staff', 'subscription', 'customDomain'];

const Settings = () => {
  const { state, dispatch } = useApp();
  const { user, updateClinicInfo } = useAuth();
  const { tenant, tenantSlug, updateTenantInfo } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  
  const isSuperAdmin = user?.role === 'super_admin' || user?.isSuperAdmin === true;
  const isAdmin = isAdminRole(user);
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
    const currentSlug = tenantSlug || tenant?.slug || 'dr-ahmed';
    const scopedKey = `clinicflow_data_${currentSlug}`;
    const parsed = safeGetJSON(scopedKey, {});
    parsed.clinicInfo = clinicForm;
    if (clinicForm.services) parsed.services = clinicForm.services;
    safeSetJSON(scopedKey, parsed);
    if (currentSlug === 'dr-ahmed') {
      safeSetJSON('clinicflow_data', parsed);
    }

    setClinicSaveSuccess(true);
    setTimeout(() => setClinicSaveSuccess(false), 3500);
  };

  if (!isAdmin) {
    return (
      <div className="settings-page" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{
          maxWidth: '500px',
          margin: '3rem auto',
          padding: '2.5rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E4E4E7',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Building2 size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090B', marginBottom: '0.5rem' }}>
            إعدادات العيادة مخصصة للإدارة فقط
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#71717A', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            حسابك الحالي مسجل بصلاحية سريرية (طبيب). إدارة ملف العيادة، مواعيد العمل، حسابات الموظفين، والاشتراكات مقتصرة على إدارة ومالك العيادة.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.6rem 1.5rem',
              backgroundColor: '#09090B',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            العودة إلى لوحة العيادة
          </a>
        </div>
      </div>
    );
  }

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

          <Tabs.Trigger 
            value="subscription"
            className={`tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
            title="متابعة باقة الاشتراك، الرصيد، والترخيص"
          >
            <CreditCard size={18} />
            <span>الاشتراك والباقة</span>
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="customDomain"
            className={`tab-btn ${activeTab === 'customDomain' ? 'active' : ''}`}
            title="إدارة الدومين الخاص والـ SSL"
          >
            <Globe size={18} />
            <span>الدومين الخاص</span>
          </Tabs.Trigger>

          {isSuperAdmin && (
            <Tabs.Trigger 
              value="sms"
              className={`tab-btn admin-badge-tab ${activeTab === 'sms' ? 'active' : ''}`}
              title="إعدادات بوابات الرسائل واسم المرسل (إدارة الساس فقط)"
            >
              <Smartphone size={18} />
              <span>رسائل الـ SMS واسم المرسل</span>
            </Tabs.Trigger>
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
                  const scopedKey = `clinicflow_data_${currentSlug}`;
                  const parsed = safeGetJSON(scopedKey, {});
                  parsed.clinicInfo = updated;
                  parsed.services = newTypes;
                  safeSetJSON(scopedKey, parsed);
                  if (currentSlug === 'dr-ahmed') {
                    safeSetJSON('clinicflow_data', parsed);
                  }
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

          {isSuperAdmin && (
            <Tabs.Content value="sms">
              <SmsConfigTab />
            </Tabs.Content>
          )}
        </div>
      </Tabs.Root>
    </div>
  );
};

export default Settings;
