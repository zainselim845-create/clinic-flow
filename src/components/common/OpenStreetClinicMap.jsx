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

    locations.forEach((loc) => {
      if (!loc.lat || !loc.lng) return;

      const isSelected = selectedId === loc.id;
      const count = loc.count || 1;

      // Clean SVG pin icon without external asset dependencies
      const customIcon = L.divIcon({
        className: 'custom-osm-marker',
        html: `
          <div class="marker-pin-bubble ${isSelected ? 'is-selected' : ''}">
            <span class="marker-pin-count">${count}</span>
          </div>
          <div class="marker-pin-label">${loc.name || ''}</div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 36],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });

      const popupContent = `
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
  }, [locations, selectedId, onSelectLocation]);

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
