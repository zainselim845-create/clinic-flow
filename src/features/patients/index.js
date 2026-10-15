/**
 * Feature Slice: Patients & Dossiers (إدارة ملفات المرضى والسجل الطبي)
 * Encapsulates patient demographic dossiers, medical alerts, chronic conditions, and visits history.
 */

export * from '@/features/patients/components';
export * from '@/features/patients/services';
export { parseNationalId, validateNationalId } from '@/features/egypt-national/nationalId';
export { validateEgyptianPhone, formatEgyptianPhone } from '@/utils/phoneValidation';
