/**
 * Feature Slice: Patients & Dossiers (إدارة ملفات المرضى والسجل الطبي)
 * Encapsulates patient demographic dossiers, medical alerts, chronic conditions, and visits history.
 */

export * from './components';
export * from './services';
export { parseNationalId, validateNationalId } from '../egypt-national/nationalId';
export { validateEgyptianPhone, formatEgyptianPhone } from '@/utils/phoneValidation';
