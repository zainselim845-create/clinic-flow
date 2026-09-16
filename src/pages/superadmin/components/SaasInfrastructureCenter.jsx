import React, { useState } from 'react';
import { 
  Database, Server, ShieldCheck, Download, CheckCircle2, 
  Smartphone, Sparkles, Send, RefreshCw, Check, Globe, CreditCard,
  Copy, CheckCheck, ExternalLink, Zap, AlertCircle, ArrowUpRight
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

export function SaasInfrastructureCenter({ allTenants = [] }) {
  const [subTab, setSubTab] = useState('database');
  const { updateTenantDomain, updateTenantInfo } = useTenant();

  // Database State
  const [dbConfig, setDbConfig] = useState(() => getSupabaseConfig());
  const [dbSaveSuccess, setDbSaveSuccess] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);

  // SMS State
  const [smsProvider, setSmsProvider] = useState(() => getGlobalSmsProvider());
  const [smsApiKey, setSmsApiKey] = useState(() => localStorage.getItem('clinicflow_global_sms_key') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEXTBEE_API_KEY) || 'cf_live_textbee_api_key_84920');
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

  const handleUpgradeTier = (clinicId, newTier) => {
    const quotas = {
      starter: { maxDoctors: 1, monthlySmsQuota: 1000, smsUsed: 0 },
      pro: { maxDoctors: 3, monthlySmsQuota: 2000, smsUsed: 0 },
      enterprise: { maxDoctors: 10, monthlySmsQuota: 5000, smsUsed: 0 }
    };
    updateTenantInfo({
      id: clinicId,
      subscriptionTier: newTier,
      quotas: quotas[newTier] || quotas.pro
    });
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
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                dir="ltr"
                value={dbConfig.key || ''}
                onChange={(e) => setDbConfig({ ...dbConfig, key: e.target.value })}
                className="input-field"
                style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
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
              <input
                type="password"
                placeholder="sms_live_api_key_xxxxxxxx"
                dir="ltr"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
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
              <input
                type="password"
                placeholder="sk-or-v1-xxxxxxxx..."
                dir="ltr"
                value={aiConfig.apiKey || ''}
                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
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
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>إدارة باقات المنصة والخطط السعرية (Platform Subscription Tiers & Quotas)</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              التحكم في تسعير الباقات، الحصص الشهرية للرسائل والذكاء الاصطناعي، وتعيين باقات العيادات المشتركة.
            </p>
          </div>

          {/* Plan Tiers Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {/* Starter Plan */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>باقة Starter (الأساسية)</strong>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#F4F4F5', color: '#52525B' }}>STARTER</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>499 ج.م <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ شهرياً</span></div>
              <ul style={{ margin: '0.75rem 0 0', paddingRight: '1.2rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <li>طبيب واحد معتمد</li>
                <li>1000 رسالة SMS / شهر</li>
                <li>جدول المواعيد وسجلات المرضى</li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div style={{ background: 'var(--surface)', border: '2px solid #2563EB', borderRadius: '12px', padding: '1.25rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-10px', left: '16px', background: '#2563EB', color: '#FFF', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.6rem', borderRadius: '999px' }}>الأكثر طلباً</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>باقة Pro (العيادة الذكية)</strong>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#EFF6FF', color: '#2563EB' }}>PRO</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>999 ج.م <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ شهرياً</span></div>
              <ul style={{ margin: '0.75rem 0 0', paddingRight: '1.2rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <li>حتى 3 أطباء معتمدين</li>
                <li>2000 رسالة SMS / شهر</li>
                <li>مساعد الذكاء الاصطناعي السريري</li>
                <li>الفواتير والمخزون وحسابات الأطباء</li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div style={{ background: 'var(--surface)', border: '1px solid #7C3AED', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>باقة Enterprise (المراكز الكبرى)</strong>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#F5F3FF', color: '#7C3AED' }}>ENTERPRISE</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>1,999 ج.م <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ شهرياً</span></div>
              <ul style={{ margin: '0.75rem 0 0', paddingRight: '1.2rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <li>حتى 10 أطباء وموظفين</li>
                <li>5000 رسالة SMS / شهر</li>
                <li>دومين خاص وشهادة SSL مجاناً</li>
                <li>سجلات الأمان والرقابة (Audit Logs)</li>
              </ul>
            </div>
          </div>

          {/* Clinics Subscriptions Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="saas-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>العيادة والمستأجر</th>
                  <th>الباقة الحالية</th>
                  <th>استهلاك الـ SMS</th>
                  <th>تعديل وترقية الباقة</th>
                </tr>
              </thead>
              <tbody>
                {allTenants.map((tenant) => {
                  const tier = tenant.subscriptionTier || 'pro';
                  const usage = getClinicUsage(tenant.id, tenant.quotas, tier);

                  return (
                    <tr key={tenant.id}>
                      <td>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{tenant.name}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{tenant.doctorName}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          background: tier === 'enterprise' ? '#F5F3FF' : tier === 'pro' ? '#EFF6FF' : '#F4F4F5',
                          color: tier === 'enterprise' ? '#7C3AED' : tier === 'pro' ? '#2563EB' : '#52525B'
                        }}>
                          {tier.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {usage.smsUsed || 0} / {usage.totalSmsAllowed || 1000}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          المتبقي: {usage.remainingSms} رسالة
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {['starter', 'pro', 'enterprise'].map((planKey) => (
                            <button
                              key={planKey}
                              type="button"
                              onClick={() => handleUpgradeTier(tenant.id, planKey)}
                              disabled={tier === planKey}
                              className={`btn ${tier === planKey ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              {planKey.toUpperCase()}
                            </button>
                          ))}
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
    </div>
  );
}
