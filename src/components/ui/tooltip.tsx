import React from 'react';
import { Tooltip as ArkTooltip } from '@ark-ui/react/tooltip';
import { Portal } from '@ark-ui/react/portal';
import './ark-ui.css';

export interface TooltipFunctionalProps {
  content?: React.ReactNode;
  children: React.ReactElement;
  openDelay?: number;
  closeDelay?: number;
  positioning?: any;
  disabled?: boolean;
}

const TooltipComponent: React.FC<TooltipFunctionalProps> = ({
  content,
  children,
  openDelay = 300,
  closeDelay = 150,
  positioning = { placement: 'top' },
  disabled = false
}) => {
  if (disabled || !content) return children;

  return (
    <ArkTooltip.Root openDelay={openDelay} closeDelay={closeDelay} positioning={positioning}>
      <ArkTooltip.Trigger asChild>{children}</ArkTooltip.Trigger>
      <Portal>
        <ArkTooltip.Positioner>
          <ArkTooltip.Content className="ark-tooltip-content">
            <ArkTooltip.Arrow className="ark-tooltip-arrow">
              <ArkTooltip.ArrowTip />
            </ArkTooltip.Arrow>
            {content}
          </ArkTooltip.Content>
        </ArkTooltip.Positioner>
      </Portal>
    </ArkTooltip.Root>
  );
};

export const Tooltip = Object.assign(TooltipComponent, {
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
});

export default Tooltip;
