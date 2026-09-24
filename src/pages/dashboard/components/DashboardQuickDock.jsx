import React from 'react';

/**
 * DashboardQuickDock
 * Floating Quick Actions Command Dock at the bottom of the clinical dashboard.
 */
const DashboardQuickDock = ({ dockItems = [] }) => {
  if (!dockItems || dockItems.length === 0) return null;

  return (
    <div 
      className="dashboard-floating-dock" 
      role="toolbar" 
      aria-label="شريط الوصول السريع للعمليات السريرية"
    >
      <div className="dock-actions-group">
        {dockItems.map((item, idx) => (
          <React.Fragment key={item.id}>
            {/* Vertical separator between main action triggers and filtering tabs */}
            {idx === 2 && <div className="dock-separator" role="separator" aria-orientation="vertical" />}
            <button
              type="button"
              onClick={item.onClick}
              className={`dock-pill-btn ${item.active ? 'active' : ''}`}
              title={item.label}
              aria-pressed={item.active}
            >
              <span className={`dock-icon-box ${item.iconType || 'default'}`}>
                {item.icon}
              </span>
              <span className="dock-label">{item.label}</span>
              {item.badge !== undefined && (
                <span className="dock-badge">{item.badge}</span>
              )}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default DashboardQuickDock;
