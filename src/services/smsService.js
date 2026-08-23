import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Get active SMS gateway configuration from LocalStorage or Environment variables
 */
export function getSmsConfig() {
  const saved = localStorage.getItem('clinicflow_sms_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved SMS config:', e);
    }
  }

  return {
    provider: import.meta.env.VITE_SMS_PROVIDER || 'cequens', // 'cequens' | 'textbee' | 'android-gateway' | 'webhook'
    // Cequens Config
    cequensApiKey: import.meta.env.VITE_CEQUENS_API_KEY || '',
    cequensSenderName: import.meta.env.VITE_CEQUENS_SENDER_NAME || 'keif',
    cequensApiUrl: import.meta.env.VITE_CEQUENS_API_URL || 'https://apis.cequens.com/sms/v1/messages',
    // TextBee Config
    apiKey: import.meta.env.VITE_TEXTBEE_API_KEY || '',
    apiUrl: import.meta.env.VITE_TEXTBEE_API_URL || 'https://api.textbee.dev/api/v1',
    deviceId: import.meta.env.VITE_TEXTBEE_DEVICE_ID || '',
    enabled: true
  };
}

/**
 * Save SMS gateway configuration
 */
export function saveSmsConfig(config) {
  localStorage.setItem('clinicflow_sms_config', JSON.stringify(config));
}

/**
 * Format Egyptian phone number to international E.164 format (+201xxxxxxxxx)
 */
export function formatEgyptianPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return '+' + cleaned.substring(2);
  if (cleaned.startsWith('0')) return '+2' + cleaned;
  if (cleaned.startsWith('20')) return '+' + cleaned;
  return '+20' + cleaned;
}

/**
 * Sends an SMS message to a given phone number
 */
export async function sendSMS(phone, message) {
  const config = getSmsConfig();
  const formattedPhone = formatEgyptianPhone(phone);
  const plainPhone = formattedPhone.replace(/^\+/, ''); // 201xxxxxxxxx

  // 1. Cequens Commercial SMS Provider (Egypt Official Sender ID)
  if (config.provider === 'cequens' && config.cequensApiKey) {
    try {
      const endpoint = config.cequensApiUrl || 'https://apis.cequens.com/sms/v1/messages';
      const sender = config.cequensSenderName || 'ClinicFlow';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.cequensApiKey.trim()}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          senderName: sender,
          messageType: 'text',
          messageText: message,
          recipients: formattedPhone,
          // Compatibility for older endpoint format
          sender: sender,
          message: message,
          recipient: plainPhone
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.replyCode === 0 || data.status === 'accepted' || data.message_id || data.data)) {
        console.log(`[SMS - Cequens] Successfully sent to ${formattedPhone} from ${sender}`);
        return { success: true, method: 'cequens', data, sender };
      } else {
        console.warn(`[SMS - Cequens] Response not ok:`, data);
        const errMsg = data.replyMessage || data.message || data.error || (response.status === 401 ? 'مفتاح الـ API غير صالح أو منتهي الصلاحية' : `خطأ من مزود الخدمة (${response.status})`);
        return { success: false, method: 'cequens', error: errMsg };
      }
    } catch (error) {
      console.error('[SMS - Cequens] Error calling API:', error);
      return { success: false, method: 'cequens', error: error.message || 'فشل الاتصال بـ Cequens' };
    }
  }

  // 2. TextBee Open-Source Gateway
  if (config.provider === 'textbee' && config.apiKey && config.deviceId) {
    try {
      const endpoint = `${config.apiUrl.replace(/\/$/, '')}/gateway/devices/${config.deviceId}/send-sms`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify({
          recipients: [formattedPhone],
          message: message,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[SMS - TextBee] Successfully sent to ${formattedPhone}`);
        return { success: true, method: 'textbee', data };
      } else {
        console.warn(`[SMS - TextBee] Failed:`, data);
        return { success: false, method: 'textbee', error: data.message || 'فشل الإرسال عبر TextBee' };
      }
    } catch (error) {
      console.error('[SMS - TextBee] Error calling API:', error);
      return { success: false, method: 'textbee', error: error.message };
    }
  }

  // 2. Capcom6 / Android SMS Gateway (Local WiFi or Cloud Webhook)
  if (config.provider === 'android-gateway' && config.apiUrl) {
    try {
      const endpoint = `${config.apiUrl.replace(/\/$/, '')}/message`;
      const headers = { 'Content-Type': 'application/json' };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumbers: [formattedPhone],
          message: message,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log(`[SMS - Android Gateway] Successfully sent to ${formattedPhone}`);
        return { success: true, method: 'android-gateway', data };
      } else {
        return { success: false, method: 'android-gateway', error: data.message || 'فشل الإرسال عبر Android Gateway' };
      }
    } catch (error) {
      console.error('[SMS - Android Gateway] Error:', error);
      return { success: false, method: 'android-gateway', error: error.message };
    }
  }

  // 3. Custom Webhook Gateway (e.g. self-hosted Node.js / GSM Modem server)
  if (config.provider === 'webhook' && config.apiUrl) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['x-api-key'] = config.apiKey;

      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      if (response.ok) {
        return { success: true, method: 'webhook' };
      }
    } catch (error) {
      console.error('[SMS - Webhook] Error:', error);
    }
  }

  // 4. Try Supabase Edge Function if available
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { phone: formattedPhone, message },
      });

      if (!error) {
        console.log(`[SMS - Supabase Edge] Sent to ${formattedPhone}`);
        return { success: true, method: 'supabase', data };
      }
    } catch (error) {
      console.error('[SMS - Supabase Edge] Error:', error);
    }
  }

  // 5. Fallback to console simulation
  console.log(`[SMS Simulation] To: ${formattedPhone} | Message: ${message}`);
  return { 
    success: true, 
    method: 'simulation', 
    message: 'تمت المحاكاة (لم يتم ضبط بيانات بوابة SMS بعد)' 
  };
}

/**
 * Compose and send a booking confirmation SMS
 */
export async function sendBookingConfirmation(patientName, phone, date, time, clinicName) {
  const message = `عزيزي ${patientName}، تم تأكيد حجز موعدك في ${clinicName} يوم ${date} الساعة ${time}. نتمنى لك دوام الصحة.`;
  return sendSMS(phone, message);
}

/**
 * Compose and send a reminder SMS
 */
export async function sendReminder(patientName, phone, date, time, clinicName) {
  const message = `تذكير بموعد: موعدك في ${clinicName} اليوم ${date} الساعة ${time}. يُرجى الحضور قبل الموعد بـ 15 دقيقة.`;
  return sendSMS(phone, message);
}
