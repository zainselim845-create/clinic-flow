import React from 'react';
import { 
  Building2, MapPin, Compass, ExternalLink, ArrowUpDown, Search, Navigation 
} from 'lucide-react';

/**
 * GeoClinicsDirectory - Right column listing clinics in the selected region with GPS distance
 */
export default function GeoClinicsDirectory({
  displayedClinics,
  userLocation,
  sortByDistance,
  setSortByDistance,
  searchQuery,
  setSearchQuery
}) {
  return (
    <div style={{
      background: 'var(--surface, #FFF)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
            سجل العيادات في النطاق المحدد ({displayedClinics.length})
          </h4>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            تفاصيل الحسابات، الأطباء، والمواقع الميدانية
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Proximity Sort Toggle when GPS is active */}
          {userLocation && (
            <button
              type="button"
              onClick={() => setSortByDistance(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: sortByDistance ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                color: sortByDistance ? '#059669' : 'var(--text-secondary)',
                border: '1px solid ' + (sortByDistance ? '#10B981' : 'var(--border-color)'),
                borderRadius: '8px',
                padding: '0.4rem 0.7rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="ترتيب العيادات من الأقرب لموقعك الفعلي عبر الـ GPS"
            >
              <ArrowUpDown size={13} />
              <span>{sortByDistance ? 'مرتب حسب الأقرب لموقعي' : 'ترتيب حسب القرب'}</span>
            </button>
          )}

          {/* Search Input */}
          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={14} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو العنوان..."
              style={{
                width: '100%',
                padding: '0.4rem 2rem 0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem'
              }}
            />
          </div>
        </div>
      </div>

      {displayedClinics.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          <MapPin size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد عيادات مسجلة مطابقة لمعايير البحث في هذا النطاق.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayedClinics.map(c => {
            const isSuspended = c.subscriptionStatus === 'suspended';
            const isLifetime = Boolean(c.isLifetimeLicense || c.subscriptionStatus === 'lifetime');
            const mapsUrl = c.googleMapsUrl || (c.coordinates ? `https://www.google.com/maps/dir/?api=1&destination=${c.coordinates.lat},${c.coordinates.lng}` : null);

            return (
              <div
                key={c.id || c.slug}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--surface)',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(2, 132, 199, 0.08)',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Building2 size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {c.name}
                      </strong>
                      {isLifetime && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}>
                          مدى الحياة
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                        background: isSuspended ? '#FEE2E2' : '#ECFDF5',
                        color: isSuspended ? '#DC2626' : '#047857'
                      }}>
                        {isSuspended ? 'موقوف' : 'نشط'}
                      </span>
                      {c.distanceKm !== null && c.distanceKm !== undefined && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                          background: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Navigation size={10} />
                          <span>{c.distanceKm} كم من موقعك</span>
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      الطبيب: {c.doctorName || 'طبيب العيادة'} | المسار: <code>/{c.slug}</code>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: '#0284C7', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={12} />
                      <span>{c.address || c.geo.governorateName}</span>
                      {c.coordinates && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', direction: 'ltr' }}>
                          ({c.coordinates.lat.toFixed(4)}, {c.coordinates.lng.toFixed(4)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        background: 'rgba(2, 132, 199, 0.08)',
                        border: '1px solid rgba(2, 132, 199, 0.25)',
                        color: '#0284C7',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Compass size={12} />
                      <span>خرائط Google</span>
                    </a>
                  )}
                  {c.slug && (
                    <a
                      href={`/c/${c.slug}/booking`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        background: 'var(--bg-secondary, #F4F4F5)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>الحجز</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary, #F4F4F5)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}>
                    {c.geo.governorateName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
