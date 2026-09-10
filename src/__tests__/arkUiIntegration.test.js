import { describe, it, expect } from 'vitest';
import React from 'react';
import { Dialog, Tabs, Tooltip, Switch, Accordion, Menu } from '../components/ui';
import { LocaleProvider } from '@ark-ui/react/locale';
import fs from 'fs';
import path from 'path';

describe('Ark UI Integration & Google Material 3 Design System Primitives', () => {

  describe('1. Primitives Exports & Component Definitions', () => {
    it('exports all core accessible primitives from components/ui', () => {
      expect(Dialog).toBeDefined();
      expect(typeof Dialog).toBe('function');

      expect(Tabs).toBeDefined();
      expect(typeof Tabs).toBe('function');

      expect(Tooltip).toBeDefined();
      expect(typeof Tooltip).toBe('function');

      expect(Switch).toBeDefined();
      expect(typeof Switch).toBe('function');

      expect(Accordion).toBeDefined();
      expect(typeof Accordion).toBe('function');

      expect(Menu).toBeDefined();
      expect(typeof Menu).toBe('function');
    });

    it('exports LocaleProvider from @ark-ui/react/locale for RTL configuration', () => {
      expect(LocaleProvider).toBeDefined();
      expect(typeof LocaleProvider).toBe('function');
    });
  });

  describe('2. React Element Instantiation with Props', () => {
    it('creates a valid React element for Dialog with M3 props', () => {
      const element = React.createElement(Dialog, {
        open: false,
        title: 'نافذة تجريبية',
        description: 'وصف النافذة السريرية',
        maxWidth: '600px'
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.title).toBe('نافذة تجريبية');
      expect(element.props.maxWidth).toBe('600px');
    });

    it('creates a valid React element for Tabs with RTL items', () => {
      const items = [
        { value: 'tab-1', label: 'المواعيد', content: 'محتوى المواعيد' },
        { value: 'tab-2', label: 'المرضى', content: 'محتوى المرضى' }
      ];
      const element = React.createElement(Tabs, {
        defaultValue: 'tab-1',
        items
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.items.length).toBe(2);
      expect(element.props.defaultValue).toBe('tab-1');
    });

    it('creates a valid React element for Switch with label', () => {
      const element = React.createElement(Switch, {
        label: 'تفعيل الإشعارات الفورية',
        defaultChecked: true
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.label).toBe('تفعيل الإشعارات الفورية');
      expect(element.props.defaultChecked).toBe(true);
    });

    it('creates a valid React element for Tooltip', () => {
      const element = React.createElement(Tooltip, {
        content: 'نسخ رابط العيادة المباشر',
        children: React.createElement('button', null, 'نسخ')
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.content).toBe('نسخ رابط العيادة المباشر');
    });

    it('creates a valid React element for Accordion', () => {
      const items = [
        { value: 'faq-1', title: 'كيفية سداد الفاتورة؟', content: 'عبر الدفع الإلكتروني أو نقداً' }
      ];
      const element = React.createElement(Accordion, { items });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.items[0].value).toBe('faq-1');
    });

    it('creates a valid React element for Menu', () => {
      const items = [
        { value: 'profile', label: 'الملف الشخصي' },
        { value: 'logout', label: 'تسجيل الخروج', danger: true }
      ];
      const trigger = React.createElement('button', null, 'خيارات');
      const element = React.createElement(Menu, { trigger, items });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.items.length).toBe(2);
    });
  });

  describe('3. Design System CSS & RTL Rules Verification', () => {
    const cssPath = path.resolve(__dirname, '../components/ui/ark-ui.css');

    it('has ark-ui.css with Google Material 3 tokens and RTL rules', () => {
      expect(fs.existsSync(cssPath)).toBe(true);
      const content = fs.readFileSync(cssPath, 'utf8');

      // Check RTL rules
      expect(content).toContain('direction: rtl');
      // Check M3 tokens and rounded corners
      expect(content).toContain('var(--radius-2xl, 28px)');
      expect(content).toContain('var(--radius-full, 9999px)');
      expect(content).toContain('var(--primary, #0B57D0)');
      expect(content).toContain('var(--surface, #FFFFFF)');

      // Check key components classes
      expect(content).toContain('.ark-dialog-backdrop');
      expect(content).toContain('.ark-dialog-content');
      expect(content).toContain('.ark-tabs-root');
      expect(content).toContain('.ark-tab-trigger');
      expect(content).toContain('.ark-tooltip-content');
      expect(content).toContain('.ark-switch-root');
      expect(content).toContain('.ark-accordion-root');
      expect(content).toContain('.ark-menu-content');
    });
  });

  describe('4. Root Provider Integration', () => {
    const mainPath = path.resolve(__dirname, '../main.jsx');

    it('wraps the application with LocaleProvider locale="ar-EG" dir="rtl"', () => {
      const mainContent = fs.readFileSync(mainPath, 'utf8');
      expect(mainContent).toContain('LocaleProvider');
      expect(mainContent).toContain('locale="ar-EG"');
      expect(mainContent).toContain('dir="rtl"');
    });
  });
});
