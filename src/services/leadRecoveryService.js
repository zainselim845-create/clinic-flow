import { cleanEgyptianPhone } from '../utils/phoneValidation';
import { safeStorage } from '../utils/safeStorage';

const DRAFTS_STORAGE_KEY = 'clinicflow_booking_drafts';

/**
 * Save or update a booking draft when patient types phone / starts booking
 */
export function saveBookingDraft(draftData) {
  if (!draftData || !draftData.phone) return null;

  try {
    const existing = getBookingDrafts();
    const cleanPhone = cleanEgyptianPhone(draftData.phone);
    const draftId = draftData.id || 'draft_' + Date.now();

    const updatedDraft = {
      id: draftId,
      phone: cleanPhone,
      name: draftData.name || '',
      service: draftData.service || '',
      date: draftData.date || '',
      slot: draftData.slot || '',
      step: draftData.step || 1,
      createdAt: draftData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'abandoned' // 'abandoned' | 'recovered' | 'completed'
    };

    // Filter out previous drafts for this phone and add new
    const filtered = existing.filter(d => d.phone !== cleanPhone);
    const result = [updatedDraft, ...filtered];

    safeStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(result));
    return updatedDraft;
  } catch (e) {
    console.error('Failed to save booking draft', e);
    return null;
  }
}

/**
 * Retrieve all booking drafts
 */
export function getBookingDrafts() {
  try {
    const data = safeStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!data) return [];
    return typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('Failed to get booking drafts', e);
    return [];
  }
}

/**
 * Mark a draft as completed/converted
 */
export function completeBookingDraft(phone) {
  try {
    const cleanPhone = cleanEgyptianPhone(phone);
    const drafts = getBookingDrafts();
    const updated = drafts.map(d => d.phone === cleanPhone ? { ...d, status: 'completed' } : d);
    safeStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to complete draft', e);
  }
}

/**
 * Generate 1-Click SMS Lead Recovery Message & Link
 */
export function generateLeadRecoverySmsMessage(draft, clinicInfo) {
  const patientName = draft.name || 'عزيزنا المريض';
  const clinicName = clinicInfo?.name || 'العيادة';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow.com';
  const resumeUrl = `${origin}/booking?resume=${draft.id}`;

  return `مرحباً ${patientName} 🌸\nلاحظنا أنك بدأت حجز موعد في ${clinicName} ولم تكمل الخطوة الأخيرة.\n\nيسعدنا مساعدتك لإتمام حجزك بضغطة زر وبدون انتظار عبر الرابط التالي: \n${resumeUrl}\n\nنحن بانتظارك ونتشرف بخدمتك دائماً!`;
}

export function generateLeadRecoverySmsUrl(draft, clinicInfo) {
  const text = generateLeadRecoverySmsMessage(draft, clinicInfo);
  const cleanPhone = (draft.phone || '').replace(/^0/, '20').replace(/\D/g, '');
  return `sms:+${cleanPhone}?body=${encodeURIComponent(text)}`;
}

// Backward compatibility alias
export const generateLeadRecoveryWhatsAppMessage = generateLeadRecoverySmsUrl;

