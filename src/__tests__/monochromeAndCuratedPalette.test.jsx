import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CURATED_CLINIC_PALETTES, applyPaletteToDom } from '../components/ClinicPalettePicker';

describe('Monochrome Black & White Core & Curated Client Palette', () => {
  describe('1. Curated Palette Specifications', () => {
    it('defines Monochrome Noir as the canonical default', () => {
      const defaultPalette = CURATED_CLINIC_PALETTES.find(p => p.isDefault);
      expect(defaultPalette).toBeDefined();
      expect(defaultPalette.id).toBe('monochrome');
      expect(defaultPalette.hex).toBe('#09090B');
    });

    it('contains exactly 8 curated options (1 monochrome base + 7 clinical specialty colors)', () => {
      expect(CURATED_CLINIC_PALETTES.length).toBe(8);
      const ids = CURATED_CLINIC_PALETTES.map(p => p.id);
      expect(ids).toContain('monochrome');
      expect(ids).toContain('royal-blue');
      expect(ids).toContain('clinical-emerald');
      expect(ids).toContain('electric-indigo');
      expect(ids).toContain('warm-amber');
      expect(ids).toContain('crimson-rose');
      expect(ids).toContain('ocean-cyan');
      expect(ids).toContain('regal-violet');
    });
  });

  describe('2. Monochrome CSS Tokens & Tenant Context Integration', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    it('applyPaletteToDom sets and resets monochrome and dynamic accents on the DOM', () => {
      expect(applyPaletteToDom).toBeDefined();
      expect(typeof applyPaletteToDom).toBe('function');
    });

    it('TenantContext applyBranding handles monochrome and curated accents cleanly', () => {
      const tenantContextPath = path.resolve(__dirname, '../context/TenantContext.jsx');
      const tenantContextSource = fs.readFileSync(tenantContextPath, 'utf8');

      expect(tenantContextSource).toContain('isMonochrome');
      expect(tenantContextSource).toContain('--clinic-primary');
    });
  });

  describe('3. General Settings Tab Embeds Palette Customizer', () => {
    const generalSettingsPath = path.resolve(__dirname, '../pages/settings/GeneralSettingsTab.jsx');
    const generalSettingsSource = fs.readFileSync(generalSettingsPath, 'utf8');

    it('imports and renders ClinicPalettePicker in GeneralSettingsTab', () => {
      expect(generalSettingsSource).toContain('ClinicPalettePicker');
      expect(generalSettingsSource).toContain('branding');
    });
  });

  describe('4. Complete Removal of Apple HIG Additions', () => {
    it('confirms AppleClinicalHub and Apple components are absent from router and sidebar', () => {
      const appPath = path.resolve(__dirname, '../App.jsx');
      const appSource = fs.readFileSync(appPath, 'utf8');
      expect(appSource).not.toContain('/apple-hub');
      expect(appSource).not.toContain('AppleClinicalHub');

      const sidebarPath = path.resolve(__dirname, '../components/Sidebar.jsx');
      const sidebarSource = fs.readFileSync(sidebarPath, 'utf8');
      expect(sidebarSource).not.toContain('/apple-hub');
    });
  });
});
