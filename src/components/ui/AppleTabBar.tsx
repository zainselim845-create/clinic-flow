import React from 'react';

export interface AppleTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  onClick: () => void;
  active?: boolean;
}

export interface AppleTabBarProps {
  tabs: AppleTabItem[];
  className?: string;
}

export const AppleTabBar: React.FC<AppleTabBarProps> = ({ tabs, className = '' }) => {
  return (
    <nav
      aria-label="شريط التبويب السفلي"
      className={`fixed bottom-0 inset-x-0 z-40 h-[83px] pb-[34px] backdrop-blur-xl bg-white/70 dark:bg-[#1C1C1E]/70 border-t border-black/5 dark:border-white/10 flex items-center justify-around px-2 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            className="flex-1 flex flex-col items-center justify-center py-1 select-none apple-touch-press cursor-pointer relative"
          >
            <div
              className={`relative flex items-center justify-center ${
                isActive
                  ? 'text-[#007AFF] dark:text-[#0A84FF]'
                  : 'text-[#8E8E93] dark:text-[#8E8E93]'
              }`}
            >
              {tab.icon}
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -end-2 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[10px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-0.5 tracking-tight ${
                isActive
                  ? 'text-[#007AFF] dark:text-[#0A84FF] font-semibold'
                  : 'text-[#8E8E93] dark:text-[#8E8E93] font-normal'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default AppleTabBar;
