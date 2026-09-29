/**
 * Egypt National Scale Feature Slice (نظام الهوية والخدمات القومية لجمهورية مصر العربية)
 * Bounded Context: All 27 Governorates, 14-digit National ID validation,
 * Medical Syndicate licensing, and National Payment Rails (InstaPay, Wallets, Fawry, Meeza).
 */

export * from './governorates';
export * from './nationalId';
export * from './syndicateVerification';
export * from './egyptPayments';
