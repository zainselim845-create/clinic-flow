import React, { useState } from 'react';
import { MessageCircle, Phone, HelpCircle, X, ChevronUp } from 'lucide-react';
import { getWhatsAppSupportUrl } from '../utils/utmTracking';

/**
 * Floating contact & customer support action button.
 * Expands to show WhatsApp chat, phone emergency hotline, and support options.
 */
export const FloatingContactButton = () => {
  const [isOpen, setIsOpen] = useState(false);

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
