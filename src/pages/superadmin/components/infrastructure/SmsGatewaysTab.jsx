import React, { useState } from 'react';
import { Send, Eye, EyeOff } from 'lucide-react';
import { getGlobalSmsProvider, saveGlobalSmsProvider, testSmsConnection } from '../../../../services/smsService';

export function SmsGatewaysTab() {
  const [smsProvider, setSmsProvider] = useState(() => getGlobalSmsProvider());
  const [smsApiKey, setSmsApiKey] = useState(() => localStorage.getItem('clinicflow_global_sms_key') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEXTBEE_API_KEY) || '');
  const [testPhone, setTestPhone] = useState('01006285031');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null);
  const [showSmsKey, setShowSmsKey] = useState(false);

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
    </div>
  );
}
