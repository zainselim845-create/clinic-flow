import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Get active SMS gateway configuration from LocalStorage or Environment variables.
 * Sensitive keys default to empty strings to avoid hardcoding secrets in source code.
 */
export function getSmsConfig() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('clinicflow_sms_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved SMS config:', e);
      }
    }
  }

  return {
    provider: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMS_PROVIDER) || 'none',
    // EasySendSMS Config
    easysendsmsApiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EASYSENDSMS_API_KEY) || '',
    easysendsmsSender: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EASYSENDSMS_SENDER) || 'keif',
    easysendsmsApiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EASYSENDSMS_API_URL) || 'https://restapi.easysendsms.app/v1/rest/sms/send',
    // SMSMisr Config
    smsmisrUsername: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_USERNAME) || '',
    smsmisrPassword: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_PASSWORD) || '',
    smsmisrSender: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_SENDER) || 'keif',
    smsmisrEnvironment: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_ENV) || '1',
    smsmisrApiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_API_URL) || 'https://smsmisr.com/api/SMS/',
    // Cequens Config
    cequensApiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CEQUENS_API_KEY) || '',
    cequensSenderName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CEQUENS_SENDER_NAME) || 'ClinicFlow',
    cequensApiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CEQUENS_API_URL) || 'https://apis.cequens.com/sms/v1/messages',
    // TextBee Config
    apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEXTBEE_API_KEY) || '',
    apiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEXTBEE_API_URL) || 'https://api.textbee.dev/api/v1',
    deviceId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEXTBEE_DEVICE_ID) || '',
    enabled: true
  };
}

export async function getEasySendSmsBalance(apiKey) {
  try {
    const key = apiKey || getSmsConfig().easysendsmsApiKey;
    if (!key) return null;
    const res = await fetch('https://restapi.easysendsms.app/v1/rest/sms/balance', {
      headers: { 'apikey': key.trim(), 'Accept': 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    return data.balance !== undefined ? data.balance : null;
  } catch (err) {
    console.error('Failed to get balance:', err);
    return null;
  }
}

export function saveSmsConfig(config) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('clinicflow_sms_config', JSON.stringify(config));
  }
}

/**
 * Generate native SMS URI (sms:+2010... or sms:010... on mobile/desktop)
 */
export function getSmsUri(phone, message = '') {
  if (!phone) return '';
  const clean = phone.replace(/[\s\-()]/g, '');
  const target = clean.startsWith('+') ? clean : clean.startsWith('0') ? '+2' + clean : '+20' + clean;
  return `sms:${target}?body=${encodeURIComponent(message)}`;
}

/**
 * Format Egyptian phone number to international E.164 format (+201xxxxxxxxx)
 */
export function formatEgyptianPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return '+' + cleaned.substring(2);
  if (cleaned.startsWith('0')) return '+2' + cleaned;
  if (cleaned.startsWith('20')) return '+' + cleaned;
  return '+20' + cleaned;
}

// ----------------------------------------------------
// Individual Provider Strategies
// ----------------------------------------------------

async function sendViaEasySend(config, plainPhone, message) {
  const endpoint = config.easysendsmsApiUrl || 'https://restapi.easysendsms.app/v1/rest/sms/send';
  const sender = config.easysendsmsSender || 'keif';
  const isArabic = /[\u0600-\u06FF]/.test(message);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': config.easysendsmsApiKey.trim(),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      from: sender.trim(),
      to: plainPhone,
      text: message,
      type: isArabic ? '1' : '0'
    })
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok && data.status === 'OK') {
    return { success: true, method: 'easysendsms', data, sender };
  }
  const errMsg = data.description || `خطأ EasySendSMS (كود: ${data.error || response.status})`;
  return { success: false, method: 'easysendsms', error: errMsg, code: data.error };
}

async function sendViaSmsMisr(config, plainPhone, message) {
  const endpoint = config.smsmisrApiUrl || 'https://smsmisr.com/api/SMS/';
  const sender = config.smsmisrSender || 'keif';
  
  const params = new URLSearchParams({
    environment: config.smsmisrEnvironment || '1',
    username: config.smsmisrUsername.trim(),
    password: config.smsmisrPassword.trim(),
    sender: sender.trim(),
    mobile: plainPhone,
    language: '2', // Arabic Unicode
    message: message
  });

  const response = await fetch(`${endpoint}?${params.toString()}`, { method: 'POST' });
  const data = await response.json().catch(() => ({}));

  if (data.code === '1901' || data.code === 1901) {
    return { success: true, method: 'smsmisr', data, sender };
  }

  const errorsMap = {
    '1902': 'رابط أو بارامترات غير صحيحة (Invalid Request)',
    '1903': 'اسم المستخدم أو كلمة المرور غير صحيحة في SMSMisr',
    '1904': 'اسم المرسل (Sender ID) غير مسجل أو غير مفعل في SMSMisr',
    '1905': 'رقم الهاتف غير صالح',
    '1906': 'رصيد الحساب غير كافٍ (Insufficient balance)'
  };
  const errMsg = errorsMap[data.code] || `فشل الإرسال عبر SMSMisr (كود: ${data.code})`;
  return { success: false, method: 'smsmisr', error: errMsg, code: data.code };
}

async function sendViaCequens(config, formattedPhone, message) {
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
      shortURL: true,
      recipients: formattedPhone.replace(/^\+2/, '0').replace(/^\+/, ''),
      messageText: message
    })
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok && (data.replyCode === 0 || data.status === 'accepted' || data.message_id || data.data)) {
    return { success: true, method: 'cequens', data, sender };
  }
  const errMsg = data.replyMessage || data.message || data.error || (response.status === 401 ? 'مفتاح الـ API غير صالح أو منتهي الصلاحية' : `خطأ من مزود الخدمة (${response.status})`);
  return { success: false, method: 'cequens', error: errMsg };
}

async function sendViaTextBee(config, formattedPhone, message) {
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

  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    return { success: true, method: 'textbee', data };
  }
  return { success: false, method: 'textbee', error: data.message || 'فشل الإرسال عبر TextBee' };
}

// ----------------------------------------------------
// Main sendSMS Dispatcher
// ----------------------------------------------------

/**
 * Sends an SMS message to a given phone number based on current configuration
 */
export async function sendSMS(phone, message) {
  const config = getSmsConfig();
  const formattedPhone = formatEgyptianPhone(phone);
  const plainPhone = formattedPhone.replace(/^\+/, '');

  try {
    if (config.provider === 'easysendsms' && config.easysendsmsApiKey) {
      return await sendViaEasySend(config, plainPhone, message);
    }

    if (config.provider === 'smsmisr' && config.smsmisrUsername && config.smsmisrPassword) {
      return await sendViaSmsMisr(config, plainPhone, message);
    }

    if (config.provider === 'cequens' && config.cequensApiKey) {
      return await sendViaCequens(config, formattedPhone, message);
    }

    if (config.provider === 'textbee' && config.apiKey && config.deviceId) {
      return await sendViaTextBee(config, formattedPhone, message);
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { phone: formattedPhone, message },
      });
      if (!error) {
        return { success: true, method: 'supabase', data };
      }
    }
  } catch (error) {
    console.error(`[SMS Error] Failed sending SMS via ${config.provider}:`, error);
    return { success: false, method: config.provider, error: error.message };
  }

  // If no SMS provider is configured, return explicit unconfigured state
  return { 
    success: false, 
    isConfigured: false,
    method: 'none', 
    error: 'لم يتم ربط مزود خدمة SMS في الإعدادات بعد (SMS Provider Not Configured).' 
  };
}

/**
 * Compose and send a booking confirmation SMS
 */
export async function sendBookingConfirmation(nameOrOptions, phone, date, time, clinicName) {
  if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
    const { patientName, phone: ph, date: d, time: t, clinicName: cName } = nameOrOptions;
    const message = `عزيزي ${patientName}، تم تأكيد حجز موعدك في ${cName || 'العيادة'} يوم ${d} الساعة ${t}. نتمنى لك دوام الصحة.`;
    return sendSMS(ph, message);
  }
  const message = `عزيزي ${nameOrOptions}، تم تأكيد حجز موعدك في ${clinicName || 'العيادة'} يوم ${date} الساعة ${time}. نتمنى لك دوام الصحة.`;
  return sendSMS(phone, message);
}

/**
 * Compose and send a reminder SMS
 */
export async function sendReminder(nameOrOptions, phone, date, time, clinicName) {
  if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
    const { patientName: pName, phone: ph, date: d, time: t, clinicName: cName } = nameOrOptions;
    const message = `تذكير بموعد: مرحباً أ/ ${pName || 'المريض'}، موعدك في ${cName || 'العيادة'} اليوم ${d} الساعة ${t}. يُرجى الحضور قبل الموعد بـ 15 دقيقة.`;
    return sendSMS(ph, message);
  }
  const message = `تذكير بموعد: مرحباً أ/ ${nameOrOptions || 'المريض'}، موعدك في ${clinicName || 'العيادة'} اليوم ${date} الساعة ${time}. يُرجى الحضور قبل الموعد بـ 15 دقيقة.`;
  return sendSMS(phone, message);
}

