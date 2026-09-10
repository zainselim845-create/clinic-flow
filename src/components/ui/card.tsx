import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'flat';
  children?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  elevated: 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow',
  outlined: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  flat: 'bg-slate-50 dark:bg-slate-850 border border-transparent'
};

const CardComponent = React.forwardRef<HTMLDivElement, CardProps>(({
  variant = 'elevated',
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`rounded-2xl overflow-hidden transition-colors ${variantStyles[variant] || variantStyles.elevated} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

CardComponent.displayName = 'Card';

export const Card = Object.assign(CardComponent, {
  Root: CardComponent,
  Header: ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`p-5 sm:p-6 pb-2 sm:pb-3 flex flex-col gap-1.5 ${className}`} {...props} />
  ),
  Title: ({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={`text-base sm:text-lg font-bold text-slate-900 dark:text-white ${className}`} {...props} />
  ),
  Description: ({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={`text-xs sm:text-sm text-slate-500 dark:text-slate-400 ${className}`} {...props} />
  ),
  Content: ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`p-5 sm:p-6 pt-2 sm:pt-3 ${className}`} {...props} />
  ),
  Footer: ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`px-5 sm:px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 ${className}`} {...props} />
  )
});

export default Card;
