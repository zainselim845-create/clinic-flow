// Supabase Edge Function — إرسال SMS عبر TextBee
// يتم استدعاؤها من الـ Frontend عبر supabase.functions.invoke('send-sms', ...)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const TEXTBEE_API_URL = Deno.env.get('TEXTBEE_API_URL') || 'https://api.textbee.dev/api/v1';
const TEXTBEE_API_KEY = Deno.env.get('TEXTBEE_API_KEY');
const TEXTBEE_DEVICE_ID = Deno.env.get('TEXTBEE_DEVICE_ID');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'يرجى تقديم رقم الهاتف والرسالة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
      console.log(`[SMS Simulation] To: ${phone}, Message: ${message}`);
      return new Response(
        JSON.stringify({ success: true, simulated: true, message: 'SMS simulated (TextBee not configured)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format Egyptian phone number
    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+2' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+2' + formattedPhone;
    }

    // Call TextBee API
    const response = await fetch(
      `${TEXTBEE_API_URL}/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEXTBEE_API_KEY,
        },
        body: JSON.stringify({
          recipients: [formattedPhone],
          message: message,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'فشل إرسال SMS');
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SMS Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
