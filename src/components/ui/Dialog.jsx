import React from 'react';
import { Dialog as ArkDialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { X } from 'lucide-react';
import './ark-ui.css';

/**
 * Accessible Modal Dialog Primitive powered by Ark UI & styled with Google Material 3
 */
export const Dialog = ({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  maxWidth = '540px',
  showClose = true
}) => {
  return (
    <ArkDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <ArkDialog.Trigger asChild>{trigger}</ArkDialog.Trigger>}
      <Portal>
        <ArkDialog.Backdrop className="ark-dialog-backdrop" />
        <ArkDialog.Positioner className="ark-dialog-positioner">
          <ArkDialog.Content className="ark-dialog-content" style={{ maxWidth }}>
            {(title || showClose) && (
              <div className="ark-dialog-header">
                {title && <ArkDialog.Title className="ark-dialog-title">{title}</ArkDialog.Title>}
                {showClose && (
                  <ArkDialog.CloseTrigger className="ark-dialog-close-btn" aria-label="إغلاق النافذة">
                    <X size={18} />
                  </ArkDialog.CloseTrigger>
                )}
              </div>
            )}
            {description && (
              <ArkDialog.Description className="ark-dialog-description">
                {description}
              </ArkDialog.Description>
            )}
            <div className="ark-dialog-body">{children}</div>
          </ArkDialog.Content>
        </ArkDialog.Positioner>
      </Portal>
    </ArkDialog.Root>
  );
};

export default Dialog;
