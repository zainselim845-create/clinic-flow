import React from 'react';
import { Avatar as ArkAvatar } from '@ark-ui/react/avatar';

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children?: React.ReactNode;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
};

const AvatarComponent: React.FC<AvatarProps> = ({
  src,
  alt = '',
  fallback,
  size = 'md',
  className = '',
  children
}) => {
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <ArkAvatar.Root className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 select-none ${sizeClass} ${className}`}>
      {src && (
        <ArkAvatar.Image
          src={src}
          alt={alt}
          className="h-full w-full object-cover rounded-full"
        />
      )}
      <ArkAvatar.Fallback className="flex h-full w-full items-center justify-center font-semibold text-slate-600 dark:text-slate-300">
        {fallback || (alt ? alt.slice(0, 2).toUpperCase() : children || '?')}
      </ArkAvatar.Fallback>
    </ArkAvatar.Root>
  );
};

export const Avatar = Object.assign(AvatarComponent, {
  Root: ({ className = '', ...props }: ArkAvatar.RootProps) => (
    <ArkAvatar.Root
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 select-none ${className}`}
      {...props}
    />
  ),
  Image: ({ className = '', ...props }: ArkAvatar.ImageProps) => (
    <ArkAvatar.Image
      className={`h-full w-full object-cover rounded-full ${className}`}
      {...props}
    />
  ),
  Fallback: ({ className = '', ...props }: ArkAvatar.FallbackProps) => (
    <ArkAvatar.Fallback
      className={`flex h-full w-full items-center justify-center font-semibold text-slate-600 dark:text-slate-300 ${className}`}
      {...props}
    />
  )
});

export default Avatar;
