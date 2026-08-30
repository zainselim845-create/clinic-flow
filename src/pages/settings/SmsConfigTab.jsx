import React, { useState } from 'react';
import { Smartphone, Send, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getSmsConfig, saveSmsConfig, sendSMS } from '../../services/smsService';

export default function SmsConfigTab() {
  const [config, setConfig] = useState(getSmsConfig());
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('مرحباً! هذه رسالة تجريبية ناجحة من نظام كلينك فلو للعيادات ');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [smsSaveSuccess, setSmsSaveSuccess] = useState(false);

  const handleSaveSms = (e) => {
    e.preventDefault();
    saveSmsConfig(config);
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
    saveSmsConfig(config);

    try {
      const res = await sendSMS(testPhone, testMessage);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="settings-section sms-tab">
      <div className="section-header">
        <div>
          <h3>بوابات الرسائل القصيرة (SMS Gateway Integration)</h3>
          <p>ربط مزود خدمة الرسائل لإرسال تأكيدات الحجز والتذكير التلقائي قبل موعد العيادة</p>
        </div>
      </div>

      {smsSaveSuccess && (
        <div className="settings-alert success">
          <CheckCircle2 size={18} />
          <span>تم حفظ إعدادات بوابة SMS بنجاح!</span>
        </div>
      )}

      <form onSubmit={handleSaveSms} className="sms-form">
        <div className="form-grid">
          <div className="form-group">
            <label>مزود الخدمة (SMS Provider)</label>
            <select
              value={config.provider || 'twilio'}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
            >
              <option value="twilio">Twilio SMS Global</option>
              <option value="victorylink">VictoryLink Egypt (فيكتوري لينك مصر)</option>
              <option value="taqnyat">Taqnyat SMS (تقنيات)</option>
              <option value="custom">Custom Webhook / REST API</option>
            </select>
          </div>

          <div className="form-group">
            <label>اسم المرسل المعتمد (Sender ID)</label>
            <input
              type="text"
              value={config.senderId || ''}
              onChange={(e) => setConfig({ ...config, senderId: e.target.value })}
              placeholder="مثال: ClinicFlow أو DrSherif"
            />
          </div>

          <div className="form-group">
            <label>Account SID / Username / API Key</label>
            <input
              type="text"
              value={config.accountSid || ''}
              onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
              placeholder="أدخل مفتاح الحساب أو اسم المستخدم"
            />
          </div>

          <div className="form-group">
            <label>Auth Token / API Secret / Password</label>
            <input
              type="password"
              value={config.authToken || ''}
              onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
              placeholder="أدخل الرمز السري للحساب"
            />
          </div>
        </div>

        <div className="sms-actions-bar">
          <button type="submit" className="btn btn-primary">
            <Save size={18} />
            <span>حفظ إعدادات البوابة</span>
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
