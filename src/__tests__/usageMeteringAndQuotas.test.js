import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getClinicUsage, 
  canClinicSendSms, 
  canClinicUseAi, 
  topUpClinicCredits, 
  getClinicUsageLedger,
  resetMonthlyUsageCycle
} from '../services/usageMeteringService';
import { sendSMS, saveSmsConfig } from '../services/smsService';
import { askDoctorAiAssistant } from '../services/aiAssistantService';
import { safeStorage } from '../utils/safeStorage';

describe('Usage Metering & Credit Enforcement Engine', () => {
  const clinicAlpha = 'clinic-alpha-' + Date.now();
  const clinicBeta = 'clinic-beta-' + Date.now();

  beforeEach(() => {
    // Clean storage
    safeStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Pre-flight Quota Checks & Default Tiers', () => {
    it('initializes default quotas correctly for different subscription tiers', () => {
      const starterUsage = getClinicUsage('clinic-starter', null, 'starter');
      expect(starterUsage.totalSmsAllowed).toBe(300);
      expect(starterUsage.remainingSms).toBe(300);
      expect(starterUsage.isSmsDepleted).toBe(false);

      const proUsage = getClinicUsage('clinic-pro', null, 'pro');
      expect(proUsage.totalSmsAllowed).toBe(1000);
      expect(proUsage.remainingSms).toBe(1000);

      const entUsage = getClinicUsage('clinic-ent', null, 'enterprise');
      expect(entUsage.totalSmsAllowed).toBe(5000);
      expect(entUsage.remainingSms).toBe(5000);
    });

    it('blocks sending when SMS balance is 0 or depleted', () => {
      // Initialize clinic with 0 remaining SMS
      getClinicUsage(clinicAlpha, { monthlySmsQuota: 10, smsUsed: 10 }, 'starter');

      const check = canClinicSendSms(clinicAlpha);
      expect(check.allowed).toBe(false);
      expect(check.remaining).toBe(0);
      expect(check.error).toContain('رصيد رسائل SMS الخاص بعيادتكم نفد بالكامل');
    });

    it('blocks AI requests when AI token balance is depleted', () => {
      getClinicUsage(clinicAlpha, { monthlyAiQuota: 1000, aiTokensUsed: 1000 }, 'starter');

      const check = canClinicUseAi(clinicAlpha, 500);
      expect(check.allowed).toBe(false);
      expect(check.error).toContain('نفد رصيد توكنز الذكاء الاصطناعي');
    });
  });

  describe('Atomic SMS Deductions & Pre-flight Gateway Integration', () => {
    it('prevents sendSMS from calling external gateway when clinic is out of credits', async () => {
      // Set clinic to exhausted quota
      getClinicUsage(clinicAlpha, { monthlySmsQuota: 5, smsUsed: 5 }, 'starter');
      saveSmsConfig({ provider: 'sandbox' }, clinicAlpha);

      const result = await sendSMS('01006285031', 'رسالة تذكير سريرية', clinicAlpha);
      expect(result.success).toBe(false);
      expect(result.isQuotaExceeded).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.error).toContain('رصيد رسائل SMS الخاص بعيادتكم نفد بالكامل');
    });

    it('atomically deducts credit and records audit ledger on successful send', async () => {
      // Set clinic with 5 SMS allowed, 0 used
      getClinicUsage(clinicAlpha, { monthlySmsQuota: 5, smsUsed: 0 }, 'starter');
      saveSmsConfig({ provider: 'sandbox' }, clinicAlpha);

      const result = await sendSMS('01006285031', 'تأكيد حجز الكشف رقم #9812', clinicAlpha);
      expect(result.success).toBe(true);

      const updated = getClinicUsage(clinicAlpha);
      expect(updated.smsUsed).toBe(1);
      expect(updated.remainingSms).toBe(4);

      // Verify audit ledger
      const ledger = getClinicUsageLedger(clinicAlpha);
      expect(ledger.length).toBe(1);
      expect(ledger[0].type).toBe('sms_deduction');
      expect(ledger[0].units).toBe(1);
      expect(ledger[0].recipient).toBe('201006285031');
      expect(ledger[0].metadata?.messageSnippet).toContain('تأكيد حجز الكشف');
    });

    it('blocks subsequent messages once remaining quota hits zero', async () => {
      // Clinic with exactly 1 SMS remaining
      getClinicUsage(clinicAlpha, { monthlySmsQuota: 1, smsUsed: 0 }, 'starter');
      saveSmsConfig({ provider: 'sandbox' }, clinicAlpha);

      // 1st send succeeds
      const first = await sendSMS('01001111111', 'رسالة رقم 1', clinicAlpha);
      expect(first.success).toBe(true);

      // 2nd send is strictly blocked
      const second = await sendSMS('01002222222', 'رسالة رقم 2', clinicAlpha);
      expect(second.success).toBe(false);
      expect(second.isQuotaExceeded).toBe(true);
    });
  });

  describe('AI Assistant Token Metering', () => {
    it('blocks askDoctorAiAssistant when clinic AI quota is exhausted', async () => {
      getClinicUsage(clinicAlpha, { monthlyAiQuota: 100, aiTokensUsed: 100 }, 'starter');

      const result = await askDoctorAiAssistant(
        [{ role: 'user', content: 'ما هي جرعة الباراسيتامول للطفل؟' }],
        { id: clinicAlpha, name: 'عيادة النور' },
        []
      );

      expect(result.success).toBe(false);
      expect(result.isQuotaExceeded).toBe(true);
      expect(result.error).toContain('نفد رصيد توكنز الذكاء الاصطناعي');
    });

    it('deducts AI tokens atomically on successful completion', async () => {
      getClinicUsage(clinicAlpha, { monthlyAiQuota: 500000, aiTokensUsed: 0 }, 'starter');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'الجرعة المقترحة هي 15 مجم/كجم كل 6 ساعات.' } }],
          usage: { total_tokens: 350 }
        })
      });

      const result = await askDoctorAiAssistant(
        [{ role: 'user', content: 'جرعة الباراسيتامول' }],
        { id: clinicAlpha, name: 'عيادة النور' },
        []
      );

      expect(result.success).toBe(true);
      expect(result.tokensUsed).toBe(350);

      const usage = getClinicUsage(clinicAlpha);
      expect(usage.aiTokensUsed).toBe(350);
      expect(usage.remainingAiTokens).toBe(500000 - 350);

      const ledger = getClinicUsageLedger(clinicAlpha);
      expect(ledger.some(e => e.type === 'ai_tokens_deduction')).toBe(true);
    });
  });

  describe('Super Admin Top-Up & Multi-Tenant Isolation', () => {
    it('restores sending ability immediately when Super Admin tops up credits', async () => {
      // Clinic starts with 0 remaining SMS
      getClinicUsage(clinicAlpha, { monthlySmsQuota: 10, smsUsed: 10 }, 'starter');
      saveSmsConfig({ provider: 'sandbox' }, clinicAlpha);

      expect(canClinicSendSms(clinicAlpha).allowed).toBe(false);

      // Super Admin top-up of +500 credits
      topUpClinicCredits({
        clinicId: clinicAlpha,
        smsCredits: 500,
        aiTokens: 100000,
        reason: 'شحن إنستاباي معتمد',
        authorizedBy: 'Super Admin'
      });

      const afterTopUp = getClinicUsage(clinicAlpha);
      expect(afterTopUp.remainingSms).toBe(500);
      expect(afterTopUp.isSmsDepleted).toBe(false);

      // Sending is immediately allowed again
      const check = canClinicSendSms(clinicAlpha);
      expect(check.allowed).toBe(true);

      const sendResult = await sendSMS('01006285031', 'رسالة بعد الشحن', clinicAlpha);
      expect(sendResult.success).toBe(true);
      expect(getClinicUsage(clinicAlpha).remainingSms).toBe(499);
    });

    it('strictly isolates credits and ledgers between Clinic A and Clinic B', async () => {
      // Clinic Alpha starts with 5 SMS
      getClinicUsage(clinicAlpha, { monthlySmsQuota: 5, smsUsed: 0 }, 'starter');
      // Clinic Beta starts with 10 SMS
      getClinicUsage(clinicBeta, { monthlySmsQuota: 10, smsUsed: 0 }, 'starter');
      saveSmsConfig({ provider: 'sandbox' }, clinicAlpha);
      saveSmsConfig({ provider: 'sandbox' }, clinicBeta);

      // Clinic Alpha sends 2 SMS
      await sendSMS('01001111111', 'رسالة عيادة أ - 1', clinicAlpha);
      await sendSMS('01002222222', 'رسالة عيادة أ - 2', clinicAlpha);

      // Clinic Alpha usage is decremented
      expect(getClinicUsage(clinicAlpha).remainingSms).toBe(3);
      expect(getClinicUsageLedger(clinicAlpha).length).toBe(2);

      // Clinic Beta MUST remain untouched
      const betaUsage = getClinicUsage(clinicBeta);
      expect(betaUsage.remainingSms).toBe(10);
      expect(betaUsage.smsUsed).toBe(0);
      expect(getClinicUsageLedger(clinicBeta).length).toBe(0);
    });

    it('handles monthly billing cycle reset without wiping extra purchased credits', () => {
      getClinicUsage(clinicAlpha, { monthlySmsQuota: 1000, extraSmsCredits: 500, smsUsed: 800 }, 'pro');

      const reset = resetMonthlyUsageCycle(clinicAlpha);
      expect(reset.smsUsed).toBe(0);
      expect(reset.extraSmsCredits).toBe(500);
      expect(reset.remainingSms).toBe(1500);
    });
  });
});
