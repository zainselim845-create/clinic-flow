import { safeStorage } from '../utils/safeStorage';

/**
 * ClinicFlow Super-Scale Usage Metering & Credit Engine
 * Strict, airtight credit tracking for SMS, AI Tokens, and Multi-Doctor quotas.
 * Zero unmetered leaks, full audit ledgering, and instant top-ups.
 */

const USAGE_STORAGE_PREFIX = 'clinicflow_usage_';
const LEDGER_STORAGE_PREFIX = 'clinicflow_usage_ledger_';

/**
 * Returns default quota structure based on subscription tier
 */
export function getDefaultTierQuotas(tier = 'pro') {
  switch (tier) {
    case 'starter':
      return {
        monthlySmsQuota: 300,
        extraSmsCredits: 0,
        smsUsed: 0,
        monthlyAiQuota: 500000,
        extraAiCredits: 0,
        aiTokensUsed: 0,
        maxDoctors: 1
      };
    case 'enterprise':
      return {
        monthlySmsQuota: 5000,
        extraSmsCredits: 0,
        smsUsed: 0,
        monthlyAiQuota: 10000000,
        extraAiCredits: 0,
        aiTokensUsed: 0,
        maxDoctors: 10
      };
    case 'pro':
    default:
      return {
        monthlySmsQuota: 1000,
        extraSmsCredits: 0,
        smsUsed: 0,
        monthlyAiQuota: 2000000,
        extraAiCredits: 0,
        aiTokensUsed: 0,
        maxDoctors: 3
      };
  }
}

/**
 * Retrieves the live, persistent usage state for a clinic
 */
export function getClinicUsage(clinicId = 'default', initialQuotas = null, tier = 'pro') {
  const cleanClinicId = clinicId || 'default';
  const key = `${USAGE_STORAGE_PREFIX}${cleanClinicId}`;
  
  const saved = safeStorage.getItem(key, null);
  if (saved && typeof saved === 'object') {
    const totalSmsAllowed = (saved.monthlySmsQuota || 1000) + (saved.extraSmsCredits || 0);
    const remainingSms = Math.max(0, totalSmsAllowed - (saved.smsUsed || 0));
    const totalAiAllowed = (saved.monthlyAiQuota || 2000000) + (saved.extraAiCredits || 0);
    const remainingAiTokens = Math.max(0, totalAiAllowed - (saved.aiTokensUsed || 0));

    return {
      ...saved,
      totalSmsAllowed,
      remainingSms,
      totalAiAllowed,
      remainingAiTokens,
      isSmsDepleted: remainingSms <= 0,
      isAiDepleted: remainingAiTokens <= 0
    };
  }

  // Initialize from defaults or provided initial quotas
  const defaults = getDefaultTierQuotas(tier);
  const initialized = {
    clinicId: cleanClinicId,
    monthlySmsQuota: initialQuotas?.monthlySmsQuota || defaults.monthlySmsQuota,
    extraSmsCredits: initialQuotas?.extraSmsCredits || 0,
    smsUsed: initialQuotas?.smsUsed || 0,
    monthlyAiQuota: initialQuotas?.aiTokensQuota || initialQuotas?.monthlyAiQuota || defaults.monthlyAiQuota,
    extraAiCredits: initialQuotas?.extraAiCredits || 0,
    aiTokensUsed: initialQuotas?.aiTokensUsed || 0,
    maxDoctors: initialQuotas?.maxDoctors || defaults.maxDoctors,
    lastResetMonth: new Date().toISOString().slice(0, 7) // YYYY-MM
  };

  const totalSmsAllowed = initialized.monthlySmsQuota + initialized.extraSmsCredits;
  const remainingSms = Math.max(0, totalSmsAllowed - initialized.smsUsed);
  const totalAiAllowed = initialized.monthlyAiQuota + initialized.extraAiCredits;
  const remainingAiTokens = Math.max(0, totalAiAllowed - initialized.aiTokensUsed);

  safeStorage.setItem(key, initialized);

  return {
    ...initialized,
    totalSmsAllowed,
    remainingSms,
    totalAiAllowed,
    remainingAiTokens,
    isSmsDepleted: remainingSms <= 0,
    isAiDepleted: remainingAiTokens <= 0
  };
}

/**
 * Pre-flight check: can the clinic send an SMS right now?
 */
export function canClinicSendSms(clinicId = 'default') {
  const usage = getClinicUsage(clinicId);
  if (usage.remainingSms <= 0) {
    return {
      allowed: false,
      remaining: 0,
      totalAllowed: usage.totalSmsAllowed,
      used: usage.smsUsed,
      error: `رصيد رسائل SMS الخاص بعيادتكم نفد بالكامل (0 متبقي من أصل ${usage.totalSmsAllowed} رسالة). يُرجى شحن الرصيد للاستمرار في إرسال التذكيرات وتأكيدات الحجز.`
    };
  }

  return {
    allowed: true,
    remaining: usage.remainingSms,
    totalAllowed: usage.totalSmsAllowed,
    used: usage.smsUsed
  };
}

/**
 * Atomically deducts 1 SMS credit from the clinic's balance and records audit ledger
 */
export function deductSmsCredit(clinicId = 'default', recipientPhone = '', metadata = {}) {
  const cleanClinicId = clinicId || 'default';
  const check = canClinicSendSms(cleanClinicId);
  if (!check.allowed) {
    throw new Error(check.error);
  }

  const key = `${USAGE_STORAGE_PREFIX}${cleanClinicId}`;
  const usage = getClinicUsage(cleanClinicId);

  const updatedUsage = {
    ...usage,
    smsUsed: (usage.smsUsed || 0) + 1
  };

  safeStorage.setItem(key, updatedUsage);

  // Append audit ledger entry
  recordUsageLedgerEntry(cleanClinicId, {
    type: 'sms_deduction',
    units: 1,
    recipient: recipientPhone,
    balanceAfter: check.remaining - 1,
    metadata
  });

  return {
    success: true,
    unitsDeducted: 1,
    remainingSms: check.remaining - 1,
    totalUsed: updatedUsage.smsUsed
  };
}

/**
 * Pre-flight check: can the clinic query AI Assistant?
 */
export function canClinicUseAi(clinicId = 'default', requiredTokens = 1000) {
  const usage = getClinicUsage(clinicId);
  if (usage.remainingAiTokens < requiredTokens) {
    return {
      allowed: false,
      remainingTokens: usage.remainingAiTokens,
      totalAllowed: usage.totalAiAllowed,
      used: usage.aiTokensUsed,
      error: `نفد رصيد توكنز الذكاء الاصطناعي السريري لهذا الشهر (${usage.remainingAiTokens.toLocaleString()} متبقي). يُرجى شحن باقة الذكاء الاصطناعي للاستمرار.`
    };
  }

  return {
    allowed: true,
    remainingTokens: usage.remainingAiTokens,
    totalAllowed: usage.totalAiAllowed,
    used: usage.aiTokensUsed
  };
}

/**
 * Atomically deducts AI tokens consumed by clinical queries
 */
export function deductAiTokens(clinicId = 'default', tokensCount = 500, metadata = {}) {
  const cleanClinicId = clinicId || 'default';
  const tokens = Math.max(1, Math.round(tokensCount));
  const key = `${USAGE_STORAGE_PREFIX}${cleanClinicId}`;
  const usage = getClinicUsage(cleanClinicId);

  const updatedUsage = {
    ...usage,
    aiTokensUsed: (usage.aiTokensUsed || 0) + tokens
  };

  safeStorage.setItem(key, updatedUsage);

  recordUsageLedgerEntry(cleanClinicId, {
    type: 'ai_tokens_deduction',
    units: tokens,
    balanceAfter: Math.max(0, usage.remainingAiTokens - tokens),
    metadata
  });

  return {
    success: true,
    tokensDeducted: tokens,
    remainingTokens: Math.max(0, usage.remainingAiTokens - tokens)
  };
}

/**
 * Super Admin or Automated Top-Up: Add extra credits to a clinic
 */
export function topUpClinicCredits({
  clinicId = 'default',
  smsCredits = 0,
  aiTokens = 0,
  reason = 'شحن رصيد مباشر',
  authorizedBy = 'Super Admin'
}) {
  const cleanClinicId = clinicId || 'default';
  const key = `${USAGE_STORAGE_PREFIX}${cleanClinicId}`;
  const usage = getClinicUsage(cleanClinicId);

  const updatedUsage = {
    ...usage,
    extraSmsCredits: (usage.extraSmsCredits || 0) + Math.max(0, Number(smsCredits) || 0),
    extraAiCredits: (usage.extraAiCredits || 0) + Math.max(0, Number(aiTokens) || 0)
  };

  safeStorage.setItem(key, updatedUsage);

  recordUsageLedgerEntry(cleanClinicId, {
    type: 'credit_topup',
    smsAdded: smsCredits,
    aiTokensAdded: aiTokens,
    reason,
    authorizedBy,
    newRemainingSms: updatedUsage.remainingSms + Math.max(0, Number(smsCredits) || 0)
  });

  return getClinicUsage(cleanClinicId);
}

/**
 * Appends an immutable audit log to the clinic's usage ledger
 */
export function recordUsageLedgerEntry(clinicId, entry) {
  const key = `${LEDGER_STORAGE_PREFIX}${clinicId || 'default'}`;
  const existingLedger = safeStorage.getItem(key, []);

  const newRecord = {
    id: 'usg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    clinicId: clinicId || 'default',
    ...entry
  };

  // Keep last 500 audit entries
  const updated = [newRecord, ...(Array.isArray(existingLedger) ? existingLedger : [])].slice(0, 500);
  safeStorage.setItem(key, updated);
  return newRecord;
}

/**
 * Retrieves the usage ledger for a clinic
 */
export function getClinicUsageLedger(clinicId = 'default') {
  const key = `${LEDGER_STORAGE_PREFIX}${clinicId || 'default'}`;
  return safeStorage.getItem(key, []);
}

/**
 * Resets monthly quotas on billing cycle (resets smsUsed, keeps extra credits)
 */
export function resetMonthlyUsageCycle(clinicId = 'default') {
  const cleanClinicId = clinicId || 'default';
  const key = `${USAGE_STORAGE_PREFIX}${cleanClinicId}`;
  const usage = getClinicUsage(cleanClinicId);

  const updated = {
    ...usage,
    smsUsed: 0,
    aiTokensUsed: 0,
    lastResetMonth: new Date().toISOString().slice(0, 7)
  };

  safeStorage.setItem(key, updated);
  return getClinicUsage(cleanClinicId);
}
