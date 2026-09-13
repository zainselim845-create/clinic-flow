import React from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';

export type AppleMaterialTier = 'ultra-thin' | 'thin' | 'regular' | 'thick' | 'spatial';

export interface AppleGlassCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  material?: AppleMaterialTier;
  sheen?: boolean;
  interactive?: boolean;
  actionIcon?: React.ReactNode;
  onActionClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

const materialClasses: Record<AppleMaterialTier, string> = {
  'ultra-thin': 'apple-glass-ultra-thin',
  'thin': 'apple-glass-thin',
  'regular': 'apple-glass',
  'thick': 'apple-glass-thick',
  'spatial': 'apple-glass-spatial'
};

export const AppleGlassCard: React.FC<AppleGlassCardProps> = ({
  badge,
  icon,
  title,
  description,
  material = 'regular',
  sheen = true,
  interactive = true,
  actionIcon,
  onActionClick,
  className = '',
  children,
  ...props
}) => {
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const ActionArrow = isRtl ? ArrowUpLeft : ArrowUpRight;

  return (
    <div
      className={`group relative overflow-hidden rounded-[28px] p-6 sm:p-8 ${
        materialClasses[material]
      } ${
        interactive ? 'hover-apple-lift cursor-pointer' : ''
      } ${sheen ? 'apple-sheen-container' : ''} ${className}`}
      {...props}
    >
      {/* 1. Specular Sheen Light Reflection */}
      {sheen && <div className="apple-sheen-overlay" />}

      {/* 2. Content Stack */}
      <div className="relative z-10 flex flex-col justify-between h-full space-y-5">
        {(badge || icon || actionIcon || onActionClick) && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {icon && (
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/50 dark:bg-white/10 text-primary shadow-xs apple-spring">
                  {icon}
                </div>
              )}
              {badge && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide bg-white/60 dark:bg-white/15 text-zinc-900 dark:text-white backdrop-blur-md border border-white/30 shadow-xs">
                  {badge}
                </span>
              )}
            </div>

            {(actionIcon || onActionClick) && (
              <button
                type="button"
                onClick={onActionClick}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 apple-spring group-hover:scale-110 group-hover:bg-white/80 dark:group-hover:bg-white/20 active:scale-95"
                aria-label="إجراء سريع"
              >
                {actionIcon || <ActionArrow className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}

        {(title || description) && (
          <div className="space-y-2">
            {title && (
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {description}
              </p>
            )}
          </div>
        )}

        {children && <div className="pt-2">{children}</div>}
      </div>
    </div>
  );
};

export default AppleGlassCard;
