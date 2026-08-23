import React, { useState, useEffect } from 'react';
import { X, Smartphone, Send, CheckCircle2, AlertCircle, Key, Link as LinkIcon, Radio, Info, Building2 } from 'lucide-react';
import { getSmsConfig, saveSmsConfig, sendSMS } from '../services/smsService';
import './SmsSettingsModal.css';

const SmsSettingsModal = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState({
    provider: 'cequens',
    cequensApiKey: '',
    cequensSenderName: 'keif',
    cequensApiUrl: 'https://apis.cequens.com/sms/v1/messages',
    apiKey: '',
    apiUrl: 'https://api.textbee.dev/api/v1',
    deviceId: '',
    enabled: true
  });

  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('تجربة إرسال رسالة SMS من نظام كلينك فلو بنجاح! 🚀');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getSmsConfig();
      setConfig(current);
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveSmsConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      alert('يرجى إدخال رقم الهاتف للتجربة');
      return;
    }

    setIsSending(true);
    setTestResult(null);

    // Save config first so the service uses the latest values
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
    <div className="modal-overlay">
      <div className="modal-content glass-card sms-settings-modal">
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Smartphone size={24} className="text-primary" />
            <h3>إعدادات وتجربة بوابة الرسائل النصية (Open-Source SMS)</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="sms-modal-body">
          {/* Information banner */}
          <div className="info-banner">
            <Info size={20} />
            <p>
              يمكنك ربط أي هاتف أندرويد يحمل شريحة مصرية مجاناً ليعمل كـ <strong>SMS Gateway</strong> مفتوح المصدر بدون اشتراكات أو تكاليف إضافية!
            </p>
          </div>

          <form onSubmit={handleSave} className="sms-form">
            {/* Provider Selection */}
            <div className="form-group">
              <label className="form-label">نوع البوابة المفتوحة المصدر:</label>
              <div className="provider-grid">
                <label className={`provider-card ${config.provider === 'cequens' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="provider"
                    value="cequens"
                    checked={config.provider === 'cequens'}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                  />
                  <div className="provider-info">
                    <strong>Cequens (رسمي باسم العيادة 🇪🇬)</strong>
                    <span>إرسال رسمي باسم المرسل عبر شبكات المحمول المصرية</span>
                  </div>
                </label>

                <label className={`provider-card ${config.provider === 'textbee' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="provider"
                    value="textbee"
                    checked={config.provider === 'textbee'}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value, apiUrl: 'https://api.textbee.dev/api/v1' })}
                  />
                  <div className="provider-info">
                    <strong>TextBee (أندرويد + سحابة)</strong>
                    <span>تطبيق أندرويد + سحابة مجانية / Self-hosted</span>
                  </div>
                </label>

                <label className={`provider-card ${config.provider === 'android-gateway' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="provider"
                    value="android-gateway"
                    checked={config.provider === 'android-gateway'}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value, apiUrl: 'http://192.168.1.100:8080' })}
                  />
                  <div className="provider-info">
                    <strong>Capcom6 Android Gateway</strong>
                    <span>سيرفر محلي مباشر على شبكة الواي فاي للعيادة</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Provider Configuration Inputs */}
            {config.provider === 'cequens' && (
              <div className="credentials-block">
                <div className="form-group">
                  <label className="form-label">
                    <Key size={16} /> Cequens API Bearer Token:
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={config.cequensApiKey}
                    onChange={(e) => setConfig({ ...config, cequensApiKey: e.target.value })}
                    dir="ltr"
                  />
                  <small className="help-text">تحصل عليه من Cequens Console ⬅️ Developer Hub ⬅️ API Keys.</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Building2 size={16} /> Sender Name (اسم المرسل المعتمد):
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. keif أو ClinicFlow"
                    value={config.cequensSenderName}
                    onChange={(e) => setConfig({ ...config, cequensSenderName: e.target.value })}
                    dir="ltr"
                    maxLength={11}
                  />
                  <small className="help-text">الاسم المعتمد من شبكات المحمول (يظهر للمريض).</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <LinkIcon size={16} /> Cequens API Endpoint:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={config.cequensApiUrl}
                    onChange={(e) => setConfig({ ...config, cequensApiUrl: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            )}
            {config.provider === 'textbee' && (
              <div className="credentials-block">
                <div className="form-group">
                  <label className="form-label">
                    <Key size={16} /> TextBee API Key:
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="e.g. tb_live_xxxxxxxxxxxxxxxx"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    dir="ltr"
                  />
                  <small className="help-text">تحصل عليه من لوحة تحكم تطبيق TextBee بعد ربط هاتفك.</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Radio size={16} /> Device ID (معرّف الهاتف):
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 660f9a2b8e1a7c0012345678"
                    value={config.deviceId}
                    onChange={(e) => setConfig({ ...config, deviceId: e.target.value })}
                    dir="ltr"
                  />
                  <small className="help-text">يظهر في التطبيق على هاتفك بعد تسجيل الدخول.</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <LinkIcon size={16} /> API Base URL:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {config.provider === 'android-gateway' && (
              <div className="credentials-block">
                <div className="form-group">
                  <label className="form-label">
                    <LinkIcon size={16} /> عنوان IP للهاتف على الواي فاي:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="http://192.168.1.50:8080"
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    dir="ltr"
                  />
                  <small className="help-text">يظهر على شاشة تطبيق Android SMS Gateway عند بدء السيرفر.</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Key size={16} /> Token / كلمة المرور (اختياري):
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="إذا كنت قد فعلت كلمة مرور في التطبيق"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {config.provider === 'webhook' && (
              <div className="credentials-block">
                <div className="form-group">
                  <label className="form-label">
                    <LinkIcon size={16} /> Webhook Endpoint URL:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://my-sms-server.com/api/send"
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            <div className="modal-actions-row">
              <button type="submit" className="btn btn-primary">
                💾 حفظ الإعدادات
              </button>
              {saveSuccess && <span className="save-badge">✅ تم الحفظ بنجاح!</span>}
            </div>
          </form>

          {/* Test Section */}
          <div className="test-section-card">
            <h4>🧪 تجربة إرسال رسالة فورية حية:</h4>
            <div className="test-form-row">
              <input
                type="tel"
                className="input-field"
                placeholder="رقم الهاتف (مثال: 01012345678)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                dir="ltr"
              />
              <button
                type="button"
                className="btn btn-success"
                onClick={handleSendTest}
                disabled={isSending}
              >
                {isSending ? 'جاري الإرسال...' : <><Send size={16} /> إرسال تجريبي الآن</>}
              </button>
            </div>

            <textarea
              className="input-field mt-2"
              rows={2}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="نص الرسالة..."
            />

            {testResult && (
              <div className={`test-result-box ${testResult.success ? 'is-success' : 'is-error'}`}>
                {testResult.success ? (
                  <>
                    <CheckCircle2 size={20} color="var(--success, #10b981)" />
                    <div>
                      <strong>تم تنفيذ الإرسال بنجاح! ({testResult.method})</strong>
                      {testResult.method === 'simulation' && (
                        <p className="sub-msg">⚠️ يعمل في وضع المحاكاة لأن بيانات الـ Gateway لم تُدخل بعد أو فارغة.</p>
                      )}
                      {testResult.method === 'cequens' && (
                        <p className="sub-msg">🇪🇬 تم إرسال الرسالة بنجاح عبر Cequens وستظهر باسم المرسل المعتمد!</p>
                      )}
                      {testResult.method === 'textbee' && (
                        <p className="sub-msg">🚀 تم إرسال الرسالة فعلياً عبر الهاتف المتصل بـ TextBee!</p>
                      )}
                      {testResult.method === 'android-gateway' && (
                        <p className="sub-msg">📶 تم إرسال الرسالة مباشرة عبر Android SMS Gateway المحلي!</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} color="var(--error, #ef4444)" />
                    <div>
                      <strong>تعذر الإرسال:</strong>
                      <p className="sub-msg">{testResult.error || 'يرجى التحقق من اتصال الهاتف والإنترنت وصلاحية المفتاح.'}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmsSettingsModal;
