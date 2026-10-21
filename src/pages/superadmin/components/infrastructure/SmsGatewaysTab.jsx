import React, { useState } from 'react';
import { Send, Eye, EyeOff, Key, Copy, Check, Sparkles } from 'lucide-react';
import { getGlobalSmsProvider, saveGlobalSmsProvider, testSmsConnection } from '@/features/marketing/services/smsService';
import { copyToClipboard } from '@/utils/clipboard';

export function SmsGatewaysTab({ allTenants = [], onOpenApiModal, updateTenantInfo }) {
  const [smsProvider, setSmsProvider] = useState(() => getGlobalSmsProvider());
  const [smsApiKey, setSmsApiKey] = useState(() => localStorage.getItem('clinicflow_global_sms_key') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEXTBEE_API_KEY) || '');
  const [testPhone, setTestPhone] = useState('01006285031');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null);
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

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

  return (
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
              type={showSmsKey ? 'text' : 'password'}
              placeholder="sms_live_api_key_xxxxxxxx"
              dir="ltr"
              value={smsApiKey}
              onChange={(e) => setSmsApiKey(e.target.value)}
              className="input-field"
              style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            />
            <button
              type="button"
              onClick={() => setShowSmsKey(prev => !prev)}
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
              title={showSmsKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
              aria-label={showSmsKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
            >
              {showSmsKey ? <EyeOff size={16} /> : <Eye size={16} />}
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

      {/* Per-Clinic Dedicated Tokens & Gateways Section */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Key size={18} color="#4F46E5" />
              <span>مفاتيح وتوكنات العيادات المستقلة (Per-Clinic Dedicated Tokens & Gateways)</span>
            </h4>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              لكل عيادة مفتاح توكن مخصص معزول تماماً، مع إمكانية ربط بوابة SMS خاصة بها أو الاعتماد على رصيد المنصة المركزي.
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 700 }}>
            {allTenants.length} عيادات مسجلة
          </span>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>العيادة</th>
                <th style={{ padding: '0.75rem 1rem' }}>توكن الـ API الحصري للعيادة</th>
                <th style={{ padding: '0.75rem 1rem' }}>معرّف المرسل (Sender ID)</th>
                <th style={{ padding: '0.75rem 1rem' }}>بوابة الـ SMS وحالة الربط</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>تخصيص التوكن</th>
              </tr>
            </thead>
            <tbody>
              {allTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    لا توجد عيادات مسجلة حالياً
                  </td>
                </tr>
              ) : (
                allTenants.map((t) => {
                  const clinicApiKey = t.apiKey || t.api_key || `cf_live_sec_${(t.slug || 'clinic').replace(/[^a-zA-Z0-9]/g, '')}_${(t.id || 'sec').substring(0, 8)}`;
                  const hasCustomSms = Boolean(t.customSmsKey || t.custom_sms_key || t.smsApiKey);
                  const isCopied = copiedKey === t.slug;

                  return (
                    <tr key={t.id || t.slug} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{t.name}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {t.slug}.clinicflow.app
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <code dir="ltr" style={{ fontSize: '0.74rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', color: '#4F46E5', fontFamily: 'monospace' }}>
                            {clinicApiKey.substring(0, 16)}...
                          </code>
                          <button
                            type="button"
                            onClick={async () => {
                              const success = await copyToClipboard(clinicApiKey);
                              if (success) {
                                setCopiedKey(t.slug);
                                setTimeout(() => setCopiedKey(null), 2000);
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: isCopied ? '#059669' : '#64748B', cursor: 'pointer', padding: '2px', display: 'inline-flex' }}
                            title="نسخ توكن العيادة بالكامل"
                            aria-label="نسخ توكن العيادة"
                          >
                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        {t.senderId ? (
                          <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, fontFamily: 'monospace' }}>
                            {t.senderId}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>افتراضي (ClinicFlow)</span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        {hasCustomSms ? (
                          <span style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={11} />
                            <span>توكن خاص بالعيادة</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                            مشترك عبر رصيد المنصة المركزي
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onOpenApiModal && onOpenApiModal(t)}
                          style={{
                            background: 'rgba(79, 70, 229, 0.08)',
                            border: '1px solid rgba(79, 70, 229, 0.3)',
                            borderRadius: '6px',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#4F46E5',
                            fontWeight: 600
                          }}
                          title="إدارة وتعديل توكن العيادة وبوابات الربط"
                        >
                          <Key size={13} />
                          <span>تخصيص التوكن والربط</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
