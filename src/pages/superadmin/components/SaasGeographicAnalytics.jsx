import React, { useState, useMemo } from 'react';
import {
  EGYPT_GOVERNORATES,
  detectClinicLocation,
  calculateHaversineDistanceKm,
  getClinicCoordinates
} from '@/data/saasGeoData';
import {
  GeoCommandHeader,
  GeoKpiCards,
  GeoInteractiveMap,
  GeoGovernoratesList,
  GeoClinicsDirectory
} from '@/pages/superadmin/components/geo';

/**
 * SaasGeographicAnalytics - Modular Orchestrator for National & Regional Geo Intelligence
 */
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
    let ownerGpsVerifiedCount = 0;
    let manualFallbackCount = 0;

    const clinicsWithGeo = allTenants.map(t => {
      const loc = detectClinicLocation(t);
      const govObj = EGYPT_GOVERNORATES.find(g => g.id === loc.governorateId) || loc;
      const coords = getClinicCoordinates(t, govObj);
      const govKey = loc.governorateId;
      const clusterKey = loc.regionCluster;

      if (loc.isOwnerDeviceLocation) {
        ownerGpsVerifiedCount++;
      } else {
        manualFallbackCount++;
      }

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
      uniqueGovsCount,
      ownerGpsVerifiedCount,
      manualFallbackCount,
      ownerVerificationRatio: totalClinics > 0 ? Math.round((ownerGpsVerifiedCount / totalClinics) * 100) : 0
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
      <GeoCommandHeader 
        activeMapMode={activeMapMode} 
        setActiveMapMode={setActiveMapMode} 
      />

      {/* KPI Stats Grid */}
      <GeoKpiCards 
        geoAnalytics={geoAnalytics} 
      />

      {/* Interactive Visual Map Card */}
      <GeoInteractiveMap 
        activeMapMode={activeMapMode}
        userLocation={userLocation}
        setUserLocation={setUserLocation}
        isLocatingUser={isLocatingUser}
        handleDetectUserLocation={handleDetectUserLocation}
        locationError={locationError}
        mapViewMode={mapViewMode}
        setMapViewMode={setMapViewMode}
        selectedGovernorate={selectedGovernorate}
        setSelectedGovernorate={setSelectedGovernorate}
        setSortByDistance={setSortByDistance}
        geoAnalytics={geoAnalytics}
        displayedClinics={displayedClinics}
      />

      {/* Main Bottom Grid: Governorates Ranking + Filterable Clinics Directory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(340px, 1.4fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Governorates Ranking & Visual Ratio Bars */}
        <GeoGovernoratesList 
          geoAnalytics={geoAnalytics}
          selectedGovernorate={selectedGovernorate}
          setSelectedGovernorate={setSelectedGovernorate}
        />

        {/* Right Column: Filtered Clinics Directory */}
        <GeoClinicsDirectory 
          displayedClinics={displayedClinics}
          userLocation={userLocation}
          sortByDistance={sortByDistance}
          setSortByDistance={setSortByDistance}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

      </div>

    </div>
  );
}
