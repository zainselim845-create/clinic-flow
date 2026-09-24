import { clsx } from 'clsx';

/**
 * Merge CSS class names conditionally.
 * Standard utility used across all components for clean, conflict-free class merging.
 * @param {...(string|Object|Array)} inputs - Class values to merge
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return clsx(inputs);
}
