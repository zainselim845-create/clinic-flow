import React from 'react';

export interface AppleDockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  badge?: number | string;
  onClick?: () => void;
  active?: boolean;
}

export interface AppleGlassDockProps {
  items: AppleDockItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  position?: 'fixed-bottom' | 'relative';
  className?: string;
}

export const AppleGlassDock: React.FC<AppleGlassDockProps> = ({
  items,
  activeId,
  onSelect,
  position = 'fixed-bottom',
  className = ''
}) => {
  const containerClass =
    position === 'fixed-bottom'
      ? `apple-dock-container-fixed ${className}`
      : `relative flex justify-center w-full ${className}`;

  return (
    <div className={containerClass}>
      <nav
        role="navigation"
        aria-label="شريط الوصول السريع"
        className="apple-dock"
      >
        {items.map((item) => {
          const isActive = activeId !== undefined ? activeId === item.id : !!item.active;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.onClick) item.onClick();
                if (onSelect) onSelect(item.id);
              }}
              className={`apple-dock-btn ${isActive ? 'apple-dock-btn-active' : ''}`}
              title={item.label}
              aria-label={item.label}
            >
              {/* Badge Counter */}
              {item.badge !== undefined && item.badge !== 0 && (
                <span className="apple-dock-badge">
                  {item.badge}
                </span>
              )}

              {/* Icon */}
              <div className={`flex items-center justify-center transition-transform ${item.color || ''}`}>
                {item.icon}
              </div>

              {/* Active Indicator Dot */}
              {isActive && <span className="apple-dock-dot" />}

              {/* Apple-style floating tooltip on hover */}
              <span className="apple-dock-tooltip">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppleGlassDock;
