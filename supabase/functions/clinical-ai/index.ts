// Supabase Edge Function — المساعد السريري الذكي للأطباء (Clinical AI via OpenRouter)
// يتم استدعاؤها عبر supabase.functions.invoke('clinical-ai', ...) لحماية مفاتيح API

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const DEFAULT_MODEL = Deno.env.get('AI_MODEL') || 'nvidia/nemotron-3-super-120b-a12b:free';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, model, temperature, maxTokens } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'يرجى تقديم مصفوفة الرسائل messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENROUTER_API_KEY) {
      // Mock / Offline response if key is not set in cloud env
      return new Response(
        JSON.stringify({
          success: true,
          simulated: true,
          content: 'أهلاً بك يا دكتور. أنا المساعد السريري الذكي المخصص لعيادتك. يسعدني مساعدتك في تنظيم الحالات والخطط العلاجية ومتابعة المرضى.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://clinicflow.app',
        'X-Title': 'ClinicFlow Doctor AI Assistant'
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 800
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'فشل الاتصال بمزود الذكاء الاصطناعي');
    }

    const replyContent = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({
        success: true,
        content: replyContent,
        model: data.model || model
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Clinical AI Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
