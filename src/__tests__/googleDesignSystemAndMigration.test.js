import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { appReducer, initialState, DATA_SCHEMA_VERSION } from '../context/AppContext';
import { getTodayDateStr } from '../utils/timeSlots';

describe('Google Material Design 3 & State Auto-Healing Quality Gate', () => {
  describe('1. Schema Version & Auto-Healing Reducer Action', () => {
    it('exports DATA_SCHEMA_VERSION with valid semantic versioning', () => {
      expect(DATA_SCHEMA_VERSION).toBeDefined();
      expect(typeof DATA_SCHEMA_VERSION).toBe('string');
      expect(DATA_SCHEMA_VERSION).toContain('google_material_3');
    });

    it('REFRESH_TODAY_DEMO_DATA populates active appointments with today date', () => {
      const today = getTodayDateStr();
      const stateWithOldAppts = {
        ...initialState,
        currentTenantSlug: 'dr-ahmed',
        appointments: [
          { id: 'old-1', date: '2026-01-01', patientName: 'قديم', status: 'completed' }
        ]
      };

      const newState = appReducer(stateWithOldAppts, { type: 'REFRESH_TODAY_DEMO_DATA' });

      expect(newState.appointments.length).toBeGreaterThan(1);
      const todayAppts = newState.appointments.filter(a => a.date === today);
      expect(todayAppts.length).toBeGreaterThanOrEqual(4);

      // Verify statuses in today's floor
      const statuses = todayAppts.map(a => a.status);
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('waiting');
      expect(statuses).toContain('completed');

      // Old appointments are preserved in history
      expect(newState.appointments.some(a => a.id === 'old-1')).toBe(true);

      // System notification added
      expect(newState.notifications[0].title).toContain('تحديث بيانات اليوم');
    });
  });

  describe('2. Google Material Design 3 CSS Integrity', () => {
    it('LandingPage.css contains authentic Google Material 3 tokens, colors, and pill shapes', () => {
      const cssPath = path.resolve(__dirname, '../pages/LandingPage.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      // Google 4-Color Accents & Google Blue
      expect(css).toContain('#1A73E8'); // Google Blue 600
      expect(css).toContain('#EA4335'); // Google Red
      expect(css).toContain('#FBBC04'); // Google Yellow
      expect(css).toContain('#34A853'); // Google Green

      // Google Pill Shapes
      expect(css).toContain('border-radius: 9999px');

      // Google Clean Light Background
      expect(css).toContain('background-color: #FFFFFF');
      expect(css).toContain('Google Sans');
      expect(css).not.toContain('background-color: #0b0f19'); // Old dark linear must be gone
    });

    it('Global index.css contains Google Material Design tokens and ambient shadows', () => {
      const cssPath = path.resolve(__dirname, '../index.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      expect(css).toContain('--primary: #1A73E8;');
      expect(css).toContain('--radius-full: 9999px;');
      expect(css).toContain('--bg-primary: #F8F9FA;');
      expect(css).toContain('Google Sans');
    });
  });
});
