import React from 'react';
import { Stethoscope, AlertCircle, Phone } from 'lucide-react';

export default function SuspendedClinicView({ clinic }) {
  return (
    <div className="nebras-booking-page" dir="rtl">
      <header className="nebras-top-bar">
        <div className="nebras-brand">
          <Stethoscope size={24} className="brand-logo-icon" />
          <span className="brand-title">{clinic.name}</span>
        </div>
      </header>
      <div className="nebras-body-container" style={{ maxWidth: '580px', margin: '4rem auto', textAlign: 'center', background: 'var(--bg-secondary)', padding: '3rem 2rem', borderRadius: '16px', border: '1px solid #fecaca' }}>
        <div style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.75rem' }}>
          الحجز الإلكتروني متوقف مؤقتاً
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          نعتذر، خدمة الحجز الإلكتروني عبر الإنترنت لعيادة <strong>{clinic.name}</strong> متوقفة مؤقتاً حالياً. يرجى التواصل مباشرة مع إدارة العيادة هاتفياً لتسجيل موعدك.
        </p>
        {clinic.phone && (
          <a href={`tel:${clinic.phone}`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', textDecoration: 'none', borderRadius: '10px' }}>
            <Phone size={18} />
            <span>الاتصال بالعيادة ({clinic.phone})</span>
          </a>
        )}
      </div>
    </div>
  );
}
