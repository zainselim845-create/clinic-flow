import React, { useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import './OpenStreetClinicMap.css';

/**
 * OpenStreetClinicMap
 * Production-ready Open-Source interactive map component using Leaflet and OpenStreetMap.
 * Free from proprietary API keys, completely open-source, with smooth zooming, marker clusters,
 * custom SVG markers, and multi-tenant clinic visualization.
 * Uses dynamic Leaflet loading for 100% SSR & Node test environment safety.
 */
export default function OpenStreetClinicMap({
  center = [26.8206, 30.8025], // Egypt center
  zoom = 6,
  locations = [],
  userLocation = null,
  selectedId = null,
  onSelectLocation = () => {},
  height = '460px',
  interactive = true
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const LRef = useRef(null);

  const updateMarkers = useCallback((L, layer) => {
    if (!layer || !L) return;
    layer.clearLayers();

    // 1. Render User GPS Live Location Pin (if present)
    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      const userIcon = L.divIcon({
        className: 'custom-osm-user-marker',
        html: `
          <div class="user-location-pulse-ring"></div>
          <div class="user-location-pin">
            <span class="user-dot"></span>
          </div>
          <div class="marker-pin-label user-label">${userLocation.name || 'موقعي الحالي'}</div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userMarker.bindPopup(`
        <div class="osm-popup-content" dir="rtl">
          <div class="osm-popup-title" style="color:#0284C7; font-size:1rem; font-weight:800;">
            ${userLocation.name || 'موقعك الحالي الفعلي (GPS)'}
          </div>
          <div class="osm-popup-address" style="color:#334155; margin-top:4px;">
            ${userLocation.address || 'تم التحديد بدقة عبر المتصفح والأقمار الصناعية'}
          </div>
          <div style="font-size:0.75rem; color:#64748B; margin-top:6px; font-family:monospace; direction:ltr;">
            ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}
          </div>
        </div>
      `);
      userMarker.addTo(layer);
    }

    // 2. Render Clinic and Governorate Locations
    locations.forEach((loc) => {
      if (!loc.lat || !loc.lng) return;

      const isSelected = selectedId === loc.id;
      const count = loc.count || 1;
      const isClinic = Boolean(loc.isClinic);

      let pinColor = '#09090B';
      if (isSelected) {
        pinColor = '#10B981';
      } else if (isClinic) {
        if (loc.isSuspended) pinColor = '#DC2626';
        else if (loc.isLifetime) pinColor = '#D97706';
        else pinColor = '#0284C7';
      }

      // Clean SVG pin icon without external asset dependencies
      const customIcon = L.divIcon({
        className: 'custom-osm-marker',
        html: `
          <div class="marker-pin-bubble ${isSelected ? 'is-selected' : ''}" style="background-color: ${pinColor}; border-color: ${pinColor};">
            <span class="marker-pin-count">${isClinic ? '•' : count}</span>
          </div>
          <div class="marker-pin-label">${loc.name || ''}</div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 36],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });

      const popupContent = isClinic ? `
        <div class="osm-popup-content" dir="rtl" style="min-width: 220px;">
          <div class="osm-popup-title" style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-bottom: 4px;">
            ${loc.name}
          </div>
          ${loc.doctorName ? `<div style="font-size: 0.82rem; color: #334155; margin-bottom: 3px;">الطبيب: <strong>${loc.doctorName}</strong></div>` : ''}
          ${loc.specialty ? `<div style="font-size: 0.78rem; color: #0284C7; margin-bottom: 4px;">${loc.specialty}</div>` : ''}
          ${loc.address ? `<div class="osm-popup-address" style="font-size: 0.76rem; color: #64748B; margin-bottom: 6px;">${loc.address}</div>` : ''}
          ${loc.distanceKm !== undefined ? `
            <div style="font-size: 0.78rem; color: #059669; font-weight: 700; margin-bottom: 6px; display: inline-flex; align-items: center; gap: 4px;">
              <span>المسافة من موقعك:</span>
              <strong dir="ltr">${loc.distanceKm} km</strong>
            </div>
          ` : ''}
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; border-top: 1px solid #E2E8F0; padding-top: 8px;">
            ${loc.slug ? `<a href="/c/${loc.slug}/booking" target="_blank" rel="noreferrer" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700; background: #09090B; color: #FFF; border-radius: 6px; text-decoration: none;">صفحة الحجز</a>` : ''}
            ${loc.googleMapsUrl ? `<a href="${loc.googleMapsUrl}" target="_blank" rel="noreferrer" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700; background: #0284C7; color: #FFF; border-radius: 6px; text-decoration: none;">خرائط Google</a>` : ''}
          </div>
        </div>
      ` : `
        <div class="osm-popup-content" dir="rtl">
          <div class="osm-popup-title">${loc.name || 'موقع عيادة'}</div>
          ${loc.governorate ? `<div class="osm-popup-gov">${loc.governorate}</div>` : ''}
          ${loc.address ? `<div class="osm-popup-address">${loc.address}</div>` : ''}
          <div class="osm-popup-stat">
            <span>عدد العيادات المسجلة:</span>
            <strong>${count}</strong>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        onSelectLocation(loc.id);
      });

      marker.addTo(layer);

      // If this location is selected, open popup
      if (isSelected) {
        marker.openPopup();
      }
    });
  }, [locations, userLocation, selectedId, onSelectLocation]);

  // Initialize Leaflet Map dynamically
  useEffect(() => {
    let isMounted = true;
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    import('leaflet').then((leafletModule) => {
      if (!isMounted || !mapContainerRef.current) return;
      const L = leafletModule.default || leafletModule;
      LRef.current = L;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center,
          zoom,
          zoomControl: interactive,
          dragging: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          boxZoom: interactive,
          attributionControl: true
        });

        // Standard OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
        }).addTo(map);

        const markersGroup = L.layerGroup().addTo(map);
        markersLayerRef.current = markersGroup;
        mapInstanceRef.current = map;
        updateMarkers(L, markersGroup);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center and zoom if changed externally
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(center, zoom, { animate: true });
  }, [center, zoom]);

  // Update Markers when locations or selection changes
  useEffect(() => {
    if (mapInstanceRef.current && markersLayerRef.current && LRef.current) {
      updateMarkers(LRef.current, markersLayerRef.current);
    }
  }, [locations, selectedId, updateMarkers]);

  return (
    <div className="osm-map-outer-wrapper" style={{ height }}>
      <div ref={mapContainerRef} className="osm-map-container" />
      <div className="osm-map-attribution-badge">
        <span>خرائط مفتوحة المصدر (OpenStreetMap & Leaflet)</span>
      </div>
    </div>
  );
}
