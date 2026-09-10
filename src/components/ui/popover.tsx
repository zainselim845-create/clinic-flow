import React from 'react';
import { Popover as ArkPopover } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';
import { X } from 'lucide-react';

export const Popover = {
  Root: ArkPopover.Root,
  Trigger: ArkPopover.Trigger,
  Anchor: ArkPopover.Anchor,
  Positioner: ({ className = '', ...props }: ArkPopover.PositionerProps) => (
    <ArkPopover.Positioner className={`z-50 ${className}`} {...props} />
  ),
  Content: ({ className = '', children, ...props }: ArkPopover.ContentProps) => (
    <Portal>
      <ArkPopover.Positioner className="z-50">
        <ArkPopover.Content
          className={`z-50 w-72 rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-xl transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
          {...props}
        >
          {children}
        </ArkPopover.Content>
      </ArkPopover.Positioner>
    </Portal>
  ),
  Title: ({ className = '', ...props }: ArkPopover.TitleProps) => (
    <ArkPopover.Title className={`text-sm font-bold text-slate-900 dark:text-white ${className}`} {...props} />
  ),
  Description: ({ className = '', ...props }: ArkPopover.DescriptionProps) => (
    <ArkPopover.Description className={`text-xs text-slate-500 dark:text-slate-400 mt-1 ${className}`} {...props} />
  ),
  CloseTrigger: ({ className = '', children, ...props }: ArkPopover.CloseTriggerProps) => (
    <ArkPopover.CloseTrigger
      className={`absolute top-3 left-3 rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
      aria-label="إغلاق"
      {...props}
    >
      {children || <X className="w-4 h-4" />}
    </ArkPopover.CloseTrigger>
  ),
  Arrow: ArkPopover.Arrow,
  ArrowTip: ArkPopover.ArrowTip
};

export default Popover;
