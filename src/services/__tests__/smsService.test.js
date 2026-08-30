import { describe, it, expect } from 'vitest';
import { formatEgyptianPhone, sendSMS } from '../smsService';

describe('smsService Unit Tests', () => {
  describe('formatEgyptianPhone', () => {
    it.each([
      ['01006285031', '+201006285031'],
      ['+201006285031', '+201006285031'],
      ['00201006285031', '+201006285031'],
      ['201006285031', '+201006285031'],
      ['011 2222 3333', '+201122223333'],
      ['012-3333-4444', '+201233334444']
    ])('formats input "%s" to E.164 standard "%s"', (rawPhone, expectedE164) => {
      expect(formatEgyptianPhone(rawPhone)).toBe(expectedE164);
    });

    it('handles empty or null values gracefully', () => {
      expect(formatEgyptianPhone('')).toBe('');
      expect(formatEgyptianPhone(null)).toBe('');
    });
  });

  describe('sendSMS unconfigured behavior', () => {
    it('returns honest unconfigured status when no credentials are provided', async () => {
      const result = await sendSMS('01006285031', 'رسالة اختبار');
      expect(result.success).toBe(false);
      expect(result.isConfigured).toBe(false);
      expect(result.error).toContain('لم يتم ربط مزود خدمة SMS');
    });
  });
});
