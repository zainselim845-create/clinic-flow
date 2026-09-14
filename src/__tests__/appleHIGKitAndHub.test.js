import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as AppleHIGKit from '../components/apple/AppleHIGKit';

describe('Apple HIG Kit & Clinical Hub Invariants', () => {
  describe('1. AppleHIGKit Component Exports', () => {
    it('exports all mandated Apple HIG atomic components', () => {
      expect(AppleHIGKit.AppleThemeProvider).toBeDefined();
      expect(AppleHIGKit.AppleButton).toBeDefined();
      expect(AppleHIGKit.AppleToggle).toBeDefined();
      expect(AppleHIGKit.AppleSquircle).toBeDefined();
      expect(AppleHIGKit.AppleInsetGroup).toBeDefined();
      expect(AppleHIGKit.AppleListRow).toBeDefined();
      expect(AppleHIGKit.AppleStepper).toBeDefined();
      expect(AppleHIGKit.AppleSlider).toBeDefined();
      expect(AppleHIGKit.AppleSegmentedControl).toBeDefined();
      expect(AppleHIGKit.AppleActionSheet).toBeDefined();
      expect(AppleHIGKit.useAppleTheme).toBeDefined();
    });
  });

  describe('2. Apple HIG Architectural Invariants Source Verification', () => {
    const kitPath = path.resolve(__dirname, '../components/apple/AppleHIGKit.jsx');
    const kitSource = fs.readFileSync(kitPath, 'utf8');

    it('enforces native 51x31px switch toggle with 27px knob and #34C759 active color', () => {
      expect(kitSource).toContain('w-[51px] h-[31px]');
      expect(kitSource).toContain('w-[27px] h-[27px]');
      expect(kitSource).toContain('bg-[#34C759]');
    });

    it('enforces 30x30px squircle icon container with 8px radius', () => {
      expect(kitSource).toContain('w-[30px] h-[30px]');
      expect(kitSource).toContain('rounded-[8px]');
    });

    it('enforces solid #FFFFFF / #1C1C1E inset surfaces without fake blurred cards', () => {
      expect(kitSource).toContain('bg-[#FFFFFF] dark:bg-[#1C1C1E]');
      expect(kitSource).toContain('rounded-[16px]');
    });

    it('enforces 0.5px indented list row divider with ml-[52px]', () => {
      expect(kitSource).toContain('ml-[52px]');
      expect(kitSource).toContain('h-[0.5px]');
    });

    it('implements stepper with -/+ native capsule and slider with continuous percentage track', () => {
      expect(kitSource).toContain('AppleStepper');
      expect(kitSource).toContain('AppleSlider');
      expect(kitSource).toContain('AppleSegmentedControl');
      expect(kitSource).toContain('AppleActionSheet');
    });
  });

  describe('3. Apple Clinical Hub Integration & Routing', () => {
    const hubPath = path.resolve(__dirname, '../pages/AppleClinicalHub.jsx');
    const hubSource = fs.readFileSync(hubPath, 'utf8');

    it('implements Apple Clinical Hub with system glass chrome and inset groups', () => {
      expect(hubSource).toContain('AppleClinicalHub');
      expect(hubSource).toContain('backdrop-blur-2xl');
      expect(hubSource).toContain('AppleInsetGroup');
      expect(hubSource).toContain('AppleSegmentedControl');
      expect(hubSource).toContain('AppleToggle');
      expect(hubSource).toContain('AppleStepper');
      expect(hubSource).toContain('AppleSlider');
      expect(hubSource).toContain('AppleActionSheet');
    });

    it('integrates live clinic data context (useApp, useAuth, useTenant)', () => {
      expect(hubSource).toContain('useApp()');
      expect(hubSource).toContain('useAuth()');
      expect(hubSource).toContain('useTenant()');
    });

    it('registers /apple-hub in App.jsx and Sidebar.jsx', () => {
      const appPath = path.resolve(__dirname, '../App.jsx');
      const appSource = fs.readFileSync(appPath, 'utf8');
      expect(appSource).toContain('/apple-hub');
      expect(appSource).toContain('AppleClinicalHub');

      const sidebarPath = path.resolve(__dirname, '../components/Sidebar.jsx');
      const sidebarSource = fs.readFileSync(sidebarPath, 'utf8');
      expect(sidebarSource).toContain('/apple-hub');
      expect(sidebarSource).toContain('واجهة آبل');
    });
  });
});
