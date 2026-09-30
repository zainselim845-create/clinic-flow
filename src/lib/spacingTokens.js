/**
 * SPACING TOKEN SYSTEM — 8px Grid Strict Design System
 * 
 * Single source of truth for all spacing tokens, scale hierarchies,
 * component contracts, and geometry constraints across ClinicFlow.
 */

// 1. Centralized 8px Scale Tokens (CSS variable strings)
export const SPACING_SCALE = Object.freeze({
  'space-0': '0px',
  'space-1': '8px',
  'space-2': '16px',
  'space-3': '24px',
  'space-4': '32px',
  'space-5': '40px',
  'space-6': '48px',
  'space-7': '56px',
  'space-8': '64px',
  'space-9': '72px',
  'space-10': '80px',
  'space-11': '88px',
  'space-12': '96px',
  'space-13': '104px',
  'space-14': '112px',
  'space-15': '120px'
});

// 2. Numeric Pixel Values for Calculations, Canvas & Charts
export const SPACING_PX = Object.freeze({
  0: 0,
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
  9: 72,
  10: 80,
  11: 88,
  12: 96,
  13: 104,
  14: 112,
  15: 120
});

// 3. Spacing Hierarchy Definitions
export const SPACING_HIERARCHY = Object.freeze({
  // Micro spacing (8px): icon <-> label, label <-> input, checkbox <-> text
  MICRO: SPACING_SCALE['space-1'],
  // Component spacing (16px): input groups, button groups, card internal content
  COMPONENT: SPACING_SCALE['space-2'],
  // Subsection spacing (24px): related content groups, card sections, toolbar sections
  SUBSECTION: SPACING_SCALE['space-3'],
  // Major component spacing (32px): major card separation, dashboard blocks
  MAJOR: SPACING_SCALE['space-4'],
  // Page-level spacing (48px / 64px / 80px): page sections, hero transitions
  PAGE_SM: SPACING_SCALE['space-6'],
  PAGE_MD: SPACING_SCALE['space-8'],
  PAGE_LG: SPACING_SCALE['space-10']
});

// 4. Strict Component Spacing Model Contracts
export const COMPONENT_SPACING = Object.freeze({
  BUTTONS: Object.freeze({
    iconGap: SPACING_SCALE['space-1'],        // 8px: icon <-> label
    groupGap: SPACING_SCALE['space-1'],       // 8px: button <-> button
    actionGroupGap: SPACING_SCALE['space-2'], // 16px: action group <-> action group
    sectionSeparation: SPACING_SCALE['space-3'] // 24px: button-to-section
  }),
  INPUTS: Object.freeze({
    labelGap: SPACING_SCALE['space-1'],       // 8px: label -> control
    helperGap: SPACING_SCALE['space-1'],      // 8px: control -> helper/error
    fieldGap: SPACING_SCALE['space-2'],       // 16px: field -> field
    sectionGap: SPACING_SCALE['space-3']      // 24px: form section -> form section
  }),
  CARDS: Object.freeze({
    paddingSm: SPACING_SCALE['space-2'],      // 16px
    paddingMd: SPACING_SCALE['space-3'],      // 24px: standard card padding
    paddingLg: SPACING_SCALE['space-4'],      // 32px: hero cards
    headerContentGap: SPACING_SCALE['space-1'], // 8px
    headerToBody: SPACING_SCALE['space-2'],   // 16px
    bodySections: SPACING_SCALE['space-2'],   // 16px
    bodyToFooter: SPACING_SCALE['space-3'],   // 24px
    cardToCard: SPACING_SCALE['space-3']      // 24px
  }),
  MODALS: Object.freeze({
    padding: SPACING_SCALE['space-3'],        // 24px standard modal edge padding
    headerToBody: SPACING_SCALE['space-2'],   // 16px
    bodyToActions: SPACING_SCALE['space-3'],  // 24px
    actionsGap: SPACING_SCALE['space-1']      // 8px
  }),
  NAVIGATION: Object.freeze({
    iconToLabel: SPACING_SCALE['space-1'],    // 8px
    sectionSeparation: SPACING_SCALE['space-3'] // 24px
  }),
  TABLES: Object.freeze({
    cellVertical: SPACING_SCALE['space-1'],   // 8px
    cellHorizontal: SPACING_SCALE['space-2'], // 16px
    actionGroupGap: SPACING_SCALE['space-1'], // 8px
    toolbarGap: SPACING_SCALE['space-2']      // 16px
  }),
  DASHBOARDS: Object.freeze({
    pageHeaderToPrimary: SPACING_SCALE['space-4'],   // 32px
    primaryToSecondary: SPACING_SCALE['space-3'],    // 24px
    secondaryToSupporting: SPACING_SCALE['space-4'], // 32px
    gridGap: SPACING_SCALE['space-3']                // 24px
  }),
  TOOLTIPS: Object.freeze({
    triggerGap: SPACING_SCALE['space-1'],     // 8px
    padding: SPACING_SCALE['space-1']         // 8px
  }),
  TOASTS: Object.freeze({
    containerPadding: SPACING_SCALE['space-2'], // 16px
    iconToContent: SPACING_SCALE['space-1'],    // 8px
    contentSections: SPACING_SCALE['space-1'],  // 8px
    toastToToast: SPACING_SCALE['space-1']      // 8px
  })
});

/**
 * Returns the CSS variable string for an 8px spacing token index (0 to 15).
 * @param {number} step - Index between 0 and 15
 * @returns {string} e.g. "var(--space-2)"
 */
export function getSpacingVar(step) {
  if (step < 0 || step > 15 || !Number.isInteger(step)) {
    console.warn(`[SpacingTokens] Invalid spacing step: ${step}. Expected integer between 0 and 15.`);
    return 'var(--space-2)';
  }
  return `var(--space-${step})`;
}

/**
 * Validates whether a given pixel value conforms strictly to the 8px grid.
 * @param {number} pixels - Pixel numeric value
 * @returns {boolean} True if pixels is a multiple of 8, false otherwise
 */
export function isValid8pxSpacing(pixels) {
  if (typeof pixels !== 'number' || isNaN(pixels) || pixels < 0) {
    return false;
  }
  return pixels % 8 === 0;
}

/**
 * Snaps any pixel value to the nearest 8px grid step.
 * @param {number} pixels - Numeric pixel value
 * @returns {number} Snapped multiple of 8
 */
export function getNearest8pxSpacing(pixels) {
  if (typeof pixels !== 'number' || isNaN(pixels) || pixels <= 0) return 0;
  return Math.round(pixels / 8) * 8;
}
