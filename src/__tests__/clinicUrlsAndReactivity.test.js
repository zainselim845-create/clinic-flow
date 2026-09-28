import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getClinicDomain,
  getClinicBookingUrl,
  getClinicManageBookingUrl,
  getClinicQrCodeUrl,
  getClinicBookingWhatsAppShareUrl,
  getCurrentHostname,
  SAAS_PLATFORM_DOMAIN
} from '../utils/clinicUrls';

describe('Clinic URLs and Domain Resolution Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. getCurrentHostname', () => {
    it('returns empty string when location is null or undefined', () => {
      expect(getCurrentHostname(null)).toBe('');
      expect(getCurrentHostname(undefined)).toBe('');
    });

    it('returns clean hostname without www prefix', () => {
      expect(getCurrentHostname({ hostname: 'www.dr-ahmed.com' })).toBe('dr-ahmed.com');
      expect(getCurrentHostname({ hostname: 'DR-AHMED.COM' })).toBe('dr-ahmed.com');
      expect(getCurrentHostname({ hostname: 'clinicflow.app' })).toBe('clinicflow.app');
    });
  });

  describe('2. getClinicDomain', () => {
    it('returns empty string if tenant is null or missing slug', () => {
      expect(getClinicDomain(null)).toBe('');
      expect(getClinicDomain({})).toBe('');
    });

    it('returns verified custom domain as highest priority', () => {
      const tenant = {
        slug: 'dr-ahmed',
        customDomain: 'dr-ahmed-dental.com'
      };
      expect(getClinicDomain(tenant)).toBe('dr-ahmed-dental.com');
    });

    it('returns custom_domain snake_case field if present', () => {
      const tenant = {
        slug: 'dr-sara',
        custom_domain: 'drsara-clinic.com'
      };
      expect(getClinicDomain(tenant)).toBe('drsara-clinic.com');
    });

    it('strips www prefix from custom domain', () => {
      const tenant = {
        slug: 'dr-ahmed',
        customDomain: 'www.dr-ahmed-dental.com'
      };
      expect(getClinicDomain(tenant)).toBe('dr-ahmed-dental.com');
    });

    it('falls back to dedicated subdomain if no custom domain is set', () => {
      const tenant = {
        slug: 'dr-khaled'
      };
      expect(getClinicDomain(tenant)).toBe(`dr-khaled.${SAAS_PLATFORM_DOMAIN}`);
    });
  });

  describe('3. getClinicBookingUrl', () => {
    it('resolves directly to custom domain when configured', () => {
      const tenant = {
        slug: 'dr-ahmed',
        customDomain: 'dr-ahmed-dental.com'
      };
      expect(getClinicBookingUrl(tenant)).toBe('https://dr-ahmed-dental.com/');
    });

    it('resolves to path-based URL in local development environment', () => {
      const tenant = { slug: 'dr-mona' };
      const localLocation = { origin: 'http://localhost:5173', hostname: 'localhost' };
      expect(getClinicBookingUrl(tenant, localLocation)).toBe('http://localhost:5173/c/dr-mona/booking');
    });

    it('resolves to path-based URL on Vercel preview environments', () => {
      const tenant = { slug: 'dr-mona' };
      const vercelLocation = {
        origin: 'https://clinic-flow-preview.vercel.app',
        hostname: 'clinic-flow-preview.vercel.app'
      };
      expect(getClinicBookingUrl(tenant, vercelLocation)).toBe('https://clinic-flow-preview.vercel.app/c/dr-mona/booking');
    });

    it('resolves to dedicated subdomain on production domain', () => {
      const tenant = { slug: 'dr-tamer' };
      const prodLocation = {
        origin: 'https://clinicflow.app',
        hostname: 'clinicflow.app'
      };
      expect(getClinicBookingUrl(tenant, prodLocation)).toBe(`https://dr-tamer.${SAAS_PLATFORM_DOMAIN}/`);
    });

    it('handles fallback gracefully when tenant has no slug', () => {
      const localLocation = { origin: 'http://localhost:5173', hostname: 'localhost' };
      expect(getClinicBookingUrl(null, localLocation)).toBe('http://localhost:5173/booking');
    });
  });

  describe('4. getClinicManageBookingUrl', () => {
    it('generates manage booking url without query when code and phone omitted', () => {
      const tenant = { slug: 'dr-nour' };
      const loc = { origin: 'http://localhost:5173', hostname: 'localhost' };
      expect(getClinicManageBookingUrl(tenant, '', '', loc)).toBe('http://localhost:5173/c/dr-nour/manage-booking');
    });

    it('appends code and phone query parameters properly', () => {
      const tenant = { slug: 'dr-nour' };
      const loc = { origin: 'http://localhost:5173', hostname: 'localhost' };
      const url = getClinicManageBookingUrl(tenant, 'CF-9821', '01006285031', loc);
      expect(url).toBe('http://localhost:5173/c/dr-nour/manage-booking?code=CF-9821&phone=01006285031');
    });

    it('respects custom domain when resolving manage booking url', () => {
      const tenant = { slug: 'dr-nour', customDomain: 'drnour-clinic.com' };
      const url = getClinicManageBookingUrl(tenant, 'CF-1234');
      expect(url).toBe('https://drnour-clinic.com/manage-booking?code=CF-1234');
    });
  });

  describe('5. getClinicQrCodeUrl', () => {
    it('returns empty string for empty booking URL', () => {
      expect(getClinicQrCodeUrl('')).toBe('');
    });

    it('creates high resolution SVG QR code url with proper parameters', () => {
      const bookingUrl = 'https://dr-ahmed.clinicflow.app/';
      const qrUrl = getClinicQrCodeUrl(bookingUrl, 320);
      expect(qrUrl).toContain('https://api.qrserver.com/v1/create-qr-code/');
      expect(qrUrl).toContain('size=320x320');
      expect(qrUrl).toContain(`data=${encodeURIComponent(bookingUrl)}`);
      expect(qrUrl).toContain('format=svg');
    });
  });

  describe('6. getClinicBookingWhatsAppShareUrl', () => {
    it('creates pre-composed Arabic message with booking link and doctor name', () => {
      const tenant = {
        name: 'عيادة الأمل لجراحة الفم والأسنان',
        doctorName: 'أحمد الشريف',
        slug: 'el-amal'
      };
      const loc = { origin: 'http://localhost:5173', hostname: 'localhost' };
      const shareUrl = getClinicBookingWhatsAppShareUrl(tenant, loc);

      expect(shareUrl).toContain('https://api.whatsapp.com/send?text=');
      const decodedMessage = decodeURIComponent(shareUrl.replace('https://api.whatsapp.com/send?text=', ''));
      expect(decodedMessage).toContain('د. أحمد الشريف');
      expect(decodedMessage).toContain('عيادة الأمل لجراحة الفم والأسنان');
      expect(decodedMessage).toContain('http://localhost:5173/c/el-amal/booking');
    });
  });
});
