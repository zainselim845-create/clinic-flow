import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface AppleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  showCloseButton?: boolean;
  maxWidth?: string;
  className?: string;
}

export const AppleSheetModal: React.FC<AppleSheetModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = true,
  maxWidth = 'max-w-lg',
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Sheet / Modal Container */}
      <div
        className={`relative z-10 w-full ${maxWidth} bg-white dark:bg-[#1C1C1E] rounded-t-[24px] sm:rounded-[24px] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden apple-spring ${className}`}
      >
        {/* Apple Top Grabber Pill */}
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-9 h-1 bg-[#3C3C43]/30 dark:bg-[#EBEBF5]/30 rounded-full" />
        </div>

        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-[#C6C6C8]/40 dark:border-[#38383A]/60">
            <div>
              {title && (
                <h3 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[13px] text-[#8E8E93] mt-0.5">{subtitle}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/20 apple-touch-press"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default AppleSheetModal;
