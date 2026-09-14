import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Hardening, SEO & AI Discovery Verification', () => {
  const publicDir = path.resolve(process.cwd(), 'public');

  describe('1. Search Engine & AI Discovery Files', () => {
    it('provides a valid XML sitemap with all public pages', () => {
      const sitemapPath = path.join(publicDir, 'sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);

      const content = fs.readFileSync(sitemapPath, 'utf8');
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<urlset');
      expect(content).toContain('https://clinicflow.app/');
      expect(content).toContain('https://clinicflow.app/booking');
      expect(content).toContain('https://clinicflow.app/manage-booking');
      expect(content).toContain('https://clinicflow.app/login');
      expect(content).toContain('https://clinicflow.app/c/dr-ahmed/booking');
      expect(content).toContain('https://clinicflow.app/c/dr-sara/booking');
    });

    it('provides a strict robots.txt protecting private dashboards and exposing sitemap', () => {
      const robotsPath = path.join(publicDir, 'robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);

      const content = fs.readFileSync(robotsPath, 'utf8');
      expect(content).toContain('User-agent: *');
      expect(content).toContain('Allow: /');
      expect(content).toContain('Allow: /booking');
      expect(content).toContain('Allow: /manage-booking');
      expect(content).toContain('Disallow: /dashboard');
      expect(content).toContain('Disallow: /super-admin');
      expect(content).toContain('Disallow: /appointments');
      expect(content).toContain('Disallow: /patients');
      expect(content).toContain('Disallow: /invoices');
      expect(content).toContain('Disallow: /settings');
      expect(content).toContain('Sitemap: https://clinicflow.app/sitemap.xml');
    });

    it('provides a compliant llms.txt manifest for AI agents', () => {
      const llmsPath = path.join(publicDir, 'llms.txt');
      expect(fs.existsSync(llmsPath)).toBe(true);

      const content = fs.readFileSync(llmsPath, 'utf8');
      expect(content).toContain('# ClinicFlow');
      expect(content).toContain('EHR/EMR');
      expect(content).toContain('Multi-Tenancy');
      expect(content).toContain('https://clinicflow.app/');
    });

    it('provides a crisp 1200x630 social share OpenGraph card', () => {
      const ogPath = path.join(publicDir, 'og-image.svg');
      expect(fs.existsSync(ogPath)).toBe(true);

      const content = fs.readFileSync(ogPath, 'utf8');
      expect(content).toContain('width="1200"');
      expect(content).toContain('height="630"');
      expect(content).toContain('ClinicFlow');
    });
  });

  describe('2. HTML Header & Schema Standards', () => {
    it('verifies index.html has canonical, og tags, and no Vite/React placeholders', () => {
      const indexPath = path.resolve(process.cwd(), 'index.html');
      const html = fs.readFileSync(indexPath, 'utf8');

      expect(html).toContain('rel="canonical"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain('application/ld+json');
      expect(html).toContain('"@type": "SoftwareApplication"');
      expect(html).toContain('"@type": "MedicalOrganization"');

      // Zero unwanted placeholder titles
      expect(html).not.toContain('<title>Vite');
      expect(html).not.toContain('<title>React');
    });

    it('verifies vite.config.js disables sourcemaps in production and splits heavy libraries', () => {
      const viteConfigPath = path.resolve(process.cwd(), 'vite.config.js');
      const config = fs.readFileSync(viteConfigPath, 'utf8');

      expect(config).toContain('sourcemap: false');
      expect(config).toContain('vendor-xlsx');
      expect(config).toContain('vendor-recharts');
      expect(config).toContain('vendor-supabase');
      expect(config).toContain('vendor-ark-ui');
    });
  });
});
