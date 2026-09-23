import React, { useState, useEffect } from 'react';
import { 
  Bot, Sparkles, Key, Cpu, ShieldCheck, CheckCircle2, 
  AlertCircle, RefreshCw, Eye, EyeOff, Save, Activity,
  Zap, ArrowUpRight, HelpCircle, Check, Sliders
} from 'lucide-react';
import { 
  getAiConfig, 
  saveAiConfig, 
  testAiConnection, 
  DEFAULT_AI_MODEL, 
  DEFAULT_OPENROUTER_KEY 
} from '../../services/aiAssistantService';
import { getClinicUsage } from '../../services/usageMeteringService';
import { useTenant } from '../../context/TenantContext';
import { useApp } from '../../context/AppContext';

export const AI_MODELS_CATALOG = [
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'NVIDIA Nemotron 120B (Free)',
    provider: 'NVIDIA / OpenRouter',
    badge: 'موصى به للعيادات',
    badgeColor: '#10B981',
    description: 'نموذج فائق القوة بـ 120 مليار معامل، مجاني بالكامل، مخصص للاستدلال السريري السريع وإدارة ملفات المرضى بدقة فورية.',
    isFree: true,
    latency: '< 400ms'
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Meta LLaMA 3.3 70B Instruct',
    provider: 'Meta AI',
    badge: 'دقة سريرية متقدمة',
    badgeColor: '#0284C7',
    description: 'أعلى دقة في فهم المصطلحات الطبية المعقدة، التحاليل المخبرية، وصياغة تقارير الكشف المفصلة باللغة العربية.',
    isFree: false,
    latency: '~ 600ms'
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Google Gemini 2.0 Flash (Free)',
    provider: 'Google',
    badge: 'سرعة البرق',
    badgeColor: '#8B5CF6',
    description: 'استجابة فائقة السرعة مع نافذة سياق ضخمة لاستيعاب كافة تفاصيل وسجلات مواعيد اليوم في لمحة.',
    isFree: true,
    latency: '< 300ms'
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'OpenAI',
    badge: 'متزن واقتصادي',
    badgeColor: '#F59E0B',
    description: 'نموذج قياسي متزن وعالي الاعتمادية للمحادثة السريرية السريعة وإدارة جداول الأطباء.',
    isFree: false,
    latency: '~ 500ms'
  },
  {
    id: 'openrouter/auto',
    name: 'التوجيه التلقائي الذكي (Auto Route)',
    provider: 'OpenRouter Smart Router',
    badge: 'تلقائي',
    badgeColor: '#64748B',
    description: 'يقوم النظام تلقائياً باختيار أفضل وأسرع نموذج متاح ومجاني عند كل استفسار لضمان عدم انقطاع الخدمة.',
    isFree: true,
    latency: 'ديناميكي'
  }
];

export default function AiAssistantTab() {
  const { tenant } = useTenant();
  const { state } = useApp();
  const clinicId = tenant?.id || state.clinicInfo?.id || 'default';

  const [config, setConfig] = useState(() => getAiConfig());
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Metering & Usage
  const [usageStats, setUsageStats] = useState(() => getClinicUsage(clinicId));

  useEffect(() => {
    setConfig(getAiConfig());
    setUsageStats(getClinicUsage(clinicId));
  }, [clinicId]);

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    saveAiConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection(config.apiKey, config.model);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApplyPresetPrompt = (presetText) => {
    setConfig(prev => ({
      ...prev,
      customInstructions: (prev.customInstructions ? prev.customInstructions + '\n' : '') + presetText
    }));
  };

  const remainingTokens = Math.max(0, (usageStats.monthlyQuota || 1000) - (usageStats.aiTokensUsed || 0));
  const usagePct = usageStats.monthlyQuota > 0 ? Math.min(100, Math.round(((usageStats.aiTokensUsed || 0) / usageStats.monthlyQuota) * 100)) : 0;

  return (
    <div className="settings-section ai-assistant-tab" dir="rtl">
      
      {/* Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            إعدادات المساعد الطبي الذكي (Doctor AI Clinical Assistant)
          </h3>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            تخصيص نماذج الذكاء الاصطناعي، ربط مفتاح OpenRouter، وتحديد البروتوكول السريري لعيادتك
          </p>
        </div>

        <button 
          type="button" 
          onClick={handleSave} 
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={16} />
          <span>حفظ التعديلات</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="settings-alert success" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={18} />
          <span>تم حفظ إعدادات المساعد الطبي الذكي بنجاح!</span>
        </div>
      )}

      {/* 1. Main Activation Toggle Card */}
      <div className="settings-card" style={{
        background: 'var(--surface, #FFF)',
        border: '1.5px solid var(--border-color)',
        borderRadius: '14px',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: config.enabled ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)',
            color: config.enabled ? '#10B981' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bot size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                تفعيل المساعد الطبي الذكي (Doctor AI Copilot)
              </strong>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                background: config.enabled ? '#ECFDF5' : '#F1F5F9',
                color: config.enabled ? '#059669' : '#64748B',
                border: '1px solid ' + (config.enabled ? '#A7F3D0' : '#E2E8F0')
              }}>
                {config.enabled ? 'مفعل ونشط' : 'معطل مؤقتاً'}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              إتاحة الزر العائم واختصار (Alt + A) لمساعدتك في استخراج بيانات المرضى، التحقق من المواعيد، وإدارة العيادة صوتياً وكتابياً.
            </p>
          </div>
        </div>

        <label className="switch-toggle" style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', flexShrink: 0 }}>
          <input 
            type="checkbox"
            checked={Boolean(config.enabled)}
            onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: config.enabled ? '#10B981' : '#CBD5E1',
            borderRadius: '34px', transition: '0.3s'
          }}>
            <span style={{
              position: 'absolute', content: '""', height: '22px', width: '22px', 
              left: config.enabled ? '27px' : '3px', bottom: '3px',
              backgroundColor: 'white', borderRadius: '50%', transition: '0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </span>
        </label>
      </div>

      {/* 2. OpenRouter API Credentials Card */}
      <div className="settings-card" style={{
        background: 'var(--surface, #FFF)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="#0284C7" />
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>
              مفتاح واجهة برمجة التطبيقات (OpenRouter API Key)
            </h4>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#059669', background: '#ECFDF5', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
            تشفير محلي آمن في المتصفح
          </span>
        </div>

        <p style={{ margin: '0 0 1rem', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          منصة ClinicFlow تدعم الربط المباشر مع بوابة OpenRouter للوصول إلى أقوى نماذج الذكاء الاصطناعي (مثل NVIDIA Nemotron 120B و LLaMA 3.3). يمكنك استخدام المفتاح الافتراضي المدمج للمنصة أو إدخال مفتاحك الخاص.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <input
              type={showKey ? 'text' : 'password'}
              dir="ltr"
              value={config.apiKey || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxx"
              style={{
                width: '100%',
                padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.84rem',
                fontFamily: 'monospace',
                background: 'var(--bg-secondary)'
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(prev => !prev)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title={showKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="btn btn-secondary"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            {isTesting ? <RefreshCw size={14} className="spin" /> : <Activity size={14} />}
            <span>{isTesting ? 'جارٍ الاختبار...' : 'اختبار الاتصال بالنموذج'}</span>
          </button>
        </div>

        {/* Live Test Diagnostics Banner */}
        {testResult && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            background: testResult.success ? '#ECFDF5' : '#FEF2F2',
            border: '1px solid ' + (testResult.success ? '#A7F3D0' : '#FECACA'),
            color: testResult.success ? '#065F46' : '#991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.success ? `الاتصال بالذكاء الاصطناعي يعمل بكفاءة كاملة! (${testResult.model})` : `فشل الاتصال: ${testResult.error}`}</span>
            </div>
            {testResult.latencyMs !== undefined && (
              <span style={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>
                {testResult.latencyMs} ms
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. AI Models Selection Grid */}
      <div className="settings-card" style={{
        background: 'var(--surface, #FFF)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} color="#10B981" />
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>
              اختيار نموذج الذكاء الاصطناعي (AI Model Selector)
            </h4>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            اختر النموذج الأنسب لطبيعة استشارات عيادتك
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {AI_MODELS_CATALOG.map((m) => {
            const isSelected = (config.model || DEFAULT_AI_MODEL) === m.id;

            return (
              <div
                key={m.id}
                onClick={() => setConfig(prev => ({ ...prev, model: m.id }))}
                style={{
                  border: isSelected ? '2px solid var(--clinic-primary, #09090B)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--bg-secondary, #F8FAFC)' : 'var(--surface)',
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                      {m.name}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      المزود: {m.provider}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: m.badgeColor + '18',
                    color: m.badgeColor,
                    border: '1px solid ' + m.badgeColor + '35'
                  }}>
                    {m.badge}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {m.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', paddingTop: '0.4rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <span>زمن الاستجابة: <strong style={{ color: '#059669', direction: 'ltr', display: 'inline-block' }}>{m.latency}</strong></span>
                  {isSelected && (
                    <span style={{ color: 'var(--clinic-primary, #09090B)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Check size={13} />
                      <span>النموذج النشط</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Custom Clinical Protocol & Instructions */}
      <div className="settings-card" style={{
        background: 'var(--surface, #FFF)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="#8B5CF6" />
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>
              بروتوكول وإرشادات العيادة السريرية المخصصة (Clinical Guidelines Prompt)
            </h4>
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            توجيه الذكاء الاصطناعي وفق أسلوب الطبيب
          </span>
        </div>

        <p style={{ margin: '0 0 0.75rem', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          اكتب هنا أي تعليمات، بروتوكولات دوائية، أو قواعد تود أن يلتزم بها المساعد الذكي في كافة ردوده واقتراحاته (مثال: أسلوب الرد، التنبيهات الدوائية، مدة إجازات المرضى):
        </p>

        <textarea
          rows={4}
          value={config.customInstructions || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, customInstructions: e.target.value }))}
          placeholder="مثال: أنا طبيب استشاري جراحة وجه وفكين، احرص دائماً على التنبيه لجرعات المضادات الحيوية، واقترح فترات راحة 48 ساعة بعد الإجراءات الجراحية، وكن دقيقاً وموجزاً في الأرقام..."
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.86rem',
            lineHeight: 1.5,
            fontFamily: 'inherit',
            marginBottom: '0.75rem'
          }}
        />

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>إضافة سريعة للبروتوكول:</span>
          {[
            { label: 'عيادة أسنان وتجميل', text: 'التأكيد على تعليمات ما بعد الخلع وتبييض الأسنان.' },
            { label: 'عيادة عظام ومفاصل', text: 'التركيز على الراحة والعلاج الطبيعي وتجنب الأحمال الزائدة.' },
            { label: 'عيادة باطنة وجهاز هضمي', text: 'التأكيد على حمية غذائية منخفضة الدهون ومتابعة السكر التراكمي.' },
            { label: 'صياغة موجزة جداً', text: 'اجعل الردود في نقاط شديدة الإيجاز دون مقدمات ترحيبية مطولة.' }
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPresetPrompt(preset.text)}
              style={{
                background: 'var(--bg-tertiary, #F1F5F9)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '0.2rem 0.65rem',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Token Quota & Metering Card */}
      <div className="settings-card" style={{
        background: 'var(--surface, #FFF)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="#F59E0B" />
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>
              رصيد واستهلاك الذكاء الاصطناعي (AI Tokens & Metering)
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            الحصة الشهرية للعيادة: <strong>{usageStats.monthlyQuota || 1000} استفسار ذكي</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>المستهلك هذا الشهر</span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{usageStats.aiTokensUsed || 0}</strong>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>الرصيد المتبقي</span>
            <strong style={{ fontSize: '1.25rem', color: '#059669' }}>{remainingTokens}</strong>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>نسبة الاستهلاك</span>
            <strong style={{ fontSize: '1.25rem', color: usagePct > 80 ? '#DC2626' : 'var(--text-primary)' }}>{usagePct}٪</strong>
          </div>
        </div>

        {/* Metering Bar */}
        <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.max(3, usagePct)}%`,
            height: '100%',
            background: usagePct > 80 ? '#DC2626' : '#10B981',
            borderRadius: '999px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

    </div>
  );
}
