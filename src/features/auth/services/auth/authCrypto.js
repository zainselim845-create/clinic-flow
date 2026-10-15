import { computeSha256 } from '@/features/auth/services/auditLoggerService';

export function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  return `sha256:${computeSha256(plainPassword)}`;
}

export function verifyPassword(inputPassword, storedPasswordOrHash) {
  if (!inputPassword || !storedPasswordOrHash) return false;
  if (typeof storedPasswordOrHash === 'string' && storedPasswordOrHash.startsWith('sha256:')) {
    return `sha256:${computeSha256(inputPassword)}` === storedPasswordOrHash;
  }
  return inputPassword === storedPasswordOrHash;
}

export function slugifyClinic(name, specialty = '') {
  if (!name) return 'clinic-' + Date.now();
  
  // Clean special characters
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A\s-]/g, '')
    .replace(/\s+/g, '-');

  // If pure Arabic or special, generate hybrid slug
  if (!clean || clean.length < 2 || !/[a-zA-Z0-9]/.test(clean)) {
    const specTag = specialty.includes('جلدية') ? 'derma' : specialty.includes('أسنان') ? 'dental' : 'clinic';
    return `${specTag}-${Date.now().toString(36)}`;
  }

  return clean;
}
