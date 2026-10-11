import React from 'react';
import { Globe, Activity } from 'lucide-react';

/**
 * GeoCommandHeader - Top command center banner with map mode selector
 */
export default function GeoCommandHeader({ activeMapMode, setActiveMapMode }) {
  return (
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
  );
}
