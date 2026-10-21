import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Send, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { Dialog, Portal } from '@/components/ui';
import { copyToClipboard } from '@/utils/clipboard';

export default function ClinicApiModal({
  isOpen,
  onClose,
  clinic,
  onSaveApiSettings
}) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [senderId, setSenderId] = useState('');
  const [customSmsKey, setCustomSmsKey] = useState('');
  const [customAiKey, setCustomAiKey] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (clinic) {
      const existingKey = clinic.apiKey || clinic.api_key || `cf_live_sec_${(clinic.slug || 'clinic').replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substring(2, 10)}`;
      setApiKey(existingKey);
      setSenderId(clinic.senderId || '');
      setCustomSmsKey(clinic.customSmsKey || clinic.custom_sms_key || '');
      setCustomAiKey(clinic.customAiKey || clinic.custom_ai_key || '');
      setWhatsappNumber(clinic.whatsappNumber || clinic.phone || '');
      setWebhookUrl(clinic.webhookUrl || '');
      setAlert(null);
    }
  }, [clinic]);

  if (!clinic) return null;

  const handleCopy = async (text, key) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleRegenerateKey = () => {
    if (window.confirm('تحذير: هل أنت متأكد من رغبتك في توليد مفتاح API جديد؟ ستتوقف أي أنظمة خارجية تستخدم المفتاح القديم حتى يتم تحديثه.')) {
      const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const newKey = `cf_live_sec_${(clinic.slug || 'clinic').replace(/[^a-zA-Z0-9]/g, '')}_${randomSecret}`;
      setApiKey(newKey);
      setAlert({ type: 'info', text: 'تم إنشاء مفتاح جديد. انقر على "حفظ إعدادات الـ APIs" لتثبيته في النظام.' });
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setAlert(null);

    try {
      const updates = {
        apiKey,
        api_key: apiKey,
        senderId: senderId.trim(),
        customSmsKey: customSmsKey.trim(),
        custom_sms_key: customSmsKey.trim(),
        customAiKey: customAiKey.trim(),
        custom_ai_key: customAiKey.trim(),
        whatsappNumber: whatsappNumber.trim(),
        webhookUrl: webhookUrl.trim()
      };

      if (onSaveApiSettings) {
        await onSaveApiSettings(clinic.id || clinic.slug, updates);
      }

      setAlert({ type: 'success', text: 'تم حفظ مفاتيح الربط والـ APIs للعيادة بنجاح!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setAlert({ type: 'error', text: 'فشل حفظ إعدادات الـ APIs: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinicflow.app';
  const curlExample = `curl -X GET "${origin}/api/v1/appointments" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "x-clinic-slug: ${clinic.slug}"`;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content 
            className="saas-modal-card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '20px',
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              zIndex: 1056
            }}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Key size={22} />
                </div>
                <div>
                  <Dialog.Title asChild>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 m-0">
                      مفاتيح الربط البرمجي والـ APIs للعيادة (Clinic API & Integrations)
                    </h3>
                  </Dialog.Title>
                  <p className="text-xs text-zinc-500 m-0 mt-0.5">
                    العيادة: <strong>{clinic.name}</strong> • المعرف: <code className="font-mono text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded">{clinic.slug}</code>
                  </p>
                </div>
              </div>

              <Dialog.CloseTrigger asChild>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </Dialog.CloseTrigger>
            </div>

            {/* Alert banner */}
            {alert && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: alert.type === 'success' ? '#ECFDF5' : alert.type === 'info' ? '#EFF6FF' : '#FEF2F2',
                color: alert.type === 'success' ? '#065F46' : alert.type === 'info' ? '#1E40AF' : '#991B1B',
                border: `1px solid ${alert.type === 'success' ? '#A7F3D0' : alert.type === 'info' ? '#BFDBFE' : '#FECACA'}`
              }}>
                {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{alert.text}</span>
              </div>
            )}

            <form onSubmit={handleSave}>
              {/* 1. Dedicated Clinic API Key */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={16} color="#4F46E5" />
                    <span>مفتاح الـ REST API السري المخصص للعيادة:</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    جاهز للربط الخارجي
                  </span>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    dir="ltr"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'monospace',
                      fontSize: '0.88rem',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(prev => !prev)}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem', flexShrink: 0 }}
                    title={showKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(apiKey, 'api-key')}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 0.85rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                  >
                    {copiedKey === 'api-key' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                    <span>{copiedKey === 'api-key' ? 'تم' : 'نسخ'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 0.75rem', flexShrink: 0 }}
                    title="توليد مفتاح جديد"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* API Quick cURL Snippet */}
                <div style={{ background: '#0F172A', borderRadius: '8px', padding: '0.75rem', marginTop: '0.6rem' }} dir="ltr">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace' }}>cURL Example</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(curlExample, 'curl-snippet')}
                      style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      {copiedKey === 'curl-snippet' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'curl-snippet' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre style={{ margin: 0, color: '#F8FAFC', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {curlExample}
                  </pre>
                </div>
              </div>

              {/* 2. Custom Gateways (SMS Sender ID & WhatsApp & Webhook) */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.92rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={16} color="#059669" />
                  <span>تخصيص قنوات الاتصال والـ Webhooks لهذه العيادة:</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>
                      معرّف مرسل SMS مخصص (Telecom Sender ID):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="مثال: DR-AHMED"
                      maxLength={11}
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>حد أقصى 11 حرفاً إنجليزياً معتمداً من شركات الاتصالات</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>
                      رقم واتساب العيادة المعتمد (WhatsApp Business):
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="01000000000"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>يستخدم لإرسال تذكيرات المواعيد والفواتير للعيادة</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>
                      توكن بوابة SMS خاصة بالعيادة (Dedicated SMS Token - اختياري):
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      placeholder="توكن خاص بالعيادة (SMSMisr / Twilio)..."
                      value={customSmsKey}
                      onChange={(e) => setCustomSmsKey(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>اتركه فارغاً إذا كانت العيادة تستهلك من رصيد المنصة المركزي الموزع</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>
                      توكن محرك الذكاء الاصطناعي الخاص (Dedicated AI Key - اختياري):
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      placeholder="sk-or-v1-xxxxxxxx... (OpenAI / OpenRouter)"
                      value={customAiKey}
                      onChange={(e) => setCustomAiKey(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>اتركه فارغاً لاستخدام مفتاح الذكاء الاصطناعي المركزي للمنصة</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>
                    رابط الـ Webhook للإشعارات الفورية (Outgoing Webhook URL):
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    placeholder="https://your-crm.com/api/clinicflow-webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>إرسال إشعار فوري بصيغة JSON عند كل حجز مريض أو دفعة جديدة</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
                >
                  <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الـ APIs والربط'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1rem' }}
                >
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
