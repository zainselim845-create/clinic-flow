import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Portal } from './ui';

/**
 * Reusable Confirmation Modal Dialog for destructive or sensitive actions.
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {string} title - Dialog title
 * @param {string} message - Warning message details
 * @param {string} confirmText - Label for confirm action button
 * @param {string} cancelText - Label for cancel action button
 * @param {Function} onConfirm - Action callback
 * @param {Function} onClose - Dismiss callback
 * @param {boolean} isDestructive - Whether confirm button is red/destructive
 */
export const ConfirmationModal = ({
  isOpen,
  title = 'تأكيد العملية',
  message = 'هل أنت متأكد من تنفيذ هذا الإجراء؟ لا يمكن التراجع عن هذه الخطوة.',
  confirmText = 'تأكيد الإجراء',
  cancelText = 'إلغاء',
  onConfirm,
  onClose,
  isDestructive = true
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div 
        className="confirmation-modal-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          direction: 'rtl'
        }}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
          style={{
            backgroundColor: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--border-color, #E4E4E7)',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div 
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: isDestructive ? '#EF4444' : '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71717A',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <h3 
            id="confirm-dialog-title"
            style={{ 
              margin: '0 0 8px', 
              fontSize: '1.1rem', 
              fontWeight: 800, 
              color: 'var(--text-primary, #09090B)' 
            }}
          >
            {title}
          </h3>

          <p 
            id="confirm-dialog-desc"
            style={{ 
              margin: '0 0 24px', 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary, #71717A)', 
              lineHeight: '1.5' 
            }}
          >
            {message}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #E4E4E7',
                color: 'var(--text-primary, #09090B)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onConfirm) onConfirm();
                if (onClose) onClose();
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                backgroundColor: isDestructive ? '#DC2626' : '#09090B',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isDestructive ? '0 2px 8px rgba(220, 38, 38, 0.25)' : 'none'
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ConfirmationModal;
