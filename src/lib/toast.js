import { toast as sonnerToast } from 'sonner';

/**
 * Unified toast notification utility.
 * Wraps sonner for consistent notification behavior across the app.
 */
export const toast = {
  success: (message, options = {}) => sonnerToast.success(message, {
    duration: 3000,
    position: 'bottom-right',
    dir: 'rtl',
    ...options
  }),

  error: (message, options = {}) => sonnerToast.error(message, {
    duration: 5000,
    position: 'bottom-right',
    dir: 'rtl',
    ...options
  }),

  warning: (message, options = {}) => sonnerToast.warning(message, {
    duration: 4000,
    position: 'bottom-right',
    dir: 'rtl',
    ...options
  }),

  info: (message, options = {}) => sonnerToast.info(message, {
    duration: 3000,
    position: 'bottom-right',
    dir: 'rtl',
    ...options
  }),

  promise: (promise, messages, options = {}) => sonnerToast.promise(promise, {
    ...messages,
    position: 'bottom-right',
    dir: 'rtl',
    ...options
  }),

  dismiss: (id) => sonnerToast.dismiss(id)
};
