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
      className={`inline-flex p-1 rounded-full apple-glass-subtle border border-white/30 dark:border-white/10 ${
        size === 'sm' ? 'text-xs' : 'text-sm'
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
            className={`relative flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition-all duration-300 apple-spring cursor-pointer select-none ${
              isSelected
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm shadow-black/5 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
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

export default AppleGlassSegmentedControl;
