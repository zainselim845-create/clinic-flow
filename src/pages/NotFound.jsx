import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Home, Calendar } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #F8FAFC)',
      padding: '2rem',
      direction: 'rtl',
      fontFamily: 'inherit'
    }}>
      <div style={{
        background: 'var(--surface, #FFFFFF)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderRadius: '20px',
        padding: '3rem 2rem',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(37, 99, 235, 0.1)',
          color: 'var(--primary, #2563EB)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <Stethoscope size={40} />
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary, #2563EB)', margin: '0 0 0.5rem' }}>
          404
        </h1>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #1E293B)', marginBottom: '0.75rem' }}>
          الصفحة المطلوبة غير موجودة
        </h2>

        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary, #64748B)', lineHeight: '1.6', marginBottom: '2rem' }}>
          يبدو أن الرابط الذي حاولت الوصول إليه غير صحيح أو تم نقله. يمكنك العودة للصفحة الرئيسية أو الانتقال لصفحة الحجز.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              background: 'var(--primary, #2563EB)',
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Home size={16} />
            <span>لوحة التحكم</span>
          </Link>

          <Link
            to="/booking"
            style={{
              background: 'var(--bg-tertiary, #F1F5F9)',
              color: 'var(--text-primary, #1E293B)',
              textDecoration: 'none',
              border: '1px solid var(--border-color, #CBD5E1)',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Calendar size={16} />
            <span>صفحة الحجز</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
