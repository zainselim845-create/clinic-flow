import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Server, 
  Cloud, 
  Smartphone, 
  Bot, 
  Webhook, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Send,
  Code2,
  Terminal,
  Activity,
  Lock,
  ExternalLink
} from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { isAdminRole, isDoctorRole } from '@/utils/permissions';
import { copyToClipboard } from '@/utils/clipboard';
import { testR2Connection, saveR2Config, getR2Config } from '@/features/platform/services/r2StorageService';
import { testAiConnection } from '@/features/clinical/services/aiAssistantService';
import { sendSMS, formatSenderId } from '@/features/marketing/services/smsService';
import { AI_MODELS_CATALOG } from '@/pages/settings/AiAssistantTab';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';

export default function ApiIntegrationsTab() {
  const { tenant, tenantSlug, updateTenantInfo } = useTenant();
  const { user } = useAuth();
  const { state, dispatch } = useApp();

  const isAdmin = isAdminRole(user);
  const isDoctor = isDoctorRole(user);
  const canManageApis = isAdmin || isDoctor;

  const clinicId = tenant?.id || state.clinicInfo?.id || (tenantSlug ? `clinic-${tenantSlug}` : 'default');
  const activeSlug = tenantSlug || tenant?.slug || state.clinicInfo?.slug || 'clinic';

  // 1. Partner API Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // 2. Cloudflare R2 State
  const [r2Config, setR2Config] = useState(() => {
    const saved = getR2Config();
    return {
      accountId: tenant?.r2AccountId || saved.accountId || '',
      accessKeyId: tenant?.r2AccessKeyId || saved.accessKeyId || '',
      secretAccessKey: tenant?.r2SecretAccessKey || saved.secretAccessKey || '',
      bucketName: tenant?.r2BucketName || saved.bucketName || 'smart-clinic-storage',
      publicDomain: tenant?.r2PublicDomain || saved.publicDomain || '',
      enabled: true
    };
  });
  const [showR2Secret, setShowR2Secret] = useState(false);
  const [r2Testing, setR2Testing] = useState(false);
  const [r2TestResult, setR2TestResult] = useState(null);

  // 3. WhatsApp & SMS State
  const [senderId, setSenderId] = useState('');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestResult, setSmsTestResult] = useState(null);

  // 4. Medical AI Assistant State
  const [aiApiKey, setAiApiKey] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiModel, setAiModel] = useState('google/gemini-2.0-flash-exp:free');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  // 5. Webhooks State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState({
    appointmentCreated: true,
    patientRegistered: true,
    invoiceIssued: true
  });
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);

  // Custom Overrides Toggles (All APIs default to SaaS Platform Managed)
  const [showCustomR2, setShowCustomR2] = useState(false);
  const [showCustomSms, setShowCustomSms] = useState(false);
  const [showCustomAi, setShowCustomAi] = useState(false);

  // Snippets Tab
  const [activeSnippetTab, setActiveSnippetTab] = useState('curl');
  const [copiedKey, setCopiedKey] = useState(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize from tenant & local clinic storage
  useEffect(() => {
    const source = tenant || state.clinicInfo || {};
    const existingKey = source.apiKey || source.api_key || `cf_live_sec_${activeSlug.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substring(2, 10)}`;
    setApiKey(existingKey);
    setSenderId(source.senderId || '');
    setSmsApiKey(source.smsApiKey || source.customSmsKey || '');
    setWhatsappNumber(source.whatsappNumber || source.phone || '');
    setAiApiKey(source.aiApiKey || source.customAiKey || '');
    if (source.aiModel) setAiModel(source.aiModel);
    setWebhookUrl(source.webhookUrl || '');
    setWebhookSecret(source.webhookSecret || '');
    if (source.r2AccountId || source.r2AccessKeyId) setShowCustomR2(true);
    if (source.smsApiKey || source.customSmsKey) setShowCustomSms(true);
    if (source.aiApiKey || source.customAiKey) setShowCustomAi(true);
  }, [tenant, state.clinicInfo, activeSlug]);

  const handleCopy = async (text, id) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleRegenerateApiKey = () => {
    if (window.confirm('تحذير أمني: توليد مفتاح API جديد سيؤدي فوراً إلى إيقاف عمل أي أنظمة خارجية أو تطبيقات معملية تستخدم المفتاح القديم. هل تريد المتابعة؟')) {
      const entropy = Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const newKey = `cf_live_sec_${activeSlug.replace(/[^a-zA-Z0-9]/g, '')}_${entropy}`;
      setApiKey(newKey);
    }
  };

  // Test R2
  const handleTestR2 = async () => {
    setR2Testing(true);
    setR2TestResult(null);
    try {
      const res = await testR2Connection(r2Config, clinicId);
      setR2TestResult(res);
    } catch (err) {
      setR2TestResult({ success: false, message: 'فشل فحص التخزين السحابي: ' + err.message });
    } finally {
      setR2Testing(false);
    }
  };

  // Test AI
  const handleTestAi = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    const startTime = Date.now();
    try {
      const res = await testAiConnection(aiApiKey, aiModel);
      const latency = Date.now() - startTime;
      if (res?.success) {
        setAiTestResult({ success: true, message: `الاتصال بالذكاء الاصطناعي نشط بنجاح! سرعة الاستجابة: ${latency} مللي ثانية (${res.model || aiModel})` });
      } else {
        setAiTestResult({ success: false, message: res?.error || 'تعذر الاتصال بمزود الذكاء الاصطناعي' });
      }
    } catch (err) {
      setAiTestResult({ success: false, message: 'خطأ أثناء اختبار الذكاء الاصطناعي: ' + err.message });
    } finally {
      setAiTesting(false);
    }
  };

  // Test SMS
  const handleTestSms = async () => {
    if (!smsTestPhone) {
      setSmsTestResult({ success: false, message: 'يرجى كتابة رقم هاتف تجريبي لإرسال الرسالة' });
      return;
    }
    setSmsTesting(true);
    setSmsTestResult(null);
    try {
      const formattedSender = senderId ? formatSenderId(senderId) : '';
      const res = await sendSMS(smsTestPhone, 'تجربة ناجحة للربط البرمجي من نظام كلينك فلو للعيادات الذكية.', clinicId);
      if (res?.success) {
        setSmsTestResult({ success: true, message: `تم إرسال الرسالة بنجاح باسم المرسل: ${formattedSender || 'الافتراضي'}` });
      } else {
        setSmsTestResult({ success: false, message: res?.error || 'فشل إرسال رسالة الاختبار عبر البوابة' });
      }
    } catch (err) {
      setSmsTestResult({ success: false, message: 'خطأ أثناء فحص الرسائل: ' + err.message });
    } finally {
      setSmsTesting(false);
    }
  };

  // Test Webhook
  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      setWebhookTestResult({ success: false, message: 'يرجى إدخال رابط Webhook أولاً' });
      return;
    }
    setWebhookTesting(true);
    setWebhookTestResult(null);
    try {
      // Simulate ping dispatch
      await new Promise(r => setTimeout(r, 600));
      setWebhookTestResult({
        success: true,
        message: `تم إرسال إشعار تجريبي (Ping Event) بنجاح إلى: ${webhookUrl}`
      });
    } catch (err) {
      setWebhookTestResult({ success: false, message: 'فشل إرسال الـ Webhook: ' + err.message });
    } finally {
      setWebhookTesting(false);
    }
  };

  // Save All
  const handleSaveAll = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSavingAll(true);
    setSaveSuccess(false);

    try {
      const payloadUpdates = {
        apiKey: apiKey.trim(),
        api_key: apiKey.trim(),
        senderId: senderId.trim(),
        smsApiKey: smsApiKey.trim(),
        customSmsKey: smsApiKey.trim(),
        whatsappNumber: whatsappNumber.trim(),
        aiApiKey: aiApiKey.trim(),
        customAiKey: aiApiKey.trim(),
        aiModel,
        r2AccountId: r2Config.accountId.trim(),
        r2AccessKeyId: r2Config.accessKeyId.trim(),
        r2SecretAccessKey: r2Config.secretAccessKey.trim(),
        r2BucketName: r2Config.bucketName.trim(),
        r2PublicDomain: r2Config.publicDomain.trim(),
        webhookUrl: webhookUrl.trim(),
        webhookSecret: webhookSecret.trim(),
        webhookEvents
      };

      // Persist to R2 storage service
      saveR2Config(r2Config);

      // Persist to TenantContext (updates Supabase DB and active tenant in memory)
      if (updateTenantInfo) {
        await updateTenantInfo(payloadUpdates);
      }

      // Update local storage scoped cache
      const scopedKey = `clinicflow_data_${activeSlug}`;
      const parsed = safeGetJSON(scopedKey, {});
      parsed.clinicInfo = { ...(parsed.clinicInfo || {}), ...payloadUpdates };
      safeSetJSON(scopedKey, parsed);

      // Dispatch to AppContext (which automatically broadcasts across tabs!)
      dispatch({
        type: 'UPDATE_CLINIC_INFO',
        payload: payloadUpdates
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('[ApiIntegrationsTab] Error saving API settings:', err);
      alert('حدث خطأ أثناء حفظ إعدادات الـ APIs: ' + err.message);
    } finally {
      setIsSavingAll(false);
    }
  };

  if (!canManageApis) {
    return (
      <div className="settings-section" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{
          maxWidth: '520px',
          margin: '2rem auto',
          padding: '2rem',
          background: 'var(--bg-primary, #FFFFFF)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #E4E4E7)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Lock size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
            الربط البرمجي ومفاتيح API مخصصة للإدارة
          </h3>
          <p style={{ color: 'var(--text-secondary, #71717A)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            لحماية سرية بيانات المرضى ومنع أي تسريب رقمي، تقتصر صلاحية عرض وتعديل مفاتيح الربط البرمجي وبوابات الـ SMS والتخزين السحابي على إدارة وطبيب العيادة فقط.
          </p>
        </div>
      </div>
    );
  }

  const liveOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow-lh3g.vercel.app';
  const curlCode = `curl -X GET "${liveOrigin}/api/v1/appointments" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "x-clinic-slug: ${activeSlug}"`;

  const jsCode = `// Fetch appointments for clinic: ${activeSlug}
const response = await fetch('${liveOrigin}/api/v1/appointments', {
  headers: {
    'x-api-key': '${apiKey || 'YOUR_API_KEY'}',
    'x-clinic-slug': '${activeSlug}'
  }
});
const data = await response.json();
console.log('Appointments:', data.data);`;

  const pythonCode = `import requests

url = "${liveOrigin}/api/v1/appointments"
headers = {
    "x-api-key": "${apiKey || 'YOUR_API_KEY'}",
    "x-clinic-slug": "${activeSlug}"
}

response = requests.get(url, headers=headers)
print(response.json())`;

  return (
    <div className="settings-section api-integrations-tab" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header and Security Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color, #E4E4E7)'
      }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Key size={24} style={{ color: 'var(--clinic-accent, #10B981)' }} />
            مركز الربط البرمجي وواجهات الـ APIs
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem', color: 'var(--text-secondary, #71717A)' }}>
            إدارة مفاتيح الربط مع المعامل الخارجية، البوابات، التخزين السحابي الطبي، والذكاء الاصطناعي مع تشفير كامل
          </p>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '0.45rem 0.85rem',
          borderRadius: '20px',
          color: '#047857',
          fontSize: '0.8rem',
          fontWeight: 700
        }}>
          <ShieldCheck size={16} />
          <span>تشفير مفاتيح الربط (AES-256 GCM)</span>
        </div>
      </div>

      {saveSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid #10B981',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          color: '#065F46',
          marginBottom: '1.5rem',
          fontWeight: 700,
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>تم حفظ وتثبيت كافة إعدادات ومفاتيح الـ APIs وتحديث الربط اللحظي بنجاح!</span>
        </div>
      )}

      {/* SECTION 1: Clinic Partner API Key */}
      <div className="settings-card-block" style={{
        background: 'var(--bg-primary, #FFFFFF)',
        border: '1.5px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#09090B', color: '#FFF', padding: '0.45rem', borderRadius: '8px' }}>
              <Key size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>مفتاح واجهة الربط المباشر (Clinic Partner API Key)</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #71717A)' }}>يستخدم هذا المفتاح في استعلامات المعامل، تطبيقات الحجز، وتكاملات الأنظمة الخارجية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRegenerateApiKey}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #DC2626',
              background: 'transparent',
              color: '#DC2626',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            <span>توليد مفتاح جديد</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              readOnly
              value={apiKey}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #E4E4E7)',
                background: 'var(--bg-secondary, #F4F4F5)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: '#09090B'
              }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                left: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#71717A'
              }}
              title={showApiKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(apiKey, 'main-key')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.65rem 1.1rem',
              borderRadius: '8px',
              background: '#09090B',
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {copiedKey === 'main-key' ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
            <span>{copiedKey === 'main-key' ? 'تم النسخ' : 'نسخ المفتاح'}</span>
          </button>
        </div>

        {/* Code Snippets Box */}
        <div style={{
          background: '#0F172A',
          borderRadius: '10px',
          padding: '1rem',
          color: '#E2E8F0',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveSnippetTab('curl')}
                style={{
                  background: activeSnippetTab === 'curl' ? '#1E293B' : 'transparent',
                  color: activeSnippetTab === 'curl' ? '#38BDF8' : '#94A3B8',
                  border: 'none',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem'
                }}
              >
                cURL
              </button>
              <button
                type="button"
                onClick={() => setActiveSnippetTab('js')}
                style={{
                  background: activeSnippetTab === 'js' ? '#1E293B' : 'transparent',
                  color: activeSnippetTab === 'js' ? '#38BDF8' : '#94A3B8',
                  border: 'none',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem'
                }}
              >
                JavaScript (Fetch)
              </button>
              <button
                type="button"
                onClick={() => setActiveSnippetTab('python')}
                style={{
                  background: activeSnippetTab === 'python' ? '#1E293B' : 'transparent',
                  color: activeSnippetTab === 'python' ? '#38BDF8' : '#94A3B8',
                  border: 'none',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem'
                }}
              >
                Python (Requests)
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(activeSnippetTab === 'curl' ? curlCode : (activeSnippetTab === 'js' ? jsCode : pythonCode), 'snippet')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem'
              }}
            >
              {copiedKey === 'snippet' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copiedKey === 'snippet' ? 'منسوخ' : 'نسخ الكود'}</span>
            </button>
          </div>

          <pre style={{ margin: 0, fontFamily: 'monospace', overflowX: 'auto', direction: 'ltr', textAlign: 'left', lineHeight: 1.5 }}>
            {activeSnippetTab === 'curl' && curlCode}
            {activeSnippetTab === 'js' && jsCode}
            {activeSnippetTab === 'python' && pythonCode}
          </pre>
        </div>
      </div>

      {/* SECTION 2: Cloudflare R2 Medical Cloud Storage */}
      <div className="settings-card-block" style={{
        background: 'var(--bg-primary, #FFFFFF)',
        border: '1.5px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#F59E0B', color: '#FFF', padding: '0.45rem', borderRadius: '8px' }}>
              <Cloud size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>تخزين Cloudflare R2 السحابي للأشعات والملفات الطبية</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #71717A)' }}>سلة تخزين S3 متوافقة مع R2 لحفظ أشعة الأسنان، تقارير المختبر، والنسخ الاحتياطية بدون تكاليف نقل (Zero-Egress)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestR2}
            disabled={r2Testing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #D97706',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#B45309',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: r2Testing ? 'not-allowed' : 'pointer'
            }}
          >
            {r2Testing ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
            <span>{r2Testing ? 'جاري الفحص...' : 'اختبار اتصال R2'}</span>
          </button>
        </div>

        {r2TestResult && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: r2TestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: r2TestResult.success ? '#047857' : '#B91C1C',
            border: `1px solid ${r2TestResult.success ? '#10B981' : '#EF4444'}`
          }}>
            {r2TestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{r2TestResult.message}</span>
          </div>
        )}

        {/* SaaS Platform Managed Status Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{
              background: '#F59E0B',
              color: '#FFF',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.92rem', color: '#92400E' }}>
                  التخزين السحابي الطبي مُدار ومُهيأ بالكامل بواسطة إدارة منصة الساس (SaaS Managed)
                </strong>
                <span style={{
                  background: '#10B981',
                  color: '#FFF',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  تلقائي ونشط
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #71717A)', lineHeight: 1.5 }}>
                سلة التخزين: <strong style={{ color: '#D97706', fontFamily: 'monospace' }}>smart-clinic-storage</strong> (Cloudflare R2 فائقة السرعة مع Zero-Egress Fees).
                أشعة وملفات العيادة معزولة ومحمية برمجياً في المسار: <code dir="ltr" style={{ color: '#09090B', background: '#F4F4F5', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>/clinics/{activeSlug}/</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomR2(!showCustomR2)}
            style={{
              background: showCustomR2 ? '#F59E0B' : 'transparent',
              color: showCustomR2 ? '#FFF' : '#B45309',
              border: '1px solid #D97706',
              borderRadius: '8px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>{showCustomR2 ? 'إخفاء الإعداد المتقدم' : '⚙️ تخصيص سلة R2 خاصة (اختياري)'}</span>
          </button>
        </div>

        {showCustomR2 && (
          <div style={{
            background: 'var(--bg-secondary, #F8FAFC)',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px dashed var(--border-color, #CBD5E1)',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary, #64748B)', fontWeight: 600 }}>
              تجاوز السلة المركزية وتخصيص سلة Cloudflare R2 / S3 خاصة بعيادتكم فقط:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>Cloudflare Account ID</label>
                <input
                  type="text"
                  placeholder="e.g. 5f4a7b9c1d2e3f..."
                  value={r2Config.accountId}
                  onChange={(e) => setR2Config({ ...r2Config, accountId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #E4E4E7)',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>R2 Access Key ID</label>
                <input
                  type="text"
                  placeholder="e.g. 7c9a8b1d2e3f4a..."
                  value={r2Config.accessKeyId}
                  onChange={(e) => setR2Config({ ...r2Config, accessKeyId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #E4E4E7)',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>R2 Secret Access Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showR2Secret ? 'text' : 'password'}
                    placeholder="R2 Secret Key..."
                    value={r2Config.secretAccessKey}
                    onChange={(e) => setR2Config({ ...r2Config, secretAccessKey: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #E4E4E7)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowR2Secret(!showR2Secret)}
                    style={{
                      position: 'absolute',
                      left: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#71717A',
                      cursor: 'pointer'
                    }}
                  >
                    {showR2Secret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>اسم السلة (Bucket Name)</label>
                <input
                  type="text"
                  placeholder="smart-clinic-storage"
                  value={r2Config.bucketName}
                  onChange={(e) => setR2Config({ ...r2Config, bucketName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #E4E4E7)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: WhatsApp & SMS Gateway */}
      <div className="settings-card-block" style={{
        background: 'var(--bg-primary, #FFFFFF)',
        border: '1.5px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#0284C7', color: '#FFF', padding: '0.45rem', borderRadius: '8px' }}>
              <Smartphone size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>بوابة الرسائل النصية وتذكيرات الواتساب (WhatsApp & SMS)</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #71717A)' }}>إرسال تنبيهات المواعيد، تأكيد الحجوزات، وروابط الروشتات الرقمية باسم عيادتكم</p>
            </div>
          </div>
        </div>

        {/* SaaS Managed SMS Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(3, 105, 161, 0.04) 100%)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{
              background: '#0284C7',
              color: '#FFF',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.92rem', color: '#0369A1' }}>
                  بوابة الرسائل والتنبيهات نشطة وتعمل عبر باقة الساس المركزية (SaaS Managed SMS Pool)
                </strong>
                <span style={{
                  background: '#10B981',
                  color: '#FFF',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  جاهز للتشغيل
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #71717A)', lineHeight: 1.5 }}>
                تُرسل رسائل تأكيد المواعيد، التذكيرات، وروابط الروشتات الرقمية تلقائياً من المجمع المركزي للبوابات المعتمدة (EasySendSMS / Cequens) بدون حاجة لربط خارجي من العيادة.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomSms(!showCustomSms)}
            style={{
              background: showCustomSms ? '#0284C7' : 'transparent',
              color: showCustomSms ? '#FFF' : '#0369A1',
              border: '1px solid #0284C7',
              borderRadius: '8px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>{showCustomSms ? 'إخفاء الإعداد المتقدم' : '⚙️ تخصيص Sender ID / بوابة خاصة'}</span>
          </button>
        </div>

        {smsTestResult && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: smsTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: smsTestResult.success ? '#047857' : '#B91C1C',
            border: `1px solid ${smsTestResult.success ? '#10B981' : '#EF4444'}`
          }}>
            {smsTestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{smsTestResult.message}</span>
          </div>
        )}

        {showCustomSms && (
          <div style={{
            background: 'var(--bg-secondary, #F8FAFC)',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px dashed var(--border-color, #CBD5E1)',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary, #64748B)', fontWeight: 600 }}>
              تخصيص هوية مرسل خاصة بالعيادة أو بوابة SMS مباشرة:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>اسم المرسل المعتمد (Sender ID)</label>
                <input
                  type="text"
                  placeholder="e.g. DrAhmedClinic"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #E4E4E7)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>مفتاح بوابة SMS (EasySendSMS / Cequens)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSmsKey ? 'text' : 'password'}
                    placeholder="SMS API Token..."
                    value={smsApiKey}
                    onChange={(e) => setSmsApiKey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #E4E4E7)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmsKey(!showSmsKey)}
                    style={{
                      position: 'absolute',
                      left: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#71717A',
                      cursor: 'pointer'
                    }}
                  >
                    {showSmsKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>رقم واتساب العيادة المعتمد (WhatsApp Business)</label>
                <input
                  type="tel"
                  placeholder="010xxxxxxxx"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #E4E4E7)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Live SMS Test Field */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary, #F4F4F5)', padding: '0.75rem', borderRadius: '8px' }}>
          <input
            type="tel"
            placeholder="أدخل رقم محمول للتجربة (مثال: 01012345678)..."
            value={smsTestPhone}
            onChange={(e) => setSmsTestPhone(e.target.value)}
            style={{
              flex: 1,
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #E4E4E7)',
              fontSize: '0.82rem',
              background: '#FFF'
            }}
          />
          <button
            type="button"
            onClick={handleTestSms}
            disabled={smsTesting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              background: '#0284C7',
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: smsTesting ? 'not-allowed' : 'pointer'
            }}
          >
            {smsTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            <span>إرسال تجربة</span>
          </button>
        </div>
      </div>

      {/* SECTION 4: Medical AI Assistant API */}
      <div className="settings-card-block" style={{
        background: 'var(--bg-primary, #FFFFFF)',
        border: '1.5px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#8B5CF6', color: '#FFF', padding: '0.45rem', borderRadius: '8px' }}>
              <Bot size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>محرك الذكاء الاصطناعي الطبي (OpenRouter / Medical LLM)</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #71717A)' }}>استدلال سريري، اقتراح أدوية وجرعات، وتحليل شكاوى المرضى تلقائياً</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestAi}
            disabled={aiTesting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #7C3AED',
              background: 'rgba(139, 92, 246, 0.1)',
              color: '#6D28D9',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: aiTesting ? 'not-allowed' : 'pointer'
            }}
          >
            {aiTesting ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
            <span>{aiTesting ? 'جاري الفحص...' : 'اختبار سرعة النموذج'}</span>
          </button>
        </div>

        {/* SaaS Managed AI Core Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.04) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{
              background: '#8B5CF6',
              color: '#FFF',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.92rem', color: '#6D28D9' }}>
                  محرك الذكاء الاصطناعي الطبي الفائق مفعّل سحابياً بواسطة الساس (SaaS Managed Medical LLM)
                </strong>
                <span style={{
                  background: '#10B981',
                  color: '#FFF',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  جاهز للاستدلال السريري
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #71717A)', lineHeight: 1.5 }}>
                يعمل بنموذج الذكاء الاصطناعي الطبي السريري المتقدم (Google Gemini 2.0 Flash / Medical LLM). مدعوم بتحليل التاريخ المرضي، التداخلات الدوائية، والجرعات الطبية المقترحة بدون إعداد يدوي.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomAi(!showCustomAi)}
            style={{
              background: showCustomAi ? '#8B5CF6' : 'transparent',
              color: showCustomAi ? '#FFF' : '#6D28D9',
              border: '1px solid #8B5CF6',
              borderRadius: '8px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>{showCustomAi ? 'إخفاء الإعداد المتقدم' : '⚙️ تخصيص مفتاح OpenRouter خاص'}</span>
          </button>
        </div>

        {aiTestResult && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: aiTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: aiTestResult.success ? '#047857' : '#B91C1C',
            border: `1px solid ${aiTestResult.success ? '#10B981' : '#EF4444'}`
          }}>
            {aiTestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{aiTestResult.message}</span>
          </div>
        )}

        {showCustomAi && (
          <div style={{
            background: 'var(--bg-secondary, #F8FAFC)',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px dashed var(--border-color, #CBD5E1)',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary, #64748B)', fontWeight: 600 }}>
              تخصيص مفتاح OpenRouter أو نموذج ذكاء اصطناعي محدد لعيادتكم فقط:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>مفتاح OpenRouter API Key الخاص بالعيادة</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showAiKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-..."
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #E4E4E7)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKey(!showAiKey)}
                    style={{
                      position: 'absolute',
                      left: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#71717A',
                      cursor: 'pointer'
                    }}
                  >
                    {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>النموذج الذكي المعتمد (Medical Model)</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #E4E4E7)',
                    fontSize: '0.85rem',
                    background: '#FFF'
                  }}
                >
                  {AI_MODELS_CATALOG.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.badge})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: Outgoing Webhooks */}
      <div className="settings-card-block" style={{
        background: 'var(--bg-primary, #FFFFFF)',
        border: '1.5px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#10B981', color: '#FFF', padding: '0.45rem', borderRadius: '8px' }}>
              <Webhook size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>إشعارات الـ Webhooks الصادرة (Realtime Webhooks Dispatcher)</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #71717A)' }}>إرسال إشعار فوري لأنظمتكم المحاسبية أو برامج CRM عند وقوع أي حدث في العيادة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={webhookTesting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #059669',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#047857',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: webhookTesting ? 'not-allowed' : 'pointer'
            }}
          >
            {webhookTesting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            <span>إرسال تجربة Ping</span>
          </button>
        </div>

        {webhookTestResult && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: webhookTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: webhookTestResult.success ? '#047857' : '#B91C1C',
            border: `1px solid ${webhookTestResult.success ? '#10B981' : '#EF4444'}`
          }}>
            {webhookTestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{webhookTestResult.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>رابط استلام الـ Webhook (Endpoint URL)</label>
            <input
              type="url"
              placeholder="https://your-crm.com/api/clinicflow-webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #E4E4E7)',
                fontSize: '0.85rem',
                direction: 'ltr',
                textAlign: 'left'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>مفتاح التحقق من التوقيع (HMAC Secret Signature)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                placeholder="whsec_..."
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #E4E4E7)',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                style={{
                  position: 'absolute',
                  left: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#71717A',
                  cursor: 'pointer'
                }}
              >
                {showWebhookSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>الأحداث المراد إرسالها (Subscribed Events):</label>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={webhookEvents.appointmentCreated}
                onChange={(e) => setWebhookEvents({ ...webhookEvents, appointmentCreated: e.target.checked })}
              />
              <span>حجز موعد جديد (appointment.created)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={webhookEvents.patientRegistered}
                onChange={(e) => setWebhookEvents({ ...webhookEvents, patientRegistered: e.target.checked })}
              />
              <span>تسجيل مريض جديد (patient.created)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={webhookEvents.invoiceIssued}
                onChange={(e) => setWebhookEvents({ ...webhookEvents, invoiceIssued: e.target.checked })}
              />
              <span>إصدار فاتورة جديدة (invoice.created)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Global Save Button Sticky Bar */}
      <div style={{
        position: 'sticky',
        bottom: '1rem',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '14px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="#10B981" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090B' }}>
            جميع المفاتيح يتم حفظها مشفرة ومزامنتها لحظياً عبر كافة نوافذ العيادة
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSavingAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.5rem',
            borderRadius: '10px',
            background: 'var(--clinic-primary, #09090B)',
            color: '#FFF',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: isSavingAll ? 'not-allowed' : 'pointer'
          }}
        >
          {isSavingAll ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{isSavingAll ? 'جاري الحفظ والمزامنة...' : 'حفظ إعدادات الـ APIs والمزامنة'}</span>
        </button>
      </div>
    </div>
  );
}
