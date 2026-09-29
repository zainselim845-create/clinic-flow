/**
 * Egyptian National Payment Rails (أنظمة الدفع والتحصيل القومية في مصر)
 * Integrations and validators for InstaPay, Mobile Wallets, Fawry, and Meeza.
 */

export const EGYPT_PAYMENT_METHODS = [
  {
    id: 'cash',
    nameAr: 'الدفع نقداً في العيادة (كاش)',
    nameEn: 'Cash on Arrival',
    icon: 'banknotes',
    instantConfirmation: true,
    requiresProof: false
  },
  {
    id: 'instapay',
    nameAr: 'تحويل إنستاباي اللحظي (InstaPay)',
    nameEn: 'InstaPay IPA Transfer',
    icon: 'bolt',
    instantConfirmation: true,
    requiresProof: true,
    supportsQr: true
  },
  {
    id: 'vodafone_cash',
    nameAr: 'فودافون كاش (Vodafone Cash)',
    nameEn: 'Vodafone Cash',
    icon: 'device-phone-mobile',
    prefix: '010',
    instantConfirmation: true,
    requiresProof: true
  },
  {
    id: 'orange_cash',
    nameAr: 'أورنج كاش (Orange Money)',
    nameEn: 'Orange Cash',
    icon: 'device-phone-mobile',
    prefix: '012',
    instantConfirmation: true,
    requiresProof: true
  },
  {
    id: 'etisalat_cash',
    nameAr: 'اتصالات كاش (Etisalat Cash)',
    nameEn: 'Etisalat Cash',
    icon: 'device-phone-mobile',
    prefix: '011',
    instantConfirmation: true,
    requiresProof: true
  },
  {
    id: 'we_pay',
    nameAr: 'وي باي (WE Pay)',
    nameEn: 'WE Pay',
    icon: 'device-phone-mobile',
    prefix: '015',
    instantConfirmation: true,
    requiresProof: true
  },
  {
    id: 'fawry',
    nameAr: 'فوري (Fawry)',
    nameEn: 'Fawry Pay',
    icon: 'receipt-percent',
    instantConfirmation: false,
    requiresProof: false
  },
  {
    id: 'meeza_card',
    nameAr: 'بطاقة ميزة الوطنية أو فيزا / ماستركارد',
    nameEn: 'Meeza / Debit Card (POS)',
    icon: 'credit-card',
    instantConfirmation: true,
    requiresProof: false
  }
];

/**
 * Validates Egyptian InstaPay Address (IPA)
 * e.g. "dr.ahmed@instapay", "clinicflow@instapay", or 11-digit mobile number
 * @param {string} ipa 
 * @returns {boolean}
 */
export function validateInstaPayAddress(ipa) {
  if (!ipa || typeof ipa !== 'string') return false;
  const clean = ipa.trim().toLowerCase();

  // Pattern A: username@instapay (3 to 30 alphanumeric characters before @)
  if (/^[a-z0-9._-]{3,30}@instapay$/.test(clean)) {
    return true;
  }

  // Pattern B: Registered Egyptian mobile number
  if (/^01[0125]\d{8}$/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Identifies mobile wallet provider from Egyptian phone number
 * @param {string} phone 
 * @returns {'vodafone_cash'|'orange_cash'|'etisalat_cash'|'we_pay'|null}
 */
export function identifyWalletProvider(phone) {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  let localNumber = clean;
  if (localNumber.startsWith('20')) {
    localNumber = '0' + localNumber.slice(2);
  } else if (!localNumber.startsWith('0')) {
    localNumber = '0' + localNumber;
  }

  if (!/^01[0125]\d{8}$/.test(localNumber)) {
    return null;
  }

  if (localNumber.startsWith('010')) return 'vodafone_cash';
  if (localNumber.startsWith('012')) return 'orange_cash';
  if (localNumber.startsWith('011')) return 'etisalat_cash';
  if (localNumber.startsWith('015')) return 'we_pay';

  return null;
}

/**
 * Generates an idempotent Fawry reference number (9 digits)
 * @param {string|number} bookingRef 
 * @returns {string}
 */
export function generateFawryRefCode(bookingRef = '') {
  const seed = String(bookingRef).replace(/\D/g, '') || String(Date.now());
  const hash = Math.abs(
    seed.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  );
  const nineDigits = String(hash).padStart(9, '9').slice(-9);
  return `9${nineDigits.slice(1)}`;
}

/**
 * Checks if a card number belongs to the Egyptian National Payment Card Network (Meeza)
 * Meeza Bank Identification Numbers (BINs) typically start with 507803 or 507808 or 507809
 * @param {string} cardNumber 
 * @returns {boolean}
 */
export function isMeezaCard(cardNumber) {
  if (!cardNumber) return false;
  const clean = String(cardNumber).replace(/\D/g, '');
  return clean.startsWith('5078') || clean.startsWith('9870');
}
