import { describe, it, expect } from 'vitest';
import {
  EGYPT_GOVERNORATES,
  getGovernorateByCode,
  findGovernorate,
  validateNationalId,
  parseNationalId,
  calculateAgeFromBirthDate,
  validateSyndicateId,
  validatePracticeLicense,
  validateFacilityLicense,
  MEDICAL_RANKS,
  EGYPT_MEDICAL_SPECIALTIES,
  EGYPT_PAYMENT_METHODS,
  validateInstaPayAddress,
  identifyWalletProvider,
  generateFawryRefCode,
  isMeezaCard
} from '../features/egypt-national';

import {
  EgyptNationalFeature,
  AppointmentsFeature,
  PatientsFeature,
  BillingFeature,
  ClinicalFeature,
  InventoryFeature
} from '../features';

import { NationalEgyptDomain } from '../domains';

describe('Egypt National Scale & Feature-Sliced Architecture', () => {
  describe('1. Egyptian Administrative Geography (All 27 Governorates)', () => {
    it('covers all official Egyptian governorates with code mappings', () => {
      // Must include 27 governorates + abroad code (88)
      expect(EGYPT_GOVERNORATES.length).toBeGreaterThanOrEqual(27);

      const cairo = getGovernorateByCode('01');
      expect(cairo).toBeDefined();
      expect(cairo?.nameAr).toBe('القاهرة');
      expect(cairo?.dialCode).toBe('02');

      const alex = getGovernorateByCode('02');
      expect(alex?.nameAr).toBe('الإسكندرية');

      const dakahlia = getGovernorateByCode('12');
      expect(dakahlia?.nameAr).toBe('الدقهلية');
      expect(dakahlia?.regionAr).toBe('إقليم الدلتا');

      const assiut = getGovernorateByCode('25');
      expect(assiut?.nameAr).toBe('أسيوط');
      expect(assiut?.regionAr).toBe('إقليم وسط الصعيد');

      const aswan = getGovernorateByCode('28');
      expect(aswan?.nameAr).toBe('أسوان');
    });

    it('finds governorate flexibly by Arabic name or English ID', () => {
      const giza = findGovernorate('الجيزة');
      expect(giza).toBeDefined();
      expect(giza?.code).toBe('21');

      const redSea = findGovernorate('red_sea');
      expect(redSea?.nameAr).toBe('البحر الأحمر');

      expect(findGovernorate('invalid_gov')).toBeNull();
    });
  });

  describe('2. Egyptian 14-Digit National ID Validation & Demographic Engine', () => {
    it('correctly decodes a 20th-century male born in Cairo', () => {
      // 2: 1900-1999, 85: 1985, 04: April, 15: Day 15, 01: Cairo, 0123: 3 is odd (male), 5: check
      const id = '28504150101235';
      const result = parseNationalId(id);

      expect(result.isValid).toBe(true);
      expect(result.birthDate).toBe('1985-04-15');
      expect(result.birthYear).toBe(1985);
      expect(result.gender).toBe('male');
      expect(result.genderAr).toBe('ذكر');
      expect(result.isMale).toBe(true);
      expect(result.governorateCode).toBe('01');
      expect(result.governorateNameAr).toBe('القاهرة');
      expect(result.age).toBeGreaterThanOrEqual(39);
    });

    it('correctly decodes a 21st-century female born in Dakahlia', () => {
      // 3: 2000-2099, 02: 2002, 11: November, 20: Day 20, 12: Dakahlia, 0146: 4 is even (female), 7: check
      const id = '30211201201467';
      const result = parseNationalId(id);

      expect(result.isValid).toBe(true);
      expect(result.birthDate).toBe('2002-11-20');
      expect(result.birthYear).toBe(2002);
      expect(result.gender).toBe('female');
      expect(result.genderAr).toBe('أنثى');
      expect(result.isMale).toBe(false);
      expect(result.governorateCode).toBe('12');
      expect(result.governorateNameAr).toBe('الدقهلية');
    });

    it('supports Eastern Arabic numerals automatically', () => {
      const easternId = '٢٨٥٠٤١٥٠١٠١٢٣٥';
      expect(validateNationalId(easternId)).toBe(true);
      const parsed = parseNationalId(easternId);
      expect(parsed.nationalId).toBe('28504150101235');
      expect(parsed.birthYear).toBe(1985);
    });

    it('rejects invalid, malformed, or impossible National IDs', () => {
      expect(validateNationalId('12345')).toBe(false); // Too short
      expect(validateNationalId('285041501012350')).toBe(false); // Too long
      expect(validateNationalId('18504150101235')).toBe(false); // Century 1 invalid
      expect(validateNationalId('28513150101235')).toBe(false); // Month 13 invalid
      expect(validateNationalId('28504310101235')).toBe(false); // April 31 does not exist
      expect(validateNationalId('28504159901235')).toBe(false); // Governorate 99 invalid
      expect(validateNationalId('39904150101235')).toBe(false); // Future date (2099)
    });
  });

  describe('3. Egyptian Medical Syndicate & Licensing Verification', () => {
    it('validates syndicate registration IDs strictly', () => {
      expect(validateSyndicateId('14892')).toBe(true);
      expect(validateSyndicateId('182904')).toBe(true);
      expect(validateSyndicateId('12')).toBe(false); // Too short
      expect(validateSyndicateId('abc')).toBe(false);
    });

    it('validates MOHP practice license numbers', () => {
      expect(validatePracticeLicense('MOHP-48291')).toBe(true);
      expect(validatePracticeLicense('ص-19824')).toBe(true);
      expect(validatePracticeLicense('98241')).toBe(true);
      expect(validatePracticeLicense('x')).toBe(false);
    });

    it('validates private facility licenses (العلاج الحر)', () => {
      expect(validateFacilityLicense('CAI-94821')).toBe(true);
      expect(validateFacilityLicense('01/1829')).toBe(true);
      expect(validateFacilityLicense('189204')).toBe(true);
      expect(validateFacilityLicense('')).toBe(false);
    });

    it('exports official healthcare ranks and medical specialties', () => {
      expect(MEDICAL_RANKS.length).toBe(4);
      expect(EGYPT_MEDICAL_SPECIALTIES.some(s => s.id === 'dental')).toBe(true);
      expect(EGYPT_MEDICAL_SPECIALTIES.some(s => s.id === 'cardiology')).toBe(true);
    });
  });

  describe('4. Egyptian National Payment Rails (InstaPay, Wallets, Fawry, Meeza)', () => {
    it('validates InstaPay IPAs and registered mobile numbers', () => {
      expect(validateInstaPayAddress('dr.ahmed@instapay')).toBe(true);
      expect(validateInstaPayAddress('clinic_flow@instapay')).toBe(true);
      expect(validateInstaPayAddress('01012345678')).toBe(true);
      expect(validateInstaPayAddress('01198765432')).toBe(true);

      expect(validateInstaPayAddress('ahmed@gmail.com')).toBe(false);
      expect(validateInstaPayAddress('invalid')).toBe(false);
      expect(validateInstaPayAddress('')).toBe(false);
    });

    it('identifies mobile wallet providers by Egyptian phone prefixes', () => {
      expect(identifyWalletProvider('01012345678')).toBe('vodafone_cash');
      expect(identifyWalletProvider('+201012345678')).toBe('vodafone_cash');
      expect(identifyWalletProvider('01212345678')).toBe('orange_cash');
      expect(identifyWalletProvider('01112345678')).toBe('etisalat_cash');
      expect(identifyWalletProvider('01512345678')).toBe('we_pay');
      expect(identifyWalletProvider('01312345678')).toBeNull(); // Landline/invalid
    });

    it('generates an idempotent 9-digit Fawry reference code', () => {
      const code1 = generateFawryRefCode('booking-12345');
      const code2 = generateFawryRefCode('booking-12345');
      expect(code1).toHaveLength(9);
      expect(code1).toBe(code2); // Idempotent for same booking
      expect(code1.startsWith('9')).toBe(true);
    });

    it('identifies national Meeza cards by BIN', () => {
      expect(isMeezaCard('5078031234567890')).toBe(true);
      expect(isMeezaCard('5078089988776655')).toBe(true);
      expect(isMeezaCard('9870123456789012')).toBe(true);
      expect(isMeezaCard('4111111111111111')).toBe(false); // Visa
    });
  });

  describe('5. Feature Slices & Domain Gateway Barrel Architecture', () => {
    it('exports all vertical slices cleanly without import cycles', () => {
      expect(EgyptNationalFeature).toBeDefined();
      expect(EgyptNationalFeature.EGYPT_GOVERNORATES).toBeDefined();

      expect(AppointmentsFeature).toBeDefined();
      expect(typeof AppointmentsFeature.getAppointments).toBe('function');

      expect(PatientsFeature).toBeDefined();
      expect(typeof PatientsFeature.getPatients).toBe('function');
      expect(typeof PatientsFeature.parseNationalId).toBe('function');

      expect(BillingFeature).toBeDefined();
      expect(typeof BillingFeature.getInvoices).toBe('function');
      expect(typeof BillingFeature.recordJournalEntry).toBe('function');

      expect(ClinicalFeature).toBeDefined();
      expect(typeof ClinicalFeature.getPatientClinicalNotes).toBe('function');

      expect(InventoryFeature).toBeDefined();
      expect(typeof InventoryFeature.getInventoryItems).toBe('function');
    });

    it('NationalEgyptDomain is accessible from enterprise domain gateway', () => {
      expect(NationalEgyptDomain).toBeDefined();
      expect(NationalEgyptDomain.EGYPT_GOVERNORATES.length).toBeGreaterThanOrEqual(27);
      expect(typeof NationalEgyptDomain.parseNationalId).toBe('function');
    });
  });
});
