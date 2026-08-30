import React, { useState } from 'react';
import { 
  Building2, Users, CalendarDays, Smartphone, Bot, Database, Stethoscope
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import * as clinicsService from '../services/clinicsService';
import { isSupabaseConfigured } from '../lib/supabase';
import GeneralSettingsTab from './settings/GeneralSettingsTab';
import ScheduleBuilderTab from './settings/ScheduleBuilderTab';
import VisitTypesTab from './settings/VisitTypesTab';
import StaffManagementTab from './settings/StaffManagementTab';
import SmsConfigTab from './settings/SmsConfigTab';
import AiAssistantConfigTab from './settings/AiAssistantConfigTab';
import DatabaseSyncTab from './settings/DatabaseSyncTab';
import './Settings.css';


const Settings = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('clinic'); // 'clinic' | 'schedule' | 'staff' | 'sms' | 'ai' | 'database'

  const useSupabase = isSupabaseConfigured();

  // Clinic Profile State
  const clinicInfo = state.clinicInfo || {
    name: 'مركز النخبة لطب وجراحة الأسنان',
    doctorName: 'د. أحمد الشريف',
    doctorEmail: 'doctor@clinicflow.com',
    doctorPassword: 'admin',
    specialty: 'طب وجراحة الفم والأسنان وتجميل الابتسامة',
    address: 'مصر الجديدة — شارع الأهرام، برج الأطباء، الدور الرابع',
    phone: '01006285031',
    regularFee: '300 ج.م',
    consultationFee: '150 ج.م',
    workingHours: 'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً'
  };


  const [clinicForm, setClinicForm] = useState(clinicInfo);
  const [clinicSaveSuccess, setClinicSaveSuccess] = useState(false);

  const handleSaveClinic = async (e) => {
    e.preventDefault();
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
    setClinicSaveSuccess(true);
    setTimeout(() => setClinicSaveSuccess(false), 3000);
  };


  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h2>مركز إعدادات العيادة والنظام </h2>
          <p>إدارة هوية العيادة، مواعيد العمل والإجازات، طاقم الاستقبال، والربط السحابي والذكي</p>
        </div>
      </div>

      <div className="settings-tabs-nav">
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'clinic' ? 'active' : ''}`}
          onClick={() => setActiveTab('clinic')}
        >
          <Building2 size={18} />
          <span>ملف العيادة والتسعير</span>
        </button>

        <button 
          type="button"
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <CalendarDays size={18} />
          <span>الجدول والإجازات والحظر</span>
        </button>

        <button 
          type="button"
          className={`tab-btn ${activeTab === 'visitTypes' ? 'active' : ''}`}
          onClick={() => setActiveTab('visitTypes')}
        >
          <Stethoscope size={18} />
          <span>أنواع الزيارات (Visit Types)</span>
        </button>

        <button 
          type="button"
          className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={18} />
          <span>فريق العمل والاستقبال</span>
        </button>


        <button 
          type="button"
          className={`tab-btn ${activeTab === 'sms' ? 'active' : ''}`}
          onClick={() => setActiveTab('sms')}
        >
          <Smartphone size={18} />
          <span>بوابات الـ SMS</span>
        </button>

        <button 
          type="button"
          className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <Bot size={18} />
          <span>الذكاء الاصطناعي (AI)</span>
        </button>

        <button 
          type="button"
          className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          <Database size={18} />
          <span>السحابة والنسخ الاحتياطي</span>
        </button>
      </div>

      <div className="settings-content-wrapper">
        {activeTab === 'clinic' && (
          <GeneralSettingsTab
            clinicForm={clinicForm}
            setClinicForm={setClinicForm}
            handleSaveClinic={handleSaveClinic}
            clinicSaveSuccess={clinicSaveSuccess}
            onNavigateToSchedule={() => setActiveTab('schedule')}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleBuilderTab
            state={state}
            dispatch={dispatch}
            clinicForm={clinicForm}
            setClinicForm={setClinicForm}
          />
        )}

        {activeTab === 'visitTypes' && (
          <VisitTypesTab
            visitTypes={state.clinicInfo?.services || []}
            onUpdateVisitTypes={(newTypes) => {
              dispatch({
                type: 'UPDATE_CLINIC_INFO',
                payload: { services: newTypes }
              });
            }}
          />
        )}

        {activeTab === 'staff' && (

          <StaffManagementTab
            staffMembers={state.staffMembers || []}
            dispatch={dispatch}
          />
        )}

        {activeTab === 'sms' && (
          <SmsConfigTab />
        )}

        {activeTab === 'ai' && (
          <AiAssistantConfigTab />
        )}

        {activeTab === 'database' && (
          <DatabaseSyncTab
            state={state}
            dispatch={dispatch}
          />
        )}
      </div>
    </div>
  );
};

export default Settings;
