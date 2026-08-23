// Supabase Edge Function — فحص المواعيد وإرسال تذكيرات SMS
// يتم تشغيلها كـ Cron Job كل 5 دقائق
// pg_cron: */5 * * * *

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TEXTBEE_API_URL = Deno.env.get('TEXTBEE_API_URL') || 'https://api.textbee.dev/api/v1';
const TEXTBEE_API_KEY = Deno.env.get('TEXTBEE_API_KEY');
const TEXTBEE_DEVICE_ID = Deno.env.get('TEXTBEE_DEVICE_ID');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
    console.log(`[SMS Simulation] To: ${phone} — ${message}`);
    return true;
  }

  let formattedPhone = phone.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+2' + formattedPhone;
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+2' + formattedPhone;
  }

  try {
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
          message,
        }),
      }
    );
    return response.ok;
  } catch (err) {
    console.error('SMS send failed:', err);
    return false;
  }
}

serve(async (_req) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // البحث عن المواعيد القادمة اليوم التي لم يتم إرسال تذكير لها
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', todayStr)
      .eq('status', 'upcoming')
      .eq('reminder_sent', false);

    if (error) throw error;
    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: 'لا توجد مواعيد تحتاج تذكير' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;

    for (const appt of appointments) {
      const [hours, minutes] = appt.time.split(':').map(Number);
      const apptTime = new Date(now);
      apptTime.setHours(hours, minutes, 0, 0);

      const diffMs = apptTime.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      // إرسال تذكير لو الموعد خلال 30 دقيقة
      if (diffMinutes >= 0 && diffMinutes <= 30) {
        const message = `تذكير: لديك موعد في العيادة اليوم الساعة ${appt.time}. الرجاء الحضور في الوقت المحدد.`;
        
        await sendSMS(appt.patient_phone, message);

        // تحديث حالة التذكير
        await supabase
          .from('appointments')
          .update({ reminder_sent: true })
          .eq('id', appt.id);

        // إضافة إشعار للداشبورد
        await supabase
          .from('notifications')
          .insert({
            clinic_id: appt.clinic_id,
            type: 'reminder',
            title: 'تذكير بموعد',
            message: `تم إرسال تذكير للمريض ${appt.patient_name} (موعد الساعة ${appt.time})`,
            read: false,
            related_id: appt.id
          });

        sentCount++;
        console.log(`Reminder sent to ${appt.patient_name} (${appt.patient_phone})`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sentCount }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Reminder check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
