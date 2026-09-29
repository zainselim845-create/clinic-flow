import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Phone, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useApp } from '../context/AppContext';
import { getWhatsAppSupportUrl } from '../utils/utmTracking';
import DoctorAiFloatingWidget from './DoctorAiFloatingWidget';

/**
 * Floating action button that adapts intelligently across the platform:
 * 1. On any client clinic system: transforms into the clinic AI Agent (DoctorAiFloatingWidget).
 * 2. On a clinic public portal: connects directly to that clinic WhatsApp AI Agent.
 * 3. On the platform landing page: displays platform sales and technical support.
 */
export const FloatingContactButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, clinic } = useAuth();
  const { tenant, isDedicatedDomain } = useTenant();
  const { state } = useApp();

  const activeClinic = tenant || state.clinicInfo || clinic;
  const isDoctorOrStaff = Boolean(
    user && ['doctor', 'receptionist', 'accountant', 'assistant', 'associate_doctor', 'super_admin'].includes(user.role)
  );

  const isInternalClinicRoute = (
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/appointments') ||
    location.pathname.startsWith('/patients') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/attendance') ||
    location.pathname.startsWith('/inventory') ||
    location.pathname.startsWith('/labs') ||
    location.pathname.startsWith('/invoices') ||
    location.pathname.startsWith('/doctor-agent') ||
    location.pathname.startsWith('/doctor-assistant') ||
    location.pathname.startsWith('/growth') ||
    location.pathname.startsWith('/marketing') ||
    location.pathname.startsWith('/onboarding')
  );

  const isClientSystem = isDoctorOrStaff || isInternalClinicRoute;

  // 1. If on any client system: This button is the AI Agent for that clinic
  if (isClientSystem) {
    return <DoctorAiFloatingWidget />;
  }

  // 2. If on a clinic public booking or portal: Connect to that clinic WhatsApp AI Agent
  const isClinicPublicPortal = location.pathname.startsWith('/c/') || isDedicatedDomain;
  if (isClinicPublicPortal && activeClinic) {
    const clinicPhone = activeClinic.phone || activeClinic.whatsappNumber || '';
    const cleanPhone = clinicPhone.replace(/\D/g, '');
    const clinicDoctorName = activeClinic.doctorName || activeClinic.name || 'طبيب العيادة';
    const clinicWaUrl = cleanPhone 
      ? `https://wa.me/20${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(`مرحباً د. ${clinicDoctorName}، أود الاستفسار وحجز موعد عبر المساعد الذكي`)}`
      : null;

    if (!clinicWaUrl) return null;

    return (
      <div 
        className="floating-contact-container"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 900,
          direction: 'rtl'
        }}
      >
        <a
          href={clinicWaUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`تواصل مع وكيل واتساب الذكي لـ ${activeClinic.name || 'العيادة'}`}
          title={`وكيل واتساب الذكي لـ ${activeClinic.name || 'العيادة'}`}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#25D366',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 16px rgba(37, 211, 102, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            textDecoration: 'none'
          }}
        >
          <MessageCircle size={24} />
        </a>
      </div>
    );
  }

  // 3. Platform Public Landing Page: Platform sales and support
  const whatsappUrl = getWhatsAppSupportUrl('مرحباً فريق كلينيك فلو، أحتاج لمساعدة في استخدام النظام');

  return (
    <div 
      className="floating-contact-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 900,
        direction: 'rtl'
      }}
    >
      {/* Expanded Quick Options Menu */}
      {isOpen && (
        <div
          className="floating-contact-menu"
          style={{
            marginBottom: '12px',
            backgroundColor: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border-color, #E4E4E7)',
            borderRadius: '16px',
            padding: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '220px',
            animation: 'fadeInUp 0.2s ease-out'
          }}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              transition: 'transform 0.15s ease'
            }}
          >
            <MessageCircle size={18} />
            <span>محادثة واتساب فورية</span>
          </a>

          <a
            href="tel:+201006285031"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-secondary, #F4F4F5)',
              color: 'var(--text-primary, #09090B)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'background 0.15s ease'
            }}
          >
            <Phone size={18} />
            <span>اتصال هاتفي مباشر</span>
          </a>

          <div
            style={{
              padding: '6px 12px',
              fontSize: '0.72rem',
              color: 'var(--text-secondary, #71717A)',
              textAlign: 'center',
              borderTop: '1px solid var(--border-color, #E4E4E7)',
              marginTop: '4px'
            }}
          >
            فريق الدعم متاح طوال أيام الأسبوع
          </div>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-label="تواصل مع الدعم الفني والمبيعات"
        title="تواصل معنا"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: isOpen ? 'var(--text-primary, #09090B)' : '#25D366',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 4px 16px rgba(37, 211, 102, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default FloatingContactButton;
