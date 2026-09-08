/**
 * Flexible specialty filter matcher
 * Matches specialty filter pills (e.g. 'الأمراض الجلدية والتجميل')
 * with varied clinical specialty titles (e.g. 'استشاري الأمراض الجلدية وتجميل الليزر')
 */
export function matchesSpecialtyFilter(clinicSpecialty, selectedPill) {
  if (!selectedPill || selectedPill === 'الكل') return true;
  if (!clinicSpecialty) return false;

  const pill = selectedPill.toLowerCase().trim();
  const spec = clinicSpecialty.toLowerCase().trim();

  if (spec.includes(pill)) return true;

  // Semantic keyword mapping
  if (pill.includes('جلدية') && spec.includes('جلدية')) return true;
  if (pill.includes('أسنان') && spec.includes('أسنان')) return true;
  if (pill.includes('أطفال') && spec.includes('أطفال')) return true;
  if (pill.includes('عظام') && spec.includes('عظام')) return true;
  if (pill.includes('باطنة') && spec.includes('باطنة')) return true;
  if (pill.includes('عيون') && spec.includes('عيون')) return true;

  // Remove common prefixes
  const cleanPill = pill.replace(/^(طب وجراحة|الأمراض|جراحة)\s+/, '').trim();
  return spec.includes(cleanPill);
}
