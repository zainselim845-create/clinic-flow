import React from 'react';

export interface AppleNavigationBarProps {
  title?: React.ReactNode;
  largeTitle?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const AppleNavigationBar: React.FC<AppleNavigationBarProps> = ({
  title,
  largeTitle,
  leading,
  trailing,
  subtitle,
  className = '',
  children,
}) => {
  return (
    <header
      className={`sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 dark:bg-[#1C1C1E]/70 border-b border-black/5 dark:border-white/10 transition-colors duration-200 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            {leading}
            {title && (
              <div className="flex flex-col">
                <span className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-white">
                  {title}
                </span>
                {subtitle && (
                  <span className="text-[12px] text-[#8E8E93]">{subtitle}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">{trailing}</div>
        </div>

        {largeTitle && (
          <div className="pb-3 pt-1">
            <h1 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-white">
              {largeTitle}
            </h1>
          </div>
        )}

        {children}
      </div>
    </header>
  );
};

export default AppleNavigationBar;
