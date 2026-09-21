import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Floating back-to-top button that fades in smoothly when the user scrolls down past 300px.
 */
export const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (window.scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();

    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="العودة إلى أعلى الصفحة"
      title="العودة لأعلى الصفحة"
      className="scroll-to-top-btn"
      style={{
        position: 'fixed',
        bottom: '84px',
        left: '24px',
        zIndex: 900,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: 'var(--surface, #FFFFFF)',
        color: 'var(--text-primary, #09090B)',
        border: '1px solid var(--border-color, #E4E4E7)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        animation: 'fadeInUp 0.25s ease'
      }}
    >
      <ArrowUp size={20} />
    </button>
  );
};

export default ScrollToTopButton;
