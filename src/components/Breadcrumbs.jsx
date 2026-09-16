import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

const SEGMENT_NAMES = {
  dashboard: 'لوحة التحكم',
  appointments: 'المواعيد والتقويم',
  patients: 'سجلات المرضى',
  invoices: 'الفوترة والتحصيل',
  inventory: 'المخزون والمستلزمات',
  labs: 'المعامل والتركيبات',
  attendance: 'الحضور والانصراف',
  settings: 'إعدادات العيادة',
  'doctor-agent': 'مساعد الطبيب',
  notifications: 'التنبيهات',
  booking: 'حجز موعد',
  'manage-booking': 'إدارة الحجز',
  'super-admin': 'إدارة الساس',
  login: 'الدخول',
  c: 'العيادات'
};

export default function Breadcrumbs({ customTrail = null, className = '' }) {
  const location = useLocation();
  const { tenant } = useTenant();
  const pathname = location.pathname;

  const isRoot = pathname === '/';
  const segments = pathname.split('/').filter(Boolean);
  
  // Build trail
  const trail = customTrail || segments.map((seg, index) => {
    const url = '/' + segments.slice(0, index + 1).join('/');
    let label = SEGMENT_NAMES[seg] || seg;

    // If segment is clinic slug
    if (segments[index - 1] === 'c' && tenant?.slug === seg) {
      label = tenant.name || seg;
    }

    return {
      label,
      url,
      isLast: index === segments.length - 1
    };
  });

  // Inject BreadcrumbList JSON-LD Schema
  useEffect(() => {
    const schemaId = 'breadcrumbs-jsonld-schema';
    let script = document.getElementById(schemaId);
    if (script) script.remove();

    if (isRoot || !trail || trail.length === 0) return;

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'الرئيسية',
          item: 'https://clinicflow.app/'
        },
        ...trail.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 2,
          name: item.label,
          item: `https://clinicflow.app${item.url}`
        }))
      ]
    };

    script = document.createElement('script');
    script.id = schemaId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(schemaId);
      if (el) el.remove();
    };
  }, [trail, isRoot]);

  // Don't render breadcrumbs on root landing page
  if (isRoot) return null;

  return (
    <nav 
      aria-label="مسار التنقل (Breadcrumb)" 
      className={`clinicflow-breadcrumbs ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.82rem',
        color: 'var(--text-tertiary, #64748B)',
        marginBottom: '0.75rem',
        flexWrap: 'wrap'
      }}
    >
      <Link 
        to="/" 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: 'var(--text-secondary, #475569)',
          textDecoration: 'none',
          transition: 'color 0.15s ease'
        }}
        title="الصفحة الرئيسية"
      >
        <Home size={13} />
        <span>الرئيسية</span>
      </Link>

      {trail.map((item, index) => (
        <React.Fragment key={item.url + index}>
          <ChevronLeft size={12} color="var(--border-color, #CBD5E1)" style={{ margin: '0 1px' }} />
          {item.isLast ? (
            <span 
              aria-current="page"
              style={{
                color: 'var(--clinic-primary, #09090B)',
                fontWeight: 600
              }}
            >
              {item.label}
            </span>
          ) : (
            <Link 
              to={item.url}
              style={{
                color: 'var(--text-secondary, #475569)',
                textDecoration: 'none'
              }}
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
