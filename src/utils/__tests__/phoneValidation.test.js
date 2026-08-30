import { describe, it, expect } from 'vitest';
import { validateEgyptianPhone, normalizeArabicNumerals, cleanEgyptianPhone } from '../phoneValidation';

describe('Egyptian Phone Number Validation & Normalization', () => {
  it.each([
    ['01011112222', true, 'Vodafone Egypt prefix 010'],
    ['01122223333', true, 'Etisalat Egypt prefix 011'],
    ['01233334444', true, 'Orange Egypt prefix 012'],
    ['01544445555', true, 'WE Egypt prefix 015'],
    ['010-0628-5031', true, 'Formatted Egyptian phone with hyphens'],
    [' 01011112222 ', true, 'Phone with surrounding whitespace'],
    ['٠١٠٠٦٢٨٥٠٣١', true, 'Eastern Arabic numerals ٠١٠'],
    ['+201006285031', true, 'International format with +20'],
    ['201006285031', true, 'International format without +']
  ])('accepts valid phone %s (%s)', (phoneInput, expected) => {
    expect(validateEgyptianPhone(phoneInput)).toBe(expected);
  });

  it.each([
    ['01311112222', false, 'Invalid prefix 013'],
    ['01411112222', false, 'Invalid prefix 014'],
    ['0101111222', false, 'Too short (10 digits)'],
    ['010111122223', false, 'Too long (12 digits)'],
    ['02233334444', false, 'Landline prefix 02'],
    ['abcdefghijk', false, 'Alphabetical characters'],
    ['', false, 'Empty string'],
    [null, false, 'Null value']
  ])('rejects invalid phone %s (%s)', (phoneInput, expected) => {
    expect(validateEgyptianPhone(phoneInput)).toBe(expected);
  });

  it('normalizes Eastern Arabic numerals to standard ASCII digits', () => {
    expect(normalizeArabicNumerals('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(cleanEgyptianPhone('٠١٠-٠٦٢٨-٥٠٣١')).toBe('01006285031');
  });
});
