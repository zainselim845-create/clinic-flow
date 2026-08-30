import React, { useState } from 'react';
import { Bot, Sparkles, Save, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Eye, EyeOff } from 'lucide-react';
import { getAiConfig, saveAiConfig, askDoctorAiAssistant } from '../../services/aiAssistantService';

export default function AiAssistantConfigTab() {
  const [aiConfig, setAiConfig] = useState(getAiConfig());
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);

  const handleSaveAi = (e) => {
    e.preventDefault();
    saveAiConfig(aiConfig);
    setAiSaveSuccess(true);
    setTimeout(() => setAiSaveSuccess(false), 3000);
  };

  const handleTestAi = async () => {
    setAiTestLoading(true);
    setAiTestResult(null);
    saveAiConfig(aiConfig);

    try {
      const res = await askDoctorAiAssistant([
        { role: 'user', content: 'مرحباً، هل أنت جاهز للعمل كمساعد سريري في كلينك فلو؟' }
      ], { doctorName: 'د. أحمد الشريف', name: 'عيادة د. أحمد' });

      if (res.success) {
        setAiTestResult({
          success: true,
          content: res.content,
          model: res.model
        });
      } else {
        setAiTestResult({
          success: false,
          error: res.error || 'تعذر الاتصال بـ OpenRouter AI'
        });
      }
    } catch (err) {
      setAiTestResult({
        success: false,
        error: err.message
      });
    } finally {
      setAiTestLoading(false);
    }
  };

  return (
    <div className="settings-section ai-tab">
      <div className="section-header">
        <div>
          <h3>مساعد الطبيب والذكاء الاصطناعي (OpenRouter AI Engine)</h3>
          <p>توصيل المساعد السريري الذكي بنماذج الذكاء الاصطناعي العالمية المتقدمة</p>
        </div>
      </div>

      {aiSaveSuccess && (
        <div className="settings-alert success">
          <CheckCircle2 size={18} />
          <span>تم حفظ إعدادات الذكاء الاصطناعي بنجاح!</span>
        </div>
      )}

      <form onSubmit={handleSaveAi} className="ai-form">
        <div className="form-grid">
          <div className="form-group">
            <label>نموذج الذكاء الاصطناعي الافتراضي (AI Model)</label>
            <select
              value={aiConfig.model || 'nvidia/nemotron-3-super-120b-a12b:free'}
              onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
            >
              <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA Nemotron 3 120B (High Performance - Free)</option>
              <option value="meta-llama/llama-3.3-70b-instruct:free">Meta LLaMA 3.3 70B Instruct (Free)</option>
              <option value="google/gemini-2.0-flash-exp:free">Google Gemini 2.0 Flash (Free)</option>
              <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (Fast & Accurate)</option>
              <option value="openrouter/auto">OpenRouter Auto-Router (Best Available)</option>
            </select>
          </div>

          <div className="form-group">
            <label>مفتاح API الخاص بـ OpenRouter</label>
            <div className="input-with-icon">
              <KeyRound size={18} />
              <input
                type={showAiKey ? 'text' : 'password'}
                value={aiConfig.apiKey || ''}
                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                placeholder="sk-or-v1-xxxxxxxx..."
              />
              <button
                type="button"
                onClick={() => setShowAiKey(!showAiKey)}
                className="btn-eye"
              >
                {showAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="ai-actions-bar">
          <button type="submit" className="btn btn-primary">
            <Save size={18} />
            <span>حفظ إعدادات المساعد الذكي</span>
          </button>
        </div>
      </form>

      <div className="test-ai-card">
        <h4>
          <Sparkles size={18} />
          <span>اختبار الاتصال والاستجابة الحية للذكاء الاصطناعي</span>
        </h4>
        <p>إرسال طلب فحص فوري للنموذج المختار للتحقق من سرعة الاستجابة وصحة المفتاح.</p>

        <button
          type="button"
          onClick={handleTestAi}
          disabled={aiTestLoading}
          className="btn btn-secondary"
        >
          {aiTestLoading ? <RefreshCw size={18} className="spin" /> : <Bot size={18} />}
          <span>{aiTestLoading ? 'جاري الاتصال والتحليل...' : 'اختبار اتصال المساعد الآن'}</span>
        </button>

        {aiTestResult && (
          <div className={`ai-result-box ${aiTestResult.success ? 'success' : 'error'}`}>
            {aiTestResult.success ? (
              <>
                <div className="result-header">
                  <CheckCircle2 size={18} />
                  <span>الاتصال نشط 100%! النموذج: {aiTestResult.model}</span>
                </div>
                <div className="ai-response-preview">
                  <strong>رد المساعد:</strong>
                  <p>{aiTestResult.content}</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={18} />
                <span>فشل الاتصال: {aiTestResult.error}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
