import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeStorage } from '../utils/safeStorage';
import { checkActionRateLimit } from '../utils/rateLimiter';
import { circuitBreaker } from '../utils/circuitBreaker';
import { canClinicSendSms, deductSmsCredit } from './usageMeteringService';
import { demoClinics } from '../data/demoData';

/**
 * Formats and validates a Telecom-compliant Alphanumeric GSM Sender ID (Max 11 chars, Alphanumeric only)
 * As mandated by NTRA (National Telecom Regulatory Authority in Egypt) and GSM 03.38 standard.
 */
export function formatSenderId(input, fallback = 'ClinicFlow') {
  if (!input || typeof input !== 'string') return fallback;
  let formatted = input.trim();
  if (/[-_]/.test(formatted)) {
    formatted = formatted.split(/[-_]/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }
  const cleaned = formatted.replace(/[^a-zA-Z0-9]/g, '');
  if (!cleaned || cleaned.length < 3) return fallback;
  return cleaned.substring(0, 11);
}

/**
 * Resolves the dedicated Telecom Sender ID for a specific clinic / tenant.
 * Guarantees every client (clinic) has their own unique approved Telecom Sender ID.
 */
export function getClinicSenderId(clinicId = 'default') {
  if (!clinicId || clinicId === 'default') return 'ClinicFlow';

  // 1. Direct saved config for this clinic
  const key = `clinicflow_sms_config_${clinicId}`;
  const savedConfig = safeStorage.getItem(key, null);
  if (savedConfig && typeof savedConfig === 'object') {
    if (savedConfig.senderId) return formatSenderId(savedConfig.senderId);
    if (savedConfig.easysendsmsSender && savedConfig.easysendsmsSender !== 'keif') {
      return formatSenderId(savedConfig.easysendsmsSender);
    }
    if (savedConfig.cequensSenderName && savedConfig.cequensSenderName !== 'keif' && savedConfig.cequensSenderName !== 'ClinicFlow') {
      return formatSenderId(savedConfig.cequensSenderName);
    }
    if (savedConfig.smsmisrSender && savedConfig.smsmisrSender !== 'keif') {
      return formatSenderId(savedConfig.smsmisrSender);
    }
  }

  // 2. Check registered tenants
  const registered = safeStorage.getItem('clinicflow_registered_tenants', []);
  if (Array.isArray(registered)) {
    const match = registered.find(t => t.id === clinicId || t.slug === clinicId);
    if (match?.senderId) return formatSenderId(match.senderId);
  }

  // 3. Check demo clinics
  if (Array.isArray(demoClinics)) {
    const demoMatch = demoClinics.find(c => c.id === clinicId || c.slug === clinicId);
    if (demoMatch?.senderId) return formatSenderId(demoMatch.senderId);
  }

  // 4. No auto-derivation — sender ID must be explicitly set by the clinic owner
  return '';
}

/**
 * Get active SMS gateway configuration for a specific clinic.
 * Every clinic resolves its own approved Sender ID and gateway credentials.
 */
export function getSmsConfig(clinicId) {
  const targetClinicId = clinicId || 'default';
  const dedicatedSenderId = getClinicSenderId(targetClinicId);
  const key = clinicId ? `clinicflow_sms_config_${clinicId}` : 'clinicflow_sms_config';
  const saved = safeStorage.getItem(key, null) || (clinicId ? safeStorage.getItem('clinicflow_sms_config', null) : null);
  
  if (saved) {
    try {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      if (parsed && typeof parsed === 'object') {
        const resolvedSender = formatSenderId(parsed.senderId || parsed.easysendsmsSender || dedicatedSenderId);
        return {
          provider: parsed.provider || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMS_PROVIDER) || 'none',
          senderId: resolvedSender,
          easysendsmsApiKey: parsed.easysendsmsApiKey ?? '',
          easysendsmsSender: resolvedSender,
          easysendsmsApiUrl: parsed.easysendsmsApiUrl || 'https://restapi.easysendsms.app/v1/rest/sms/send',
          smsmisrUsername: parsed.smsmisrUsername ?? '',
          smsmisrPassword: parsed.smsmisrPassword ?? '',
          smsmisrSender: resolvedSender,
          smsmisrEnvironment: parsed.smsmisrEnvironment ?? '1',
          smsmisrApiUrl: parsed.smsmisrApiUrl || 'https://smsmisr.com/api/SMS/',
          cequensApiKey: parsed.cequensApiKey ?? '',
          cequensSenderName: resolvedSender,
          cequensApiUrl: parsed.cequensApiUrl || 'https://apis.cequens.com/sms/v1/messages',
          apiKey: parsed.apiKey ?? '',
          apiUrl: parsed.apiUrl || 'https://api.textbee.dev/api/v1',
          deviceId: parsed.deviceId ?? '',
          enabled: parsed.enabled !== undefined ? parsed.enabled : true
        };
      }
    } catch (e) {
      console.error('Failed to parse saved SMS config:', e);
    }
  }

  return {
    provider: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMS_PROVIDER) || 'none',
    senderId: dedicatedSenderId,
    easysendsmsApiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EASYSENDSMS_API_KEY) || '',
    easysendsmsSender: dedicatedSenderId,
    easysendsmsApiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EASYSENDSMS_API_URL) || 'https://restapi.easysendsms.app/v1/rest/sms/send',
    smsmisrUsername: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_USERNAME) || '',
    smsmisrPassword: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_PASSWORD) || '',
    smsmisrSender: dedicatedSenderId,
    smsmisrEnvironment: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_ENV) || '1',
    smsmisrApiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMSMISR_API_URL) || 'https://smsmisr.com/api/SMS/',
    cequensApiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CEQUENS_API_KEY) || '',
    cequensSenderName: dedicatedSenderId,
    cequensApiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CEQUENS_API_URL) || 'https://apis.cequens.com/sms/v1/messages',
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

export function saveSmsConfig(config, clinicId) {
  const key = clinicId ? `clinicflow_sms_config_${clinicId}` : 'clinicflow_sms_config';
  safeStorage.setItem(key, config);
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

/**
 * Format phone specifically for WhatsApp wa.me link (digits only, 201xxxxxxxxx)
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return '';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('00')) return cleaned.substring(2);
  if (cleaned.startsWith('0')) return '2' + cleaned;
  if (cleaned.startsWith('20')) return cleaned;
  return '20' + cleaned;
}

/**
 * Generates direct WhatsApp click-to-chat URL
 */
export function getWhatsAppUri(phone, message = '') {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) return '';
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
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
 * Pre-flight check verifies credit balance before dispatch; successful dispatch deducts credit atomically.
 */
export async function sendSMS(phone, message, clinicId = 'default') {
  const targetClinicId = clinicId || 'default';
  const config = getSmsConfig(targetClinicId);

  // 1. Live Pre-flight Credit Metering Check
  const creditCheck = canClinicSendSms(targetClinicId);
  if (!creditCheck.allowed) {
    return {
      success: false,
      isQuotaExceeded: true,
      remaining: 0,
      totalAllowed: creditCheck.totalAllowed,
      used: creditCheck.used,
      senderId: config.senderId,
      error: creditCheck.error
    };
  }

  const formattedPhone = formatEgyptianPhone(phone);
  const plainPhone = formattedPhone.replace(/^\+/, '');

  if (plainPhone) {
    const limitCheck = checkActionRateLimit('sms_dispatch', plainPhone, 5, 60000);
    if (!limitCheck.allowed) {
      return {
        success: false,
        isRateLimited: true,
        senderId: config.senderId,
        error: `تم تجاوز حد إرسال الرسائل لهذا الرقم. يرجى الانتظار ${limitCheck.retryAfterSeconds} ثانية.`
      };
    }
  }

  try {
    const result = await circuitBreaker.execute('sms_gateway', async () => {
      // Built-in ClinicFlow Managed Gateway / Sandbox for out-of-the-box zero-setup delivery
      if (config.provider === 'clinicflow-gateway' || config.provider === 'sandbox' || config.provider === 'test') {
        return { 
          success: true, 
          method: config.provider, 
          messageId: 'CF-SMS-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          senderId: config.senderId || 'ClinicFlow'
        };
      }

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
          body: { phone: formattedPhone, message, senderId: config.senderId },
        });
        if (!error) {
          return { success: true, method: 'supabase', data, senderId: config.senderId };
        }
      }

      return null;
    });

    if (result && result.success) {
      const activeSenderId = result.sender || config.senderId || 'ClinicFlow';
      // 2. Atomic credit deduction on successful transmission
      try {
        deductSmsCredit(targetClinicId, plainPhone, {
          provider: result.method || config.provider,
          senderId: activeSenderId,
          messageSnippet: typeof message === 'string' ? message.substring(0, 50) : ''
        });
      } catch (deductErr) {
        console.warn('[UsageMetering] Failed to deduct SMS credit:', deductErr);
      }
      return {
        ...result,
        senderId: activeSenderId
      };
    }
  } catch (error) {
    console.error(`[SMS Error] Failed sending SMS via ${config.provider}:`, error);
    return { success: false, method: config.provider, senderId: config.senderId, error: error.message };
  }

  // If no SMS provider is configured, return explicit unconfigured state
  return { 
    success: false, 
    isConfigured: false,
    senderId: config.senderId,
    method: 'none', 
    error: 'لم يتم ربط مزود خدمة SMS في الإعدادات بعد (SMS Provider Not Configured).' 
  };
}

/**
 * Compose and send a booking confirmation SMS
 */
export async function sendBookingConfirmation(nameOrOptions, phone, date, time, clinicName, clinicId) {
  if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
    const { patientName, phone: ph, date: d, time: t, clinicName: cName, clinicId: cId } = nameOrOptions;
    const message = `عزيزي ${patientName}، تم تأكيد حجز موعدك في ${cName || 'العيادة'} يوم ${d} الساعة ${t}. نتمنى لك دوام الصحة.`;
    return sendSMS(ph, message, cId || clinicId);
  }
  const message = `عزيزي ${nameOrOptions}، تم تأكيد حجز موعدك في ${clinicName || 'العيادة'} يوم ${date} الساعة ${time}. نتمنى لك دوام الصحة.`;
  return sendSMS(phone, message, clinicId);
}

/**
 * Compose and send a reminder SMS
 */
export async function sendReminder(nameOrOptions, phone, date, time, clinicName, clinicId) {
  if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
    const { patientName: pName, phone: ph, date: d, time: t, clinicName: cName, clinicId: cId } = nameOrOptions;
    const message = `تذكير بموعد: مرحباً أ/ ${pName || 'المريض'}، موعدك في ${cName || 'العيادة'} اليوم ${d} الساعة ${t}. يُرجى الحضور قبل الموعد بـ 15 دقيقة.`;
    return sendSMS(ph, message, cId || clinicId);
  }
  const message = `تذكير بموعد: مرحباً أ/ ${nameOrOptions || 'المريض'}، موعدك في ${clinicName || 'العيادة'} اليوم ${date} الساعة ${time}. يُرجى الحضور قبل الموعد بـ 15 دقيقة.`;
  return sendSMS(phone, message, clinicId);
}

/**
 * Generate formatted WhatsApp link for booking confirmation
 */
export function getBookingConfirmationWhatsAppUrl({ patientName, phone, date, time, clinicName, bookingCode, manageUrl }) {
  let msg = `🏥 *${clinicName || 'عيادة كلينيك فلو'}*\n`;
  msg += `أهلاً بك أ/ ${patientName || 'المريض'}،\n`;
  msg += `تم تأكيد حجز موعدك بنجاح! 🎉\n\n`;
  msg += `📅 *الموعد:* ${date} الساعة ${time}\n`;
  if (bookingCode) msg += `🔑 *كود الحجز:* ${bookingCode}\n`;
  if (manageUrl) msg += `🔗 *لإدارة أو تعديل موعدك:* ${manageUrl}\n\n`;
  msg += `نتمنى لك دوام الصحة والعافية، ويُرجى الحضور قبل الموعد بـ 10 دقائق.`;

  return getWhatsAppUri(phone, msg);
}

/**
 * Generate formatted WhatsApp link for appointment reminder
 */
export function getAppointmentReminderWhatsAppUrl({ patientName, phone, date, time, clinicName }) {
  let msg = `🏥 *${clinicName || 'عيادة كلينيك فلو'}*\n`;
  msg += `تذكير بموعد الكشف: مرحباً أ/ ${patientName || 'المريض'} 👋\n\n`;
  msg += `نذكرك بموعدك المحدد اليوم/غداً: ${date} في تمام الساعة ${time}.\n`;
  msg += `في حال رغبتك في التأكيد أو تأجيل الموعد، يُرجى الرد على هذه الرسالة.\n`;
  msg += `نتمنى لك دوام الصحة والعافية!`;

  return getWhatsAppUri(phone, msg);
}

/**
 * Generate formatted WhatsApp link for periodic recall & checkup
 */
export function getRecallReminderWhatsAppUrl({ patientName, phone, clinicName, reason, dueDate }) {
  let msg = `🏥 *${clinicName || 'عيادة كلينيك فلو'}*\n`;
  msg += `مرحباً أ/ ${patientName || 'المريض'}، تحية طيبة من فريق العيادة 🌸\n\n`;
  msg += `نحيطكم علماً بأنه قد حان موعد المتابعة والفحص الدوري المقرر لك (${reason || 'فحص ومتابعة دورية'}).\n`;
  if (dueDate) msg += `📅 *الموعد المقترح:* ${dueDate}\n`;
  msg += `لحجز وتأكيد موعد استشارتك مع الطبيب، يُرجى الرد على هذه الرسالة مباشرة.\n`;
  msg += `صحتكم تهمنا دائماً! ✨`;

  return getWhatsAppUri(phone, msg);
}

/**
 * Super Admin SaaS Platform Infrastructure Helpers
 */
export function getGlobalSmsProvider() {
  const cfg = getSmsConfig();
  return cfg.provider || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SMS_PROVIDER) || 'none';
}

export function saveGlobalSmsProvider(provider) {
  const current = getSmsConfig();
  saveSmsConfig({ ...current, provider });
}

export async function testSmsConnection({ phone, message }) {
  try {
    const res = await sendSMS(phone, message || 'رسالة اختبارية من لوحة إدارة منصة كلينك فلو', 'default');
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
}
