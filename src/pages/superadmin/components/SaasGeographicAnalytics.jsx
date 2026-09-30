import React, { useState, useMemo } from 'react';
import { 
  MapPin, Globe, Building2, Compass, 
  Search, Activity, Award,
  TrendingUp, RotateCcw, LocateFixed,
  Navigation, RefreshCw, AlertCircle, ArrowUpDown, ExternalLink
} from 'lucide-react';
import OpenStreetClinicMap from '../../../components/common/OpenStreetClinicMap';

import {
  EGYPT_GOVERNORATES,
  REGIONAL_CLUSTERS,
  GULF_EXPANSION_REGIONS,
  detectClinicLocation,
  calculateHaversineDistanceKm,
  getClinicCoordinates
} from '../../../data/saasGeoData';

export default function SaasGeographicAnalytics({ allTenants = [] }) {
  const [selectedGovernorate, setSelectedGovernorate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMapMode, setActiveMapMode] = useState('egypt'); // 'egypt' | 'gulf'

  // Live Real GPS User Geolocation State
  const [userLocation, setUserLocation] = useState(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [mapViewMode, setMapViewMode] = useState('clinics'); // 'clinics' | 'clusters'
  const [sortByDistance, setSortByDistance] = useState(false);

  // Browser HTML5 Geolocation Handler
  const handleDetectUserLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('خاصية تحديد الموقع الجغرافي عبر GPS غير مدعومة في هذا المتصفح.');
      return;
    }

    setIsLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let resolvedAddress = 'موقعك الفعلي المعتمد عبر GPS';

        // Attempt reverse geocoding via OpenStreetMap Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'Accept-Language': 'ar,en' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const comp = data.address || {};
              resolvedAddress = comp.suburb || comp.city || comp.town || comp.state || data.display_name.split(',')[0];
            }
          }
        } catch {
          // Graceful fallback to default description
        }

        setUserLocation({
          lat,
          lng,
          name: 'موقعي الميداني الفعلي',
          address: resolvedAddress,
          accuracy: Math.round(position.coords.accuracy || 0)
        });
        setIsLocatingUser(false);
        setSortByDistance(true);
        setMapViewMode('clinics');
      },
      (err) => {
        setIsLocatingUser(false);
        setLocationError('تعذر تحديد موقع GPS: ' + (err.code === 1 ? 'يرجى السماح بصلاحية الموقع في المتصفح' : err.message));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  // Process and group all clinics by geographical coordinates & clusters
  const geoAnalytics = useMemo(() => {
    const govCounts = {};
    const clusterCounts = {};
    const clinicsWithGeo = allTenants.map(t => {
      const loc = detectClinicLocation(t);
      const govObj = EGYPT_GOVERNORATES.find(g => g.id === loc.governorateId) || loc;
      const coords = getClinicCoordinates(t, govObj);
      const govKey = loc.governorateId;
      const clusterKey = loc.regionCluster;

      if (!govCounts[govKey]) {
        govCounts[govKey] = {
          id: govKey,
          name: loc.governorateName,
          cluster: clusterKey,
          clusterName: loc.regionClusterName,
          total: 0,
          active: 0,
          suspended: 0,
          lifetime: 0,
          clinics: []
        };
      }

      if (!clusterCounts[clusterKey]) {
        clusterCounts[clusterKey] = {
          id: clusterKey,
          name: loc.regionClusterName,
          total: 0
        };
      }

      govCounts[govKey].total++;
      clusterCounts[clusterKey].total++;

      const isSuspended = t.subscriptionStatus === 'suspended';
      const isLifetime = Boolean(t.isLifetimeLicense || t.subscriptionStatus === 'lifetime');

      if (isLifetime) govCounts[govKey].lifetime++;
      if (isSuspended) govCounts[govKey].suspended++;
      else govCounts[govKey].active++;

      const clinicDecorated = {
        ...t,
        geo: loc,
        coordinates: coords
      };

      govCounts[govKey].clinics.push(clinicDecorated);

      return clinicDecorated;
    });

    const sortedGovs = Object.values(govCounts).sort((a, b) => b.total - a.total);
    const sortedClusters = Object.values(clusterCounts).sort((a, b) => b.total - a.total);

    const totalClinics = allTenants.length;
    const topGov = sortedGovs[0] || { name: 'القاهرة', total: 0 };
    const uniqueGovsCount = sortedGovs.length;

    return {
      govCounts,
      clinicsWithGeo,
      sortedGovs,
      sortedClusters,
      totalClinics,
      topGov,
      uniqueGovsCount
    };
  }, [allTenants]);

  // Filtered and sorted clinics based on UI selection and GPS proximity
  const displayedClinics = useMemo(() => {
    const list = geoAnalytics.clinicsWithGeo.map(c => {
      const distance = userLocation 
        ? calculateHaversineDistanceKm(userLocation.lat, userLocation.lng, c.coordinates.lat, c.coordinates.lng)
        : null;
      return {
        ...c,
        distanceKm: distance
      };
    }).filter(c => {
      const matchesGov = selectedGovernorate === 'all' || c.geo.governorateId === selectedGovernorate;
      const matchesSearch = !searchQuery || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.doctorName && c.doctorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.geo.governorateName.includes(searchQuery);
      return matchesGov && matchesSearch;
    });

    if (sortByDistance && userLocation) {
      list.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    }

    return list;
  }, [geoAnalytics.clinicsWithGeo, selectedGovernorate, searchQuery, userLocation, sortByDistance]);

  return (
    <div className="saas-geographic-analytics" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: 'rtl' }}>
      
      {/* Top Banner: Enterprise Command Center Header */}
      <div style={{
        background: 'linear-gradient(135deg, #09090B 0%, #18181B 100%)',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '1.75rem',
        border: '1px solid #27272A',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38BDF8'
          }}>
            <Globe size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              مركز الذكاء والانتشار الجغرافي (Geographic Intelligence)
            </h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem', color: '#A1A1AA' }}>
              الخريطة التفاعلية ورصد مواقع استخدام العيادات وتوزيع الحسابات ميدانياً
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            padding: '0.45rem 0.95rem',
            borderRadius: '999px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <Activity size={14} />
            <span>الشبكة الميدانية: متصلة ولحظية</span>
          </span>

          <div style={{
            display: 'inline-flex',
            background: '#27272A',
            padding: '0.25rem',
            borderRadius: '10px',
            border: '1px solid #3F3F46'
          }}>
            <button
              type="button"
              onClick={() => setActiveMapMode('egypt')}
              style={{
                background: activeMapMode === 'egypt' ? '#09090B' : 'transparent',
                color: activeMapMode === 'egypt' ? '#FFFFFF' : '#A1A1AA',
                border: 'none',
                borderRadius: '8px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              جمهورية مصر العربية
            </button>
            <button
              type="button"
              onClick={() => setActiveMapMode('gulf')}
              style={{
                background: activeMapMode === 'gulf' ? '#09090B' : 'transparent',
                color: activeMapMode === 'gulf' ? '#FFFFFF' : '#A1A1AA',
                border: 'none',
                borderRadius: '8px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              التوسع الإقليمي (الخليج العربي)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>المواقع والمحافظات المغطاة</span>
            <MapPin size={18} color="#0284C7" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {geoAnalytics.uniqueGovsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>محافظة ومنطقة</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={13} />
            <span>تغطية تشغيلية فعالة</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>المحافظة الأكثر كثافة</span>
            <Award size={18} color="#0284C7" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {geoAnalytics.topGov.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {geoAnalytics.topGov.total} عيادة ({geoAnalytics.totalClinics > 0 ? Math.round((geoAnalytics.topGov.total / geoAnalytics.totalClinics) * 100) : 0}٪ من إجمالي المنصة)
          </div>
        </div>

        <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>إجمالي العيادات المفهرسة</span>
            <Building2 size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {geoAnalytics.totalClinics} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>عيادة معتمدة</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            كافة الحسابات مفهرسة جغرافياً
          </div>
        </div>

        <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>الأقاليم الحيوية (Clusters)</span>
            <Activity size={18} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {geoAnalytics.sortedClusters.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>أقاليم جغرافية</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            القاهرة الكبرى، الدلتا، القناة، الصعيد
          </div>
        </div>

      </div>

      {/* Interactive Visual Map Card */}
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

        {/* Location Error Notice (if GPS denied) */}
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
              // If in clusters mode, select governorate; if clinic clicked, focus it
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
            {/* Quick Filter Buttons */}
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

      {/* Main Bottom Grid: Governorates Ranking + Filterable Clinics Directory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(340px, 1.4fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Governorates Ranking & Visual Ratio Bars */}
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

        {/* Right Column: Filtered Clinics Directory */}
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

      </div>

    </div>
  );
}
