import { cleanEgyptianPhone } from '../utils/phoneValidation';
import { safeStorage } from '../utils/safeStorage';

const DRAFTS_STORAGE_KEY = 'clinicflow_booking_drafts';

export const BOOKING_FUNNEL_STEPS = {
  1: { id: 'phone_input', name: 'إدخال رقم الهاتف والبيانات الأساسية', weight: 25 },
  2: { id: 'service_selected', name: 'اختيار نوع الكشف والخدمة الطبية', weight: 50 },
  3: { id: 'slot_selected', name: 'اختيار التاريخ وموعد الحضور', weight: 75 },
  4: { id: 'review', name: 'مراجعة وتأكيد بيانات الحجز', weight: 90 },
  5: { id: 'completed', name: 'تم تأكيد الحجز بنجاح', weight: 100 }
};

/**
 * Helper to get storage key scoped by clinicId
 */
function getDraftsKey(clinicId) {
  return clinicId ? `${DRAFTS_STORAGE_KEY}_${clinicId}` : DRAFTS_STORAGE_KEY;
}

/**
 * Save or update a booking draft with granular funnel telemetry
 */
export function saveBookingDraft(draftData, clinicId) {
  if (!draftData || !draftData.phone) return null;

  try {
    const targetClinicId = clinicId || draftData.clinicId || undefined;
    const existing = getBookingDrafts(targetClinicId);
    const cleanPhone = cleanEgyptianPhone(draftData.phone);
    const draftId = draftData.id || 'draft_' + Date.now();
    const currentStepNum = Number(draftData.step || 1);
    const stepInfo = BOOKING_FUNNEL_STEPS[currentStepNum] || BOOKING_FUNNEL_STEPS[1];

    const updatedDraft = {
      id: draftId,
      clinicId: targetClinicId,
      clinic_id: targetClinicId,
      phone: cleanPhone,
      name: draftData.name || '',
      service: draftData.service || draftData.type || '',
      date: draftData.date || '',
      slot: draftData.slot || draftData.time || '',
      step: currentStepNum,
      stepKey: stepInfo.id,
      stepName: stepInfo.name,
      createdAt: draftData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: draftData.status || 'abandoned' // 'abandoned' | 'recovered' | 'completed'
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
    const updated = drafts.map(d => d.phone === cleanPhone ? { ...d, status: 'completed', step: 5, stepName: BOOKING_FUNNEL_STEPS[5].name, completedAt: new Date().toISOString() } : d);
    safeStorage.setItem(getDraftsKey(clinicId), JSON.stringify(updated));

    if (clinicId) {
      try {
        const globalDrafts = getBookingDrafts();
        const globalUpdated = globalDrafts.map(d => (d.phone === cleanPhone && (!d.clinicId || d.clinicId === clinicId)) ? { ...d, status: 'completed', step: 5, stepName: BOOKING_FUNNEL_STEPS[5].name, completedAt: new Date().toISOString() } : d);
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
 * Mark a draft as recovered (when staff contacts patient or message is sent)
 */
export function markDraftAsRecovered(draftId, clinicId) {
  try {
    const drafts = getBookingDrafts(clinicId);
    const updated = drafts.map(d => d.id === draftId ? { ...d, status: 'recovered', recoveredAt: new Date().toISOString() } : d);
    safeStorage.setItem(getDraftsKey(clinicId), JSON.stringify(updated));

    if (clinicId) {
      try {
        const globalDrafts = getBookingDrafts();
        const globalUpdated = globalDrafts.map(d => d.id === draftId ? { ...d, status: 'recovered', recoveredAt: new Date().toISOString() } : d);
        safeStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(globalUpdated));
      } catch (err) {
        console.warn('[LeadRecoveryService] Global draft recovery note:', err);
      }
    }
  } catch (e) {
    console.error('Failed to mark draft as recovered', e);
  }
}

/**
 * Compute Booking Funnel Telemetry & Analytics
 */
export function getBookingFunnelStats(clinicId) {
  const drafts = getBookingDrafts(clinicId);
  const totalStarted = drafts.length;

  let step1Count = 0; // Entered phone & name
  let step2Count = 0; // Selected service
  let step3Count = 0; // Selected date & slot
  let completedCount = 0;
  let abandonedCount = 0;
  let recoveredCount = 0;

  drafts.forEach(d => {
    if (d.status === 'completed') {
      completedCount++;
      step1Count++;
      step2Count++;
      step3Count++;
    } else {
      if (d.status === 'recovered') recoveredCount++;
      else abandonedCount++;

      if (d.step >= 1) step1Count++;
      if (d.step >= 2) step2Count++;
      if (d.step >= 3) step3Count++;
    }
  });

  const dropOffStep1 = Math.max(0, step1Count - step2Count);
  const dropOffStep2 = Math.max(0, step2Count - step3Count);
  const dropOffStep3 = Math.max(0, step3Count - completedCount);

  const conversionRate = totalStarted > 0 ? Math.round((completedCount / totalStarted) * 100) : 0;
  const recoveryRate = (abandonedCount + recoveredCount) > 0 ? Math.round((recoveredCount / (abandonedCount + recoveredCount)) * 100) : 0;

  return {
    totalStarted,
    step1Count,
    step2Count,
    step3Count,
    completedCount,
    abandonedCount,
    recoveredCount,
    dropOffStep1,
    dropOffStep2,
    dropOffStep3,
    conversionRate,
    recoveryRate,
    abandonedDrafts: drafts.filter(d => d.status === 'abandoned' || d.status === 'recovered')
  };
}

/**
 * Generate 1-Click Lead Recovery Message & Link (Zero Emojis, Zero Stars)
 */
export function generateLeadRecoveryMessage(draft, clinicInfo) {
  const patientName = draft.name ? `أ / د. ${draft.name}` : 'عزيزنا المريض';
  const clinicName = clinicInfo?.name || 'العيادة';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow.com';
  const resumeUrl = `${origin}/booking?resume=${draft.id}`;

  return `مرحباً بك ${patientName}.\nلاحظنا أنك بدأت حجز موعد في ${clinicName} ولم تكمل الخطوة الأخيرة.\n\nيسعدنا مساعدتك لإتمام حجزك بضغطة واحدة وبدون إعادة إدخال بياناتك عبر الرابط المباشر التالي:\n${resumeUrl}\n\nفريق العيادة في انتظارك ونتشرف بخدمتك دائماً.`;
}

/**
 * Generate WhatsApp Recovery Link
 */
export function generateLeadRecoveryWhatsAppUrl(draft, clinicInfo) {
  const text = generateLeadRecoveryMessage(draft, clinicInfo);
  const cleanPhone = (draft.phone || '').replace(/^0/, '20').replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generate SMS Recovery Link
 */
export function generateLeadRecoverySmsUrl(draft, clinicInfo) {
  const text = generateLeadRecoveryMessage(draft, clinicInfo);
  const cleanPhone = (draft.phone || '').replace(/^0/, '20').replace(/\D/g, '');
  return `sms:+${cleanPhone}?body=${encodeURIComponent(text)}`;
}

// Backward compatibility aliases
export const generateLeadRecoverySmsMessage = generateLeadRecoveryMessage;
export const generateLeadRecoveryWhatsAppMessage = generateLeadRecoveryWhatsAppUrl;
