import React from 'react';

export type AppleButtonVariant = 'glass' | 'primary' | 'subtle' | 'success' | 'danger';
export type AppleButtonSize = 'sm' | 'md' | 'lg';

export interface AppleGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppleButtonVariant;
  size?: AppleButtonSize;
  icon?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<AppleButtonVariant, string> = {
  glass: 'apple-glass text-zinc-900 dark:text-white hover:bg-white/85 dark:hover:bg-white/20 border-white/50 dark:border-white/10',
  primary: 'bg-[var(--apple-blue)] text-white hover:opacity-95 shadow-md shadow-[var(--apple-blue)]/25 border border-white/20',
  subtle: 'apple-glass-subtle text-zinc-800 dark:text-zinc-100 hover:bg-white/40 dark:hover:bg-white/10',
  success: 'bg-[var(--apple-green)] text-white hover:opacity-95 shadow-md shadow-[var(--apple-green)]/25 border border-white/20',
  danger: 'bg-[var(--apple-red)] text-white hover:opacity-95 shadow-md shadow-[var(--apple-red)]/25 border border-white/20'
};

const sizeClasses: Record<AppleButtonSize, string> = {
  sm: 'px-4 py-1.5 text-xs gap-1.5 min-h-[32px]',
  md: 'px-6 py-2.5 text-sm gap-2 min-h-[42px]',
  lg: 'px-8 py-3.5 text-base gap-2.5 min-h-[50px]'
};

export const AppleGlassButton: React.FC<AppleGlassButtonProps> = ({
  variant = 'glass',
  size = 'md',
  icon,
  iconTrailing,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center font-medium tracking-tight rounded-full apple-spring active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer ${
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

export default AppleGlassButton;
