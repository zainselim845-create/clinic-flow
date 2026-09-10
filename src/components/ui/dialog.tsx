import React from 'react';
import { Dialog as ArkDialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { X } from 'lucide-react';
import './ark-ui.css';

export interface DialogFunctionalProps {
  open?: boolean;
  onOpenChange?: (details: { open: boolean }) => void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: string;
  showClose?: boolean;
}

const DialogComponent: React.FC<DialogFunctionalProps> = ({
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

export const Dialog = Object.assign(DialogComponent, {
  Root: ArkDialog.Root,
  Trigger: ArkDialog.Trigger,
  Backdrop: ({ className = '', ...props }: ArkDialog.BackdropProps) => (
    <ArkDialog.Backdrop
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  ),
  Positioner: ({ className = '', ...props }: ArkDialog.PositionerProps) => (
    <ArkDialog.Positioner
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto ${className}`}
      {...props}
    />
  ),
  Content: ({ className = '', ...props }: ArkDialog.ContentProps) => (
    <ArkDialog.Content
      className={`relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  ),
  Header: ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${className}`} {...props} />
  ),
  Title: ({ className = '', ...props }: ArkDialog.TitleProps) => (
    <ArkDialog.Title
      className={`text-lg font-bold text-slate-900 dark:text-white tracking-tight ${className}`}
      {...props}
    />
  ),
  Description: ({ className = '', ...props }: ArkDialog.DescriptionProps) => (
    <ArkDialog.Description
      className={`text-sm text-slate-500 dark:text-slate-400 mt-1 ${className}`}
      {...props}
    />
  ),
  Body: ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`p-6 max-h-[calc(85vh-120px)] overflow-y-auto ${className}`} {...props} />
  ),
  Footer: ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 ${className}`} {...props} />
  ),
  CloseTrigger: ({ className = '', children, ...props }: ArkDialog.CloseTriggerProps) => (
    <ArkDialog.CloseTrigger
      className={`rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      aria-label="إغلاق النافذة"
      {...props}
    >
      {children || <X className="w-5 h-5" />}
    </ArkDialog.CloseTrigger>
  )
});

export default Dialog;
