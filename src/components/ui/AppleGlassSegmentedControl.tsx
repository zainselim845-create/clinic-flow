import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface AppleGlassSegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function AppleGlassSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = ''
}: AppleGlassSegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex p-[2px] rounded-[9px] bg-[#E5E5EA] dark:bg-[#2C2C2E] select-none ${
        size === 'sm' ? 'text-[12px]' : 'text-[13px]'
      } ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;

        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center justify-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-[7px] font-medium transition-all duration-200 apple-spring cursor-pointer select-none ${
              isSelected
                ? 'bg-white dark:bg-[#636366] text-zinc-900 dark:text-white shadow-[0_2px_4px_rgba(0,0,0,0.08)] font-semibold'
                : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] bg-black/5 dark:bg-white/10">
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const AppleSegmentedControl = AppleGlassSegmentedControl;

export default AppleGlassSegmentedControl;
