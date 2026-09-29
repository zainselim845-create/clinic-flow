/**
 * ClinicFlow Auto Location Detection Service
 * Silently detects user location in the background without interrupting the user.
 * 1. Checks memory/session cache first.
 * 2. Attempts silent browser geolocation if permission is granted or non-blocking.
 * 3. Falls back immediately and silently to an IP-based location API.
 * 4. Never displays errors, popups, or blockers to the user.
 */

const CACHE_KEY = 'clinicflow_auto_user_location';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let inMemoryLocation = null;
let detectionPromise = null;

/**
 * Calculates distance between two coordinates in kilometers (Haversine Formula)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined || lat1 === null ||
    lon1 === undefined || lon1 === null ||
    lat2 === undefined || lat2 === null ||
    lon2 === undefined || lon2 === null
  ) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Formats distance in Arabic for clean user display
 */
export function formatDistanceAr(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return '';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `على بعد ${meters} متر تقريباً`;
  }
  return `على بعد ${distanceKm} كم تقريباً`;
}

/**
 * Retrieve cached location if still fresh
 */
function getCachedLocation() {
  if (inMemoryLocation) return inMemoryLocation;
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS) {
      inMemoryLocation = parsed.data;
      return inMemoryLocation;
    }
  } catch (_) {
    // Ignore storage parsing issues
  }
  return null;
}

/**
 * Save detected location to cache
 */
function setCachedLocation(data) {
  inMemoryLocation = data;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (_) {
    // Ignore storage quota issues
  }
}

/**
 * Attempt silent IP-based location fallback (2.5s timeout)
 */
async function fetchIpLocation(timeoutMs = 2500) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller ? controller.signal : undefined,
      headers: { 'Accept': 'application/json' }
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        return {
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          city: data.city || '',
          region: data.region || '',
          country: data.country_name || '',
          source: 'ip',
          accuracyKm: 15
        };
      }
    }
  } catch (_) {
    if (timeoutId) clearTimeout(timeoutId);
  }

  try {
    const res2 = await fetch('https://freeipapi.com/api/json', {
      headers: { 'Accept': 'application/json' }
    });
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.latitude && data2.longitude) {
        return {
          lat: Number(data2.latitude),
          lng: Number(data2.longitude),
          city: data2.cityName || '',
          region: data2.regionName || '',
          country: data2.countryName || '',
          source: 'ip_backup',
          accuracyKm: 25
        };
      }
    }
  } catch (_) {
    // Silent fail
  }

  return null;
}

/**
 * Silently detects user location without disturbing or blocking the user.
 * @param {Object} options
 * @returns {Promise<{lat: number, lng: number, city?: string, region?: string, source: string}|null>}
 */
export async function getAutoUserLocation(options = {}) {
  const cached = getCachedLocation();
  if (cached) return cached;

  if (detectionPromise) return detectionPromise;

  detectionPromise = (async () => {
    try {
      if (typeof window !== 'undefined' && navigator && navigator.geolocation) {
        let isPermissionGranted = false;
        try {
          if (navigator.permissions && navigator.permissions.query) {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            if (status.state === 'granted') {
              isPermissionGranted = true;
            }
          }
        } catch (_) {
          // Permissions API might not support 'geolocation' query in some browsers
        }

        if (isPermissionGranted) {
          const gpsResult = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                resolve({
                  lat: Math.round(pos.coords.latitude * 10000) / 10000,
                  lng: Math.round(pos.coords.longitude * 10000) / 10000,
                  accuracyKm: Math.round((pos.coords.accuracy || 100) / 1000 * 10) / 10,
                  source: 'gps'
                });
              },
              () => resolve(null),
              { timeout: 2000, maximumAge: 60000, enableHighAccuracy: false }
            );
          });

          if (gpsResult) {
            setCachedLocation(gpsResult);
            return gpsResult;
          }
        }
      }

      const ipResult = await fetchIpLocation(options.timeoutMs || 2500);
      if (ipResult) {
        setCachedLocation(ipResult);
        return ipResult;
      }
    } catch (_) {
      // Silent error suppression
    } finally {
      detectionPromise = null;
    }

    return null;
  })();

  return detectionPromise;
}
