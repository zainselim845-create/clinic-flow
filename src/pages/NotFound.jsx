import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  Home, 
  Calendar, 
  Search, 
  LogIn, 
  ArrowRight, 
  HelpCircle, 
  MessageCircle,
  Activity
} from 'lucide-react';
import { getWhatsAppSupportUrl } from '../utils/utmTracking';

export default function NotFound() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/booking?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const supportUrl = getWhatsAppSupportUrl('مرحباً، واجهت صفحة غير موجودة (404) في منصة كلينيك فلو وأحتاج للمساعدة.');

  return (
    <div 
      className="not-found-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, var(--bg-primary, #F8FAFC) 0%, #EDF2F7 100%)',
        padding: '2.5rem 1rem',
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
          padding: '2.75rem 2rem',
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Animated Status Pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '4px 12px', borderRadius: '9999px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
          <Activity size={13} />
          <span>خوادم وخدمات كلينيك فلو تعمل بكفاءة 100%</span>
        </div>

        {/* Medical Icon Badge */}
        <div 
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '12px',
            background: 'var(--bg-tertiary, #F4F4F5)',
            color: 'var(--clinic-primary, #09090B)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            border: '1px solid var(--border-color, #E4E4E7)'
          }}
        >
          <Stethoscope size={40} />
        </div>

        {/* Clear H1 Heading */}
        <h1 
          style={{ 
            fontSize: '2.2rem', 
            fontWeight: 800, 
            color: 'var(--text-primary, #0F172A)', 
            margin: '0 0 0.4rem',
            letterSpacing: '-0.02em'
          }}
        >
          404 - لم نتمكن من إيجاد الصفحة
        </h1>

        <p 
          style={{ 
            fontSize: '0.94rem', 
            color: 'var(--text-secondary, #64748B)', 
            lineHeight: '1.6', 
            margin: '0 auto 1.5rem',
            maxWidth: '460px'
          }}
        >
          عذراً، الرابط المطلوب غير متوفر حالياً أو ربما تم تغيير مسار العيادة. ابحث في دليل العيادات أو اختر وجهة سريعة أدناه:
        </p>

        {/* Interactive Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '1.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="ابحث عن اسم طبيب، تخصص، أو عيادة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 38px 10px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '0.88rem',
                outline: 'none',
                backgroundColor: 'var(--bg-tertiary, #F8FAFC)',
                color: 'inherit'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              backgroundColor: 'var(--clinic-primary, #09090B)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            بحث
          </button>
        </form>

        {/* Quick Access Links Grid */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              background: 'var(--clinic-primary, #09090B)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Home size={16} />
            <span>الرئيسية</span>
          </Link>

          <Link
            to="/booking"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              background: 'var(--bg-tertiary, #F4F4F5)',
              color: 'var(--text-primary, #09090B)',
              border: '1px solid var(--border-color, #E4E4E7)',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Calendar size={16} color="var(--clinic-primary, #09090B)" />
            <span>دليل العيادات</span>
          </Link>

          <Link
            to="/manage-booking"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              background: 'var(--bg-tertiary, #F1F5F9)',
              color: 'var(--text-primary, #0F172A)',
              border: '1px solid var(--border-color, #E2E8F0)',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <HelpCircle size={16} color="#10B981" />
            <span>متابعة حجز سابق</span>
          </Link>

          <Link
            to="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              background: 'var(--bg-tertiary, #F1F5F9)',
              color: 'var(--text-primary, #0F172A)',
              border: '1px solid var(--border-color, #E2E8F0)',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <LogIn size={16} color="#8B5CF6" />
            <span>دخول العيادة</span>
          </Link>
        </div>

        {/* Helpful Contact & Return Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #64748B)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.6rem'
            }}
          >
            <ArrowRight size={14} />
            <span>الرجوع للصفحة السابقة</span>
          </button>

          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              color: '#059669',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <MessageCircle size={15} />
            <span>تحدث مع الدعم الفني</span>
          </a>
        </div>
      </div>
    </div>
  );
}
