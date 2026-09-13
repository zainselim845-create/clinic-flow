import React from 'react';

export type AppleButtonVariant = 
  | 'prominent' 
  | 'tinted' 
  | 'plain' 
  | 'glass' 
  | 'primary' 
  | 'subtle' 
  | 'success' 
  | 'danger';

export type AppleButtonSize = 'sm' | 'md' | 'lg';
export type AppleButtonShape = 'full' | 'squircle';

export interface AppleGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppleButtonVariant;
  size?: AppleButtonSize;
  shape?: AppleButtonShape;
  icon?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<AppleButtonVariant, string> = {
  prominent: 'bg-[#007AFF] text-white hover:bg-[#0071E3] active:scale-[0.97] shadow-xs font-semibold',
  tinted: 'bg-[#007AFF]/15 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] hover:bg-[#007AFF]/25 active:scale-[0.97] font-semibold',
  plain: 'bg-transparent text-[#007AFF] dark:text-[#0A84FF] hover:opacity-80 active:opacity-50 border-none font-normal shadow-none',
  glass: 'apple-glass text-zinc-900 dark:text-white hover:bg-white/85 dark:hover:bg-white/20 border-white/50 dark:border-white/10 active:scale-[0.97]',
  primary: 'bg-[#007AFF] text-white hover:bg-[#0071E3] active:scale-[0.97] shadow-xs font-semibold',
  subtle: 'apple-glass-subtle text-zinc-800 dark:text-zinc-100 hover:bg-white/40 dark:hover:bg-white/10 active:scale-[0.97]',
  success: 'bg-[#34C759] text-white hover:opacity-95 shadow-xs border border-white/20 active:scale-[0.97] font-semibold',
  danger: 'bg-[#FF3B30] text-white hover:opacity-95 shadow-xs border border-white/20 active:scale-[0.97] font-semibold'
};

const sizeClasses: Record<AppleButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-[13px] gap-1.5 min-h-[32px]',
  md: 'px-5 py-2.5 text-[15px] gap-2 min-h-[42px]',
  lg: 'px-6 py-3 text-[17px] gap-2.5 min-h-[48px]'
};

export const AppleGlassButton: React.FC<AppleGlassButtonProps> = ({
  variant = 'glass',
  size = 'md',
  shape = 'full',
  icon,
  iconTrailing,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const shapeClass = shape === 'squircle' ? 'rounded-[12px]' : 'rounded-full';

  return (
    <button
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center font-medium tracking-tight apple-spring active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer ${shapeClass} ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="relative z-10">{children}</span>
          {iconTrailing && <span className="flex-shrink-0">{iconTrailing}</span>}
        </>
      )}
    </button>
  );
};

export const AppleButton = AppleGlassButton;

export default AppleGlassButton;
