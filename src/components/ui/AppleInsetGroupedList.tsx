import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export type AppleSystemColor = 
  | 'blue' 
  | 'green' 
  | 'indigo' 
  | 'orange' 
  | 'pink' 
  | 'purple' 
  | 'red' 
  | 'teal' 
  | 'yellow';

const systemColorBg: Record<AppleSystemColor, string> = {
  blue: 'bg-[#007AFF] dark:bg-[#0A84FF]',
  green: 'bg-[#34C759] dark:bg-[#30D158]',
  indigo: 'bg-[#5856D6] dark:bg-[#5E5CE6]',
  orange: 'bg-[#FF9500] dark:bg-[#FF9F0A]',
  pink: 'bg-[#FF2D55] dark:bg-[#FF375F]',
  purple: 'bg-[#AF52DE] dark:bg-[#BF5AF2]',
  red: 'bg-[#FF3B30] dark:bg-[#FF453A]',
  teal: 'bg-[#5AC8FA] dark:bg-[#64D2FF]',
  yellow: 'bg-[#FFCC00] dark:bg-[#FFD60A]',
};

export interface AppleInsetItemProps {
  id?: string | number;
  icon?: React.ReactNode;
  iconColor?: AppleSystemColor;
  iconSize?: 'sm' | 'md';
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface AppleInsetGroupedListProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  items?: AppleInsetItemProps[];
  children?: React.ReactNode;
  className?: string;
}

export const AppleInsetGroupedCard: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => {
  return (
    <div
      className={`apple-inset-card bg-white dark:bg-[#1C1C1E] rounded-[16px] sm:rounded-[20px] overflow-hidden shadow-xs border border-black/5 dark:border-white/5 ${className}`}
    >
      {children}
    </div>
  );
};

export const AppleInsetItem: React.FC<AppleInsetItemProps & { isLast?: boolean }> = ({
  icon,
  iconColor = 'blue',
  iconSize = 'md',
  title,
  subtitle,
  value,
  badge,
  trailing,
  chevron = false,
  onClick,
  disabled = false,
  destructive = false,
  isLast = false,
}) => {
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const isClickable = Boolean(onClick) && !disabled;
  const squircleSize = iconSize === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  return (
    <div className="relative">
      <div
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? onClick : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        className={`flex items-center justify-between px-4 py-3 sm:py-3.5 transition-colors duration-150 select-none ${
          isClickable
            ? 'cursor-pointer active:bg-black/5 dark:active:bg-white/5 apple-touch-press'
            : ''
        } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      >
        {/* Leading: Icon + Title/Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0">
          {icon && (
            <div
              className={`rounded-[7px] flex items-center justify-center text-white shadow-xs flex-shrink-0 ${squircleSize} ${systemColorBg[iconColor]}`}
            >
              {icon}
            </div>
          )}

          <div className="min-w-0 flex flex-col">
            <span
              className={`text-[17px] font-normal leading-tight truncate ${
                destructive
                  ? 'text-[#FF3B30] dark:text-[#FF453A] font-medium'
                  : 'text-zinc-900 dark:text-white'
              }`}
            >
              {title}
            </span>
            {subtitle && (
              <span className="text-[13px] text-[#8E8E93] leading-tight truncate mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Trailing: Value / Badge / Action / Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0 ms-3">
          {value && (
            <span className="text-[17px] text-[#8E8E93] font-normal">{value}</span>
          )}

          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/15 dark:text-[#0A84FF]">
              {badge}
            </span>
          )}

          {trailing}

          {chevron && (
            <ChevronIcon className="w-4 h-4 text-[#C7C7CC] dark:text-[#48484A]" />
          )}
        </div>
      </div>

      {/* Indented 0.5px Separator */}
      {!isLast && (
        <div
          className="h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]"
          style={{
            marginInlineStart: icon ? (iconSize === 'sm' ? '3.25rem' : '3.65rem') : '1rem',
          }}
        />
      )}
    </div>
  );
};

export const AppleInsetGroupedList: React.FC<AppleInsetGroupedListProps> = ({
  header,
  footer,
  items,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {header && (
        <div className="px-4 text-[13px] font-normal text-[#8E8E93] uppercase tracking-wider">
          {header}
        </div>
      )}

      <AppleInsetGroupedCard>
        {items
          ? items.map((item, idx) => (
              <AppleInsetItem
                key={item.id ?? idx}
                {...item}
                isLast={idx === items.length - 1}
              />
            ))
          : children}
      </AppleInsetGroupedCard>

      {footer && (
        <div className="px-4 text-[13px] font-normal text-[#8E8E93] leading-relaxed">
          {footer}
        </div>
      )}
    </div>
  );
};

export default AppleInsetGroupedList;
