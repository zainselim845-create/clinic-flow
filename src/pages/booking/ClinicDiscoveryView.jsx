import React from 'react';
import { 
  Building2, Search, Stethoscope, Award, MapPin, Globe, ArrowLeft 
} from 'lucide-react';
import { matchesSpecialtyFilter } from '../../utils/specialtyUtils';

export default function ClinicDiscoveryView({
  allTenants,
  discoverySearch,
  setDiscoverySearch,
  discoverySpecialty,
  setDiscoverySpecialty,
  onSelectClinic,
  onNavigate
}) {
  const filteredClinics = allTenants.filter(c => {
    if (c.subscriptionStatus === 'suspended') return false;
    const q = discoverySearch.trim().toLowerCase();
    const matchesQuery = !q || (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.doctorName && c.doctorName.toLowerCase().includes(q)) ||
      (c.specialty && c.specialty.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
    const matchesSpec = matchesSpecialtyFilter(c.specialty, discoverySpecialty);
    return matchesQuery && matchesSpec;
  });

  return (
    <div className="nebras-booking-page" dir="rtl" style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8fafc)' }}>
      {/* Top Bar */}
      <header className="nebras-top-bar" style={{ background: 'var(--bg-secondary, #ffffff)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
        <div className="nebras-brand" onClick={() => onNavigate('/')} style={{ cursor: 'pointer' }}>
          <Stethoscope size={24} className="brand-logo-icon" />
          <span className="brand-title">منظومة كلينيك فلو الموحدة</span>
        </div>
        <div className="nebras-bar-links">
          <button onClick={() => onNavigate('/')} className="nebras-nav-btn">
            <span>الرئيسية</span>
          </button>
          <button onClick={() => onNavigate('/manage-booking')} className="nebras-nav-btn">
            <span>تعديل موعد سابق</span>
          </button>
          <button onClick={() => onNavigate('/login?portal=clinic')} className="nebras-nav-btn outline">
            <span>دخول العيادات</span>
          </button>
          <button onClick={() => onNavigate('/login?portal=admin')} className="nebras-nav-btn" style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
            <span>إدارة الساس</span>
          </button>
        </div>
      </header>

      {/* Directory Content */}
      <div className="nebras-body-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Header Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.9rem',
            borderRadius: '9999px',
            background: 'rgba(2, 132, 199, 0.12)',
            color: '#0284c7',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            <Building2 size={15} />
            <span>دليل العيادات والمراكز الطبية المعتمدة</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary, #0f172a)', marginBottom: '0.75rem' }}>
            اختر عيادتك أو ابحث عن طبيبك لحجز موعد فوري
          </h1>
          <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto' }}>
            لكل عيادة على منظومة كلينيك فلو رابط حجز مستقل ومحمي. ابحث عن طبيبك أدناه للانتقال لصفحة الحجز المعتمدة:
          </p>
        </div>

        {/* Search Controls */}
        <div style={{ maxWidth: '720px', margin: '0 auto 2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={20} style={{ position: 'absolute', right: '1.25rem', color: '#94a3b8' }} />
            <input
              type="text"
              id="booking-discovery-search"
              name="bookingDiscoverySearch"
              aria-label="ابحث باسم العيادة، اسم الطبيب، التخصص، أو العنوان"
              value={discoverySearch}
              onChange={(e) => setDiscoverySearch(e.target.value)}
              placeholder="ابحث باسم العيادة، اسم الطبيب، التخصص، أو العنوان..."
              style={{
                width: '100%',
                padding: '0.95rem 3.25rem 0.95rem 1.25rem',
                background: 'var(--bg-secondary, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                fontSize: '1rem',
                color: 'var(--text-primary, #0f172a)',
                outline: 'none',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}
            />
            {discoverySearch && (
              <button
                onClick={() => setDiscoverySearch('')}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  background: '#f1f5f9',
                  border: 'none',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                إلغاء
              </button>
            )}
          </div>

          {/* Specialty Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['الكل', 'طب وجراحة الأسنان', 'الأمراض الجلدية والتجميل', 'طب الأطفال', 'جراحة العظام', 'أمراض الباطنة'].map(spec => (
              <button
                key={spec}
                onClick={() => setDiscoverySpecialty(spec)}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '8px',
                  border: discoverySpecialty === spec ? '1px solid #0284c7' : '1px solid var(--border-color, #e2e8f0)',
                  background: discoverySpecialty === spec ? '#0284c7' : 'var(--bg-secondary, #ffffff)',
                  color: discoverySpecialty === spec ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Clinics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredClinics.length > 0 ? (
            filteredClinics.map(clinic => (
              <div
                key={clinic.id || clinic.slug}
                style={{
                  background: 'var(--bg-secondary, #ffffff)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(2, 132, 199, 0.1)',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0, marginBottom: '0.2rem' }}>
                      {clinic.name}
                    </h3>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                      {clinic.doctorName}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: 'var(--bg-primary, #f8fafc)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary, #64748b)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={15} color="#0284c7" />
                    <span>{clinic.specialty}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={15} color="#0284c7" />
                    <span>{clinic.address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={15} color="#0284c7" />
                    <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#0284c7' }}>
                      {clinic.customDomain || `/c/${clinic.slug}/booking`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectClinic(clinic)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>احجز موعدك في هذه العيادة</span>
                  <ArrowLeft size={16} />
                </button>
              </div>
            ))
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: 'var(--bg-secondary, #ffffff)',
              borderRadius: '16px',
              border: '1px dashed var(--border-color, #cbd5e1)'
            }}>
              <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '1.05rem', marginBottom: '1rem' }}>
                لم يتم العثور على أي عيادة تطابق "{discoverySearch}".
              </p>
              <button
                onClick={() => { setDiscoverySearch(''); setDiscoverySpecialty('الكل'); }}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                إعادة ضبط البحث
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
