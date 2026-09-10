import React from 'react';
import { Tooltip as ArkTooltip } from '@ark-ui/react/tooltip';
import { Portal } from '@ark-ui/react/portal';
import './ark-ui.css';

/**
 * Accessible Tooltip Primitive powered by Ark UI with Google M3 inverse pill style
 */
export const Tooltip = ({
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

export default Tooltip;
