import { cleanEgyptianPhone } from '../utils/phoneValidation';
import { safeStorage } from '../utils/safeStorage';

const DRAFTS_STORAGE_KEY = 'clinicflow_booking_drafts';

/**
 * Helper to get storage key scoped by clinicId
 */
function getDraftsKey(clinicId) {
  return clinicId ? `${DRAFTS_STORAGE_KEY}_${clinicId}` : DRAFTS_STORAGE_KEY;
}

/**
 * Save or update a booking draft when patient types phone / starts booking
 */
export function saveBookingDraft(draftData, clinicId) {
  if (!draftData || !draftData.phone) return null;

  try {
    const targetClinicId = clinicId || draftData.clinicId || undefined;
    const existing = getBookingDrafts(targetClinicId);
    const cleanPhone = cleanEgyptianPhone(draftData.phone);
    const draftId = draftData.id || 'draft_' + Date.now();

    const updatedDraft = {
      id: draftId,
      clinicId: targetClinicId,
      clinic_id: targetClinicId,
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

    safeStorage.setItem(getDraftsKey(targetClinicId), JSON.stringify(result));
    if (targetClinicId) {
      try {
        const globalData = safeStorage.getItem(DRAFTS_STORAGE_KEY);
        const globalList = globalData ? (typeof globalData === 'string' ? JSON.parse(globalData) : (Array.isArray(globalData) ? globalData : [])) : [];
        const globalFiltered = globalList.filter(d => !(d.phone === cleanPhone && (!d.clinicId || d.clinicId === targetClinicId)));
        safeStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify([updatedDraft, ...globalFiltered]));
      } catch (err) {
        console.warn('[LeadRecoveryService] Global draft sync note:', err);
      }
    }
    return updatedDraft;
  } catch (e) {
    console.error('Failed to save booking draft', e);
    return null;
  }
}

/**
 * Retrieve all booking drafts (scoped by clinicId if provided)
 */
export function getBookingDrafts(clinicId) {
  try {
    if (clinicId) {
      const scopedKey = getDraftsKey(clinicId);
      const scopedData = safeStorage.getItem(scopedKey);
      let list = scopedData ? (typeof scopedData === 'string' ? JSON.parse(scopedData) : (Array.isArray(scopedData) ? scopedData : [])) : [];
      
      const globalData = safeStorage.getItem(DRAFTS_STORAGE_KEY);
      if (globalData) {
        const globalList = typeof globalData === 'string' ? JSON.parse(globalData) : (Array.isArray(globalData) ? globalData : []);
        const matchingGlobal = globalList.filter(d => d.clinicId === clinicId);
        if (matchingGlobal.length > 0) {
          const ids = new Set(list.map(d => d.id));
          matchingGlobal.forEach(d => {
            if (!ids.has(d.id)) {
              list.push(d);
              ids.add(d.id);
            }
          });
        }
      }
      return list.filter(d => !d.clinicId || d.clinicId === clinicId);
    }

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
export function completeBookingDraft(phone, clinicId) {
  try {
    const cleanPhone = cleanEgyptianPhone(phone);
    const drafts = getBookingDrafts(clinicId);
    const updated = drafts.map(d => d.phone === cleanPhone ? { ...d, status: 'completed' } : d);
    safeStorage.setItem(getDraftsKey(clinicId), JSON.stringify(updated));

    if (clinicId) {
      try {
        const globalDrafts = getBookingDrafts();
        const globalUpdated = globalDrafts.map(d => (d.phone === cleanPhone && (!d.clinicId || d.clinicId === clinicId)) ? { ...d, status: 'completed' } : d);
        safeStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(globalUpdated));
      } catch (err) {
        console.warn('[LeadRecoveryService] Global draft completion note:', err);
      }
    }
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

