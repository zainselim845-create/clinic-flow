import React from 'react';
import { Globe, MapPin } from 'lucide-react';

/**
 * GeoGovernoratesList - Left column listing governorates breakdown with progress bars
 */
export default function GeoGovernoratesList({
  geoAnalytics,
  selectedGovernorate,
  setSelectedGovernorate
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
          ترتيب المحافظات والمناطق (Regional Breakdown)
        </h4>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
          اضغط للتصفية السريعة
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* All Regions Reset Button */}
        <div 
          onClick={() => setSelectedGovernorate('all')}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: selectedGovernorate === 'all' ? '2px solid var(--clinic-primary, #09090B)' : '1px solid var(--border-color)',
            background: selectedGovernorate === 'all' ? 'var(--bg-secondary, #F4F4F5)' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={16} color="var(--clinic-primary, #09090B)" />
            <strong style={{ fontSize: '0.88rem' }}>كافة المحافظات والمناطق</strong>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, background: '#E4E4E7', padding: '0.15rem 0.55rem', borderRadius: '999px' }}>
            {geoAnalytics.totalClinics}
          </span>
        </div>

        {/* List of Governorates with Visual Progress Bars */}
        {geoAnalytics.sortedGovs.map(g => {
          const pct = geoAnalytics.totalClinics > 0 ? Math.round((g.total / geoAnalytics.totalClinics) * 100) : 0;
          const isSelected = selectedGovernorate === g.id;

          return (
            <div
              key={g.id}
              onClick={() => setSelectedGovernorate(g.id)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: isSelected ? '2px solid var(--clinic-primary, #09090B)' : '1px solid var(--border-color)',
                background: isSelected ? 'var(--bg-secondary, #F4F4F5)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={15} color={isSelected ? 'var(--clinic-primary, #09090B)' : '#0284C7'} />
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{g.name}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>({g.clusterName})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {g.total} عيادة
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {pct}٪
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '6px', background: '#E4E4E7', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.max(5, pct)}%`,
                  height: '100%',
                  background: isSelected ? 'var(--clinic-primary, #09090B)' : '#0284C7',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
