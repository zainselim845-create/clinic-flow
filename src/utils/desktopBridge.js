/**
 * ClinicFlow Desktop Bridge Helper
 * Safely communicates with Electron desktop APIs when running on Windows desktop.
 * Falls back gracefully to standard browser APIs when running on web.
 */

export const isDesktopApp = () => {
  return typeof window !== 'undefined' && Boolean(window.desktopAPI?.isDesktop);
};

export const getPrinters = async () => {
  if (isDesktopApp() && window.desktopAPI?.getPrinters) {
    try {
      return await window.desktopAPI.getPrinters();
    } catch (e) {
      console.warn('[DesktopBridge] Failed to get printers:', e);
      return [];
    }
  }
  return [];
};

export const printDirect = async (options = {}) => {
  if (isDesktopApp() && window.desktopAPI?.printDirect) {
    try {
      return await window.desktopAPI.printDirect(options);
    } catch (e) {
      console.warn('[DesktopBridge] Direct print error:', e);
      return { success: false, error: e.message };
    }
  }
  // Fallback to browser print dialog
  if (typeof window !== 'undefined' && window.print) {
    window.print();
    return { success: true, fallback: true };
  }
  return { success: false, error: 'Print not supported' };
};

export const showDesktopNotification = (title, body) => {
  if (isDesktopApp() && window.desktopAPI?.showNotification) {
    return window.desktopAPI.showNotification({ title, body });
  }
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
    return true;
  }
  return false;
};

export const openExternalUrl = (url) => {
  if (isDesktopApp() && window.desktopAPI?.openExternal) {
    return window.desktopAPI.openExternal(url);
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
};
