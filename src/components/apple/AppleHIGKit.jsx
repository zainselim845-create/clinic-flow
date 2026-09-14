import React, { useState, createContext, useContext } from 'react';
import {
  ChevronRight,
  Minus,
  Plus
} from 'lucide-react';

// =========================================================================
// 1. APPLE DESIGN SYSTEM THEME CONTEXT
// =========================================================================

const AppleThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {}
});

export const useAppleTheme = () => useContext(AppleThemeContext);

export const AppleThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <AppleThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={isDark ? 'dark' : ''}>
        {children}
      </div>
    </AppleThemeContext.Provider>
  );
};

// =========================================================================
// 2. APPLE NATIVE BUTTONS (Prominent, Tinted, Plain, Destructive)
// =========================================================================

export const AppleButton = ({
  variant = 'prominent',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  icon: Icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-[32px] px-3 text-[13px] font-medium rounded-full',
    md: 'h-[44px] px-5 text-[15px] font-semibold rounded-full',
    lg: 'h-[50px] px-6 text-[17px] font-semibold rounded-full'
  }[size] || 'h-[44px] px-5 text-[15px] font-semibold rounded-full';

  const variantClasses = {
    prominent:
      'bg-[#007AFF] text-white hover:bg-[#0071E3] active:bg-[#0062C4] shadow-[0_2px_8px_rgba(0,122,255,0.25)]',
    tinted:
      'bg-[#007AFF]/15 text-[#007AFF] hover:bg-[#007AFF]/20 active:bg-[#007AFF]/25',
    plain:
      'bg-transparent text-[#007AFF] hover:opacity-80 active:opacity-60 p-0 h-auto font-normal',
    destructive:
      'bg-[#FF3B30] text-white hover:bg-[#E0352B] active:bg-[#C92F26] shadow-[0_2px_8px_rgba(255,59,48,0.25)]'
  }[variant] || 'bg-[#007AFF] text-white';

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 select-none transition-all duration-150
        active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer
        ${sizeClasses}
        ${variantClasses}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : size === 'md' ? 18 : 20} strokeWidth={2.4} />}
          {children}
        </>
      )}
    </button>
  );
};

// =========================================================================
// 3. APPLE NATIVE TOGGLE SWITCH (51x31px with 27px Knob)
// =========================================================================

export const AppleToggle = ({
  checked,
  onChange,
  disabled = false,
  id,
  name,
  'aria-label': ariaLabel
}) => {
  return (
    <button
      id={id}
      name={name}
      type="button"
      role="switch"
      dir="ltr"
      aria-checked={checked}
      aria-label={ariaLabel || 'Apple Switch'}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex items-center shrink-0 w-[51px] h-[31px] rounded-full p-[2px]
        transition-colors duration-250 ease-in-out cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${checked ? 'bg-[#34C759]' : 'bg-[#E9E9EB] dark:bg-[#39393D]'}
      `}
    >
      <span
        className={`
          inline-block w-[27px] h-[27px] rounded-full bg-white
          shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]
          transform transition-transform duration-250 ease-in-out pointer-events-none
          ${checked ? 'translate-x-[20px]' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

// =========================================================================
// 4. APPLE SQUIRCLE ICON CONTAINER (30x30px with 8px radius)
// =========================================================================

export const AppleSquircle = ({
  icon: Icon,
  bgHex,
  colorHex = '#FFFFFF',
  size = 18
}) => {
  return (
    <div
      style={{ backgroundColor: bgHex }}
      className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
    >
      <Icon size={size} style={{ color: colorHex }} strokeWidth={2.2} />
    </div>
  );
};

// =========================================================================
// 5. APPLE INSET GROUP & LIST ROW (HIG Solid Surface Cards)
// =========================================================================

export const AppleInsetGroup = ({
  header,
  footer,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {header && (
        <div className="px-4">
          <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wider">
            {header}
          </span>
        </div>
      )}
      
      {/* Solid Inset Surface Card - HIG Strict (No fake blur on content surfaces) */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[16px] border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {children}
      </div>

      {footer && (
        <div className="px-4">
          <p className="text-[13px] font-normal text-[#8E8E93] leading-normal">
            {footer}
          </p>
        </div>
      )}
    </div>
  );
};

export const AppleListRow = ({
  icon,
  iconBg = '#007AFF',
  title,
  subtitle,
  value,
  isInteractive = false,
  showChevron = false,
  showDivider = true,
  onClick,
  accessory
}) => {
  const content = (
    <div className="px-4 py-3 flex items-center justify-between min-h-[48px] gap-3">
      <div className="flex items-center gap-3.5 min-w-0">
        {icon && <AppleSquircle icon={icon} bgHex={iconBg} />}
        <div className="min-w-0 truncate">
          <p className="text-[17px] font-normal text-[#000000] dark:text-[#FFFFFF] leading-snug truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-[13px] font-normal text-[#8E8E93] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {value && (
          <span className="text-[17px] font-normal text-[#8E8E93]">
            {value}
          </span>
        )}
        {accessory}
        {showChevron && (
          <ChevronRight size={18} className="text-[#C7C7CC] dark:text-[#48484A]" />
        )}
      </div>
    </div>
  );

  return (
    <div>
      {isInteractive ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] cursor-pointer"
        >
          {content}
        </button>
      ) : (
        content
      )}

      {/* 0.5px Indented Divider (ms-[52px] for RTL & LTR alignment) */}
      {showDivider && (
        <div className="ms-[52px] rtl:mr-[52px] rtl:ml-0 ltr:ml-[52px] h-[0.5px] bg-black/[0.08] dark:bg-white/[0.1]" />
      )}
    </div>
  );
};

// =========================================================================
// 6. APPLE STEPPER (Minus / Plus Native Capsule)
// =========================================================================

export const AppleStepper = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false
}) => {
  const handleDec = () => {
    if (value > min) onChange(value - step);
  };

  const handleInc = () => {
    if (value < max) onChange(value + step);
  };

  return (
    <div className="inline-flex items-center h-[32px] bg-[#E3E3E8] dark:bg-[#2C2C2E] rounded-[8px] p-0.5 select-none">
      <button
        type="button"
        onClick={handleDec}
        disabled={disabled || value <= min}
        aria-label="Decrease"
        className="w-[34px] h-full flex items-center justify-center rounded-[6px] text-[#007AFF] active:bg-black/10 dark:active:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      
      <div className="w-[0.5px] h-[16px] bg-black/15 dark:bg-white/15" />

      <button
        type="button"
        onClick={handleInc}
        disabled={disabled || value >= max}
        aria-label="Increase"
        className="w-[34px] h-full flex items-center justify-center rounded-[6px] text-[#007AFF] active:bg-black/10 dark:active:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
};

// =========================================================================
// 7. APPLE CONTINUOUS SLIDER (iOS Native Style)
// =========================================================================

export const AppleSlider = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  minIcon: MinIcon,
  maxIcon: MaxIcon
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="flex items-center gap-3 w-full py-1">
      {MinIcon && <MinIcon size={16} className="text-[#8E8E93] shrink-0" />}
      
      <div className="relative flex-1 flex items-center h-[28px] cursor-pointer">
        {/* Track */}
        <div className="w-full h-[6px] bg-[#E3E3E8] dark:bg-[#39393D] rounded-full overflow-hidden">
          <div
            style={{ width: `${percentage}%` }}
            className="h-full bg-[#007AFF] transition-all duration-75"
          />
        </div>

        {/* Hidden Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {/* Knob */}
        <div
          style={{ left: `calc(${percentage}% - 14px)` }}
          className="absolute top-[0px] w-[28px] h-[28px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] pointer-events-none border border-black/[0.04]"
        />
      </div>

      {MaxIcon && <MaxIcon size={18} className="text-[#8E8E93] shrink-0" />}
    </div>
  );
};

// =========================================================================
// 8. APPLE SEGMENTED CONTROL (Sliding Capsule Tab Bar)
// =========================================================================

export const AppleSegmentedControl = ({
  options,
  activeId,
  onChange
}) => {
  return (
    <div
      role="tablist"
      aria-label="View Segments"
      className="w-full bg-[#E3E3E8] dark:bg-[#2C2C2E] p-[2px] rounded-[9px] flex items-center select-none"
    >
      {options.map((opt) => {
        const isActive = activeId === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={`
              flex-1 py-[6px] text-[13px] font-semibold text-center rounded-[7px] transition-all duration-200 cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]
              ${
                isActive
                  ? 'bg-white dark:bg-[#636366] text-[#000000] dark:text-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.04)]'
                  : 'text-[#8E8E93] hover:text-[#000000] dark:hover:text-[#FFFFFF]'
              }
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

// =========================================================================
// 9. APPLE NATIVE ACTION SHEET & CONFIRMATION
// =========================================================================

export const AppleActionSheet = ({
  isOpen,
  title,
  message,
  options = [],
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-3 animate-fade-in"
    >
      <div className="fixed inset-0" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-[420px] space-y-2 animate-slide-up">
        {/* Actions Card */}
        <div className="bg-[#FFFFFF]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl rounded-[14px] overflow-hidden divide-y divide-black/[0.08] dark:divide-white/[0.1] shadow-xl text-center">
          {(title || message) && (
            <div className="px-4 py-3">
              {title && (
                <p className="text-[13px] font-semibold text-[#8E8E93] leading-tight">
                  {title}
                </p>
              )}
              {message && (
                <p className="text-[12px] font-normal text-[#8E8E93] mt-1 leading-snug">
                  {message}
                </p>
              )}
            </div>
          )}

          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                opt.onSelect();
                onCancel();
              }}
              className={`
                w-full h-[54px] flex items-center justify-center text-[19px] font-normal active:bg-black/5 dark:active:bg-white/5 transition-colors cursor-pointer
                ${opt.isDestructive ? 'text-[#FF3B30] font-medium' : 'text-[#007AFF]'}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Cancel Card */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[14px] overflow-hidden shadow-xl">
          <button
            type="button"
            onClick={onCancel}
            className="w-full h-[54px] flex items-center justify-center text-[19px] font-semibold text-[#007AFF] active:bg-black/5 dark:active:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
