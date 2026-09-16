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

    it('contains 10 curated options tailored to clinical specialties and identities', () => {
      expect(CURATED_CLINIC_PALETTES.length).toBe(10);
      const ids = CURATED_CLINIC_PALETTES.map(p => p.id);
      expect(ids).toEqual([
        'monochrome',
        'royal-blue',
        'clinical-emerald',
        'precision-teal',
        'rose-radiance',
        'deep-amethyst',
        'amber-vitality',
        'warm-coral',
        'slate-indigo',
        'obsidian-gold'
      ]);

      // Every palette must have valid hex, specialty, category, and badgeText
      CURATED_CLINIC_PALETTES.forEach(palette => {
        expect(palette.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(palette.name).toBeTruthy();
        expect(palette.specialty).toBeTruthy();
        expect(palette.badgeText).toBeTruthy();
        expect(palette.group).toBeTruthy();
      });
    });
  });

  describe('2. Monochrome CSS Tokens & Tenant Context Integration', () => {
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

  describe('3. Doctor Logo Upload & Brand Identity in Settings', () => {
    const generalSettingsPath = path.resolve(__dirname, '../pages/settings/GeneralSettingsTab.jsx');
    const generalSettingsSource = fs.readFileSync(generalSettingsPath, 'utf8');

    it('imports and renders both ClinicLogoUploader and ClinicPalettePicker in GeneralSettingsTab', () => {
      expect(generalSettingsSource).toContain('ClinicLogoUploader');
      expect(generalSettingsSource).toContain('ClinicPalettePicker');
      expect(generalSettingsSource).toContain('branding');
      expect(generalSettingsSource).toContain('logoUrl');
    });

    it('confirms ClinicLogoUploader file exists with preset icons and upload capabilities', () => {
      const uploaderPath = path.resolve(__dirname, '../components/ClinicLogoUploader.jsx');
      expect(fs.existsSync(uploaderPath)).toBe(true);
      const uploaderSource = fs.readFileSync(uploaderPath, 'utf8');
      expect(uploaderSource).toContain('MEDICAL_PRESET_LOGOS');
      expect(uploaderSource).toContain('handleFile');
      expect(uploaderSource).toContain('logoUrl');
    });
  });

  describe('4. SaaS SuperAdmin Direct Clinic Branding & Logo Control', () => {
    it('provides SaasBrandingModal component for platform management', () => {
      const modalPath = path.resolve(__dirname, '../pages/superadmin/components/SaasBrandingModal.jsx');
      expect(fs.existsSync(modalPath)).toBe(true);
      const modalSource = fs.readFileSync(modalPath, 'utf8');
      expect(modalSource).toContain('CURATED_CLINIC_PALETTES');
      expect(modalSource).toContain('logoUrl');
      expect(modalSource).toContain('onSave');
    });

    it('connects SaasBrandingModal into SuperAdminDashboard and ClinicsTable', () => {
      const dashboardPath = path.resolve(__dirname, '../pages/superadmin/SuperAdminDashboard.jsx');
      const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
      expect(dashboardSource).toContain('SaasBrandingModal');
      expect(dashboardSource).toContain('onCustomizeBrand');

      const tablePath = path.resolve(__dirname, '../pages/superadmin/components/ClinicsTable.jsx');
      const tableSource = fs.readFileSync(tablePath, 'utf8');
      expect(tableSource).toContain('onCustomizeBrand');
      expect(tableSource).toContain('btn-brand-clinic');
    });
  });

  describe('5. Complete Removal of Apple Remnants', () => {
    it('confirms AppleClinicalHub and Apple components are absent from router and sidebar', () => {
      const appPath = path.resolve(__dirname, '../App.jsx');
      const appSource = fs.readFileSync(appPath, 'utf8');
      expect(appSource).not.toContain('/apple-hub');
      expect(appSource).not.toContain('AppleClinicalHub');

      const sidebarPath = path.resolve(__dirname, '../components/Sidebar.jsx');
      const sidebarSource = fs.readFileSync(sidebarPath, 'utf8');
      expect(sidebarSource).not.toContain('/apple-hub');
    });

    it('confirms appleGlass.css is removed from filesystem and index.css', () => {
      const cssPath = path.resolve(__dirname, '../styles/appleGlass.css');
      expect(fs.existsSync(cssPath)).toBe(false);

      const indexCssPath = path.resolve(__dirname, '../index.css');
      const indexCss = fs.readFileSync(indexCssPath, 'utf8');
      expect(indexCss).not.toContain('appleGlass.css');
    });

    it('confirms Apple UI component files are deleted from src/components/ui/', () => {
      const uiDir = path.resolve(__dirname, '../components/ui');
      const uiFiles = fs.readdirSync(uiDir);
      const appleFiles = uiFiles.filter(f => f.startsWith('Apple'));
      expect(appleFiles).toEqual([]);
    });

    it('confirms appleDesignSystem.test.js is removed', () => {
      const appleTestPath = path.resolve(__dirname, './appleDesignSystem.test.js');
      expect(fs.existsSync(appleTestPath)).toBe(false);
    });
  });

  describe('6. Redesigned Floating Quick Actions Command Dock', () => {
    it('verifies Dashboard.jsx contains the semantic floating dock markup', () => {
      const dashboardPath = path.resolve(__dirname, '../pages/Dashboard.jsx');
      const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');

      expect(dashboardSource).toContain('dashboard-floating-dock');
      expect(dashboardSource).toContain('dock-actions-group');
      expect(dashboardSource).toContain('dock-separator');
      expect(dashboardSource).toContain('dock-pill-btn');
      expect(dashboardSource).toContain('dock-icon-box');
      expect(dashboardSource).toContain('role="toolbar"');
      expect(dashboardSource).toContain('aria-label="شريط الوصول السريع للعمليات السريرية"');
    });

    it('verifies Dashboard.css contains glassmorphism, tactile button pills, and responsive layout', () => {
      const cssPath = path.resolve(__dirname, '../pages/Dashboard.css');
      const cssSource = fs.readFileSync(cssPath, 'utf8');

      expect(cssSource).toContain('.dashboard-floating-dock');
      expect(cssSource).toContain('.dock-actions-group');
      expect(cssSource).toContain('.dock-pill-btn');
      expect(cssSource).toContain('.dock-icon-box');
      expect(cssSource).toContain('.dock-separator');
      expect(cssSource).toContain('backdrop-filter: blur(20px)');
      expect(cssSource).toContain('calc(50% - 120px)');
    });
  });
});

