/**
 * Egyptian 14-Digit National ID (الرقم القومي المصري)
 * Validation, demographic decoding, and civil registry mapping engine.
 */

import { getGovernorateByCode } from './governorates';

/**
 * Checks if a given year is a leap year in the Gregorian calendar
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Validates days in a specific month and year
 */
function isValidDate(year, month, day) {
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonths[month - 1];
}

/**
 * Computes exact chronological age from an ISO date string (YYYY-MM-DD)
 */
export function calculateAgeFromBirthDate(birthDateStr) {
  if (!birthDateStr) return 0;
  const birth = new Date(birthDateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Validates Egyptian 14-Digit National ID format and demographic components
 * @param {string} nationalId 
 * @returns {boolean}
 */
export function validateNationalId(nationalId) {
  const result = parseNationalId(nationalId);
  return result.isValid;
}

/**
 * Parses and decodes complete demographics from Egyptian National ID
 * 
 * Anatomy of Egyptian 14-digit National ID:
 * - Digit 1: Century (2 = 1900-1999, 3 = 2000-2099)
 * - Digits 2-3: Birth Year (YY)
 * - Digits 4-5: Birth Month (MM: 01-12)
 * - Digits 6-7: Birth Day (DD: 01-31)
 * - Digits 8-9: Governorate of Birth Code (01-35, 88)
 * - Digits 10-13: Sequence Number (Digit 13: Odd = Male, Even = Female)
 * - Digit 14: Verification Check Digit
 * 
 * @param {string} rawId - 14-digit National ID
 * @returns {Object} Decoded patient demographics
 */
export function parseNationalId(rawId) {
  if (!rawId) {
    return { isValid: false, error: 'الرقم القومي مطلوب' };
  }

  // Convert Arabic/Eastern numbers to Western digits and trim
  const cleanId = String(rawId)
    .trim()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

  if (!/^\d{14}$/.test(cleanId)) {
    return {
      isValid: false,
      error: 'الرقم القومي يجب أن يتكون من 14 رقماً بالضبط',
      nationalId: cleanId
    };
  }

  // 1. Century & Year
  const centuryDigit = parseInt(cleanId[0], 10);
  let centuryYear = 0;
  if (centuryDigit === 2) {
    centuryYear = 1900;
  } else if (centuryDigit === 3) {
    centuryYear = 2000;
  } else {
    return {
      isValid: false,
      error: 'خانة القرن الأولى غير صالحة (يجب أن تبدأ بـ 2 لمواليد 1900-1999 أو 3 لمواليد 2000 فما فوق)',
      nationalId: cleanId
    };
  }

  const birthYear = centuryYear + parseInt(cleanId.slice(1, 3), 10);
  const birthMonth = parseInt(cleanId.slice(3, 5), 10);
  const birthDay = parseInt(cleanId.slice(5, 7), 10);

  // 2. Date verification
  if (!isValidDate(birthYear, birthMonth, birthDay)) {
    return {
      isValid: false,
      error: `تاريخ الميلاد المستخرج (${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}) غير حقيقي أو غير صالح في التقويم`,
      nationalId: cleanId
    };
  }

  const birthDateStr = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  const now = new Date();
  const birthDateObj = new Date(birthDateStr);
  if (birthDateObj > now) {
    return {
      isValid: false,
      error: 'تاريخ الميلاد المستخرج يقع في المستقبل وغير منطقي',
      nationalId: cleanId
    };
  }

  // 3. Governorate Code
  const govCode = cleanId.slice(7, 9);
  const governorate = getGovernorateByCode(govCode);
  if (!governorate) {
    return {
      isValid: false,
      error: `كود محافظة الميلاد (${govCode}) غير مسجل في السجل المدني المصري`,
      nationalId: cleanId
    };
  }

  // 4. Gender (Digit 13: Odd = Male, Even = Female)
  const genderDigit = parseInt(cleanId[12], 10);
  const isMale = genderDigit % 2 !== 0;
  const gender = isMale ? 'male' : 'female';
  const genderAr = isMale ? 'ذكر' : 'أنثى';

  // 5. Age
  const age = calculateAgeFromBirthDate(birthDateStr);

  return {
    isValid: true,
    nationalId: cleanId,
    birthDate: birthDateStr,
    birthYear,
    birthMonth,
    birthDay,
    age,
    gender,
    genderAr,
    isMale,
    governorateCode: govCode,
    governorateNameAr: governorate.nameAr,
    governorateNameEn: governorate.nameEn,
    governorateRegionAr: governorate.regionAr,
    governorate
  };
}
