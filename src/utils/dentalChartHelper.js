/**
 * Dental Anatomical Charting & Periodontal Pocket Helper
 * Supports standard FDI notation, 5-surface restoration mapping (MODBL), and Perio probing.
 */

export const TOOTH_SURFACES = [
  { id: 'O', name: 'أطباقي / إطباق', short: 'O', label: 'Occlusal / Incisal' },
  { id: 'M', name: 'أنسي (أمامي)', short: 'M', label: 'Mesial' },
  { id: 'D', name: 'وحشي (خلفي)', short: 'D', label: 'Distal' },
  { id: 'B', name: 'دهليزي (خدي/شفوي)', short: 'B', label: 'Buccal / Labial' },
  { id: 'L', name: 'لساني / حنكي', short: 'L', label: 'Lingual / Palatal' }
];

export const RESTORATION_TYPES = [
  { id: 'sound', label: 'سليم (Sound)', color: '#10b981', bg: '#ecfdf5' },
  { id: 'cavity', label: 'تسوس نشط (Caries)', color: '#ef4444', bg: '#fef2f2' },
  { id: 'composite', label: 'حشو تجميلي (Composite)', color: '#06b6d4', bg: '#ecfeff' },
  { id: 'amalgam', label: 'حشو فضي (Amalgam)', color: '#64748b', bg: '#f8fafc' },
  { id: 'rct', label: 'حشو عصب (RCT)', color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'crown', label: 'تاج / طربوش (Crown)', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'implant', label: 'زرعة سنية (Implant)', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'missing', label: 'مخلوع / مفقود (Missing)', color: '#94a3b8', bg: '#f1f5f9' }
];

/**
 * Initializes default dental chart state for 32 adult teeth
 */
export function createInitialDentalChart() {
  const chart = {};
  // FDI quadrants: 11-18, 21-28, 31-38, 41-48
  const toothNumbers = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
  ];

  toothNumbers.forEach(num => {
    chart[num] = {
      toothNumber: num,
      status: 'sound',
      surfaces: {
        O: 'sound',
        M: 'sound',
        D: 'sound',
        B: 'sound',
        L: 'sound'
      },
      perio: {
        buccalPocket: 2, // mm (1-6)
        lingualPocket: 2,
        bop: false // Bleeding On Probing
      },
      notes: ''
    };
  });

  return chart;
}

/**
 * Counts statistics of affected teeth and surfaces
 */
export function calculateDentalSummary(dentalChart = {}) {
  let cavityCount = 0;
  let filledCount = 0;
  let missingCount = 0;
  let rctCount = 0;
  let crownCount = 0;
  let perioRiskCount = 0;

  Object.values(dentalChart).forEach(tooth => {
    if (tooth.status === 'missing') {
      missingCount++;
      return;
    }
    if (tooth.status === 'crown') crownCount++;
    if (tooth.status === 'rct') rctCount++;

    // Check individual surfaces
    const surfaces = Object.values(tooth.surfaces || {});
    if (surfaces.some(s => s === 'cavity') || tooth.status === 'cavity') {
      cavityCount++;
    }
    if (surfaces.some(s => s === 'composite' || s === 'amalgam')) {
      filledCount++;
    }

    // Perio evaluation: pocket depth >= 4mm or BOP indicates perio risk
    if (tooth.perio?.buccalPocket >= 4 || tooth.perio?.lingualPocket >= 4 || tooth.perio?.bop) {
      perioRiskCount++;
    }
  });

  return {
    cavityCount,
    filledCount,
    missingCount,
    rctCount,
    crownCount,
    perioRiskCount,
    dmftScore: cavityCount + missingCount + filledCount // Standard WHO Decayed-Missing-Filled index
  };
}
