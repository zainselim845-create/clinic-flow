import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  SPACING_SCALE,
  SPACING_PX,
  SPACING_HIERARCHY,
  COMPONENT_SPACING,
  getSpacingVar,
  isValid8pxSpacing,
  getNearest8pxSpacing
} from '../lib/spacingTokens';

describe('Strict 8px Grid Spacing Token System', () => {
  const indexCssPath = path.resolve(__dirname, '../index.css');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');

  describe('1. Centralized CSS Spacing Scale (--space-0 to --space-15)', () => {
    it('defines all 16 consecutive 8px tokens in src/index.css', () => {
      for (let i = 0; i <= 15; i++) {
        const expectedPx = `${i * 8}px`;
        const expectedToken = `--space-${i}: ${expectedPx};`;
        expect(indexCss).toContain(expectedToken);
      }
    });

    it('enforces perfect mathematical multiples of 8 across the entire scale', () => {
      for (let i = 0; i <= 15; i++) {
        const tokenKey = `space-${i}`;
        const cssVal = SPACING_SCALE[tokenKey];
        const numericVal = SPACING_PX[i];

        expect(cssVal).toBe(`${i * 8}px`);
        expect(numericVal).toBe(i * 8);
        expect(numericVal % 8).toBe(0);
      }
    });

    it('defines all semantic hierarchy tokens in src/index.css', () => {
      expect(indexCss).toContain('--space-micro: var(--space-1);');
      expect(indexCss).toContain('--space-component: var(--space-2);');
      expect(indexCss).toContain('--space-subsection: var(--space-3);');
      expect(indexCss).toContain('--space-major: var(--space-4);');
      expect(indexCss).toContain('--space-page-sm: var(--space-6);');
      expect(indexCss).toContain('--space-page-md: var(--space-8);');
      expect(indexCss).toContain('--space-page-lg: var(--space-10);');
    });

    it('configures Tailwind v4 @theme spacing block with --space-* tokens', () => {
      expect(indexCss).toContain('@theme {');
      expect(indexCss).toContain('--spacing-1: var(--space-1);');
      expect(indexCss).toContain('--spacing-2: var(--space-2);');
      expect(indexCss).toContain('--spacing-3: var(--space-3);');
      expect(indexCss).toContain('--spacing-4: var(--space-4);');
      expect(indexCss).toContain('--spacing-8: var(--space-8);');
    });
  });

  describe('2. JavaScript Design Token Source of Truth (src/lib/spacingTokens.js)', () => {
    it('exports immutable SPACING_SCALE matching the 8px CSS system', () => {
      expect(Object.isFrozen(SPACING_SCALE)).toBe(true);
      expect(SPACING_SCALE['space-0']).toBe('0px');
      expect(SPACING_SCALE['space-1']).toBe('8px');
      expect(SPACING_SCALE['space-2']).toBe('16px');
      expect(SPACING_SCALE['space-3']).toBe('24px');
      expect(SPACING_SCALE['space-4']).toBe('32px');
      expect(SPACING_SCALE['space-5']).toBe('40px');
      expect(SPACING_SCALE['space-6']).toBe('48px');
      expect(SPACING_SCALE['space-8']).toBe('64px');
      expect(SPACING_SCALE['space-10']).toBe('80px');
      expect(SPACING_SCALE['space-15']).toBe('120px');
    });

    it('exports SPACING_HIERARCHY with correct semantic mappings', () => {
      expect(SPACING_HIERARCHY.MICRO).toBe('8px');
      expect(SPACING_HIERARCHY.COMPONENT).toBe('16px');
      expect(SPACING_HIERARCHY.SUBSECTION).toBe('24px');
      expect(SPACING_HIERARCHY.MAJOR).toBe('32px');
      expect(SPACING_HIERARCHY.PAGE_SM).toBe('48px');
      expect(SPACING_HIERARCHY.PAGE_MD).toBe('64px');
      expect(SPACING_HIERARCHY.PAGE_LG).toBe('80px');
    });

    it('exports COMPONENT_SPACING contracts matching strict guidelines', () => {
      // Buttons
      expect(COMPONENT_SPACING.BUTTONS.iconGap).toBe('8px');
      expect(COMPONENT_SPACING.BUTTONS.groupGap).toBe('8px');
      expect(COMPONENT_SPACING.BUTTONS.actionGroupGap).toBe('16px');

      // Inputs
      expect(COMPONENT_SPACING.INPUTS.labelGap).toBe('8px');
      expect(COMPONENT_SPACING.INPUTS.helperGap).toBe('8px');
      expect(COMPONENT_SPACING.INPUTS.fieldGap).toBe('16px');
      expect(COMPONENT_SPACING.INPUTS.sectionGap).toBe('24px');

      // Cards
      expect(COMPONENT_SPACING.CARDS.paddingSm).toBe('16px');
      expect(COMPONENT_SPACING.CARDS.paddingMd).toBe('24px');
      expect(COMPONENT_SPACING.CARDS.headerContentGap).toBe('8px');
      expect(COMPONENT_SPACING.CARDS.headerToBody).toBe('16px');
      expect(COMPONENT_SPACING.CARDS.bodySections).toBe('16px');
      expect(COMPONENT_SPACING.CARDS.bodyToFooter).toBe('24px');

      // Modals
      expect(COMPONENT_SPACING.MODALS.padding).toBe('24px');
      expect(COMPONENT_SPACING.MODALS.headerToBody).toBe('16px');
      expect(COMPONENT_SPACING.MODALS.bodyToActions).toBe('24px');
      expect(COMPONENT_SPACING.MODALS.actionsGap).toBe('8px');

      // Navigation
      expect(COMPONENT_SPACING.NAVIGATION.iconToLabel).toBe('8px');

      // Tables
      expect(COMPONENT_SPACING.TABLES.cellVertical).toBe('8px');
      expect(COMPONENT_SPACING.TABLES.cellHorizontal).toBe('16px');
      expect(COMPONENT_SPACING.TABLES.actionGroupGap).toBe('8px');

      // Dashboards
      expect(COMPONENT_SPACING.DASHBOARDS.pageHeaderToPrimary).toBe('32px');
      expect(COMPONENT_SPACING.DASHBOARDS.primaryToSecondary).toBe('24px');
      expect(COMPONENT_SPACING.DASHBOARDS.secondaryToSupporting).toBe('32px');
      expect(COMPONENT_SPACING.DASHBOARDS.gridGap).toBe('24px');

      // Toasts
      expect(COMPONENT_SPACING.TOASTS.containerPadding).toBe('16px');
      expect(COMPONENT_SPACING.TOASTS.iconToContent).toBe('8px');
      expect(COMPONENT_SPACING.TOASTS.toastToToast).toBe('8px');
    });

    it('provides utility functions for dynamic CSS variable generation and 8px validation', () => {
      expect(getSpacingVar(0)).toBe('var(--space-0)');
      expect(getSpacingVar(2)).toBe('var(--space-2)');
      expect(getSpacingVar(5)).toBe('var(--space-5)');
      expect(getSpacingVar(12)).toBe('var(--space-12)');

      expect(isValid8pxSpacing(0)).toBe(true);
      expect(isValid8pxSpacing(8)).toBe(true);
      expect(isValid8pxSpacing(16)).toBe(true);
      expect(isValid8pxSpacing(24)).toBe(true);
      expect(isValid8pxSpacing(32)).toBe(true);
      expect(isValid8pxSpacing(15)).toBe(false);
      expect(isValid8pxSpacing(23)).toBe(false);
      expect(isValid8pxSpacing(-8)).toBe(false);

      expect(getNearest8pxSpacing(15)).toBe(16);
      expect(getNearest8pxSpacing(23)).toBe(24);
      expect(getNearest8pxSpacing(28)).toBe(32);
      expect(getNearest8pxSpacing(7)).toBe(8);
      expect(getNearest8pxSpacing(3)).toBe(0);
    });
  });

  describe('3. Component Architecture & CSS Geometry Integrity', () => {
    it('verifies buttons, inputs, and modal components in index.css use tokenized spacing', () => {
      expect(indexCss).toContain('gap: var(--space-1);');
      expect(indexCss).toContain('padding: var(--space-1) var(--space-2);');
      expect(indexCss).toContain('min-height: var(--space-5);');
      expect(indexCss).toContain('margin-bottom: var(--space-2);');
      expect(indexCss).toContain('padding: var(--space-3);');
    });

    it('verifies ark-ui.css and Modal.css do not contain ad-hoc 1.75rem (28px)', () => {
      const arkUiCss = fs.readFileSync(path.resolve(__dirname, '../components/ui/ark-ui.css'), 'utf8');
      const modalCss = fs.readFileSync(path.resolve(__dirname, '../components/Modal.css'), 'utf8');

      expect(arkUiCss).not.toContain('padding: 1.75rem;');
      expect(modalCss).not.toContain('padding: 1.75rem;');
      expect(arkUiCss).toContain('padding: var(--space-3);');
      expect(modalCss).toContain('padding: var(--space-3);');
    });
  });
});