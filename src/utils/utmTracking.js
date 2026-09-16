/**
 * Utility to append standard UTM marketing parameters to external outbound links.
 * 
 * @param {string} url - The target outbound URL
 * @param {Object} options - UTM parameter overrides
 * @returns {string} URL with appended UTM parameters
 */
export function buildUtmUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return url;
  
  const {
    source = 'clinicflow_web',
    medium = 'referral',
    campaign = 'saas_platform',
    term,
    content
  } = options;

  try {
    const isRelative = url.startsWith('/') || url.startsWith('#');
    if (isRelative) return url;

    // Handle special schemes like wa.me, mailto, tel
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      return url;
    }

    const parsed = new URL(url, 'https://clinicflow.app');
    
    // Only append if not already present
    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', source);
    }
    if (!parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', medium);
    }
    if (!parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', campaign);
    }
    if (term && !parsed.searchParams.has('utm_term')) {
      parsed.searchParams.set('utm_term', term);
    }
    if (content && !parsed.searchParams.has('utm_content')) {
      parsed.searchParams.set('utm_content', content);
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Creates an outbound WhatsApp link with pre-filled message and UTM attribution.
 */
export function getWhatsAppSupportUrl(message = 'مرحباً، أود الاستفسار عن منصة ClinicFlow لإدارة العيادات') {
  const phone = '201006285031';
  const baseUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return buildUtmUrl(baseUrl, {
    source: 'clinicflow_web',
    medium: 'whatsapp_button',
    campaign: 'customer_support'
  });
}
