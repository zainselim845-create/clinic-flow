/**
 * OpenRouter AI Integration for ClinicFlow Doctor Assistant
 * Connects to high-performance free & premium LLMs (e.g. NVIDIA Nemotron, LLaMA 3.3, OpenAI, Gemini)
 */

export const DEFAULT_OPENROUTER_KEY = '';
export const DEFAULT_AI_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
export const FALLBACK_AI_MODEL = 'openrouter/auto';


export function getAiConfig() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('clinicflow_ai_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse AI config:', e);
      }
    }
  }

  return {
    apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY) || DEFAULT_OPENROUTER_KEY,
    model: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_MODEL) || DEFAULT_AI_MODEL,
    enabled: true
  };
}

export function saveAiConfig(config) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('clinicflow_ai_config', JSON.stringify(config));
  }
}

/**
 * Generate an AI conversational response using OpenRouter API
 * @param {Array} chatHistory - Array of { role: 'user'|'assistant'|'system', content: string }
 * @param {Object} clinicContext - Clinic and doctor metadata
 * @param {Array} patientsSummary - Summary of patient records for contextual reasoning
 * @param {Object} systemState - Live appointments, blockedSlots, etc.
 */
export async function askDoctorAiAssistant(chatHistory, clinicContext = {}, patientsSummary = [], systemState = {}) {
  const config = getAiConfig();
  const key = config.apiKey || DEFAULT_OPENROUTER_KEY;
  const targetModel = config.model || DEFAULT_AI_MODEL;

  const doctorName = clinicContext?.doctorName || 'د. أحمد الشريف';
  const specialty = clinicContext?.specialty || 'استشاري الباطنة والجهاز الهضمي والكبد';
  const clinicName = clinicContext?.name || 'عيادة كلينك فلو';
  const todayStr = new Date().toISOString().split('T')[0];

  const blockedList = (systemState?.blockedSlots || [])
    .map(b => `${b.date} (${b.time === 'FULL_DAY' || b.isFullDay ? 'يوم كامل' : b.time})`)
    .join(', ') || 'لا توجد أيام محظورة';

  // Contextual Clinical System Prompt
  const systemPrompt = `أنت "المساعد السريري والإداري الذكي" المخصص لـ ${doctorName} في ${clinicName} (${specialty}).
تاريخ اليوم في النظام: ${todayStr}.
الأيام والمواعيد المغلقة حالياً في السيستم: ${blockedList}.
عدد المرضى المسجلين: ${patientsSummary.length} مريض.

قواعد الاستجابة:
1. تحدث مع الطبيب كشريك ذكي وإداري سريري يفهم فوراً متطلبات العيادة بالعامية المصرية الراقية والفصحى البسيطة.
2. إذا ذكر الطبيب أنه يعمل في يوم معين أو سأل عن حالة يوم أو طلب فتح أو إغلاق موعد، أجب بوضوح وتأكيد مباشر عن حالة الجدول مع التاريخ.
3. إذا طلب الطبيب صياغة رسائل للمرضى، صغ رسائل احترافية متضمنة المتغيرات {اسم_المريض} و {اسم_العيادة}.
4. كن ذكياً وموجزاً ومباشراً ولا تكرر المقدمات الطويلة.`;

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(m => ({
      role: m.sender === 'doctor' ? 'user' : (m.sender === 'agent' ? 'assistant' : m.role || 'user'),
      content: m.text || m.content || ''
    }))
  ];

  // Primary request
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key.trim()}`,
        'HTTP-Referer': 'https://clinic-flow-ten-sigma.vercel.app',
        'X-Title': 'ClinicFlow Doctor AI Assistant'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.choices?.[0]?.message?.content) {
      return {
        success: true,
        model: targetModel,
        content: data.choices[0].message.content.trim()
      };
    }

    // Fallback to openrouter/auto if primary model returned 429/404
    if (targetModel !== FALLBACK_AI_MODEL) {
      const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`,
          'HTTP-Referer': 'https://clinic-flow-ten-sigma.vercel.app',
          'X-Title': 'ClinicFlow Doctor AI Assistant'
        },
        body: JSON.stringify({
          model: FALLBACK_AI_MODEL,
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 800
        })
      });
      const fallbackData = await fallbackRes.json().catch(() => ({}));
      if (fallbackRes.ok && fallbackData.choices?.[0]?.message?.content) {
        return {
          success: true,
          model: FALLBACK_AI_MODEL,
          content: fallbackData.choices[0].message.content.trim()
        };
      }
    }

    return {
      success: false,
      error: data?.error?.message || 'فشل استلام رد من نموذج الذكاء الاصطناعي.'
    };
  } catch (err) {
    console.error('Doctor AI Assistant OpenRouter Error:', err);
    return {
      success: false,
      error: err.message || 'تعذر الاتصال بخوادم OpenRouter.'
    };
  }
}
