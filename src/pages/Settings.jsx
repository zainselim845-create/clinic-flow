import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Key, Radio, Link as LinkIcon, Send, CheckCircle2, 
  AlertCircle, Download, MessageSquare, Building2, Sparkles
} from 'lucide-react';
import { getSmsConfig, saveSmsConfig, sendSMS } from '../services/smsService';
import './Settings.css';

const Settings = () => {
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
  const [testMessage, setTestMessage] = useState('مرحباً! هذه رسالة تجريبية ناجحة من نظام كلينك فلو للعيادات 🏥✨');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const current = getSmsConfig();
    setConfig(current);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    saveSmsConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      alert('يرجى كتابة رقم الهاتف أولاً لإرسال التجربة');
      return;
    }

    setIsSending(true);
    setTestResult(null);

    // Save configuration before sending
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
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h2>إعدادات بوابة الرسائل النصية (SMS Gateway)</h2>
          <p className="page-subtitle">ربط الهاتف الأندرويد والشريحة لإرسال رسائل التأكيد والتذكير للمرضى مجاناً وبأمان</p>
        </div>
      </div>

      {/* Visual Step-by-Step Guide */}
      <div className="guide-card glass-card">
        <h3>📖 خطوات الربط في 3 دقائق فقط:</h3>
        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>حمّل تطبيق TextBee على هاتف العيادة</h4>
              <p>تطبيق أندرويد مجاني ومفتوح المصدر يحول شريحة الهاتف إلى بوابة SMS سحابية.</p>
              <a 
                href="https://textbee.dev" 
                target="_blank" 
                rel="noreferrer" 
                className="btn-download"
              >
                <Download size={16} /> موقع وتحميل TextBee (APK)
              </a>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>سجل حسابك وانسخ المفاتيح</h4>
              <p>افتح التطبيق، أنشئ حساباً وانسخ الـ <strong>API Key</strong> والـ <strong>Device ID</strong> الظاهرين على شاشة الهاتف.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>ألصق المفاتيح بالأسفل واضغط حفظ</h4>
              <p>ضع المفاتيح في الحقول بالأسفل، واضغط <strong>"حفظ الإعدادات"</strong> ثم جرب إرسال رسالة لرقمك فوراً!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        {/* Settings Form */}
        <div className="settings-card glass-card">
          <h3>⚙️ بيانات الربط والاتصال</h3>
          <form onSubmit={handleSave} className="settings-form">
            <div className="form-group">
              <label className="form-label">نوع بوابة الرسائل (SMS Gateway Provider):</label>
              <div className="provider-selector">
                <button
                  type="button"
                  className={`provider-btn ${config.provider === 'cequens' ? 'active' : ''}`}
                  onClick={() => setConfig({ ...config, provider: 'cequens' })}
                >
                  <Building2 size={20} />
                  <span>Cequens (رسمي باسم العيادة 🇪🇬)</span>
                  <span className="badge-official">الموصى به</span>
                </button>
                <button
                  type="button"
                  className={`provider-btn ${config.provider === 'textbee' ? 'active' : ''}`}
                  onClick={() => setConfig({ ...config, provider: 'textbee', apiUrl: 'https://api.textbee.dev/api/v1' })}
                >
                  <Smartphone size={20} />
                  <span>TextBee (أندرويد + سحابة)</span>
                </button>
                <button
                  type="button"
                  className={`provider-btn ${config.provider === 'android-gateway' ? 'active' : ''}`}
                  onClick={() => setConfig({ ...config, provider: 'android-gateway', apiUrl: 'http://192.168.1.100:8080' })}
                >
                  <Radio size={20} />
                  <span>Capcom6 (واي فاي محلي)</span>
                </button>
              </div>
            </div>

            {config.provider === 'cequens' && (
              <>
                <div className="provider-alert-box info">
                  <Sparkles size={18} />
                  <span>ترسل الرسائل مباشرة عبر شبكات المحمول المصرية (Vodafone, Orange, Etisalat, WE) وتظهر باسم عيادتك المسجل!</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Key size={16} /> Cequens API Bearer Token / Key:
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={config.cequensApiKey}
                    onChange={(e) => setConfig({ ...config, cequensApiKey: e.target.value })}
                    dir="ltr"
                  />
                  <span className="field-hint">تحصل عليه من Cequens Dashboard ⬅️ Developer Hub ⬅️ API Keys.</span>
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
                  <span className="field-hint">اسم المرسل الذي يظهر على موبايل المريض (حد أقصى 11 حرف إنجليزي).</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <LinkIcon size={16} /> Cequens API URL:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={config.cequensApiUrl}
                    onChange={(e) => setConfig({ ...config, cequensApiUrl: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </>
            )}

            {config.provider === 'textbee' && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <Key size={16} /> TextBee API Key:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 9b8a7c6d-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    dir="ltr"
                  />
                  <span className="field-hint">تنسخه من لوحة تحكم TextBee Dashboard بعد الدخول.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Smartphone size={16} /> Device ID (معرّف الهاتف):
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 660f9a2b8e1a7c0012345678"
                    value={config.deviceId}
                    onChange={(e) => setConfig({ ...config, deviceId: e.target.value })}
                    dir="ltr"
                  />
                  <span className="field-hint">يظهر داخل تطبيق الهاتف عند تفعيله.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <LinkIcon size={16} /> API Server URL:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </>
            )}

            {config.provider === 'android-gateway' && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <LinkIcon size={16} /> عنوان IP للهاتف على شبكة العيادة:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="http://192.168.1.50:8080"
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    dir="ltr"
                  />
                  <span className="field-hint">يظهر على شاشة التطبيق في الهاتف بعد تشغيله على نفس الراوتر.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Key size={16} /> Token الحماية (اختياري):
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="كلمة المرور إذا قمت بتفعيلها"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-save-settings">
                💾 حفظ الإعدادات في النظام
              </button>
              {saveSuccess && <span className="save-status">✅ تم حفظ الإعدادات بنجاح!</span>}
            </div>
          </form>
        </div>

        {/* Live Test Card */}
        <div className="settings-card glass-card">
          <h3>🧪 تجربة إرسال رسالة حية فورية</h3>
          <p className="card-desc">اكتب رقم هاتفك المحمول واضغط إرسال للتأكد من وصول الرسالة فعلياً لهاتفك.</p>

          <div className="test-box">
            <div className="form-group">
              <label className="form-label">رقم الهاتف المستلم:</label>
              <input
                type="tel"
                className="input-field"
                placeholder="010xxxxxxxx"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label className="form-label">نص الرسالة التجريبية:</label>
              <textarea
                className="input-field"
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-send-test"
              onClick={handleSendTest}
              disabled={isSending}
            >
              {isSending ? (
                <span>جاري الإرسال عبر الشريحة...</span>
              ) : (
                <>
                  <Send size={18} />
                  <span>إرسال رسالة تجريبية الآن 🚀</span>
                </>
              )}
            </button>

            {testResult && (
              <div className={`result-box ${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? (
                  <>
                    <CheckCircle2 size={24} className="result-icon text-success" />
                    <div className="result-text">
                      <strong>تم الإرسال بنجاح! ({testResult.method})</strong>
                      {testResult.method === 'simulation' ? (
                        <p>⚠️ يعمل النظام حالياً في وضع <strong>المحاكاة (Simulation)</strong> لعدم إدخال مفاتيح هاتف حقيقي بعد. يتم حفظ وتجهيز الرسائل بنجاح.</p>
                      ) : (
                        <p>🎉 تم إرسال الرسالة النصية فعلياً عبر شريحة الهاتف المتصلة بنجاح!</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={24} className="result-icon text-error" />
                    <div className="result-text">
                      <strong>فشل الإرسال:</strong>
                      <p>{testResult.error || 'يرجى التأكد من اتصال الهاتف بالإنترنت والشريحة.'}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message Templates Preview */}
      <div className="templates-card glass-card">
        <h3>💬 نماذج الرسائل الآلية التي يرسلها البرنامج للمرضى</h3>
        <div className="templates-grid">
          <div className="template-item">
            <div className="template-header">
              <MessageSquare size={18} />
              <h4>1. رسالة تأكيد الحجز الفورية (عند حجز موعد جديد)</h4>
            </div>
            <div className="template-bubble">
              "عزيزي <strong>[اسم المريض]</strong>، تم تأكيد حجز موعدك في عيادة د. أحمد الشريف يوم <strong>[التاريخ]</strong> الساعة <strong>[الوقت]</strong>. نتمنى لك دوام الصحة والعافية."
            </div>
          </div>

          <div className="template-item">
            <div className="template-header">
              <MessageSquare size={18} />
              <h4>2. رسالة التذكير الآلية (قبل الموعد بـ 30 دقيقة)</h4>
            </div>
            <div className="template-bubble">
              "تذكير بموعد: موعدك في عيادة د. أحمد الشريف اليوم <strong>[التاريخ]</strong> الساعة <strong>[الوقت]</strong>. يُرجى الحضور قبل الموعد بـ 15 دقيقة."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
