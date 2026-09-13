import React from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { X } from 'lucide-react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  return (
    <Dialog.Root 
      open={isOpen} 
      lazyMount
      unmountOnExit
      onOpenChange={(details) => {
        if (!details.open && onClose) {
          onClose();
        }
      }}
    >
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content className={`modal-container size-${size}`}>
              <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                <div className="apple-sheet-grabber" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Dialog.Title asChild>
                    <h2 className="modal-title">{title}</h2>
                  </Dialog.Title>
                  <Dialog.CloseTrigger asChild>
                    <button 
                      className="modal-close" 
                      onClick={onClose}
                      aria-label="إغلاق النافذة"
                      type="button"
                    >
                      <X size={20} />
                    </button>
                  </Dialog.CloseTrigger>
                </div>
              </div>
            <div className="modal-body">
              {children}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default Modal;
