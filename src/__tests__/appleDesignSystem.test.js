import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as AppleUI from '../components/ui';

describe('Apple Human Interface & Advanced Glassmorphism Design System', () => {
  describe('1. Apple CSS Tokens & Physics Architecture', () => {
    const cssPath = path.resolve(__dirname, '../styles/appleGlass.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    it('contains all 9 canonical Apple system accents', () => {
      expect(css).toContain('--apple-blue: #007AFF;');
      expect(css).toContain('--apple-purple: #AF52DE;');
      expect(css).toContain('--apple-pink: #FF2D55;');
      expect(css).toContain('--apple-red: #FF3B30;');
      expect(css).toContain('--apple-orange: #FF9500;');
      expect(css).toContain('--apple-yellow: #FFCC00;');
      expect(css).toContain('--apple-green: #34C759;');
      expect(css).toContain('--apple-teal: #5AC8FA;');
      expect(css).toContain('--apple-indigo: #5856D6;');
    });

    it('contains dark mode system accents and backgrounds', () => {
      expect(css).toContain('--apple-blue: #0A84FF;');
      expect(css).toContain('--apple-green: #30D158;');
      expect(css).toContain('--apple-bg-primary: #000000;');
      expect(css).toContain('--apple-bg-secondary: #1C1C1E;');
      expect(css).toContain('--apple-bg-tertiary: #2C2C2E;');
      expect(css).toContain('--apple-separator: #38383A;');
    });

    it('contains exact light mode Apple HIG background and separator tokens', () => {
      expect(css).toContain('--apple-bg-primary: #F2F2F7;');
      expect(css).toContain('--apple-bg-secondary: #FFFFFF;');
      expect(css).toContain('--apple-bg-tertiary: #E5E5EA;');
      expect(css).toContain('--apple-separator: #C6C6C8;');
      expect(css).toContain('--apple-text-secondary: #8E8E93;');
    });

    it('implements the Apple SF Pro typography scale and tracking', () => {
      // Large Title (34px, Bold, tracking: -0.02em)
      expect(css).toContain('.apple-large-title');
      expect(css).toContain('font-size: 34px;');
      expect(css).toContain('letter-spacing: -0.02em;');

      // Title 1, 2, 3
      expect(css).toContain('.apple-title-1');
      expect(css).toContain('font-size: 28px;');
      expect(css).toContain('.apple-title-2');
      expect(css).toContain('font-size: 22px;');
      expect(css).toContain('.apple-title-3');
      expect(css).toContain('font-size: 20px;');

      // Headline (17px Semibold) & Body (17px Regular)
      expect(css).toContain('.apple-headline');
      expect(css).toContain('font-size: 17px;');
      expect(css).toContain('.apple-body');

      // Subhead, Footnote, Captions with #8E8E93
      expect(css).toContain('.apple-subhead');
      expect(css).toContain('font-size: 15px;');
      expect(css).toContain('.apple-footnote');
      expect(css).toContain('font-size: 13px;');
      expect(css).toContain('.apple-caption-1');
      expect(css).toContain('font-size: 12px;');
      expect(css).toContain('.apple-caption-2');
      expect(css).toContain('font-size: 11px;');
    });

    it('defines 0.5px Apple separators and indented dividers', () => {
      expect(css).toContain('.apple-separator');
      expect(css).toContain('height: 0.5px;');
      expect(css).toContain('.apple-separator-indented');
      expect(css).toContain('margin-inline-start: 3.5rem;');
    });

    it('implements Apple Materials and Frosted Glass hierarchy', () => {
      // Top Nav Bar
      expect(css).toContain('.apple-nav-bar');
      expect(css).toContain('backdrop-filter: blur(20px) saturate(180%)');

      // Bottom Tab Bar (83px height, 34px bottom inset)
      expect(css).toContain('.apple-tab-bar');
      expect(css).toContain('height: 83px;');
      expect(css).toContain('padding-bottom: 34px;');

      // Inset Grouped Solid Card Surface
      expect(css).toContain('.apple-inset-card');
      expect(css).toContain('.apple-squircle-icon');
    });

    it('implements Apple Button Prominent and Tinted and Touch Press feedback', () => {
      expect(css).toContain('.apple-btn-prominent');
      expect(css).toContain('transform: scale(0.97);');
      expect(css).toContain('.apple-btn-tinted');
      expect(css).toContain('.apple-btn-plain');
      expect(css).toContain('.apple-sheet-grabber');
      expect(css).toContain('width: 36px;');
      expect(css).toContain('height: 5px;');
    });

    it('implements the 5-layer optical refraction physics for Apple Regular Glass', () => {
      // 1. Specular highlight inset
      expect(css).toContain('inset 0 1px 1px 0');
      // 2. Edge border
      expect(css).toContain('border: 1px solid rgba(255, 255, 255, 0.40);');
      // 3. Tint fill
      expect(css).toContain('background: rgba(255, 255, 255, 0.65);');
      // 4. Optical Refraction & Saturation
      expect(css).toContain('backdrop-filter: blur(24px) saturate(190%);');
      // 5. Ambient drop shadow
      expect(css).toContain('0 10px 30px -10px rgba(0, 0, 0, 0.08)');
    });

    it('supports all 5 Apple Material Tiers', () => {
      // Ultra Thin (12px blur, 160% saturate)
      expect(css).toContain('.apple-glass-ultra-thin');
      expect(css).toContain('blur(12px) saturate(160%)');

      // Thin / Subtle (18px blur, 180% saturate)
      expect(css).toContain('.apple-glass-thin');
      expect(css).toContain('blur(18px) saturate(180%)');

      // Regular (24px blur, 190% saturate)
      expect(css).toContain('.apple-glass-regular');
      expect(css).toContain('blur(24px) saturate(190%)');

      // Thick (32px blur, 200% saturate)
      expect(css).toContain('.apple-glass-thick');
      expect(css).toContain('blur(32px) saturate(200%)');

      // visionOS Spatial & Dock (40px blur, 210% saturate)
      expect(css).toContain('.apple-glass-spatial');
      expect(css).toContain('.apple-dock');
      expect(css).toContain('blur(40px) saturate(210%)');
    });

    it('contains Apple spring curves and squircle continuous corners', () => {
      expect(css).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
      expect(css).toContain('--squircle-sm: 16px;');
      expect(css).toContain('--squircle-md: 20px;');
      expect(css).toContain('--squircle-lg: 28px;');
      expect(css).toContain('--squircle-xl: 32px;');
      expect(css).toContain('.apple-sheen-overlay');
    });

    it('index.css imports appleGlass.css cleanly', () => {
      const indexCssPath = path.resolve(__dirname, '../index.css');
      const indexCss = fs.readFileSync(indexCssPath, 'utf8');
      expect(indexCss).toContain('@import "./styles/appleGlass.css";');
    });
  });

  describe('2. Component Library Integrity', () => {
    it('exports AppleGlassCard with valid React component', () => {
      expect(AppleUI.AppleGlassCard).toBeDefined();
      expect(typeof AppleUI.AppleGlassCard).toBe('function');
    });

    it('exports AppleGlassButton and AppleButton with valid React component', () => {
      expect(AppleUI.AppleGlassButton).toBeDefined();
      expect(typeof AppleUI.AppleGlassButton).toBe('function');
      expect(AppleUI.AppleButton).toBeDefined();
      expect(AppleUI.AppleButton).toBe(AppleUI.AppleGlassButton);
    });

    it('exports AppleGlassDock with valid React component', () => {
      expect(AppleUI.AppleGlassDock).toBeDefined();
      expect(typeof AppleUI.AppleGlassDock).toBe('function');
    });

    it('exports AppleGlassSegmentedControl and AppleSegmentedControl with valid React component', () => {
      expect(AppleUI.AppleGlassSegmentedControl).toBeDefined();
      expect(typeof AppleUI.AppleGlassSegmentedControl).toBe('function');
      expect(AppleUI.AppleSegmentedControl).toBeDefined();
      expect(AppleUI.AppleSegmentedControl).toBe(AppleUI.AppleGlassSegmentedControl);
    });

    it('exports AppleInsetGroupedList, AppleInsetItem, and AppleInsetGroupedCard', () => {
      expect(AppleUI.AppleInsetGroupedList).toBeDefined();
      expect(typeof AppleUI.AppleInsetGroupedList).toBe('function');
      expect(AppleUI.AppleInsetItem).toBeDefined();
      expect(typeof AppleUI.AppleInsetItem).toBe('function');
      expect(AppleUI.AppleInsetGroupedCard).toBeDefined();
      expect(typeof AppleUI.AppleInsetGroupedCard).toBe('function');
    });

    it('exports AppleSheetModal with valid React component', () => {
      expect(AppleUI.AppleSheetModal).toBeDefined();
      expect(typeof AppleUI.AppleSheetModal).toBe('function');
    });

    it('exports AppleNavigationBar with valid React component', () => {
      expect(AppleUI.AppleNavigationBar).toBeDefined();
      expect(typeof AppleUI.AppleNavigationBar).toBe('function');
    });

    it('exports AppleTabBar with valid React component', () => {
      expect(AppleUI.AppleTabBar).toBeDefined();
      expect(typeof AppleUI.AppleTabBar).toBe('function');
    });
  });
});
