import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Home, Calendar, Search, LogIn, ArrowRight } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '404 - الصفحة غير موجودة | كلينك فلو (ClinicFlow)';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, follow');
  }, []);

  return (
    <div 
      className="not-found-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary, #F8FAFC)',
        padding: '2rem 1rem',
        direction: 'rtl',
        fontFamily: 'inherit'
      }}
    >
      <div 
        className="not-found-card"
        style={{
          background: 'var(--surface, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '24px',
          padding: '3rem 2.25rem',
          maxWidth: '540px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.07)'
        }}
      >
        {/* Medical Icon Badge */}
        <div 
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(16, 185, 129, 0.12))',
            color: 'var(--primary, #0071E3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            border: '1px solid rgba(37, 99, 235, 0.2)'
          }}
        >
          <Stethoscope size={44} />
        </div>

        {/* Single Clear H1 Heading */}
        <h1 
          style={{ 
            fontSize: '2.4rem', 
            fontWeight: 900, 
            color: 'var(--text-primary, #0F172A)', 
            margin: '0 0 0.5rem',
            letterSpacing: '-0.02em'
          }}
        >
          404 - الصفحة غير موجودة
        </h1>

        <p 
          style={{ 
            fontSize: '1rem', 
            color: 'var(--text-secondary, #64748B)', 
            lineHeight: '1.7', 
            margin: '0 auto 2rem',
            maxWidth: '440px'
          }}
        >
          عذراً، الرابط الذي حاولت الوصول إليه غير صحيح أو قد تم نقل العيادة أو إلغاء الصفحة. يمكنك استخدام الروابط السريعة أدناه للوصول لمبتغاك:
        </p>

        {/* Quick Access Links Grid */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '0.75rem',
            marginBottom: '1.75rem'
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: 'var(--primary, #0071E3)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Home size={17} />
            <span>الرئيسية</span>
          </Link>

          <Link
            to="/booking"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: 'var(--bg-tertiary, #F1F5F9)',
              color: 'var(--text-primary, #0F172A)',
              border: '1px solid var(--border-color, #E2E8F0)',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Calendar size={17} color="var(--primary, #0071E3)" />
            <span>بوابة الحجز</span>
          </Link>

          <Link
            to="/manage-booking"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: 'var(--bg-tertiary, #F1F5F9)',
              color: 'var(--text-primary, #0F172A)',
              border: '1px solid var(--border-color, #E2E8F0)',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Search size={17} color="#10B981" />
            <span>استعلام التذكرة</span>
          </Link>

          <Link
            to="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: 'var(--bg-tertiary, #F1F5F9)',
              color: 'var(--text-primary, #0F172A)',
              border: '1px solid var(--border-color, #E2E8F0)',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <LogIn size={17} color="#8B5CF6" />
            <span>دخول الطاقم</span>
          </Link>
        </div>

        {/* Return back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary, #94A3B8)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.8rem'
          }}
        >
          <ArrowRight size={14} />
          <span>الرجوع للصفحة السابقة</span>
        </button>
      </div>
    </div>
  );
}
