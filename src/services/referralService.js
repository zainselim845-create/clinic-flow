import { safeStorage } from '../utils/safeStorage';

const REFERRALS_STORAGE_KEY = 'clinicflow_referrals_ledger';

/**
 * Generate a unique referral code for a patient
 */
export function getPatientReferralCode(patientId) {
  if (!patientId) return 'CF-REF-001';
  return `CF-REF-${String(patientId).replace(/\D/g, '').slice(-4) || 'VIP'}`;
}

/**
 * Get full referral link for a patient
 */
export function getPatientReferralLink(patientId) {
  const code = getPatientReferralCode(patientId);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow.com';
  return `${origin}/booking?ref=${code}`;
}

/**
 * Retrieve referral logs & stats
 */
export function getReferralsLedger() {
  try {
    const data = safeStorage.getItem(REFERRALS_STORAGE_KEY);
    if (!data) return [];
    return typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('Failed to get referrals', e);
    return [];
  }
}

/**
 * Record a new referral when an appointment is booked with a referral code
 */
export function recordReferral(referralCode, referredPatientName, referredPhone) {
  try {
    const existing = getReferralsLedger();
    const newEntry = {
      id: 'ref_' + Date.now(),
      referralCode,
      referredPatientName,
      referredPhone,
      rewardAmount: 100, // 100 EGP credit to referrer
      refereeDiscount: '10%',
      status: 'pending', // 'pending' | 'completed' | 'rewarded'
      createdAt: new Date().toISOString()
    };
    const updated = [newEntry, ...existing];
    safeStorage.setItem(REFERRALS_STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (e) {
    console.error('Failed to record referral', e);
    return null;
  }
}
