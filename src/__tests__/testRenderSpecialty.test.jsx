import { describe, it, expect } from 'vitest';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import SpecialtyClinics from '../pages/SpecialtyClinics';
import SpecialtyClinicalHub from '../components/specialty/SpecialtyClinicalHub';
import PediatricGrowthChart from '../components/specialty/PediatricGrowthChart';
import OphthalmologyRefractionChart from '../components/specialty/OphthalmologyRefractionChart';
import ObGynPregnancyTracker from '../components/specialty/ObGynPregnancyTracker';
import DicomViewerModal from '../components/specialty/DicomViewerModal';
import { AppProvider } from '../context/AppContext';
import { TenantProvider } from '../context/TenantContext';
import { AuthProvider } from '../context/AuthContext';

describe('Render test for Specialty modules', () => {
  it('renders SpecialtyClinicalHub without crashing', () => {
    const html = ReactDOMServer.renderToString(
      <SpecialtyClinicalHub patientId="p-1" clinicId="c-1" />
    );
    expect(html).toContain('specialty-hub-wrapper');
  });

  it('renders PediatricGrowthChart without crashing', () => {
    const html = ReactDOMServer.renderToString(
      <PediatricGrowthChart patientId="p-1" clinicId="c-1" patientName="طفل" />
    );
    expect(html).toContain('pediatric-growth-container');
  });

  it('renders OphthalmologyRefractionChart without crashing', () => {
    const html = ReactDOMServer.renderToString(
      <OphthalmologyRefractionChart patientId="p-1" clinicId="c-1" />
    );
    expect(html).toContain('ophthalmology-container');
  });

  it('renders ObGynPregnancyTracker without crashing', () => {
    const html = ReactDOMServer.renderToString(
      <ObGynPregnancyTracker patientId="p-1" clinicId="c-1" />
    );
    expect(html).toContain('obgyn-container');
  });

  it('renders DicomViewerModal without crashing', () => {
    const html = ReactDOMServer.renderToString(
      <DicomViewerModal isOpen={true} patientName="مريض" patientId="p-1" />
    );
    expect(html).toContain('dicom-modal-overlay');
  });

  it('renders SpecialtyClinics page inside providers without crashing', () => {
    const html = ReactDOMServer.renderToString(
      <MemoryRouter initialEntries={['/specialty-charts']}>
        <AppProvider>
          <TenantProvider>
            <AuthProvider>
              <SpecialtyClinics />
            </AuthProvider>
          </TenantProvider>
        </AppProvider>
      </MemoryRouter>
    );
    expect(html).toContain('specialty-clinics-page');
  });
});
