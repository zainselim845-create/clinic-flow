import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Smartphone, Send, Save, CheckCircle2, AlertCircle, RefreshCw,
  ShieldCheck, MessageSquare, Zap, TrendingUp, Clock, Radio,
  ChevronDown, ChevronUp, Eye, EyeOff, Copy, Activity
} from 'lucide-react';
import {
  getSmsConfig, saveSmsConfig, sendSMS, formatSenderId,
  getClinicSenderId, getEasySendSmsBalance, testSmsConnection
} from '../services/smsService';
import { useTenant } from '../context/TenantContext';
import './SmsIntegration.css';

const SMS_PROVIDERS = [
  {
    id: 'clinicflow-gateway',
    name: 'ClinicFlow Gateway',
    desc: 'بوابة كلينك فلو المدارة — جاهزة بدون إعداد',
    badge: 'موصى به',
    fields: []
  },
  {
    id: 'easysendsms',
    name: 'EasySendSMS',
    desc: 'بوابة دولية عالية الأداء — ربط عبر API Key',
    badge: 'دولي',
    fields: ['easysendsmsApiKey']
  },
  {
    id: 'smsmisr',
    name: 'SMSMisr',
    desc: 'بوابة مصرية مرخّصة — اسم مستخدم وكلمة مرور',
    badge: 'مصر',
    fields: ['smsmisrUsername', 'smsmisrPassword']
  },
  {
    id: 'cequens',
    name: 'Cequens',
    desc: 'منصة CPaaS إقليمية — ربط عبر Bearer Token',
    badge: 'إقليمي',
    fields: ['cequensApiKey']
  },
  {
    id: 'textbee',
    name: 'TextBee',
    desc: 'بوابة عبر هاتف Android شخصي',
    badge: 'مجاني',
    fields: ['apiKey', 'deviceId']
  },
  {
    id: 'sandbox',
    name: 'وضع المحاكاة',
    desc: 'Sandbox — بدون إرسال فعلي، للاختبار فقط',
    badge: 'تطوير',
    fields: []
  }
];

const AUTO_TRIGGERS = [
  {
    id: 'booking_confirm',
    title: 'تأكيد الحجز الفوري',
    desc: 'إرسال رسالة تأكيد فورية عند إتمام حجز موعد جديد',
    icon: CheckCircle2,
    template: 'تم تأكيد حجزك بنجاح في {clinic_name} يوم {date} الساعة {time}. كود الحجز: {code}. نتمنى لك دوام الصحة!'
  },
  {
    id: 'appointment_reminder',
    title: 'تذكير الموعد (قبل 24 ساعة)',
    desc: 'تذكير تلقائي للمريض قبل موعد الكشف بيوم كامل',
    icon: Clock,
    template: 'مرحباً {patient_name}، نذكرك بموعدك في {clinic_name} غداً في تمام الساعة {time}. يُرجى الحضور قبل الموعد بـ 15 دقيقة.'
  },
  {
    id: 'recall_reminder',
    title: 'تذكير المتابعة الدورية',
    desc: 'رسالة متابعة دورية للمرضى الذين لم يزوروا العيادة',
    icon: RefreshCw,
    template: 'أ/ {patient_name}، حان موعد المتابعة والفحص الدوري في {clinic_name}. لحجز موعدك، يُرجى التواصل معنا. صحتكم تهمنا!'
  },
  {
    id: 'payment_receipt',
    title: 'إيصال الدفع الرقمي',
    desc: 'إرسال إيصال بالمبلغ المدفوع بعد إتمام عملية التحصيل',
    icon: Activity,
    template: 'تم تحصيل مبلغ {amount} ج.م من أ/ {patient_name} في {clinic_name}. شكراً لثقتكم!'
  }
];

export default function SmsIntegration() {
  const { tenant } = useTenant();
  const clinicId = tenant?.id || 'default';

  const [config, setConfig] = useState(() => getSmsConfig(clinicId));
  const [selectedProvider, setSelectedProvider] = useState(config.provider || 'clinicflow-gateway');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('مرحباً! هذه رسالة تجريبية من نظام كلينك فلو.');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({});
  const [expandedTrigger, setExpandedTrigger] = useState(null);
  const [triggerStates, setTriggerStates] = useState(() => {
    const saved = {};
    AUTO_TRIGGERS.forEach(t => { saved[t.id] = true; });
    return saved;
  });

  const currentSenderForMetrics = formatSenderId(config.senderId || getClinicSenderId(clinicId));
  const [metrics] = useState({
    totalSent: 0,
    deliveryRate: '--',
    balance: 'حسب باقة العيادة',
    activeSender: currentSenderForMetrics || ''
  });

  useEffect(() => {
    const fresh = getSmsConfig(clinicId);
    setConfig(fresh);
    setSelectedProvider(fresh.provider || 'clinicflow-gateway');
  }, [clinicId]);

  const currentSender = useMemo(
    () => formatSenderId(config.senderId || getClinicSenderId(clinicId)),
    [config.senderId, clinicId]
  );

  const activeProviderObj = useMemo(
    () => SMS_PROVIDERS.find(p => p.id === selectedProvider) || SMS_PROVIDERS[0],
    [selectedProvider]
  );

  const handleProviderSelect = useCallback((providerId) => {
    setSelectedProvider(providerId);
    setConfig(prev => ({ ...prev, provider: providerId }));
    setTestResult(null);
  }, []);

  const handleSaveConfig = useCallback((e) => {
    e?.preventDefault();
    const sanitized = {
      ...config,
      provider: selectedProvider,
      senderId: config.senderId ? formatSenderId(config.senderId) : ''
    };
    saveSmsConfig(sanitized, clinicId);
    setConfig(sanitized);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }, [config, selectedProvider, clinicId]);

  const handleSendTest = useCallback(async () => {
    if (!testPhone) {
      setTestResult({ success: false, error: 'يرجى كتابة رقم الهاتف أولاً' });
      return;
    }
    setIsSending(true);
    setTestResult(null);
    saveSmsConfig({ ...config, provider: selectedProvider }, clinicId);
    try {
      const res = await sendSMS(testPhone, testMessage, clinicId);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsSending(false);
    }
  }, [testPhone, testMessage, config, selectedProvider, clinicId]);

  const toggleApiKeyVisibility = useCallback((field) => {
    setShowApiKeys(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const charCount = testMessage.length;
  const smsSegments = Math.ceil(charCount / 70) || 1;

  return (
    <div className="sms-integration-page">
      {/* Page Header */}
      <div className="sms-page-header">
        <div className="sms-header-text">
          <h1>
            <Smartphone size={22} />
            بوابة الرسائل النصية والتكامل
          </h1>
          <p>إدارة شاملة لبوابات SMS، اسم المرسل المعتمد، والتذكيرات الآلية للمرضى</p>
        </div>
        <div className="sms-badge-status">
          <Radio size={14} />
          <span>البوابة نشطة</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="sms-metrics-grid">
        <div className="sms-metric-card">
          <div className="sms-metric-top">
            <span className="sms-metric-title">رسائل مُرسلة</span>
            <div className="sms-metric-icon"><MessageSquare size={18} /></div>
          </div>
          <div className="sms-metric-value">{metrics.totalSent === 0 ? '٠' : metrics.totalSent.toLocaleString('ar-EG')}</div>
          <div className="sms-metric-sub">
            <MessageSquare size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span>{metrics.totalSent === 0 ? 'لم يتم إرسال رسائل بعد' : 'إجمالي الرسائل'}</span>
          </div>
        </div>
        <div className="sms-metric-card">
          <div className="sms-metric-top">
            <span className="sms-metric-title">معدل التوصيل</span>
            <div className="sms-metric-icon"><Zap size={18} /></div>
          </div>
          <div className="sms-metric-value">{metrics.deliveryRate === '--' ? '--' : `${metrics.deliveryRate}%`}</div>
          <div className="sms-metric-sub">
            <Activity size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span>{metrics.deliveryRate === '--' ? 'بانتظار أول إرسال' : 'أداء ممتاز'}</span>
          </div>
        </div>
        <div className="sms-metric-card">
          <div className="sms-metric-top">
            <span className="sms-metric-title">الرصيد المتاح</span>
            <div className="sms-metric-icon"><Activity size={18} /></div>
          </div>
          <div className="sms-metric-value">{metrics.balance}</div>
          <div className="sms-metric-sub">
            <ShieldCheck size={12} style={{ color: '#10B981' }} />
            <span>مُدار من باقة المنصة</span>
          </div>
        </div>
        <div className="sms-metric-card">
          <div className="sms-metric-top">
            <span className="sms-metric-title">اسم المرسل</span>
            <div className="sms-metric-icon"><Smartphone size={18} /></div>
          </div>
          <div className="sms-metric-value" style={{ fontSize: '1.15rem', direction: 'ltr', textAlign: 'left' }}>
            {currentSender || 'لم يتم التحديد بعد'}
          </div>
          <div className="sms-metric-sub">
            {currentSender ? (
              <>
                <Smartphone size={12} style={{ color: '#10B981' }} />
                <span>اسم مرسل مخصص للعيادة</span>
              </>
            ) : (
              <>
                <AlertCircle size={12} style={{ color: '#F59E0B' }} />
                <span>يُرجى إدخال اسم المرسل في الإعدادات</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="sms-main-grid">
        {/* Left Column: Provider Config */}
        <div className="sms-panel-card">
          <h3 className="sms-panel-title">
            <Radio size={18} />
            اختيار وتهيئة بوابة الإرسال
          </h3>

          {/* Provider Selector Cards */}
          <div className="sms-providers-selector">
            {SMS_PROVIDERS.map(provider => (
              <button
                key={provider.id}
                type="button"
                className={`sms-provider-btn ${selectedProvider === provider.id ? 'active' : ''}`}
                onClick={() => handleProviderSelect(provider.id)}
              >
                <span className="sms-provider-badge">{provider.badge}</span>
                <span className="sms-provider-name">{provider.name}</span>
                <span className="sms-provider-desc">{provider.desc}</span>
              </button>
            ))}
          </div>

          {/* Dynamic Config Fields */}
          <form onSubmit={handleSaveConfig}>
            <div className="sms-form-group">
              <label>اسم المرسل المعتمد (Sender ID) — أقصى ١١ حرفاً</label>
              <div className="sms-input-wrap">
                <input
                  className="sms-input"
                  type="text"
                  dir="ltr"
                  maxLength={11}
                  value={config.senderId || ''}
                  onChange={(e) => setConfig({ ...config, senderId: formatSenderId(e.target.value) })}
                  placeholder="مثال: DrAhmed"
                />
              </div>
            </div>

            {activeProviderObj.fields.includes('easysendsmsApiKey') && (
              <div className="sms-form-group">
                <label>EasySendSMS — مفتاح API</label>
                <div className="sms-input-wrap">
                  <input
                    className="sms-input"
                    type={showApiKeys.easysendsmsApiKey ? 'text' : 'password'}
                    dir="ltr"
                    value={config.easysendsmsApiKey || ''}
                    onChange={(e) => setConfig({ ...config, easysendsmsApiKey: e.target.value })}
                    placeholder="API Key من لوحة EasySendSMS"
                  />
                  <button type="button" className="sms-input-btn-action" onClick={() => toggleApiKeyVisibility('easysendsmsApiKey')}>
                    {showApiKeys.easysendsmsApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {activeProviderObj.fields.includes('smsmisrUsername') && (
              <>
                <div className="sms-form-group">
                  <label>SMSMisr — اسم المستخدم</label>
                  <input
                    className="sms-input"
                    type="text"
                    dir="ltr"
                    value={config.smsmisrUsername || ''}
                    onChange={(e) => setConfig({ ...config, smsmisrUsername: e.target.value })}
                    placeholder="Username"
                  />
                </div>
                <div className="sms-form-group">
                  <label>SMSMisr — كلمة المرور</label>
                  <div className="sms-input-wrap">
                    <input
                      className="sms-input"
                      type={showApiKeys.smsmisrPassword ? 'text' : 'password'}
                      dir="ltr"
                      value={config.smsmisrPassword || ''}
                      onChange={(e) => setConfig({ ...config, smsmisrPassword: e.target.value })}
                      placeholder="Password"
                    />
                    <button type="button" className="sms-input-btn-action" onClick={() => toggleApiKeyVisibility('smsmisrPassword')}>
                      {showApiKeys.smsmisrPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeProviderObj.fields.includes('cequensApiKey') && (
              <div className="sms-form-group">
                <label>Cequens — مفتاح Bearer Token</label>
                <div className="sms-input-wrap">
                  <input
                    className="sms-input"
                    type={showApiKeys.cequensApiKey ? 'text' : 'password'}
                    dir="ltr"
                    value={config.cequensApiKey || ''}
                    onChange={(e) => setConfig({ ...config, cequensApiKey: e.target.value })}
                    placeholder="Bearer Token"
                  />
                  <button type="button" className="sms-input-btn-action" onClick={() => toggleApiKeyVisibility('cequensApiKey')}>
                    {showApiKeys.cequensApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {activeProviderObj.fields.includes('apiKey') && (
              <>
                <div className="sms-form-group">
                  <label>TextBee — مفتاح API</label>
                  <div className="sms-input-wrap">
                    <input
                      className="sms-input"
                      type={showApiKeys.textbeeApiKey ? 'text' : 'password'}
                      dir="ltr"
                      value={config.apiKey || ''}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="API Key"
                    />
                    <button type="button" className="sms-input-btn-action" onClick={() => toggleApiKeyVisibility('textbeeApiKey')}>
                      {showApiKeys.textbeeApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="sms-form-group">
                  <label>TextBee — معرّف الجهاز (Device ID)</label>
                  <input
                    className="sms-input"
                    type="text"
                    dir="ltr"
                    value={config.deviceId || ''}
                    onChange={(e) => setConfig({ ...config, deviceId: e.target.value })}
                    placeholder="Device ID"
                  />
                </div>
              </>
            )}

            {saveSuccess && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1rem', borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)', color: '#059669',
                fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.75rem'
              }}>
                <CheckCircle2 size={16} />
                <span>تم حفظ الإعدادات بنجاح!</span>
              </div>
            )}

            <button type="submit" className="btn-sms-primary">
              <Save size={16} />
              حفظ إعدادات البوابة
            </button>
          </form>
        </div>

        {/* Right Column: Test Simulator + Triggers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Test Simulator */}
          <div className="sms-panel-card">
            <h3 className="sms-panel-title">
              <Send size={18} />
              محاكي الإرسال التجريبي
            </h3>

            <div className="sms-test-box">
              <div className="sms-form-group">
                <label>رقم هاتف التجربة</label>
                <input
                  className="sms-input"
                  type="tel"
                  dir="ltr"
                  placeholder="01006285031"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>

              <div className="sms-form-group">
                <label>نص الرسالة</label>
                <textarea
                  className="sms-input"
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="sms-test-quick-chips">
                <button type="button" className="sms-chip-btn" onClick={() => setTestMessage('تذكير بموعدك في العيادة غداً الساعة 10:00 صباحاً. نتمنى لك الصحة!')}>
                  تذكير موعد
                </button>
                <button type="button" className="sms-chip-btn" onClick={() => setTestMessage('تم تأكيد حجزك بنجاح! كود الحجز: CF-' + Math.floor(Math.random() * 9000 + 1000))}>
                  تأكيد حجز
                </button>
                <button type="button" className="sms-chip-btn" onClick={() => setTestMessage('مرحباً! حان موعد فحصك الدوري. للحجز تواصل معنا. صحتكم تهمنا!')}>
                  متابعة دورية
                </button>
              </div>

              <div className="sms-char-counter">
                <span>{charCount} حرف</span>
                <span>{smsSegments} رسالة (SMS Segment)</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-sms-primary"
              onClick={handleSendTest}
              disabled={isSending}
            >
              {isSending ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
              {isSending ? 'جاري الإرسال...' : 'إرسال رسالة اختبار'}
            </button>

            {testResult && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1rem', borderRadius: '8px',
                marginTop: '0.75rem', fontSize: '0.84rem', fontWeight: 600,
                background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: testResult.success ? '#059669' : '#DC2626'
              }}>
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>
                  {testResult.success
                    ? `تم الإرسال بنجاح! (${testResult.method || 'gateway'}) — ${testResult.messageId || 'OK'}`
                    : `فشل: ${testResult.error || 'خطأ غير محدد'}`}
                </span>
              </div>
            )}
          </div>

          {/* Automated Triggers */}
          <div className="sms-panel-card">
            <h3 className="sms-panel-title">
              <Zap size={18} />
              التذكيرات والرسائل الآلية
            </h3>

            <div className="sms-triggers-list">
              {AUTO_TRIGGERS.map(trigger => {
                const TriggerIcon = trigger.icon;
                const isExpanded = expandedTrigger === trigger.id;
                return (
                  <div key={trigger.id} className="sms-trigger-card">
                    <div className="sms-trigger-header">
                      <div className="sms-trigger-info" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, cursor: 'pointer' }} onClick={() => setExpandedTrigger(isExpanded ? null : trigger.id)}>
                        <TriggerIcon size={18} style={{ color: 'var(--clinic-primary, #09090B)', flexShrink: 0 }} />
                        <div>
                          <h4>{trigger.title}</h4>
                          <p>{trigger.desc}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label className="sms-switch">
                          <input
                            type="checkbox"
                            checked={triggerStates[trigger.id] || false}
                            onChange={() => setTriggerStates(prev => ({ ...prev, [trigger.id]: !prev[trigger.id] }))}
                          />
                          <span className="sms-slider"></span>
                        </label>
                        <button type="button" onClick={() => setExpandedTrigger(isExpanded ? null : trigger.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="sms-trigger-body">
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                          قالب الرسالة:
                        </div>
                        <div className="sms-trigger-template">{trigger.template}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
