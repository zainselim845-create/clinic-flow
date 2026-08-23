import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.css';

const StatCard = ({ icon: Icon, title, value, change, changeType, color = 'var(--color-primary)' }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrapper" style={{ backgroundColor: `${color}20`, color: color }}>
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value">{value}</div>
        {change && (
          <div className={`stat-change ${changeType}`}>
            {changeType === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{change}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
