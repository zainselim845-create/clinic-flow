import React from 'react';
import { Slider as ArkSlider } from '@ark-ui/react/slider';

export const Slider = {
  Root: ({ className = '', ...props }: ArkSlider.RootProps) => (
    <ArkSlider.Root className={`flex flex-col gap-2 w-full select-none ${className}`} {...props} />
  ),
  Label: ({ className = '', ...props }: ArkSlider.LabelProps) => (
    <ArkSlider.Label className={`text-xs font-bold text-slate-700 dark:text-slate-300 ${className}`} {...props} />
  ),
  ValueText: ({ className = '', ...props }: ArkSlider.ValueTextProps) => (
    <ArkSlider.ValueText className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${className}`} {...props} />
  ),
  Control: ({ className = '', ...props }: ArkSlider.ControlProps) => (
    <ArkSlider.Control className={`relative flex items-center h-5 w-full cursor-pointer ${className}`} {...props} />
  ),
  Track: ({ className = '', ...props }: ArkSlider.TrackProps) => (
    <ArkSlider.Track className={`h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden ${className}`} {...props} />
  ),
  Range: ({ className = '', ...props }: ArkSlider.RangeProps) => (
    <ArkSlider.Range className={`h-full bg-primary ${className}`} {...props} />
  ),
  Thumb: ({ className = '', ...props }: ArkSlider.ThumbProps) => (
    <ArkSlider.Thumb
      className={`h-5 w-5 rounded-full bg-white border-2 border-primary shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
      {...props}
    />
  )
};

export default Slider;
