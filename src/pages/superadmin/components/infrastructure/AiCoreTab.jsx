import React, { useState } from 'react';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import { getOpenRouterConfig, saveOpenRouterConfig, testOpenRouterConnection } from '../../../../services/aiAssistantService';

export function AiCoreTab() {
  const [aiConfig, setAiConfig] = useState(() => getOpenRouterConfig());
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [showAiKey, setShowAiKey] = useState(false);

  const handleSaveAi = (e) => {
    e.preventDefault();
    saveOpenRouterConfig(aiConfig);
    alert('تم حفظ إعدادات محرك الذكاء الاصطناعي المركزي بنجاح!');
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await testOpenRouterConnection(aiConfig.apiKey, aiConfig.model);
      setAiTestResult(res);
    } catch (err) {
      setAiTestResult({ success: false, message: err.message });
    } finally {
      setAiTesting(false);
    }
  };

  return (
    <div className="infra-content-pane">
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>محرك الذكاء الاصطناعي المركزي (Platform Clinical AI Core)</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          توفير نماذج التحليل السريري ومساعد الطبيب لكافة العيادات المشتركة عبر مفتاح API مركزي موحد.
        </p>
      </div>

      <form onSubmit={handleSaveAi} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            نموذج الذكاء الاصطناعي الافتراضي للمنصة:
          </label>
          <select
            value={aiConfig.model || 'nvidia/nemotron-3-120b'}
            onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
            style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-primary)' }}
          >
            <option value="nvidia/nemotron-3-120b">NVIDIA Nemotron 3 120B (سريع وعالي الدقة - مجاني)</option>
            <option value="meta-llama/llama-3.3-70b-instruct">Meta LLaMA 3.3 70B (متقدم للاستشارات الطبية)</option>
            <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet (أعلى معايير الدقة السريرية)</option>
            <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (سريع واقتصادي)</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            مفتاح OpenRouter API المركزي للمنصة:
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showAiKey ? 'text' : 'password'}
              placeholder="sk-or-v1-xxxxxxxx..."
              dir="ltr"
              value={aiConfig.apiKey || ''}
              onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
              className="input-field"
              style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            />
            <button
              type="button"
              onClick={() => setShowAiKey(prev => !prev)}
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
              title={showAiKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
              aria-label={showAiKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
            >
              {showAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">
            <span>حفظ إعدادات محرك الذكاء الاصطناعي</span>
          </button>

          <button
            type="button"
            onClick={handleTestAi}
            disabled={aiTesting}
            className="btn btn-secondary"
          >
            <RefreshCw size={14} className={aiTesting ? 'animate-spin' : ''} />
            <span>{aiTesting ? 'جاري فحص استجابة النموذج...' : 'اختبار استجابة النموذج'}</span>
          </button>

          {aiTestResult && (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: aiTestResult.success ? '#059669' : '#DC2626' }}>
              {aiTestResult.success ? 'النموذج متصل ويعمل بسرعة استجابة ممتازة!' : `فشل: ${aiTestResult.message || 'خطأ في الاتصال'}`}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
