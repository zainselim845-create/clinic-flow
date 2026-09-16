/**
 * ClinicFlow Central System Error & Diagnostic Telemetry Service
 * Automatically captures frontend runtime exceptions, network failures,
 * rate limit events, and user-submitted bug reports across all clinics.
 */

const SYSTEM_ERRORS_KEY = 'clinicflow_system_errors';
const BUG_REPORTS_KEY = 'clinicflow_user_bug_reports';

let inMemoryErrors = null;
let inMemoryBugReports = null;

/**
 * Initializes global window error & unhandled rejection listeners
 */
export function initGlobalErrorListeners() {
  if (typeof window === 'undefined') return;

  // Catch unhandled JavaScript runtime exceptions
  window.addEventListener('error', (event) => {
    captureSystemError({
      type: 'runtime_exception',
      message: event.message || 'Unknown JavaScript Error',
      filename: event.filename || 'unknown',
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      severity: 'critical',
      path: window.location.pathname
    });
  });

  // Catch unhandled Promise rejections (e.g. Supabase, fetch network failures)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    captureSystemError({
      type: 'unhandled_promise_rejection',
      message: typeof reason === 'string' ? reason : (reason?.message || 'Unhandled Promise Rejection'),
      stack: reason?.stack,
      severity: 'high',
      path: window.location.pathname
    });
  });
}

/**
 * Redacts sensitive tokens, credentials, and API keys from error messages, stacks, and payloads
 */
export function redactSensitiveTokens(input) {
  if (!input) return input;
  if (typeof input === 'string') {
    return input
      // Redact JWT tokens
      .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT_TOKEN]')
      // Redact Bearer tokens
      .replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_TOKEN]')
      // Redact OpenRouter / OpenAI keys
      .replace(/sk-[a-zA-Z0-9_-]{10,}/gi, 'sk-[REDACTED_KEY]')
      // Redact query parameter keys and passwords
      .replace(/(apikey|api_key|token|password|secret|access_token)=([^&\s]+)/gi, '$1=[REDACTED]');
  }
  if (typeof input === 'object') {
    try {
      const copy = Array.isArray(input) ? [...input] : { ...input };
      for (const k of Object.keys(copy)) {
        if (/key|token|password|secret|auth/i.test(k)) {
          copy[k] = '[REDACTED]';
        } else if (typeof copy[k] === 'string') {
          copy[k] = redactSensitiveTokens(copy[k]);
        } else if (typeof copy[k] === 'object' && copy[k] !== null) {
          copy[k] = redactSensitiveTokens(copy[k]);
        }
      }
      return copy;
    } catch (_) {
      return input;
    }
  }
  return input;
}

/**
 * Captures a system error with context
 */
export function captureSystemError({
  type = 'system_error',
  message,
  stack = '',
  severity = 'medium',
  context = {},
  clinicId = null,
  userId = null,
  path = ''
}) {
  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '');
  
  // Try to retrieve active clinic from localStorage if not passed
  let resolvedClinic = clinicId;
  if (!resolvedClinic && typeof localStorage !== 'undefined') {
    resolvedClinic = localStorage.getItem('clinicflow_active_tenant_slug') || 'unspecified';
  }

  const errorEntry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message: redactSensitiveTokens(String(message || 'Unspecified error occurred')),
    stack: redactSensitiveTokens(String(stack || '')),
    severity, // 'critical' | 'high' | 'medium' | 'low'
    clinicId: resolvedClinic,
    userId: userId || 'guest',
    path: currentPath,
    context: redactSensitiveTokens(context && typeof context === 'object' ? context : {}),
    timestamp: new Date().toISOString(),
    status: 'unresolved' // 'unresolved' | 'investigating' | 'resolved'
  };

  const errors = getSystemErrors();
  inMemoryErrors = [errorEntry, ...errors].slice(0, 500); // Keep last 500 records

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SYSTEM_ERRORS_KEY, JSON.stringify(inMemoryErrors));
    } catch (_) {}
  }

  // Dispatch an event for live admin notifications if listening
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clinicflow_system_error_logged', { detail: errorEntry }));
  }

  return errorEntry;
}

/**
 * Retrieves all captured system errors
 */
export function getSystemErrors() {
  if (inMemoryErrors) return inMemoryErrors;
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYSTEM_ERRORS_KEY);
    inMemoryErrors = raw ? JSON.parse(raw) : [];
    return inMemoryErrors;
  } catch (_) {
    return [];
  }
}

/**
 * Marks a system error as resolved
 */
export function resolveSystemError(errorId) {
  const errors = getSystemErrors();
  inMemoryErrors = errors.map(err => 
    err.id === errorId ? { ...err, status: 'resolved', resolvedAt: new Date().toISOString() } : err
  );
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SYSTEM_ERRORS_KEY, JSON.stringify(inMemoryErrors));
    } catch (_) {}
  }
  return inMemoryErrors;
}

/**
 * Clears all captured system errors (admin maintenance)
 */
export function clearSystemErrors() {
  inMemoryErrors = [];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(SYSTEM_ERRORS_KEY);
    } catch (_) {}
  }
}

/**
 * Submits a user/doctor bug report or support ticket
 */
export function reportUserBug({
  title,
  description,
  category = 'bug', // 'bug' | 'performance' | 'ui' | 'feature_request'
  clinicId = '',
  clinicName = '',
  doctorEmail = '',
  path = '',
  deviceInfo = ''
}) {
  if (!title?.trim() || !description?.trim()) {
    throw new Error('يرجى كتابة عنوان ووصف المشكلة بالتفصيل.');
  }

  const report = {
    id: `bug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim(),
    description: description.trim(),
    category,
    clinicId: clinicId || 'general',
    clinicName: clinicName || 'غير محدد',
    doctorEmail: doctorEmail || 'anonymous',
    path: path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    deviceInfo: deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    status: 'open', // 'open' | 'in_progress' | 'resolved'
    createdAt: new Date().toISOString()
  };

  const currentReports = getBugReports();
  inMemoryBugReports = [report, ...currentReports];

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(BUG_REPORTS_KEY, JSON.stringify(inMemoryBugReports));
    } catch (_) {}
  }

  // Dispatch event for live UI update in SuperAdmin
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clinicflow_bug_reported', { detail: report }));
  }

  return report;
}

/**
 * Retrieves all user bug reports
 */
export function getBugReports() {
  if (inMemoryBugReports) return inMemoryBugReports;
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BUG_REPORTS_KEY);
    inMemoryBugReports = raw ? JSON.parse(raw) : [];
    return inMemoryBugReports;
  } catch (_) {
    return [];
  }
}

/**
 * Updates a bug report status (open, in_progress, resolved)
 */
export function updateBugReportStatus(reportId, status) {
  const reports = getBugReports();
  inMemoryBugReports = reports.map(r => 
    r.id === reportId ? { ...r, status, updatedAt: new Date().toISOString() } : r
  );
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(BUG_REPORTS_KEY, JSON.stringify(inMemoryBugReports));
    } catch (_) {}
  }
  return inMemoryBugReports;
}

/**
 * Deletes an individual bug report
 */
export function deleteBugReport(reportId) {
  const reports = getBugReports();
  inMemoryBugReports = reports.filter(r => r.id !== reportId);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(BUG_REPORTS_KEY, JSON.stringify(inMemoryBugReports));
    } catch (_) {}
  }
  return inMemoryBugReports;
}

/**
 * Clears all user bug reports (admin maintenance)
 */
export function clearBugReports() {
  inMemoryBugReports = [];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(BUG_REPORTS_KEY);
    } catch (_) {}
  }
  return [];
}

/**
 * Deletes a single captured system error
 */
export function deleteSystemError(errorId) {
  const errors = getSystemErrors();
  inMemoryErrors = errors.filter(e => e.id !== errorId);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SYSTEM_ERRORS_KEY, JSON.stringify(inMemoryErrors));
    } catch (_) {}
  }
  return inMemoryErrors;
}

/**
 * Resolves all captured system errors in bulk
 */
export function resolveAllSystemErrors() {
  const errors = getSystemErrors();
  const now = new Date().toISOString();
  inMemoryErrors = errors.map(err => ({
    ...err,
    status: 'resolved',
    resolvedAt: err.resolvedAt || now
  }));
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SYSTEM_ERRORS_KEY, JSON.stringify(inMemoryErrors));
    } catch (_) {}
  }
  return inMemoryErrors;
}
