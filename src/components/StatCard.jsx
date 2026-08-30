import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.css';

const StatCard = ({ icon: Icon, title, value, change, changeType = 'up', badgeText, color = 'blue' }) => {
  const colorMap = {
    blue: { bg: 'rgba(37, 99, 235, 0.1)', text: '#2563EB', border: 'rgba(37, 99, 235, 0.2)' },
    green: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: 'rgba(16, 185, 129, 0.2)' },
    purple: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6', border: 'rgba(139, 92, 246, 0.2)' },
    teal: { bg: 'rgba(13, 148, 136, 0.1)', text: '#0D9488', border: 'rgba(13, 148, 136, 0.2)' },
    amber: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="modern-stat-card glass-card">
      <div className="stat-header-row">
        <span className="stat-title-label">{title}</span>
        <div className="stat-icon-badge" style={{ background: scheme.bg, color: scheme.text, border: `1px solid ${scheme.border}` }}>
          <Icon size={20} />
        </div>
      </div>
      
      <div className="stat-main-row">
        <div className="stat-number-value">{value}</div>
      </div>

      <div className="stat-footer-row">
        {change ? (
          <div className={`stat-trend-chip ${changeType}`}>
            {changeType === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{change}%</span>
          </div>
        ) : badgeText ? (
          <span className="stat-custom-badge">{badgeText}</span>
        ) : (
          <span className="stat-live-dot">
            <span className="pulsing-dot"></span>
            <span>محدث لحظياً</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
