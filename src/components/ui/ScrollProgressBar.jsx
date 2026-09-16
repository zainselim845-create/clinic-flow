import React, { useEffect, useState } from 'react';

/**
 * High-performance, lightweight scroll progress indicator.
 * Displays a sleek 3px bar at the top of the viewport representing current page scroll progress.
 */
export const ScrollProgressBar = () => {
  const [scrollPercentage, setScrollPercentage] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        setScrollPercentage(0);
        return;
      }
      const scrolled = (window.scrollY / scrollHeight) * 100;
      setScrollPercentage(Math.min(100, Math.max(0, scrolled)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (scrollPercentage <= 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="مؤشر تقدم التمرير في الصفحة"
      aria-valuenow={Math.round(scrollPercentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 99999,
        pointerEvents: 'none',
        backgroundColor: 'transparent'
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${scrollPercentage}%`,
          background: 'linear-gradient(90deg, var(--brand-primary, #09090B), #2563EB)',
          transition: 'width 0.1s ease-out',
          boxShadow: '0 0 8px rgba(37, 99, 235, 0.4)'
        }}
      />
    </div>
  );
};

export default ScrollProgressBar;
