/**
 * ClinicFlow Cloud Circuit Breaker (circuitBreaker.js)
 * Anti-Fragile Resilience Pattern for Cloud and Database operations.
 * Protects the UI from hanging, freezing, or crashing during backend outages.
 *
 * States:
 * - CLOSED: Remote database operations are healthy; requests proceed normally.
 * - OPEN: Remote database is unreachable, unmigrated (PGRST205), or failing.
 *         All operations immediately bypass network and use local-first storage (0ms latency).
 * - HALF_OPEN: Probe state where a single health check determines if the circuit can reset to CLOSED.
 */

export const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 60000; // 60 seconds
    this.state = CIRCUIT_STATE.CLOSED;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = Date.now();
    this.tripReason = null;
    this.listeners = new Set();

    // Listen to browser network connectivity events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkRestored());
      window.addEventListener('offline', () => this.trip('browser_offline'));
    }
  }

  isAvailable() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }

    if (this.state === CIRCUIT_STATE.CLOSED) {
      return true;
    }

    if (this.state === CIRCUIT_STATE.OPEN) {
      const now = Date.now();
      if (this.lastFailureTime && (now - this.lastFailureTime > this.resetTimeoutMs)) {
        this.transitionTo(CIRCUIT_STATE.HALF_OPEN, 'probing_remote_health');
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();
    if (this.state !== CIRCUIT_STATE.CLOSED) {
      this.transitionTo(CIRCUIT_STATE.CLOSED, 'remote_health_restored');
    }
  }

  recordFailure(error) {
    this.lastFailureTime = Date.now();
    this.consecutiveFailures += 1;

    const errMsg = typeof error === 'string' 
      ? error 
      : (error?.message || error?.code || 'unknown_error');

    const isSchemaMissing = errMsg.includes('PGRST205') || errMsg.includes('schema cache');
    const isAuthInvalid = errMsg.includes('invalid_api_key') || errMsg.includes('JWT');

    if (isSchemaMissing) {
      this.trip('schema_missing_pgrst205');
      return;
    }

    if (isAuthInvalid) {
      this.trip('auth_credentials_invalid');
      return;
    }

    if (this.state === CIRCUIT_STATE.HALF_OPEN || this.consecutiveFailures >= this.failureThreshold) {
      this.trip(`consecutive_failures_${this.consecutiveFailures}`);
    }
  }

  trip(reason = 'manual_trip') {
    this.tripReason = reason;
    this.lastFailureTime = Date.now();
    this.transitionTo(CIRCUIT_STATE.OPEN, reason);
  }

  reset() {
    this.consecutiveFailures = 0;
    this.tripReason = null;
    this.transitionTo(CIRCUIT_STATE.CLOSED, 'manual_reset');
  }

  handleNetworkRestored() {
    this.transitionTo(CIRCUIT_STATE.HALF_OPEN, 'network_online_probe');
  }

  transitionTo(newState, reason) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    this.notifyListeners({ oldState, newState, reason, timestamp: Date.now() });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach(fn => {
      try {
        fn(event);
      } catch (err) {
        console.warn('[CircuitBreaker] Listener error:', err);
      }
    });
  }

  getStatus() {
    return {
      state: this.state,
      isAvailable: this.isAvailable(),
      consecutiveFailures: this.consecutiveFailures,
      tripReason: this.tripReason,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }
}

export const cloudCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 60000
});

export default cloudCircuitBreaker;
