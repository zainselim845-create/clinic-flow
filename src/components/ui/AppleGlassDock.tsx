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
  const containerPositionClass =
    position === 'fixed-bottom'
      ? 'fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[95vw]'
      : 'relative flex justify-center w-full';

  return (
    <div className={`${containerPositionClass} ${className}`}>
      <nav
        role="navigation"
        aria-label="شريط الوصول السريع"
        className="flex items-end gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-[26px] apple-dock shadow-2xl transition-all duration-300"
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
              className="group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition-all duration-300 hover:-translate-y-2 active:scale-90 cursor-pointer outline-hidden"
              title={item.label}
              aria-label={item.label}
            >
              {/* Badge Counter */}
              {item.badge !== undefined && item.badge !== 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--apple-red)] text-white text-[10px] font-bold flex items-center justify-center shadow-xs border border-white/40">
                  {item.badge}
                </span>
              )}

              {/* Icon */}
              <div className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center transition-transform group-hover:scale-110 ${item.color || 'text-zinc-800 dark:text-zinc-100'}`}>
                {item.icon}
              </div>

              {/* Active Indicator Dot */}
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white shadow-xs" />
              )}

              {/* Apple-style floating tooltip on hover */}
              <span className="pointer-events-none absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap bg-black/80 dark:bg-white/90 text-white dark:text-black shadow-md backdrop-blur-xs">
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
