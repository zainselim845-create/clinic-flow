/**
 * OpenRouter AI Integration for ClinicFlow Doctor Assistant
 * Connects to high-performance free & premium LLMs (e.g. NVIDIA Nemotron, LLaMA 3.3, OpenAI, Gemini)
 */

import { circuitBreaker } from '../utils/circuitBreaker';
import { canClinicUseAi, deductAiTokens } from './usageMeteringService';

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
        try {
          localStorage.removeItem('clinicflow_ai_config');
        } catch (_) {}
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

  const clinicId = clinicContext?.id || clinicContext?.clinicId || 'default';

  // 1. Live Pre-flight AI Token Quota Check
  const aiCheck = canClinicUseAi(clinicId, 50);
  if (!aiCheck.allowed) {
    return {
      success: false,
      isQuotaExceeded: true,
      error: aiCheck.error,
      remainingTokens: aiCheck.remainingTokens
    };
  }

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
    return await circuitBreaker.execute('openrouter_ai', async () => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`,
          'HTTP-Referer': (typeof window !== 'undefined' && window.location?.origin) || 'https://clinicflow.app',
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
        const rawContent = data.choices[0].message.content.trim();
        const estimatedTokens = data.usage?.total_tokens || 
          Math.max(50, Math.round((formattedMessages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + rawContent.length) / 4));
        
        try {
          deductAiTokens(clinicId, estimatedTokens, {
            model: targetModel,
            clinicName
          });
        } catch (deductErr) {
          console.warn('[UsageMetering] Failed to deduct AI tokens:', deductErr);
        }

        return {
          success: true,
          model: targetModel,
          content: rawContent,
          tokensUsed: estimatedTokens
        };
      }

      // Fallback to openrouter/auto if primary model returned 429/404
      if (targetModel !== FALLBACK_AI_MODEL) {
        const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key.trim()}`,
            'HTTP-Referer': (typeof window !== 'undefined' && window.location?.origin) || 'https://clinicflow.app',
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
          const rawContent = fallbackData.choices[0].message.content.trim();
          const estimatedTokens = fallbackData.usage?.total_tokens || 
            Math.max(50, Math.round((formattedMessages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + rawContent.length) / 4));

          try {
            deductAiTokens(clinicId, estimatedTokens, {
              model: FALLBACK_AI_MODEL,
              clinicName
            });
          } catch (deductErr) {
            console.warn('[UsageMetering] Failed to deduct AI tokens:', deductErr);
          }

          return {
            success: true,
            model: FALLBACK_AI_MODEL,
            content: rawContent,
            tokensUsed: estimatedTokens
          };
        }
      }

      return {
        success: false,
        error: data?.error?.message || 'فشل استلام رد من نموذج الذكاء الاصطناعي.'
      };
    });
  } catch (err) {
    console.error('Doctor AI Assistant OpenRouter Error:', err);
    return {
      success: false,
      error: err.message || 'تعذر الاتصال بخوادم OpenRouter.'
    };
  }
}

/**
 * Super Admin SaaS Platform Infrastructure Helpers
 */
export function getOpenRouterConfig() {
  return getAiConfig();
}

export function saveOpenRouterConfig(config) {
  return saveAiConfig(config);
}

export async function testOpenRouterConnection(apiKey, model) {
  try {
    if (apiKey) {
      saveAiConfig({ apiKey, model: model || DEFAULT_AI_MODEL, enabled: true });
    }
    const res = await askDoctorAiAssistant([
      { role: 'user', content: 'فحص الاتصال بمحرك الذكاء الاصطناعي المركزي لمنصة كلينك فلو' }
    ], { doctorName: 'مدير المنصة', name: 'إدارة الساس' });
    if (res.success) {
      return { success: true, message: 'الاتصال بمحرك الذكاء الاصطناعي يعمل بنجاح!', content: res.content, model: res.model };
    } else {
      return { success: false, message: res.error || 'تعذر الاتصال بمحرك الذكاء الاصطناعي' };
    }
  } catch (err) {
    return { success: false, message: err.message || 'خطأ أثناء فحص محرك الذكاء الاصطناعي' };
  }
}
