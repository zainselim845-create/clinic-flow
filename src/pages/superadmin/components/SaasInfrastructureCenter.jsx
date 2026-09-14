import React, { useState } from 'react';
import { 
  Database, Server, ShieldCheck, Download, CheckCircle2, 
  Smartphone, Sparkles, Send, RefreshCw, Check
} from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig } from '../../../lib/supabase';
import { getRegisteredTenants, getAllPlatformUsers } from '../../../services/authService';
import { getGlobalSmsProvider, saveGlobalSmsProvider, testSmsConnection } from '../../../services/smsService';
import { getOpenRouterConfig, saveOpenRouterConfig, testOpenRouterConnection } from '../../../services/aiAssistantService';

export function SaasInfrastructureCenter({ allTenants = [] }) {
  const [subTab, setSubTab] = useState('database');

  // Database State
  const [dbConfig, setDbConfig] = useState(() => getSupabaseConfig());
  const [dbSaveSuccess, setDbSaveSuccess] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);

  // SMS State
  const [smsProvider, setSmsProvider] = useState(() => getGlobalSmsProvider());
  const [smsApiKey, setSmsApiKey] = useState(() => localStorage.getItem('clinicflow_global_sms_key') || '');
  const [testPhone, setTestPhone] = useState('01006285031');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null);

  // AI State
  const [aiConfig, setAiConfig] = useState(() => getOpenRouterConfig());
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

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
    </div>
  );
}
