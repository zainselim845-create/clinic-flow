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
        background: 'var(--bg-card, #FFFFFF)',
        border: '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--clinic-primary, #09090B)', color: '#FFF', padding: '0.5rem', borderRadius: '8px' }}>
            <Smartphone size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>اسم المرسل المعتمد لعيادتكم (Sender ID):</div>
            <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              {currentSender}
            </strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>معتمد ومطابق للوائح تنظيم الاتصالات (NTRA / GSM)</span>
        </div>
      </div>

      {/* SaaS Central SMS Gateway Notice Banner */}
      <div style={{
        background: 'var(--bg-secondary, #FAFAFA)',
        border: '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#10B981', color: '#FFF', padding: '0.5rem', borderRadius: '10px' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>
              بوابة الرسائل القصيرة ومسارات الاتصالات مدارة ومؤمّنة مركزياً (SaaS SMS Hub)
            </strong>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              رصيد الرسائل وبوابات الربط تُغذى وتُعتمد تلقائياً من باقة عيادتكم في المنصة دون الحاجة لتعاقدات منفصلة.
            </p>
          </div>
        </div>
        <span style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '999px' }}>
          بوابة الساس نشطة
        </span>
      </div>

      {smsSaveSuccess && (
        <div className="settings-alert success">
          <CheckCircle2 size={18} />
          <span>تم حفظ اسم المرسل وإعدادات التذكيرات بنجاح!</span>
        </div>
      )}

      <form onSubmit={handleSaveSms} className="sms-form">
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>اسم المرسل المعتمد للعيادة (Approved Sender ID) *</label>
            <input
              type="text"
              value={config.senderId || ''}
              maxLength={11}
              dir="ltr"
              onChange={(e) => setConfig({ ...config, senderId: formatSenderId(e.target.value) })}
              placeholder="مثال: DrAhmed أو SaraDerma أو ZainSelim"
            />
            <small style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginTop: '0.35rem', display: 'block' }}>
              أقصى حد 11 حرفاً إنجليزياً وأرقام بدون مسافات (وفقاً للوائح الجهاز القومي لتنظيم الاتصالات NTRA والمعيار العالمي GSM). هذا هو الاسم الذي يظهر في أعلى رسائل المرضى.
            </small>
          </div>
        </div>

        {/* Templates Showcase */}
        <div style={{
          marginTop: '1rem',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem'
        }}>
          <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone size={16} color="var(--primary)" />
            <span>قوالب الرسائل والتذكيرات الآلية للمرضى</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                ١. تذكير الموعد (قبل الكشف بـ 24 ساعة)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                "مرحباً بك! نذكرك بموعد كشفك في [اسم العيادة] غداً في تمام [الوقت]. لتأكيد أو تعديل الموعد: [رابط المنظومة]"
              </div>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                ٢. تأكيد الحجز الرقمي الفوري
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                "تم تأكيد حجزك بنجاح في [اسم العيادة] يوم [التاريخ] الساعة [الوقت]. كود الحجز: [الكود]. نتمنى لك دوام الصحة!"
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced BYO Gateway (Optional) */}
        <details style={{ marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            ⚙️ خيارات متقدمة: ربط بوابة اتصالات خارجية خاصة (BYO Gateway)
          </summary>
          <div style={{ marginTop: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            <div className="form-group">
              <label>المزود الخاص</label>
              <select
                value={config.provider || 'none'}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              >
                <option value="none">استخدام بوابة ساس الافتراضية (موصى به)</option>
                <option value="easysendsms">EasySendSMS</option>
                <option value="smsmisr">SMSMisr (مصر)</option>
                <option value="cequens">Cequens SMS</option>
                <option value="textbee">TextBee Android Gateway</option>
                <option value="sandbox">وضع المحاكاة (Sandbox)</option>
              </select>
            </div>
            <div className="form-group">
              <label>مفتاح الربط الخاص (API Key)</label>
              <input
                type="text"
                value={config.easysendsmsApiKey || config.cequensApiKey || config.apiKey || ''}
                onChange={(e) => setConfig({ 
                  ...config, 
                  easysendsmsApiKey: e.target.value,
                  cequensApiKey: e.target.value,
                  apiKey: e.target.value 
                })}
                placeholder="اتركه فارغاً للاعتماد على بوابة المنصة"
              />
            </div>
          </div>
        </details>

        <div className="sms-actions-bar" style={{ marginTop: '1.25rem' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={18} />
            <span>حفظ اسم المرسل والإعدادات</span>
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
