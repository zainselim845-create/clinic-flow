import React from 'react';
import { 
  Compass, RefreshCw, LocateFixed, RotateCcw, AlertCircle, MapPin 
} from 'lucide-react';
import OpenStreetClinicMap from '@/components/common/OpenStreetClinicMap';
import { 
  EGYPT_GOVERNORATES, 
  GULF_EXPANSION_REGIONS, 
  REGIONAL_CLUSTERS 
} from '@/data/saasGeoData';

/**
 * GeoInteractiveMap - Visual OpenStreetMap component with live GPS controls
 */
export default function GeoInteractiveMap({
  activeMapMode,
  userLocation,
  setUserLocation,
  isLocatingUser,
  handleDetectUserLocation,
  locationError,
  mapViewMode,
  setMapViewMode,
  selectedGovernorate,
  setSelectedGovernorate,
  setSortByDistance,
  geoAnalytics,
  displayedClinics
}) {
  return (
    <div style={{
      background: '#09090B',
      color: '#FFFFFF',
      border: '1px solid #27272A',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Map Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #27272A', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Compass size={20} color="#38BDF8" />
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              {activeMapMode === 'egypt' ? 'الخريطة التفاعلية لجمهورية مصر العربية' : 'خريطة التوسع الإقليمي والدولي'}
            </h4>
            <span style={{ fontSize: '0.78rem', color: '#A1A1AA' }}>
              رصد مواقع العيادات الفعلية ميدانياً وحساب المسافات الحقيقية من موقعك عبر الـ GPS
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* GPS Geolocation Button */}
          <button
            type="button"
            onClick={handleDetectUserLocation}
            disabled={isLocatingUser}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: userLocation ? 'rgba(2, 132, 199, 0.25)' : '#27272A',
              color: userLocation ? '#38BDF8' : '#F4F4F5',
              border: '1px solid ' + (userLocation ? '#0284C7' : '#3F3F46'),
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: isLocatingUser ? 'wait' : 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="تحديد موقعي الفعلي وموقع المشرف عبر الـ GPS"
          >
            {isLocatingUser ? (
              <RefreshCw size={13} className="spin" />
            ) : (
              <LocateFixed size={13} color={userLocation ? '#38BDF8' : '#94A3B8'} />
            )}
            <span>
              {isLocatingUser 
                ? 'جارٍ الاتصال بالأقمار الصناعية (GPS)...' 
                : (userLocation ? `موقعي: ${userLocation.address} (±${userLocation.accuracy}م)` : 'تحديد موقعي الفعلي (GPS)')}
            </span>
          </button>

          {userLocation && (
            <button
              type="button"
              onClick={() => { setUserLocation(null); setSortByDistance(false); }}
              style={{
                background: 'transparent',
                color: '#94A3B8',
                border: '1px solid #3F3F46',
                borderRadius: '6px',
                padding: '0.35rem 0.6rem',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
              title="إلغاء تثبيت الموقع الحالي"
            >
              إلغاء التحديد
            </button>
          )}

          {/* Mode Switch: Individual Clinics vs Regional Clusters */}
          <div style={{
            display: 'inline-flex',
            background: '#27272A',
            padding: '0.2rem',
            borderRadius: '8px',
            border: '1px solid #3F3F46'
          }}>
            <button
              type="button"
              onClick={() => setMapViewMode('clinics')}
              style={{
                background: mapViewMode === 'clinics' ? '#09090B' : 'transparent',
                color: mapViewMode === 'clinics' ? '#FFFFFF' : '#A1A1AA',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.7rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              دبابيس العيادات الحقيقية ({geoAnalytics.totalClinics})
            </button>
            <button
              type="button"
              onClick={() => setMapViewMode('clusters')}
              style={{
                background: mapViewMode === 'clusters' ? '#09090B' : 'transparent',
                color: mapViewMode === 'clusters' ? '#FFFFFF' : '#A1A1AA',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.7rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              تجميعات المحافظات
            </button>
          </div>

          {selectedGovernorate !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedGovernorate('all')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#27272A',
                color: '#F4F4F5',
                border: '1px solid #3F3F46',
                borderRadius: '8px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} />
              <span>إعادة ضبط العرض</span>
            </button>
          )}
        </div>
      </div>

      {/* Location Error Notice */}
      {locationError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#FCA5A5',
          padding: '0.65rem 1rem',
          borderRadius: '10px',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{locationError}</span>
        </div>
      )}

      {/* OpenStreetMap Interactive Leaflet Map Container */}
      <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
        <OpenStreetClinicMap
          center={
            userLocation && selectedGovernorate === 'all'
              ? [userLocation.lat, userLocation.lng]
              : selectedGovernorate !== 'all'
              ? (() => {
                  const target = [...EGYPT_GOVERNORATES, ...GULF_EXPANSION_REGIONS].find(g => g.id === selectedGovernorate);
                  return target ? [target.lat, target.lng] : (activeMapMode === 'egypt' ? [26.8206, 30.8025] : [24.5, 47.0]);
                })()
              : (activeMapMode === 'egypt' ? [26.8206, 30.8025] : [24.5, 47.0])
          }
          zoom={
            userLocation && selectedGovernorate === 'all'
              ? 10
              : selectedGovernorate !== 'all'
              ? 10
              : (activeMapMode === 'egypt' ? 6 : 5)
          }
          userLocation={userLocation}
          locations={
            mapViewMode === 'clinics'
              ? displayedClinics.map(c => ({
                  id: c.id || c.slug,
                  name: c.name,
                  doctorName: c.doctorName,
                  specialty: c.specialty,
                  lat: c.coordinates.lat,
                  lng: c.coordinates.lng,
                  address: c.address || c.geo.governorateName,
                  phone: c.phone,
                  slug: c.slug,
                  googleMapsUrl: c.googleMapsUrl,
                  isClinic: true,
                  isSuspended: c.subscriptionStatus === 'suspended',
                  isLifetime: Boolean(c.isLifetimeLicense || c.subscriptionStatus === 'lifetime'),
                  distanceKm: c.distanceKm
                }))
              : (activeMapMode === 'egypt' ? EGYPT_GOVERNORATES : GULF_EXPANSION_REGIONS)
                  .filter(reg => (geoAnalytics.govCounts[reg.id]?.total || 0) > 0)
                  .map(reg => ({
                    id: reg.id,
                    name: reg.name,
                    lat: reg.lat,
                    lng: reg.lng,
                    count: geoAnalytics.govCounts[reg.id]?.total || 0,
                    governorate: REGIONAL_CLUSTERS[reg.region] || ''
                  }))
          }
          selectedId={selectedGovernorate}
          onSelectLocation={(id) => {
            const isGov = EGYPT_GOVERNORATES.some(g => g.id === id);
            if (isGov) {
              setSelectedGovernorate(prev => prev === id ? 'all' : id);
            }
          }}
          height="460px"
        />
      </div>

      {/* Active Selection Breadcrumb Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: '#18181B',
        padding: '0.75rem 1rem',
        borderRadius: '10px',
        border: '1px solid #27272A'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={16} color={selectedGovernorate === 'all' ? '#94A3B8' : '#10B981'} />
          <span style={{ fontSize: '0.85rem', color: '#E4E4E7' }}>
            {selectedGovernorate === 'all' ? (
              'الموقع المحدد حالياً: كافة المحافظات والمناطق المسجلة'
            ) : (
              <>
                الموقع المحدد: <strong style={{ color: '#10B981' }}>{geoAnalytics.govCounts[selectedGovernorate]?.name || selectedGovernorate}</strong>
                {' '}({geoAnalytics.govCounts[selectedGovernorate]?.total || 0} عيادة)
              </>
            )}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['cairo', 'giza', 'alexandria', 'dakahlia', 'sharqia', 'assiut', 'red_sea'].map(gid => {
            const g = EGYPT_GOVERNORATES.find(x => x.id === gid);
            if (!g) return null;
            const isCur = selectedGovernorate === gid;
            const count = geoAnalytics.govCounts[gid]?.total || 0;

            return (
              <button
                key={gid}
                type="button"
                onClick={() => setSelectedGovernorate(prev => prev === gid ? 'all' : gid)}
                style={{
                  background: isCur ? '#10B981' : '#27272A',
                  color: isCur ? '#09090B' : '#D4D4D8',
                  border: '1px solid ' + (isCur ? '#10B981' : '#3F3F46'),
                  borderRadius: '6px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {g.name.split(' ')[0]} ({count})
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
