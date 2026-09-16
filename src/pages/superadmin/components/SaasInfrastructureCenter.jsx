import React, { useState } from 'react';
import { 
  Database, Server, ShieldCheck, Download, CheckCircle2, Crown, 
  Smartphone, Sparkles, Send, RefreshCw, Check, Globe, CreditCard,
  Copy, CheckCheck, ExternalLink, Zap, AlertCircle, ArrowUpRight,
  TrendingUp, Users, PauseCircle, PlayCircle, ShieldAlert, Sliders,
  Edit3, Trash2, Plus, Layers, DollarSign, Calendar, Clock, AlertTriangle,
  RotateCcw, Search, Filter, Lock, Unlock, PhoneCall,
  Eye, EyeOff
} from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig } from '../../../lib/supabase';
import { getRegisteredTenants, getAllPlatformUsers } from '../../../services/authService';
import { getGlobalSmsProvider, saveGlobalSmsProvider, testSmsConnection } from '../../../services/smsService';
import { getOpenRouterConfig, saveOpenRouterConfig, testOpenRouterConnection } from '../../../services/aiAssistantService';
import { useTenant } from '../../../context/TenantContext';
import { 
  DOMAIN_STATUS, 
  verifyDomainDnsAndSsl, 
  getRequiredDnsRecords, 
  saveClinicDomainSettings, 
  getClinicDomainSettings, 
  sanitizeDomain, 
  isValidDomain 
} from '../../../services/customDomainService';
import { getDefaultTierQuotas, getClinicUsage } from '../../../services/usageMeteringService';
import { getGoogleClientId, saveGoogleClientId, getGoogleOAuthSetupInfo } from '../../../services/googleAuthService';
import {
  getSaaSSubscriptionPlans,
  saveSaaSSubscriptionPlan,
  deleteSaaSSubscriptionPlan,
  resetSaaSSubscriptionPlansToDefaults,
  getSaaSBillingMetrics,
  updateClinicSubscriptionDetails
} from '../../../services/saasSubscriptionPlansService';
import EditPlanTierModal from './EditPlanTierModal';
import ClinicSubscriptionControlModal from './ClinicSubscriptionControlModal';

export function SaasInfrastructureCenter({ allTenants = [] }) {
  const [subTab, setSubTab] = useState('database');
  const { updateTenantDomain, updateTenantInfo } = useTenant();
  const [showTokens, setShowTokens] = useState({ dbKey: false, smsKey: false, aiKey: false });

  // Database State
  const [dbConfig, setDbConfig] = useState(() => getSupabaseConfig());
  const [dbSaveSuccess, setDbSaveSuccess] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);

  // SMS State
  const [smsProvider, setSmsProvider] = useState(() => getGlobalSmsProvider());
  const [smsApiKey, setSmsApiKey] = useState(() => localStorage.getItem('clinicflow_global_sms_key') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEXTBEE_API_KEY) || '');
  const [testPhone, setTestPhone] = useState('01006285031');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null);

  // AI State
  const [aiConfig, setAiConfig] = useState(() => getOpenRouterConfig());
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  // Custom Domains State
  const [domainInputs, setDomainInputs] = useState(() => {
    const map = {};
    allTenants.forEach(t => {
      map[t.id] = t.customDomain || t.custom_domain || '';
    });
    return map;
  });
  const [domainVerifying, setDomainVerifying] = useState({});
  const [domainResults, setDomainResults] = useState({});
  const [domainSaved, setDomainSaved] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [googleClientId, setGoogleClientIdState] = useState(() => getGoogleClientId());
  const [googleSaveSuccess, setGoogleSaveSuccess] = useState(false);
  const setupInfo = getGoogleOAuthSetupInfo();

  // SaaS Subscription Plans & Clinics Control State
  const [plans, setPlans] = useState(() => getSaaSSubscriptionPlans());
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [selectedPlanToEdit, setSelectedPlanToEdit] = useState(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [selectedTenantToControl, setSelectedTenantToControl] = useState(null);
  const [clinicSubSearch, setClinicSubSearch] = useState('');
  const [clinicSubStatusFilter, setClinicSubStatusFilter] = useState('all');

  const handleSaveGoogleOAuth = (e) => {
    e.preventDefault();
    saveGoogleClientId(googleClientId);
    setGoogleSaveSuccess(true);
    setTimeout(() => setGoogleSaveSuccess(false), 2500);
  };

  const handleCopyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveDomain = (clinicId, domain) => {
    const cleaned = sanitizeDomain(domain);
    updateTenantDomain(clinicId, cleaned);
    saveClinicDomainSettings(clinicId, {
      domain: cleaned,
      sslStatus: cleaned ? DOMAIN_STATUS.PENDING_DNS : DOMAIN_STATUS.UNCONFIGURED,
      verifiedAt: null
    });
    setDomainSaved(prev => ({ ...prev, [clinicId]: true }));
    setTimeout(() => setDomainSaved(prev => ({ ...prev, [clinicId]: false })), 2500);
  };

  const handleVerifyDomain = async (clinicId, domain) => {
    const cleaned = sanitizeDomain(domain);
    if (!cleaned) return;
    setDomainVerifying(prev => ({ ...prev, [clinicId]: true }));
    try {
      const res = await verifyDomainDnsAndSsl(cleaned, clinicId);
      setDomainResults(prev => ({ ...prev, [clinicId]: res }));
      if (res.isValid && res.sslActive) {
        saveClinicDomainSettings(clinicId, {
          domain: cleaned,
          sslStatus: DOMAIN_STATUS.ACTIVE_SSL,
          verifiedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      setDomainResults(prev => ({ ...prev, [clinicId]: { isValid: false, message: err.message } }));
    } finally {
      setDomainVerifying(prev => ({ ...prev, [clinicId]: false }));
    }
  };

  const billingMetrics = getSaaSBillingMetrics(allTenants);

  const handleOpenEditPlan = (plan) => {
    setSelectedPlanToEdit(plan);
    setIsEditPlanModalOpen(true);
  };

  const handleCreateNewPlan = () => {
    setSelectedPlanToEdit(null);
    setIsEditPlanModalOpen(true);
  };

  const handleSavePlan = (planData) => {
    saveSaaSSubscriptionPlan(planData);
    setPlans(getSaaSSubscriptionPlans());
    setIsEditPlanModalOpen(false);
    setSelectedPlanToEdit(null);
  };

  const handleDeletePlan = (planId) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الباقة المخصصة نهائياً؟')) {
      deleteSaaSSubscriptionPlan(planId);
      setPlans(getSaaSSubscriptionPlans());
    }
  };

  const handleResetPlans = () => {
    if (window.confirm('هل أنت متأكد من استعادة الباقات المصنعية الافتراضية (Starter, Pro, Enterprise)؟')) {
      const reset = resetSaaSSubscriptionPlansToDefaults();
      setPlans(reset);
    }
  };

  const handleOpenControlClinic = (tenant) => {
    setSelectedTenantToControl(tenant);
    setIsControlModalOpen(true);
  };

  const handleUpgradeTier = (clinicId, newTier) => {
    const selectedPlan = plans.find(p => p.id === newTier);
    const quotas = selectedPlan ? {
      maxDoctors: selectedPlan.maxDoctors,
      monthlySmsQuota: selectedPlan.monthlySmsQuota,
      smsUsed: 0
    } : {
      starter: { maxDoctors: 1, monthlySmsQuota: 1000, smsUsed: 0 },
      pro: { maxDoctors: 3, monthlySmsQuota: 2000, smsUsed: 0 },
      enterprise: { maxDoctors: 10, monthlySmsQuota: 5000, smsUsed: 0 }
    }[newTier] || { maxDoctors: 3, monthlySmsQuota: 2000, smsUsed: 0 };

    updateTenantInfo({
      id: clinicId,
      subscriptionTier: newTier,
      quotas
    });
  };

  const handleQuickToggleSuspend = (tenant) => {
    const isSuspended = tenant.subscriptionStatus === 'suspended';
    if (isSuspended) {
      updateClinicSubscriptionDetails(tenant.id, {
        subscriptionStatus: 'active'
      });
      alert(`تم فك تجميد وتفعيل عيادة (${tenant.name}) بنجاح!`);
    } else {
      const reason = window.prompt('سبب تجميد وإيقاف العيادة:', 'عدم سداد الاشتراك الدوري المستحق');
      if (reason !== null) {
        updateClinicSubscriptionDetails(tenant.id, {
          subscriptionStatus: 'suspended',
          suspensionReason: reason.trim() || 'عدم سداد الاشتراك الدوري المستحق'
        });
        alert(`تم تجميد عيادة (${tenant.name}) وسيظهر سبب الإيقاف للطبيب فوراً على شاشة الدخول.`);
      }
    }
    setPlans(getSaaSSubscriptionPlans());
  };

  const handleExportPlatformBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        platform: 'ClinicFlow B2B SaaS',
        version: '2.5.0',
        tenants: getRegisteredTenants(),
        users: getAllPlatformUsers(),
        systemStats: {
          totalTenants: allTenants.length,
          storageStatus: 'isolated_per_tenant'
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinicflow_platform_master_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export platform backup:', err);
      alert('فشل تصدير النسخة الاحتياطية للمنصة.');
    }
  };

  const handleSaveDb = (e) => {
    e.preventDefault();
    saveSupabaseConfig(dbConfig.url, dbConfig.key);
    setDbSaveSuccess(true);
    setTimeout(() => setDbSaveSuccess(false), 3000);
  };

  const handleTestDb = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    try {
      if (!dbConfig.url || !dbConfig.key) {
        throw new Error('يرجى ملء بيانات الرابط ومفتاح الاتصال أولاً.');
      }
      const res = await fetch(`${dbConfig.url}/rest/v1/`, {
        headers: {
          apikey: dbConfig.key,
          Authorization: `Bearer ${dbConfig.key}`
        }
      });
      if (res.ok || res.status === 200 || res.status === 404) {
        setDbTestResult({ success: true, message: 'الاتصال بقاعدة بيانات Supabase يعمل بنجاح!' });
      } else {
        setDbTestResult({ success: false, message: `فشل التحقق: رمز الاستجابة ${res.status}` });
      }
    } catch (err) {
      setDbTestResult({ success: false, message: err.message || 'تعذر الاتصال بالسحابة.' });
    } finally {
      setDbTesting(false);
    }
  };

  const handleSaveSms = (e) => {
    e.preventDefault();
    saveGlobalSmsProvider(smsProvider);
    localStorage.setItem('clinicflow_global_sms_key', smsApiKey);
    alert('تم حفظ إعدادات بوابة الرسائل المركزية بنجاح!');
  };

  const handleTestSms = async () => {
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await testSmsConnection({
        phone: testPhone,
        message: 'رسالة اختبارية من لوحة إدارة منصة ClinicFlow B2B SaaS'
      });
      setSmsResult(res);
    } catch (err) {
      setSmsResult({ success: false, error: err.message });
    } finally {
      setSmsSending(false);
    }
  };

  const handleSaveAi = (e) => {
    e.preventDefault();
    saveOpenRouterConfig(aiConfig);
    alert('تم حفظ إعدادات محرك الذكاء الاصطناعي المركزي بنجاح!');
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await testOpenRouterConnection(aiConfig.apiKey, aiConfig.model);
      setAiTestResult(res);
    } catch (err) {
      setAiTestResult({ success: false, message: err.message });
    } finally {
      setAiTesting(false);
    }
  };

  return (
    <div className="saas-section-card" style={{ padding: '1.75rem' }}>
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: 'var(--text-primary)'
      }}>
        <CheckCircle2 size={20} color="#10B981" />
        <div>
          <strong style={{ display: 'block', fontSize: '0.92rem', color: '#059669' }}>منظومة الربط والـ APIs مُهيأة مسبقاً وتعمل تلقائياً (Zero-Configuration APIs):</strong>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            تم تزويد المنظومة مسبقاً بكافة المفاتيح (Supabase، محرك الذكاء الاصطناعي، وبوابات الرسائل المركزية). لا يُطلب من العميل أو الطبيب إدخال أي مفاتيح أو إعدادات برمجية.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setSubTab('database')}
          className={`btn ${subTab === 'database' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '10px' }}
        >
          <Database size={16} />
          <span>قاعدة بيانات Supabase المركزية</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('sms')}
          className={`btn ${subTab === 'sms' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '10px' }}
        >
          <Smartphone size={16} />
          <span>بوابات الرسائل المركزية (SMS Gateways)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ai')}
          className={`btn ${subTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '10px' }}
        >
          <Sparkles size={16} />
          <span>محرك الذكاء الاصطناعي المركزي (AI Core)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('domains')}
          className={`btn ${subTab === 'domains' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '10px' }}
        >
          <Globe size={16} />
          <span>الدومينات الخاصة والـ SSL (Custom Domains)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('subscriptions')}
          className={`btn ${subTab === 'subscriptions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '10px' }}
        >
          <CreditCard size={16} />
          <span>باقات الاشتراكات والترخيص (Subscription Plans)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('auth')}
          className={`btn ${subTab === 'auth' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '10px' }}
        >
          <ShieldCheck size={16} />
          <span>المصادقة وGoogle OAuth (SSO)</span>
        </button>
      </div>

      {subTab === 'database' && (
        <div className="infra-content-pane">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>إدارة السحابة وقواعد البيانات (PostgreSQL & Multi-Tenancy)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                ربط كافة عيادات المنصة بقاعدة بيانات PostgreSQL موحدة مع عزل أمان RLS صارم لكل مستأجر.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportPlatformBackup}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: '#10B981', color: '#047857', background: '#ECFDF5' }}
            >
              <Download size={16} />
              <span>تصدير نسخة احتياطية لكافة عيادات المنصة (JSON)</span>
            </button>
          </div>

          <form onSubmit={handleSaveDb} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                رابط مشروع Supabase (Project URL):
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                dir="ltr"
                value={dbConfig.url || ''}
                onChange={(e) => setDbConfig({ ...dbConfig, url: e.target.value })}
                className="input-field"
                style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                مفتاح الوصول العام (Anon / Public API Key):
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showTokens.dbKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  dir="ltr"
                  value={dbConfig.key || ''}
                  onChange={(e) => setDbConfig({ ...dbConfig, key: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowTokens(prev => ({ ...prev, dbKey: !prev.dbKey }))}
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem'
                  }}
                  title={showTokens.dbKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                  aria-label={showTokens.dbKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                >
                  {showTokens.dbKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary">
                {dbSaveSuccess ? <Check size={16} /> : <CheckCircle2 size={16} />}
                <span>{dbSaveSuccess ? 'تم الحفظ بنجاح!' : 'حفظ إعدادات السحابة'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestDb}
                disabled={dbTesting}
                className="btn btn-secondary"
              >
                <RefreshCw size={14} className={dbTesting ? 'animate-spin' : ''} />
                <span>{dbTesting ? 'جاري الفحص...' : 'فحص الاتصال بقاعدة البيانات'}</span>
              </button>

              {dbTestResult && (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: dbTestResult.success ? '#059669' : '#DC2626' }}>
                  {dbTestResult.message}
                </span>
              )}
            </div>
          </form>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: 'var(--text-primary)' }}>جداول المنصة المركزية وحصانة العزل:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {['clinics (العيادات)', 'users (المستخدمين)', 'appointments (المواعيد)', 'patients (المرضى)', 'invoices (الفواتير)', 'labs (المعامل)', 'inventory (المخزون)', 'attendance (الحضور)'].map((tbl, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <ShieldCheck size={14} color="#10B981" />
                  <span>{tbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'sms' && (
        <div className="infra-content-pane">
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>بوابات الرسائل القصيرة المركزية (Platform Telecom & SMS Pool)</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              الربط المباشر مع مزودي الاتصالات المعتمدين وتوزيع الحصص على العيادات.
            </p>
          </div>

          <form onSubmit={handleSaveSms} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                مزود الخدمة المعتمد للمنصة (SMS Provider):
              </label>
              <select
                value={smsProvider}
                onChange={(e) => setSmsProvider(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                <option value="smsmisr">SMSMisr (مصر - فودافون / أورانج / إي آند / وي)</option>
                <option value="twilio">Twilio (عالمي & دولي)</option>
                <option value="unifonic">Unifonic (الشرق الأوسط والخليج)</option>
                <option value="none">محاكاة محلية بدون إرسال فعلي (Mock Mode)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                مفتاح الربط الرئيسي للمنصة (Master SMS API Key):
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showTokens.smsKey ? 'text' : 'password'}
                  placeholder="sms_live_api_key_xxxxxxxx"
                  dir="ltr"
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowTokens(prev => ({ ...prev, smsKey: !prev.smsKey }))}
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem'
                  }}
                  title={showTokens.smsKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                  aria-label={showTokens.smsKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                >
                  {showTokens.smsKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
              <button type="submit" className="btn btn-primary">
                <span>حفظ إعدادات البوابة المركزية</span>
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                تجربة إرسال رسالة اختبارية فورية:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '500px' }}>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="01012345678"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  disabled={smsSending}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={14} />
                  <span>{smsSending ? 'جاري الإرسال...' : 'إرسال تجربة'}</span>
                </button>
              </div>
              {smsResult && (
                <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: smsResult.success ? '#059669' : '#DC2626' }}>
                  {smsResult.success ? 'تم إرسال رسالة الاختبار بنجاح!' : `خطأ: ${smsResult.error || 'فشل الإرسال'}`}
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {subTab === 'ai' && (
        <div className="infra-content-pane">
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>محرك الذكاء الاصطناعي المركزي (Platform Clinical AI Core)</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              توفير نماذج التحليل السريري ومساعد الطبيب لكافة العيادات المشتركة عبر مفتاح API مركزي موحد.
            </p>
          </div>

          <form onSubmit={handleSaveAi} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                نموذج الذكاء الاصطناعي الافتراضي للمنصة:
              </label>
              <select
                value={aiConfig.model || 'nvidia/nemotron-3-120b'}
                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                <option value="nvidia/nemotron-3-120b">NVIDIA Nemotron 3 120B (سريع وعالي الدقة - مجاني)</option>
                <option value="meta-llama/llama-3.3-70b-instruct">Meta LLaMA 3.3 70B (متقدم للاستشارات الطبية)</option>
                <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet (أعلى معايير الدقة السريرية)</option>
                <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (سريع واقتصادي)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                مفتاح OpenRouter API المركزي للمنصة:
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showTokens.aiKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-xxxxxxxx..."
                  dir="ltr"
                  value={aiConfig.apiKey || ''}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowTokens(prev => ({ ...prev, aiKey: !prev.aiKey }))}
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem'
                  }}
                  title={showTokens.aiKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                  aria-label={showTokens.aiKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                >
                  {showTokens.aiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary">
                <span>حفظ إعدادات محرك الذكاء الاصطناعي</span>
              </button>

              <button
                type="button"
                onClick={handleTestAi}
                disabled={aiTesting}
                className="btn btn-secondary"
              >
                <RefreshCw size={14} className={aiTesting ? 'animate-spin' : ''} />
                <span>{aiTesting ? 'جاري فحص استجابة النموذج...' : 'اختبار استجابة النموذج'}</span>
              </button>

              {aiTestResult && (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: aiTestResult.success ? '#059669' : '#DC2626' }}>
                  {aiTestResult.success ? 'النموذج متصل ويعمل بسرعة استجابة ممتازة!' : `فشل: ${aiTestResult.message || 'خطأ في الاتصال'}`}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {subTab === 'domains' && (
        <div className="infra-content-pane">
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>إدارة الدومينات الخاصة والـ SSL المركزية (Platform Custom Domains)</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              تهيئة وربط الدومينات المخصصة لعيادات المنصة، وفحص سجلات DNS وتوليد شهادات الحماية SSL مباشرة من إدارة الساس.
            </p>
          </div>

          {/* DNS Configuration Guide Card */}
          <div style={{
            background: 'var(--surface-container, #F8FAFC)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              سجلات الـ DNS المطلوبة لتوجيه الدومين إلى خوادم كلينيك فلو:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>CNAME</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.3rem' }}>cname.clinicflow.app</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText('cname', 'cname.clinicflow.app')}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  {copiedKey === 'cname' ? <CheckCheck size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedKey === 'cname' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', background: '#ECFDF5', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>A Record</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.3rem' }}>76.76.21.21</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText('a_record', '76.76.21.21')}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  {copiedKey === 'a_record' ? <CheckCheck size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedKey === 'a_record' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clinics Domain List Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="saas-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>العيادة والمستأجر</th>
                  <th>الدومين المخصص (Custom Domain)</th>
                  <th>حالة الـ SSL والاتصال</th>
                  <th>إجراءات الربط والفحص</th>
                </tr>
              </thead>
              <tbody>
                {allTenants.map((tenant) => {
                  const currentDomain = domainInputs[tenant.id] ?? (tenant.customDomain || tenant.custom_domain || '');
                  const isVerifying = domainVerifying[tenant.id];
                  const result = domainResults[tenant.id];
                  const isSaved = domainSaved[tenant.id];
                  const hasDomain = Boolean(tenant.customDomain || tenant.custom_domain);

                  return (
                    <tr key={tenant.id}>
                      <td>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{tenant.name}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>/{tenant.slug}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '320px' }}>
                          <input
                            type="text"
                            dir="ltr"
                            placeholder="مثال: drsara-clinic.com"
                            value={currentDomain}
                            onChange={(e) => setDomainInputs(prev => ({ ...prev, [tenant.id]: e.target.value }))}
                            className="input-field"
                            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', flex: 1 }}
                          />
                        </div>
                      </td>
                      <td>
                        {hasDomain ? (
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            background: '#ECFDF5',
                            color: '#047857',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <CheckCircle2 size={12} />
                            دومين نشط وموجّه ✓
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)'
                          }}>
                            غير مهيأ
                          </span>
                        )}
                        {result && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: result.isValid ? '#059669' : '#DC2626' }}>
                            {result.message || (result.isValid ? 'DNS & SSL سليم ومفعل!' : 'DNS لم يوجه بعد')}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveDomain(tenant.id, currentDomain)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', borderRadius: '6px' }}
                          >
                            {isSaved ? <Check size={14} /> : <CheckCircle2 size={14} />}
                            <span>{isSaved ? 'تم الحفظ!' : 'حفظ'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyDomain(tenant.id, currentDomain)}
                            disabled={isVerifying || !currentDomain}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', borderRadius: '6px' }}
                          >
                            <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
                            <span>{isVerifying ? 'جاري الفحص...' : 'فحص DNS'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'subscriptions' && (
        <div className="infra-content-pane">
          {/* SaaS Billing & Financial Health KPI Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem'
          }}>
            {/* Lifetime Portals Buyout Card */}
            <div style={{ background: 'var(--surface)', border: '1px solid #FDE68A', borderRadius: '12px', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '3px', background: 'linear-gradient(90deg, #F59E0B, #D97706)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 700 }}>شراء وتراخيص مدى الحياة</span>
                <Crown size={16} color="#D97706" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
                {billingMetrics.lifetimeCount || 0} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>بورتال دائم</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 700, marginTop: '0.25rem' }}>
                {(billingMetrics.totalLifetimeRevenue || 0).toLocaleString()} ج.م إجمالي عوائد الشراء
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>الدخل الشهري (MRR)</span>
                <TrendingUp size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {billingMetrics.mrr.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ج.م/شهر</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: '0.25rem' }}>
                مبني على الاشتراكات النشطة
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>الدخل السنوي المتوقع (ARR)</span>
                <DollarSign size={16} color="#3B82F6" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {billingMetrics.arr.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ج.م/سنة</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                إجمالي الإيراد السنوي المستهدف
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>العيادات النشطة والمدفوعة</span>
                <CheckCircle2 size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
                {billingMetrics.activePayingCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>عيادة</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                سارية ومفعلة بالكامل
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>الموقوفة والمجمدة (Suspended)</span>
                <ShieldAlert size={16} color="#EF4444" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: billingMetrics.suspendedCount > 0 ? '#DC2626' : 'var(--text-primary)' }}>
                {billingMetrics.suspendedCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>عيادة</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: billingMetrics.suspendedCount > 0 ? '#DC2626' : 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>
                {billingMetrics.suspendedCount > 0 ? 'معطلة لعدم السداد / بانتظار التحصيل' : 'لا توجد عيادات موقوفة'}
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>فترة تجريبية (Trial)</span>
                <Clock size={16} color="#F59E0B" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706' }}>
                {billingMetrics.trialCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>عيادة</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                تجربة مجانية قبل التعاقد
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>متوسط الإيراد (ARPU)</span>
                <Layers size={16} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {billingMetrics.arpu.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ج.م</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                لكل عيادة مشتركة شهرياً
              </div>
            </div>
          </div>

          {/* Section 1: SaaS Plans & Tiering Studio */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Sliders size={20} color="#007AFF" />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    استوديو هندسة وتعديل باقات الساس (SaaS Pricing & Tiering Studio)
                  </h3>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  أنت المتحكم الكامل في المنصة: اضبط أسعار الباقات، عدّل حصص رسائل الـ SMS، حدد عدد الأطباء المسموح، وفعل/عطل الميزات لكل خطة.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCreateNewPlan}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    borderRadius: '8px',
                    padding: '0.5rem 0.9rem',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                >
                  <Plus size={15} />
                  <span>+ إنشاء باقة مخصصة جديدة (Custom Plan)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetPlans}
                  className="btn btn-secondary"
                  title="استعادة الباقات والأسعار الأصلية المعتمدة"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.82rem'
                  }}
                >
                  <RotateCcw size={14} />
                  <span>إعادة ضبط للافتراضي</span>
                </button>
              </div>
            </div>

            {/* Dynamic Plan Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}>
              {plans.map((plan) => {
                const isPro = plan.id === 'pro';
                const isEnterprise = plan.id === 'enterprise';
                const isCustom = !['starter', 'pro', 'enterprise'].includes(plan.id);
                const activeClinicsCount = allTenants.filter(t => (t.subscriptionTier || 'pro') === plan.id).length;

                return (
                  <div
                    key={plan.id}
                    style={{
                      background: 'var(--bg-secondary, #F9FAFB)',
                      border: isPro ? '2px solid #2563EB' : isEnterprise ? '2px solid #7C3AED' : '1px solid var(--border-color)',
                      borderRadius: '14px',
                      padding: '1.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: isPro ? '0 10px 25px -5px rgba(37, 99, 235, 0.1)' : 'none'
                    }}
                  >
                    {plan.badge && (
                      <div style={{
                        position: 'absolute',
                        top: '-11px',
                        left: '16px',
                        background: isPro ? '#2563EB' : isEnterprise ? '#7C3AED' : '#52525B',
                        color: '#FFFFFF',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.65rem',
                        borderRadius: '999px',
                        letterSpacing: '0.3px'
                      }}>
                        {plan.badge}
                      </div>
                    )}

                    <div>
                      {/* Plan Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)', display: 'block' }}>
                            {plan.name}
                          </strong>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            ID: {plan.id} ({plan.nameEn})
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#2563EB',
                          whiteSpace: 'nowrap'
                        }}>
                          {activeClinicsCount} عيادة مشتركة
                        </span>
                      </div>

                      {/* Pricing Display */}
                      <div style={{
                        background: 'var(--surface)',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        marginBottom: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline'
                      }}>
                        <div>
                          <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {Number(plan.monthlyPrice || 0).toLocaleString()} ج.م
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
                            / شهرياً
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          سنوي: <strong style={{ color: 'var(--text-primary)' }}>{Number(plan.annualPrice || (plan.monthlyPrice * 10)).toLocaleString()} ج.م</strong>
                        </div>
                      </div>

                      {/* Limits & Quotas */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                        fontSize: '0.8rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ background: 'var(--surface)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>الأطباء المعتمدين:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{plan.maxDoctors} طبيب</strong>
                        </div>
                        <div style={{ background: 'var(--surface)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>رصيد SMS شهري:</span>
                          <strong style={{ color: '#059669' }}>{Number(plan.monthlySmsQuota || 1000).toLocaleString()} رسالة</strong>
                        </div>
                        <div style={{ background: 'var(--surface)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>أقصى مواعيد / شهر:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{Number(plan.maxAppointmentsPerMonth || 1000).toLocaleString()}</strong>
                        </div>
                        <div style={{ background: 'var(--surface)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>سجلات المرضى:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{Number(plan.maxPatients || 5000).toLocaleString()}</strong>
                        </div>
                      </div>

                      {/* Feature Checklist */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}>
                          {plan.aiAssistant ? <Check size={14} color="#10B981" /> : <span style={{ color: '#9CA3AF', width: 14 }}>✕</span>}
                          <span style={{ color: plan.aiAssistant ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            مساعد الذكاء الاصطناعي الطبي
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}>
                          {plan.customDomain ? <Check size={14} color="#10B981" /> : <span style={{ color: '#9CA3AF', width: 14 }}>✕</span>}
                          <span style={{ color: plan.customDomain ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            دومين خاص وشهادة SSL مخصصة
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}>
                          {plan.whatsappBot ? <Check size={14} color="#10B981" /> : <span style={{ color: '#9CA3AF', width: 14 }}>✕</span>}
                          <span style={{ color: plan.whatsappBot ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            تكامل واتساب وتأكيد الحجز الفوري
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}>
                          {plan.labModule ? <Check size={14} color="#10B981" /> : <span style={{ color: '#9CA3AF', width: 14 }}>✕</span>}
                          <span style={{ color: plan.labModule ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            إدارة المعامل والتركيبات والتكلفة
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}>
                          {plan.inventoryModule ? <Check size={14} color="#10B981" /> : <span style={{ color: '#9CA3AF', width: 14 }}>✕</span>}
                          <span style={{ color: plan.inventoryModule ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            المخزون وحسابات الأطباء والأرباح
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlan(plan)}
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.82rem',
                          borderRadius: '8px'
                        }}
                      >
                        <Edit3 size={14} />
                        <span>تعديل تفاصيل وحصص الباقة</span>
                      </button>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="btn btn-secondary"
                          title="حذف هذه الباقة المخصصة"
                          style={{
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            borderColor: '#FCA5A5',
                            color: '#DC2626'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Clinics Subscriptions & Freeze/Suspend Control Table */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#10B981" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    جدول اشتراكات العيادات والتحكم الفوري (Clinic Lifecycle & Suspension Hub)
                  </h3>
                </div>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  تجميد العيادة فورياً عند تأخر السداد، تمديد الاشتراك، رفع الحصص، أو تغيير الباقة بنقرة واحدة.
                </p>
              </div>

              {/* Search & Filter Toolbar */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="بحث باسم العيادة أو الطبيب..."
                    value={clinicSubSearch}
                    onChange={(e) => setClinicSubSearch(e.target.value)}
                    className="input-field"
                    style={{
                      padding: '0.4rem 2rem 0.4rem 0.75rem',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      width: '210px'
                    }}
                  />
                </div>

                <select
                  value={clinicSubStatusFilter}
                  onChange={(e) => setClinicSubStatusFilter(e.target.value)}
                  className="input-field"
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <option value="all">كافة الحالات</option>
                  <option value="active">نشط (Active)</option>
                  <option value="lifetime">👑 ترخيص مدى الحياة (Lifetime)</option>
                  <option value="trial">فترة تجريبية (Trial)</option>
                  <option value="suspended">موقوف ومجمد (Suspended)</option>
                  <option value="grace_period">مهلة سداد (Grace)</option>
                </select>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="saas-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>العيادة والمستأجر</th>
                    <th>الباقة الحالية</th>
                    <th>حالة الاشتراك</th>
                    <th>استهلاك الـ SMS والحصة</th>
                    <th>سبب الوقف / الملاحظات</th>
                    <th>إجراءات التحكم والوقف</th>
                  </tr>
                </thead>
                <tbody>
                  {allTenants
                    .filter((t) => {
                      const matchSearch = !clinicSubSearch ||
                        (t.name || '').toLowerCase().includes(clinicSubSearch.toLowerCase()) ||
                        (t.doctorName || '').toLowerCase().includes(clinicSubSearch.toLowerCase()) ||
                        (t.slug || '').toLowerCase().includes(clinicSubSearch.toLowerCase());
                      const status = t.subscriptionStatus || 'active';
                      const isLifetime = Boolean(t.isLifetimeLicense || status === 'lifetime');
                      const matchStatus = clinicSubStatusFilter === 'all' 
                        ? true 
                        : clinicSubStatusFilter === 'lifetime' 
                          ? isLifetime 
                          : status === clinicSubStatusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map((tenant) => {
                      const tier = tenant.subscriptionTier || 'pro';
                      const status = tenant.subscriptionStatus || 'active';
                      const isSuspended = status === 'suspended';
                      const isTrial = status === 'trial';
                      const isGrace = status === 'grace_period';
                      const usage = getClinicUsage(tenant.id, tenant.quotas, tier);
                      const currentPlanObj = plans.find(p => p.id === tier) || { name: tier.toUpperCase(), monthlyPrice: 999 };

                      return (
                        <tr key={tenant.id} style={{ background: isSuspended ? 'rgba(239, 68, 68, 0.03)' : undefined }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                background: isSuspended ? '#EF4444' : isTrial ? '#F59E0B' : '#10B981'
                              }} />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    {tenant.name}
                                  </strong>
                                  {isLifetime && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      background: '#FEF3C7',
                                      color: '#B45309',
                                      border: '1px solid #FCD34D',
                                      borderRadius: '4px',
                                      padding: '0.1rem 0.4rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem'
                                    }}>
                                      <Crown size={10} />
                                      مدى الحياة
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  {tenant.doctorName} • <code style={{ fontSize: '0.74rem' }}>/{tenant.slug}</code>
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: tier === 'enterprise' ? '#F5F3FF' : tier === 'pro' ? '#EFF6FF' : '#F4F4F5',
                                color: tier === 'enterprise' ? '#7C3AED' : tier === 'pro' ? '#2563EB' : '#52525B'
                              }}>
                                {tier.toUpperCase()}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                ({currentPlanObj.monthlyPrice} ج.م)
                              </span>
                            </div>
                            {tenant.customAgreedPrice !== undefined && tenant.customAgreedPrice !== null && tenant.customAgreedPrice !== '' && (
                              <div style={{ fontSize: '0.73rem', color: '#059669', fontWeight: 700, marginTop: '3px' }}>
                                اتفاق: {Number(tenant.customAgreedPrice).toLocaleString()} ج.م
                                {tenant.billingCycle === 'annual' ? ' /سنوي' : tenant.billingCycle === 'quarterly' ? ' /٣ أشهر' : tenant.billingCycle === 'semi_annual' ? ' /٦ أشهر' : tenant.billingCycle === 'custom' ? ' (مرن)' : ' /شهري'}
                              </div>
                            )}
                          </td>

                          <td>
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              padding: '0.22rem 0.65rem',
                              borderRadius: '999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: isSuspended ? '#FEE2E2' : isTrial ? '#FEF3C7' : isGrace ? '#FEF08A' : '#ECFDF5',
                              color: isSuspended ? '#DC2626' : isTrial ? '#B45309' : isGrace ? '#A16207' : '#047857'
                            }}>
                              {isLifetime ? (
                                <>
                                  <Crown size={12} />
                                  <span>دائم مدى الحياة ∞</span>
                                </>
                              ) : isSuspended ? (
                                <>
                                  <Lock size={12} />
                                  <span>موقوف ومجمد</span>
                                </>
                              ) : isTrial ? (
                                <>
                                  <Clock size={12} />
                                  <span>فترة تجريبية</span>
                                </>
                              ) : isGrace ? (
                                <>
                                  <AlertTriangle size={12} />
                                  <span>مهلة سداد</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={12} />
                                  <span>نشط ومعتمد</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td>
                            <div style={{ minWidth: '130px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                                <span style={{ fontWeight: 700 }}>{usage.smsUsed || 0} / {usage.totalSmsAllowed || 1000}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{usage.remainingSms} متبقي</span>
                              </div>
                              <div style={{ height: '5px', background: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${Math.min(100, Math.round(((usage.smsUsed || 0) / (usage.totalSmsAllowed || 1000)) * 100))}%`,
                                  background: usage.isSmsDepleted ? '#EF4444' : '#10B981'
                                }} />
                              </div>
                            </div>
                          </td>

                          <td>
                            {isSuspended ? (
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#DC2626',
                                fontWeight: 700,
                                background: '#FEF2F2',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid #FCA5A5',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                <AlertTriangle size={12} />
                                <span>{tenant.suspensionReason || 'عدم سداد الاشتراك الدوري'}</span>
                              </div>
                            ) : tenant.subscriptionPaymentHistory && tenant.subscriptionPaymentHistory.length > 0 ? (
                              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                                تم سداد {tenant.subscriptionPaymentHistory[tenant.subscriptionPaymentHistory.length - 1].amount} ج.م ({tenant.subscriptionPaymentHistory[tenant.subscriptionPaymentHistory.length - 1].method})
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                اشتراك منتظم
                              </span>
                            )}
                          </td>

                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              {/* Open Full Lifecycle & Suspension Modal */}
                              <button
                                type="button"
                                onClick={() => handleOpenControlClinic(tenant)}
                                className="btn btn-primary"
                                title="التحكم الكامل في الباقة وتجميد العيادة وتمديد الاشتراك"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.78rem',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: '#4F46E5',
                                  borderColor: '#4338CA'
                                }}
                              >
                                <ShieldAlert size={13} />
                                <span>التحكم في الباقة والوقف</span>
                              </button>

                              {/* Quick Freeze/Unfreeze Toggle */}
                              <button
                                type="button"
                                onClick={() => handleQuickToggleSuspend(tenant)}
                                className="btn btn-secondary"
                                title={isSuspended ? 'إلغاء التجميد وإعادة التفعيل فوراً' : 'تجميد فوري للعيادة مع سبب الإيقاف'}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.78rem',
                                  borderRadius: '6px',
                                  color: isSuspended ? '#059669' : '#DC2626',
                                  borderColor: isSuspended ? '#A7F3D0' : '#FECACA'
                                }}
                              >
                                {isSuspended ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                                <span>{isSuspended ? 'فك التجميد' : 'تجميد'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'auth' && (
        <div className="infra-content-pane">
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>إعدادات تسجيل الدخول الموحد (Google OAuth 2.0 & Platform Identity)</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              تهيئة معرف العميل الموحد (Google Client ID) لتمكين أطباء وطواقم المنصة من تسجيل الدخول الآمن بنقرة واحدة عبر السحابة.
            </p>
          </div>

          <form onSubmit={handleSaveGoogleOAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '650px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
                معرّف عميل Google (OAuth 2.0 Client ID):
              </label>
              <input
                type="text"
                dir="ltr"
                className="input-field"
                value={googleClientId}
                onChange={(e) => setGoogleClientIdState(e.target.value)}
                placeholder="مثال: 337379604098-xxx.apps.googleusercontent.com"
                style={{ width: '100%', height: '42px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary">
                <Check size={16} />
                <span>حفظ إعدادات Google OAuth المركزية</span>
              </button>
              {googleSaveSuccess && (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                  تم حفظ Google Client ID وتطبيقه على كافة العيادات بنجاح!
                </span>
              )}
            </div>
          </form>

          {/* Setup Guide for Google Cloud Console */}
          <div style={{ marginTop: '2rem', background: 'var(--surface-container, #F8FAFC)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '1.25rem', maxWidth: '650px' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              الروابط المعتمدة للربط في Google Cloud Credentials:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Authorized JavaScript Origins:</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', border: '1px solid var(--border-color)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginTop: '0.25rem' }}>
                  <code style={{ fontSize: '0.8rem', direction: 'ltr' }}>{setupInfo.origin}</code>
                  <button type="button" onClick={() => handleCopyText('google-origin', setupInfo.origin)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                    {copiedKey === 'google-origin' ? 'تم النسخ' : 'نسخ'}
                  </button>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Authorized Redirect URIs:</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', border: '1px solid var(--border-color)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginTop: '0.25rem' }}>
                  <code style={{ fontSize: '0.8rem', direction: 'ltr' }}>{setupInfo.loginRedirect}</code>
                  <button type="button" onClick={() => handleCopyText('google-redirect', setupInfo.loginRedirect)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                    {copiedKey === 'google-redirect' ? 'تم النسخ' : 'نسخ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    
      {/* SaaS Plan Tier Studio Modal */}
      <EditPlanTierModal
        isOpen={isEditPlanModalOpen}
        onClose={() => {
          setIsEditPlanModalOpen(false);
          setSelectedPlanToEdit(null);
        }}
        plan={selectedPlanToEdit}
        onSave={handleSavePlan}
      />

      {/* Clinic Subscription & Lifecycle Control Modal */}
      <ClinicSubscriptionControlModal
        isOpen={isControlModalOpen}
        onClose={() => {
          setIsControlModalOpen(false);
          setSelectedTenantToControl(null);
        }}
        clinic={selectedTenantToControl}
        onSuccess={() => {
          setPlans(getSaaSSubscriptionPlans());
        }}
      />
</div>
  );
}
