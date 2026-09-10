import React from 'react';
import { Tooltip as ArkTooltip } from '@ark-ui/react/tooltip';
import { Portal } from '@ark-ui/react/portal';

export const Tooltip = {
  Root: ArkTooltip.Root,
  Trigger: ArkTooltip.Trigger,
  Positioner: ({ className = '', ...props }: ArkTooltip.PositionerProps) => (
    <ArkTooltip.Positioner className={`z-50 ${className}`} {...props} />
  ),
  Content: ({ className = '', children, ...props }: ArkTooltip.ContentProps) => (
    <Portal>
      <ArkTooltip.Positioner className="z-50">
        <ArkTooltip.Content
          className={`z-50 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-lg border border-slate-700/50 transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
          {...props}
        >
          {children}
        </ArkTooltip.Content>
      </ArkTooltip.Positioner>
    </Portal>
  ),
  Arrow: ArkTooltip.Arrow,
  ArrowTip: ArkTooltip.ArrowTip
};

export default Tooltip;
