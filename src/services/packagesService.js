import { getTodayDateStr } from '../utils/timeSlots';
import { getDaysDifference } from './segmentationService';
import { safeStorage } from '../utils/safeStorage';

const PACKAGES_STORAGE_KEY = 'clinicflow_patient_packages';

/**
 * Multi-Session Package Ledger (Laser, Skin Care, Physiotherapy, Slimming)
 */
export function getPatientPackages() {
  try {
    const data = safeStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!data) return [];
    return typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('Failed to get packages', e);
    return [];
  }
}

export function savePatientPackage(pkgData) {
  try {
    const existing = getPatientPackages();
    const newPkg = {
      id: pkgData.id || 'pkg_' + Date.now(),
      patientId: pkgData.patientId,
      patientName: pkgData.patientName,
      packageName: pkgData.packageName || 'باقة ليزر متكاملة (6 جلسات)',
      totalSessions: Number(pkgData.totalSessions) || 6,
      completedSessions: Number(pkgData.completedSessions) || 0,
      remainingSessions: (Number(pkgData.totalSessions) || 6) - (Number(pkgData.completedSessions) || 0),
      sessionIntervalDays: Number(pkgData.sessionIntervalDays) || 28, // e.g. 4 weeks
      lastSessionDate: pkgData.lastSessionDate || getTodayDateStr(),
      nextDueDate: pkgData.nextDueDate || calculateNextSessionDate(pkgData.lastSessionDate, pkgData.sessionIntervalDays),
      price: pkgData.price || '3000 ج.م',
      status: 'active', // 'active' | 'completed' | 'stalled'
      createdAt: new Date().toISOString()
    };

    const filtered = existing.filter(p => p.id !== newPkg.id);
    const updated = [newPkg, ...filtered];
    safeStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(updated));
    return newPkg;
  } catch (e) {
    console.error('Failed to save package', e);
    return null;
  }
}

export function calculateNextSessionDate(lastDate = getTodayDateStr(), intervalDays = 28) {
  const d = new Date(lastDate);
  d.setDate(d.getDate() + Number(intervalDays));
  return d.toISOString().split('T')[0];
}

/**
 * Detect stalled packages (patient didn't show up for next session in interval + 14 days)
 */
export function detectStalledPackages(packages = []) {
  const today = getTodayDateStr();
  return packages.filter(pkg => {
    if (pkg.remainingSessions <= 0) return false;
    const daysSinceLast = getDaysDifference(pkg.lastSessionDate, today);
    return daysSinceLast > (pkg.sessionIntervalDays + 14);
  });
}
