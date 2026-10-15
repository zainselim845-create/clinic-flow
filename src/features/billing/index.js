/**
 * Feature Slice: Billing & Financial Ledger (الفواتير والحسابات المالية)
 * Encapsulates patient invoicing in Egyptian Pounds (EGP), double-entry ledger, and national payment rails.
 */

export * from '@/features/billing/components';
export * from '@/features/billing/services';
export { EGYPT_PAYMENT_METHODS, validateInstaPayAddress, identifyWalletProvider, generateFawryRefCode, isMeezaCard } from '@/features/egypt-national/egyptPayments';
