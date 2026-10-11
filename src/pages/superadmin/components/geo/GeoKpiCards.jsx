import React from 'react';
import { MapPin, Award, Building2, Activity, TrendingUp } from 'lucide-react';

/**
 * GeoKpiCards - Geographic key performance indicator metrics grid
 */
export default function GeoKpiCards({ geoAnalytics }) {
  return (
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
  );
}
