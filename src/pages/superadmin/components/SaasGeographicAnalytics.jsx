import React, { useState, useMemo } from 'react';
import { 
  MapPin, Globe, Building2, Users, Compass, 
  Search, ShieldCheck, Activity, Award, CheckCircle2,
  Lock, ArrowUpRight, TrendingUp
} from 'lucide-react';

// Standard Egyptian Governorates and Regional Clusters
export const EGYPT_GOVERNORATES = [
  { id: 'cairo', name: 'القاهرة', region: 'greater_cairo', keywords: ['قاهرة', 'cairo', 'تجمع', 'معادي', 'نصر', 'جديدة', 'شروق', 'مدينتي', 'رحاب', 'ميديكال بارك', 'أهرام'] },
  { id: 'giza', name: 'الجيزة', region: 'greater_cairo', keywords: ['جيزة', 'giza', 'دقي', 'مهندسين', 'أكتوبر', 'october', 'زايد', 'zayed', 'هرم', 'فيصل'] },
  { id: 'alexandria', name: 'الإسكندرية', region: 'alex_coast', keywords: ['إسكندرية', 'اسكندرية', 'alex', 'alexandria', 'سموحة', 'لوران', 'رشدي', 'رمل'] },
  { id: 'dakahlia', name: 'الدقهلية (المنصورة)', region: 'delta', keywords: ['دقهلية', 'منصورة', 'mansoura', 'ميت غمر', 'سنبلاوين'] },
  { id: 'gharbia', name: 'الغربية (طنطا)', region: 'delta', keywords: ['غربية', 'طنطا', 'tanta', 'محلة'] },
  { id: 'sharqia', name: 'الشرقية (الزقازيق)', region: 'delta', keywords: ['شرقية', 'زقازيق', 'عاشر', '10th'] },
  { id: 'qalyubia', name: 'القليوبية (بنها)', region: 'greater_cairo', keywords: ['قليوبية', 'بنها', 'شبرا'] },
  { id: 'menofia', name: 'المنوفية (شبين الكوم)', region: 'delta', keywords: ['منوفية', 'شبين', 'سادات', 'منوف'] },
  { id: 'beheira', name: 'البحيرة (دمنهور)', region: 'delta', keywords: ['بحيرة', 'دمنهور', 'كفر الدوار'] },
  { id: 'kafr_el_sheikh', name: 'كفر الشيخ', region: 'delta', keywords: ['كفر الشيخ', 'دسوق'] },
  { id: 'damietta', name: 'دمياط', region: 'delta', keywords: ['دمياط', 'رأس البر'] },
  { id: 'port_said', name: 'بورسعيد', region: 'canal', keywords: ['بورسعيد', 'بورفؤاد'] },
  { id: 'ismailia', name: 'الإسماعيلية', region: 'canal', keywords: ['إسماعيلية', 'اسماعيلية'] },
  { id: 'suez', name: 'السويس', region: 'canal', keywords: ['سويس', 'عين سخنة'] },
  { id: 'fayoum', name: 'الفيوم', region: 'upper_egypt', keywords: ['فيوم'] },
  { id: 'beni_suef', name: 'بني سويف', region: 'upper_egypt', keywords: ['بني سويف'] },
  { id: 'minya', name: 'المنيا', region: 'upper_egypt', keywords: ['منيا', 'ملوي'] },
  { id: 'assiut', name: 'أسيوط', region: 'upper_egypt', keywords: ['أسيوط', 'اسيوط', 'ديروط'] },
  { id: 'sohag', name: 'سوهاج', region: 'upper_egypt', keywords: ['سوهاج', 'طهطا', 'جرجا'] },
  { id: 'qena', name: 'قنا', region: 'upper_egypt', keywords: ['قنا', 'نجع حمادي'] },
  { id: 'luxor', name: 'الأقصر', region: 'upper_egypt', keywords: ['أقصر', 'اقصر', 'luxor'] },
  { id: 'aswan', name: 'أسوان', region: 'upper_egypt', keywords: ['أسوان', 'اسوان', 'aswan'] },
  { id: 'red_sea', name: 'البحر الأحمر (الغردقة)', region: 'frontier', keywords: ['بحر أحمر', 'غردقة', 'hurghada', 'جونة'] },
  { id: 'matrouh', name: 'مطروح والساحل الشمالي', region: 'frontier', keywords: ['مطروح', 'ساحل', 'علمين'] }
];

export const REGIONAL_CLUSTERS = {
  greater_cairo: 'إقليم القاهرة الكبرى',
  alex_coast: 'الإسكندرية والساحل',
  delta: 'محافظات الدلتا والوجه البحري',
  canal: 'مدن القناة وسيناء',
  upper_egypt: 'محافظات صعيد مصر',
  frontier: 'المحافظات الساحلية والحدودية',
  gulf_international: 'الخليج والتوسع الدولي'
};

/**
 * Heuristic detector for clinic location based on address, phone, and name
 */
export function detectClinicLocation(clinic = {}) {
  const address = (clinic.address || '').toLowerCase();
  const name = (clinic.name || '').toLowerCase();
  const text = `${address} ${name}`;

  // 1. Check Egyptian governorates
  for (const gov of EGYPT_GOVERNORATES) {
    for (const kw of gov.keywords) {
      if (text.includes(kw)) {
        return {
          country: 'مصر',
          countryCode: 'EG',
          governorateId: gov.id,
          governorateName: gov.name,
          regionCluster: gov.region,
          regionClusterName: REGIONAL_CLUSTERS[gov.region]
        };
      }
    }
  }

  // 2. Check Gulf / International
  if (text.includes('سعودية') || text.includes('رياض') || text.includes('جدة') || text.includes('saudi') || (clinic.phone && clinic.phone.startsWith('+966'))) {
    return { country: 'المملكة العربية السعودية', countryCode: 'SA', governorateId: 'riyadh', governorateName: 'الرياض والمملكة', regionCluster: 'gulf_international', regionClusterName: REGIONAL_CLUSTERS.gulf_international };
  }
  if (text.includes('إمارات') || text.includes('دبي') || text.includes('uae') || text.includes('dubai') || (clinic.phone && clinic.phone.startsWith('+971'))) {
    return { country: 'الإمارات العربية المتحدة', countryCode: 'AE', governorateId: 'dubai', governorateName: 'دبي والإمارات', regionCluster: 'gulf_international', regionClusterName: REGIONAL_CLUSTERS.gulf_international };
  }
  if (text.includes('كويت') || text.includes('kuwait') || (clinic.phone && clinic.phone.startsWith('+965'))) {
    return { country: 'الكويت', countryCode: 'KW', governorateId: 'kuwait', governorateName: 'دولة الكويت', regionCluster: 'gulf_international', regionClusterName: REGIONAL_CLUSTERS.gulf_international };
  }

  // Default: Cairo (Heart of Operations)
  return {
    country: 'مصر',
    countryCode: 'EG',
    governorateId: 'cairo',
    governorateName: 'القاهرة',
    regionCluster: 'greater_cairo',
    regionClusterName: REGIONAL_CLUSTERS.greater_cairo
  };
}

export default function SaasGeographicAnalytics({ allTenants = [] }) {
  const [selectedGovernorate, setSelectedGovernorate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Process and group all clinics by geographical coordinates & clusters
  const geoAnalytics = useMemo(() => {
    const govCounts = {};
    const clusterCounts = {};
    const clinicsWithGeo = allTenants.map(t => {
      const loc = detectClinicLocation(t);
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

      govCounts[govKey].clinics.push({
        ...t,
        geo: loc
      });

      return {
        ...t,
        geo: loc
      };
    });

    const sortedGovs = Object.values(govCounts).sort((a, b) => b.total - a.total);
    const sortedClusters = Object.values(clusterCounts).sort((a, b) => b.total - a.total);

    const totalClinics = allTenants.length;
    const topGov = sortedGovs[0] || { name: 'القاهرة', total: 0 };
    const uniqueGovsCount = sortedGovs.length;

    return {
      clinicsWithGeo,
      sortedGovs,
      sortedClusters,
      totalClinics,
      topGov,
      uniqueGovsCount
    };
  }, [allTenants]);

  // Filtered clinics based on UI selection
  const displayedClinics = useMemo(() => {
    return geoAnalytics.clinicsWithGeo.filter(c => {
      const matchesGov = selectedGovernorate === 'all' || c.geo.governorateId === selectedGovernorate;
      const matchesSearch = !searchQuery || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.doctorName && c.doctorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.geo.governorateName.includes(searchQuery);
      return matchesGov && matchesSearch;
    });
  }, [geoAnalytics.clinicsWithGeo, selectedGovernorate, searchQuery]);

  return (
    <div className="saas-geographic-analytics" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: 'rtl' }}>
      
      {/* Top Banner & Telemetry Info */}
      <div style={{
        background: 'linear-gradient(135deg, #09090B 0%, #18181B 100%)',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38BDF8'
          }}>
            <Globe size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
              مركز الذكاء والانتشار الجغرافي (Geographic Intelligence)
            </h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem', color: '#A1A1AA' }}>
              رصد وتتبع مواقع استخدام العيادات وتوزيع الحسابات حسب المحافظات والمناطق الإقليمية
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38BDF8',
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <Compass size={14} />
            <span>نطاق التشغيل: جمهورية مصر العربية والإقليم العربي</span>
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>المحافظات والمواقع المغطاة</span>
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
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>المحافظة الأكثر كثافة بالعيادات</span>
            <Award size={18} color="#EAB308" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {geoAnalytics.topGov.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {geoAnalytics.topGov.total} عيادة ({geoAnalytics.totalClinics > 0 ? Math.round((geoAnalytics.topGov.total / geoAnalytics.totalClinics) * 100) : 0}٪ من المنصة)
          </div>
        </div>

        <div style={{ background: 'var(--surface, #FFF)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>إجمالي العيادات الموزعة</span>
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

      {/* Main Grid: Regional Distribution Breakdown + Filterable Clinics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(340px, 1.4fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Governorates Ranking & Visual Bars */}
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
              ترتيب المحافظات والمناطق (Distribution by Region)
            </h4>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              اضغط على المحافظة للتصفية
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* "All Regions" Button */}
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

            {/* List of Governorates with Visual Ratio Bars */}
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

        {/* Right Column: Filtered Clinics Directory with Exact Location Badges */}
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
                سجل العيادات في المنطقة المحددة ({displayedClinics.length})
              </h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                تفاصيل الحسابات، الأطباء، والعناوين الميدانية
              </span>
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو العنوان..."
                style={{
                  width: '100%',
                  padding: '0.45rem 2rem 0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.82rem'
                }}
              />
            </div>
          </div>

          {displayedClinics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <MapPin size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد عيادات مسجلة مطابقة لمعايير البحث في هذه المنطقة.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {displayedClinics.map(c => {
                const isSuspended = c.subscriptionStatus === 'suspended';
                const isLifetime = Boolean(c.isLifetimeLicense || c.subscriptionStatus === 'lifetime');

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
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          الطبيب: {c.doctorName || 'طبيب العيادة'} • المسار: <code>/{c.slug}</code>
                        </div>

                        <div style={{ fontSize: '0.74rem', color: '#0284C7', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={12} />
                          <span>{c.address || c.geo.governorateName}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
