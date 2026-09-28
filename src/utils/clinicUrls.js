/**
 * ClinicFlow Centralized URL & Domain Resolution Utility
 * 
 * Computes deterministic public and private URLs for clinics, dedicated subdomains,
 * custom domains, QR codes, and WhatsApp sharing across production, staging, and local environments.
 */

export const SAAS_PLATFORM_DOMAIN = 'clinicflow.app';
export const VERCEL_PRODUCTION_HOST = 'clinic-flow-ten-sigma.vercel.app';

/**
 * Returns the clean hostname of the current environment
 */
export function getCurrentHostname(location = (typeof window !== 'undefined' ? window.location : null)) {
  if (!location) return '';
  return (location.hostname || '').toLowerCase().trim().replace(/^www\./i, '');
}

/**
 * Returns the effective base domain/host for a clinic.
 * Priority:
 * 1. Verified Custom Domain (e.g. dr-hazem-clinic.com)
 * 2. Dedicated Subdomain (e.g. dr-ahmed.clinicflow.app)
 * 3. Platform Host
 */
export function getClinicDomain(tenant, location = (typeof window !== 'undefined' ? window.location : null)) {
  if (!tenant) return '';
  const custom = (tenant.customDomain || tenant.custom_domain || '').trim().toLowerCase().replace(/^www\./i, '');
  if (custom) return custom;

  const slug = (tenant.slug || '').trim().toLowerCase();
  if (!slug) return '';

  return `${slug}.${SAAS_PLATFORM_DOMAIN}`;
}

/**
 * Resolves the primary public booking URL for patients to book an appointment with this clinic.
 */
export function getClinicBookingUrl(tenant, location = (typeof window !== 'undefined' ? window.location : null)) {
  const custom = (tenant?.customDomain || tenant?.custom_domain || '').trim().toLowerCase().replace(/^www\./i, '');
  if (custom) {
    return `https://${custom}/`;
  }

  const slug = (tenant?.slug || '').trim().toLowerCase();
  if (!slug) {
    const origin = location?.origin || `https://${SAAS_PLATFORM_DOMAIN}`;
    return `${origin}/booking`;
  }

  const origin = location?.origin || '';
  const hostname = getCurrentHostname(location);

  // If running locally in development (e.g. localhost:5173)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return `${origin}/c/${slug}/booking`;
  }

  // If on Vercel deployment preview / production host
  if (hostname.endsWith('.vercel.app')) {
    return `${origin}/c/${slug}/booking`;
  }

  // Production standard SaaS subdomain
  return `https://${slug}.${SAAS_PLATFORM_DOMAIN}/`;
}

/**
 * Resolves the patient appointment management URL
 */
export function getClinicManageBookingUrl(
  tenant, 
  bookingCode = '', 
  phone = '', 
  location = (typeof window !== 'undefined' ? window.location : null)
) {
  const custom = (tenant?.customDomain || tenant?.custom_domain || '').trim().toLowerCase().replace(/^www\./i, '');
  const slug = (tenant?.slug || '').trim().toLowerCase();
  const origin = location?.origin || `https://${SAAS_PLATFORM_DOMAIN}`;

  let base = '';
  if (custom) {
    base = `https://${custom}/manage-booking`;
  } else if (origin) {
    base = slug ? `${origin}/c/${slug}/manage-booking` : `${origin}/manage-booking`;
  } else {
    base = `https://${slug}.${SAAS_PLATFORM_DOMAIN}/manage-booking`;
  }

  const params = new URLSearchParams();
  if (bookingCode) params.set('code', bookingCode);
  if (phone) params.set('phone', phone);

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Generates an SVG/PNG QR Code URL for the clinic's public booking portal.
 * Uses high-contrast error correction for reliable scanning on paper/reception counter.
 */
export function getClinicQrCodeUrl(bookingUrl, size = 300) {
  if (!bookingUrl) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(bookingUrl)}&margin=1&format=svg`;
}

/**
 * Generates a pre-composed WhatsApp sharing link for patients
 */
export function getClinicBookingWhatsAppShareUrl(tenant, location = null) {
  const bookingUrl = getClinicBookingUrl(tenant, location);
  const clinicName = tenant?.name || 'عيادتنا';
  const doctorName = tenant?.doctorName ? `د. ${tenant.doctorName.replace(/^د\.?\s*/, '')}` : '';

  let message = `مرحباً بك،\nلحجز موعد كشف أو استشارة لدى ${doctorName ? `${doctorName} - ` : ''}${clinicName}، يمكنك الحجز المباشر واختيار الموعد المناسب لك عبر رابط البوابة الإلكترونية:\n\n${bookingUrl}\n\nنتمنى لكم دوام الصحة والعافية.`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
