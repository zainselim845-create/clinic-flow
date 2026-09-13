import React, { useState, useEffect } from 'react';
import { Smartphone, Send, Save, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { getSmsConfig, saveSmsConfig, sendSMS, formatSenderId, getClinicSenderId } from '../../services/smsService';
import { useTenant } from '../../context/TenantContext';

export default function SmsConfigTab() {
  const { tenant } = useTenant();
  const clinicId = tenant?.id || 'default';
  const [config, setConfig] = useState(() => getSmsConfig(clinicId));
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('مرحباً! هذه رسالة تجريبية ناجحة من نظام كلينك فلو للعيادات ');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [smsSaveSuccess, setSmsSaveSuccess] = useState(false);

  useEffect(() => {
    setConfig(getSmsConfig(clinicId));
  }, [clinicId]);

  const handleSaveSms = (e) => {
    e.preventDefault();
    const sanitized = {
      ...config,
      senderId: formatSenderId(config.senderId || getClinicSenderId(clinicId))
    };
    saveSmsConfig(sanitized, clinicId);
    setConfig(sanitized);
    setSmsSaveSuccess(true);
    setTimeout(() => setSmsSaveSuccess(false), 3000);
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      setTestResult({ success: false, error: 'يرجى كتابة رقم الهاتف أولاً لإرسال التجربة' });
      return;
    }

    setIsSending(true);
    setTestResult(null);
    saveSmsConfig(config, clinicId);

    try {
      const res = await sendSMS(testPhone, testMessage, clinicId);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const currentSender = formatSenderId(config.senderId || getClinicSenderId(clinicId));

  return (
    <div className="settings-section sms-tab">
      <div className="section-header">
        <div>
          <h3>بوابات الرسائل القصيرة واسم المرسل (SMS Gateway & Sender ID)</h3>
          <p>تخصيص اسم المرسل المعتمد (Sender ID) الخاص بعيادتكم والربط مع بوابات الإرسال</p>
        </div>
      </div>

      {/* Live Sender ID Preview Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.08), rgba(16, 185, 129, 0.08))',
        border: '1px solid rgba(0, 113, 227, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#0071E3', color: '#FFF', padding: '0.5rem', borderRadius: '10px' }}>
            <Smartphone size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>اسم المرسل المعتمد لعيادتكم (Sender ID):</div>
            <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              {currentSender}
            </strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#059669', background: '#ECFDF5', padding: '0.35rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>معتمد ومطابق للوائح تنظيم الاتصالات (NTRA / GSM)</span>
        </div>
      </div>

      {smsSaveSuccess && (
        <div className="settings-alert success">
          <CheckCircle2 size={18} />
          <span>تم حفظ إعدادات بوابة SMS واسم المرسل بنجاح!</span>
        </div>
      )}

      <form onSubmit={handleSaveSms} className="sms-form">
        <div className="form-grid">
          <div className="form-group">
            <label>مزود الخدمة (SMS Provider)</label>
            <select
              value={config.provider || 'none'}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
            >
              <option value="none">بدون ربط مباشر (أو استخدام واتساب المجاني)</option>
              <option value="easysendsms">EasySendSMS (مصر والخليج)</option>
              <option value="smsmisr">SMSMisr (إس إم إس مصر)</option>
              <option value="cequens">Cequens SMS (سيكوينز)</option>
              <option value="textbee">TextBee Gateway (Android Gateway)</option>
              <option value="sandbox">وضع المحاكاة والتجربة (Sandbox)</option>
            </select>
          </div>

          <div className="form-group">
            <label>اسم المرسل المعتمد للعيادة (Sender ID) *</label>
            <input
              type="text"
              value={config.senderId || ''}
              maxLength={11}
              dir="ltr"
              onChange={(e) => setConfig({ ...config, senderId: formatSenderId(e.target.value) })}
              placeholder="مثال: DrAhmed أو SaraDerma"
            />
            <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              أقصى حد 11 حرفاً إنجليزياً وأرقام بدون مسافات (وفقاً للمعيار العالمي GSM).
            </small>
          </div>

          <div className="form-group">
            <label>مفتاح الربط / API Key</label>
            <input
              type="text"
              value={config.easysendsmsApiKey || config.cequensApiKey || config.apiKey || ''}
              onChange={(e) => setConfig({ 
                ...config, 
                easysendsmsApiKey: e.target.value,
                cequensApiKey: e.target.value,
                apiKey: e.target.value 
              })}
              placeholder="أدخل مفتاح API الخاص بحسابك لدى المزود"
            />
          </div>

          <div className="form-group">
            <label>اسم المستخدم أو معرف الحساب (إن وجد)</label>
            <input
              type="text"
              value={config.smsmisrUsername || ''}
              onChange={(e) => setConfig({ ...config, smsmisrUsername: e.target.value })}
              placeholder="اسم المستخدم في بوابة SMSMisr"
            />
          </div>
        </div>

        <div className="sms-actions-bar">
          <button type="submit" className="btn btn-primary">
            <Save size={18} />
            <span>حفظ إعدادات البوابة واسم المرسل</span>
          </button>
        </div>
      </form>

      <div className="test-sms-card">
        <h4>
          <Smartphone size={18} />
          <span>اختبار إرسال رسالة SMS فورية للمعاينة</span>
        </h4>
        <div className="test-sms-grid">
          <div className="form-group">
            <label>رقم هاتف التجربة</label>
            <input
              type="tel"
              placeholder="01006285031"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <div className="form-group full-width">
            <label>نص الرسالة التجريبية</label>
            <textarea
              rows={2}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendTest}
          disabled={isSending}
          className="btn btn-secondary"
        >
          {isSending ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
          <span>{isSending ? 'جاري الإرسال التجريبي...' : 'إرسال رسالة اختبار'}</span>
        </button>

        {testResult && (
          <div className={`test-result-box ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? (
              <>
                <CheckCircle2 size={18} />
                <span>تم إرسال الرسالة التجريبية بنجاح! كود العملية: {testResult.messageId || 'SENT-OK'}</span>
              </>
            ) : (
              <>
                <AlertCircle size={18} />
                <span>فشل الإرسال: {testResult.error || 'يرجى مراجعة صحة بيانات الربط'}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
