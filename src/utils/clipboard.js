/**
 * Safe cross-browser clipboard copy utility.
 * Guarantees zero unhandled crashes in iOS/Android in-app browsers, WebViews, and HTTP contexts.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // 1. Modern Clipboard API
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
  } catch (_) {
    // Continue to fallback
  }

  // 2. Legacy execCommand Fallback
  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = String(text);
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (_) {
    // Suppress
  }

  return false;
}
