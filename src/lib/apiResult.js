/**
 * Standardized API result wrapper.
 * Ensures every service function returns a consistent shape.
 * Eliminates ad-hoc { data, error } / { success, error } inconsistencies.
 */
export function ok(data) {
  return { success: true, data, error: null };
}

export function fail(error, data = null) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  return { success: false, data, error: new Error(message) };
}

/**
 * Wraps an async operation with consistent error handling.
 * @param {Function} fn - Async function to execute
 * @param {string} context - Error context for logging (e.g., 'addPatient')
 * @returns {Promise<{success: boolean, data: any, error: Error|null}>}
 */
export async function safeAsync(fn, context = 'operation') {
  try {
    const result = await fn();
    return ok(result);
  } catch (error) {
    console.error(`[${context}]`, error);
    return fail(error);
  }
}
