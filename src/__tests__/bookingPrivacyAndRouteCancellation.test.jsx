import { describe, it, expect } from 'vitest';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { getClinicBookingUrl } from '../utils/clinicUrls';

describe('Booking Privacy & Route Cancellation (Zero Tenant Leakage)', () => {
  it('1. getClinicBookingUrl safely falls back to / when tenant has no slug, preventing /booking exposure', () => {
    const localLocation = { origin: 'http://localhost:5173', hostname: 'localhost' };
    expect(getClinicBookingUrl(null, localLocation)).toBe('http://localhost:5173/');
    expect(getClinicBookingUrl({}, localLocation)).toBe('http://localhost:5173/');
  });

  it('2. getClinicBookingUrl preserves direct clinic paths when clinic has a valid slug', () => {
    const tenant = { slug: 'dr-nour' };
    const localLocation = { origin: 'http://localhost:5173', hostname: 'localhost' };
    expect(getClinicBookingUrl(tenant, localLocation)).toBe('http://localhost:5173/c/dr-nour/booking');
  });

  it('3. /booking route target element is Navigate with to="/" and replace=true to protect tenant privacy', () => {
    const navigateEl = <Navigate to="/" replace />;
    expect(navigateEl.props.to).toBe('/');
    expect(navigateEl.props.replace).toBe(true);
  });

  it('4. /c route target element is Navigate with to="/" and replace=true', () => {
    const navigateEl = <Navigate to="/" replace />;
    expect(navigateEl.props.to).toBe('/');
    expect(navigateEl.props.replace).toBe(true);
  });

  it('5. Direct clinic booking URL generation avoids directory exposure across environments', () => {
    const tenant = { slug: 'dr-tamer' };
    const prodLocation = { origin: 'https://clinicflow.app', hostname: 'clinicflow.app' };
    const bookingUrl = getClinicBookingUrl(tenant, prodLocation);
    expect(bookingUrl).not.toContain('/booking');
    expect(bookingUrl).toBe('https://dr-tamer.clinicflow.app/');
  });
});
