import React, { useState } from 'react';
import { MapPin, LocateFixed, Compass, RefreshCw, AlertCircle, Globe, ExternalLink } from 'lucide-react';

export default function ClinicLocationGpsSection({ clinicForm, setClinicForm }) {
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState(null);

  const handleCaptureClinicGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsNotice({ type: 'error', text: 'خاصية تحديد الموقع عبر GPS غير مدعومة في هذا المتصفح.' });
      return;
    }
    setIsLocatingGps(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

        let detectedAddress = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'Accept-Language': 'ar,en' }
          });
          if (res.ok) {
            const data = await res.json();
            detectedAddress = data.display_name || '';
          }
        } catch (fetchErr) {
          console.warn('[GPS Geocoding] Reverse geocode lookup note:', fetchErr);
        }

        setClinicForm(prev => ({
          ...prev,
          googleMapsUrl: mapsLink,
          coordinates: { lat, lng },
          address: prev.address || detectedAddress
        }));

        setGpsNotice({
          type: 'success',
          text: `تم تحديد إحداثيات العيادة بدقة عبر GPS (${lat}, ${lng}) بنجاح!`
        });
        setIsLocatingGps(false);
      },
      (err) => {
        console.warn('[GPS Geocoding] Geolocation error:', err);
        setGpsNotice({
          type: 'error',
          text: err.code === 1 ? 'تم رفض إذن الوصول للموقع. يرجى تفعيل إذن الموقع في المتصفح أو إدخال الرابط يدوياً.' : 'تعذر التقاط إشارة GPS. يرجى إدخال الرابط يدوياً.'
        });
        setIsLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <>
      <div className="form-group full-width" style={{
        background: 'var(--surface-container, #F8FAFC)',
        border: '1.5px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginTop: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(2, 132, 199, 0.1)',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MapPin size={20} />
            </div>
            <div>
              <h5 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                الموقع الجغرافي للعيادة وخرائط جوجل (Google Maps & GPS)
              </h5>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                حدد موقع عيادتك الحقيقي ليتمكن المرضى من الملاحة المباشرة للعيادة عبر Google Maps
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCaptureClinicGps}
            disabled={isLocatingGps}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              background: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: isLocatingGps ? 'not-allowed' : 'pointer',
              opacity: isLocatingGps ? 0.7 : 1,
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
            }}
          >
            {isLocatingGps ? (
              <>
                <RefreshCw size={14} className="spin-animate" />
                <span>جاري التقاط الإحداثيات...</span>
              </>
            ) : (
              <>
                <LocateFixed size={14} />
                <span>تحديد موقعي الحالي بالـ GPS تلقائياً</span>
              </>
            )}
          </button>
        </div>

        {gpsNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            background: gpsNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: gpsNotice.type === 'success' ? '#059669' : '#DC2626',
            border: `1px solid ${gpsNotice.type === 'success' ? '#A7F3D0' : '#FECACA'}`
          }}>
            {gpsNotice.type === 'success' ? <Compass size={16} /> : <AlertCircle size={16} />}
            <span>{gpsNotice.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="googleMapsUrl" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              رابط موقع العيادة المباشر على Google Maps
            </label>
            <div className="input-with-icon">
              <MapPin size={16} />
              <input
                id="googleMapsUrl"
                name="googleMapsUrl"
                type="url"
                dir="ltr"
                value={clinicForm.googleMapsUrl || ''}
                onChange={(e) => setClinicForm({ ...clinicForm, googleMapsUrl: e.target.value })}
                placeholder="https://maps.app.goo.gl/... أو https://google.com/maps?q=lat,lng"
                style={{ fontSize: '0.82rem' }}
              />
            </div>
            <small style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              الصق رابط مشاركة الموقع من تطبيق خرائط جوجل
            </small>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              الإحداثيات الجغرافية الدقيقة (Latitude, Longitude)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                step="0.0001"
                placeholder="خط العرض (Lat)"
                dir="ltr"
                value={clinicForm.coordinates?.lat ?? ''}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value) || 0;
                  setClinicForm(prev => ({
                    ...prev,
                    coordinates: {
                      lat,
                      lng: prev.coordinates?.lng || 0
                    },
                    googleMapsUrl: prev.googleMapsUrl || (lat && prev.coordinates?.lng ? `https://www.google.com/maps?q=${lat},${prev.coordinates.lng}` : prev.googleMapsUrl)
                  }));
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace'
                }}
              />
              <input
                type="number"
                step="0.0001"
                placeholder="خط الطول (Lng)"
                dir="ltr"
                value={clinicForm.coordinates?.lng ?? ''}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value) || 0;
                  setClinicForm(prev => ({
                    ...prev,
                    coordinates: {
                      lat: prev.coordinates?.lat || 0,
                      lng
                    },
                    googleMapsUrl: prev.googleMapsUrl || (prev.coordinates?.lat && lng ? `https://www.google.com/maps?q=${prev.coordinates.lat},${lng}` : prev.googleMapsUrl)
                  }));
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            يتم إرفاق هذا الرابط تلقائياً في تذاكر الحجز ورسائل الـ SMS للمرضى للملاحة المباشرة.
          </span>
          {(clinicForm.googleMapsUrl || (clinicForm.coordinates?.lat && clinicForm.coordinates?.lng)) && (
            <a
              href={clinicForm.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${clinicForm.coordinates?.lat},${clinicForm.coordinates?.lng}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                color: '#0284C7',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={13} />
              <span>معاينة وفتح الموقع في خرائط Google للاتجاهات</span>
            </a>
          )}
        </div>
      </div>

      <div className="form-group full-width">
        <label htmlFor="googleReviewUrl">رابط صفحة تقييمات العيادة على خرائط جوجل (Google Maps Reviews URL)</label>
        <div className="input-with-icon">
          <Globe size={18} />
          <input 
            id="googleReviewUrl"
            name="googleReviewUrl"
            type="url" 
            dir="ltr"
            value={clinicForm.googleReviewUrl || ''} 
            onChange={(e) => setClinicForm({ ...clinicForm, googleReviewUrl: e.target.value })}
            placeholder="https://g.page/r/your-clinic/review أو https://maps.google.com/?cid=..." 
          />
        </div>
        <small style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
          يوجه النظام المرضى الراضين تلقائياً لتقييم عيادتك على Google Maps بعد إتمام الكشف بنجاح لرفع تقييم العيادة.
        </small>
      </div>
    </>
  );
}
