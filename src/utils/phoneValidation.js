/**
 * Egyptian phone number validation and normalization utility.
 * Supports standard ASCII digits and Eastern Arabic numerals (٠-٩).
 * Validates Egyptian mobile networks: Vodafone (010), Etisalat (011), Orange (012), WE (015).
 */

/**
 * Converts Eastern Arabic numerals (٠-٩) and Persian numerals (۰-۹) to standard ASCII (0-9).
 * @param {string} str - Raw string possibly containing Arabic digits
 * @returns {string} Normalized string with ASCII digits
 */
export const normalizeArabicNumerals = (str) => {
  if (!str || typeof str !== 'string') return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(arabicDigits[i], String(i)).replaceAll(persianDigits[i], String(i));
  }
  return result;
};

/**
 * Extracts and normalizes Egyptian phone digits into standard 11-digit format (01xxxxxxxxx).
 * @param {string|null|undefined} phone - Raw input
 * @returns {string} 11-digit clean phone string or cleaned numbers
 */
export const cleanEgyptianPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const normalized = normalizeArabicNumerals(phone);
  let digits = normalized.replace(/\D/g, '');
  // If formatted as +201xxxxxxxxx or 201xxxxxxxxx, convert to 01xxxxxxxxx
  if (digits.startsWith('201') && digits.length === 12) {
    digits = '0' + digits.slice(2);
  }
  return digits;
};

/**
 * Validates whether a given phone string is a valid Egyptian mobile number.
 * @param {string|null|undefined} phone - Raw phone input
 * @returns {boolean} true if valid 11-digit Egyptian mobile number
 */
export const validateEgyptianPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleanDigits = cleanEgyptianPhone(phone);
  const egPhoneRegex = /^01[0125][0-9]{8}$/;
  return egPhoneRegex.test(cleanDigits);
};
