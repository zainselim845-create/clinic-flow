import React from 'react';
import { Carousel as ArkCarousel } from '@ark-ui/react/carousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Carousel = {
  Root: ({ className = '', ...props }: ArkCarousel.RootProps) => (
    <ArkCarousel.Root className={`relative w-full overflow-hidden ${className}`} {...props} />
  ),
  Viewport: ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`overflow-hidden rounded-2xl ${className}`} {...props} />
  ),
  ItemGroup: ({ className = '', ...props }: ArkCarousel.ItemGroupProps) => (
    <ArkCarousel.ItemGroup className={`flex ${className}`} {...props} />
  ),
  Item: ({ className = '', ...props }: ArkCarousel.ItemProps) => (
    <ArkCarousel.Item className={`min-w-0 flex-shrink-0 flex-grow-0 basis-full ${className}`} {...props} />
  ),
  Control: ({ className = '', ...props }: ArkCarousel.ControlProps) => (
    <ArkCarousel.Control className={`flex items-center justify-between gap-2 mt-4 ${className}`} {...props} />
  ),
  PrevTrigger: ({ className = '', children, ...props }: ArkCarousel.PrevTriggerProps) => (
    <ArkCarousel.PrevTrigger
      className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      aria-label="السابق"
      {...props}
    >
      {children || <ChevronRight className="w-5 h-5" />}
    </ArkCarousel.PrevTrigger>
  ),
  NextTrigger: ({ className = '', children, ...props }: ArkCarousel.NextTriggerProps) => (
    <ArkCarousel.NextTrigger
      className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      aria-label="التالي"
      {...props}
    >
      {children || <ChevronLeft className="w-5 h-5" />}
    </ArkCarousel.NextTrigger>
  ),
  IndicatorGroup: ({ className = '', ...props }: ArkCarousel.IndicatorGroupProps) => (
    <ArkCarousel.IndicatorGroup className={`flex items-center justify-center gap-1.5 ${className}`} {...props} />
  ),
  Indicator: ({ className = '', ...props }: ArkCarousel.IndicatorProps) => (
    <ArkCarousel.Indicator
      className={`h-2 w-2 rounded-full transition-all data-[current]:w-6 data-[current]:bg-primary bg-slate-300 dark:bg-slate-700 ${className}`}
      {...props}
    />
  )
};

export default Carousel;
