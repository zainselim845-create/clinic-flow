/**
 * ClinicFlow Resilience — Circuit Breakers (canonical module)
 * ==========================================================
 * Single home for every circuit-breaker pattern in the codebase.
 * Two specialized breakers live here:
 *
 * 1. CloudCircuitBreaker (`cloudCircuitBreaker`)
 *    Anti-fragile guard for Cloud/Database operations. Protects the UI from
 *    hanging, freezing, or crashing during backend outages.
 *    - CLOSED: remote DB healthy; requests proceed normally.
 *    - OPEN:   remote DB unreachable, unmigrated (PGRST205), or failing —
 *              operations immediately bypass network and use local-first storage.
 *    - HALF_OPEN: probe state; a single health check decides reset.
 *
 * 2. ServiceCircuitBreaker (`circuitBreaker`)
 *    Per-service registry breaker for third-party APIs (SMS gateways, AI
 *    providers, Webhooks) with per-call timeouts and fallback execution.
 */

/* ------------------------------------------------------------------ */
/* 1. Cloud / Database breaker                                         */
/* ------------------------------------------------------------------ */

export const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

export class CloudCircuitBreaker {
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

export const cloudCircuitBreaker = new CloudCircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 60000
});

/* ------------------------------------------------------------------ */
/* 2. Per-service third-party API breaker                              */
/* ------------------------------------------------------------------ */

export const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

export class ServiceCircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownPeriodMs = options.cooldownPeriodMs || 30000;
    this.timeoutMs = options.timeoutMs || 5000;
    this.circuits = new Map();
  }

  getCircuit(serviceName) {
    let circuit = this.circuits.get(serviceName);
    if (!circuit) {
      circuit = {
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        successCountInHalfOpen: 0
      };
      this.circuits.set(serviceName, circuit);
    }
    return circuit;
  }

  isOpen(serviceName) {
    const circuit = this.getCircuit(serviceName);
    const now = Date.now();

    if (circuit.state === CircuitState.OPEN) {
      if (now - circuit.lastFailureTime > this.cooldownPeriodMs) {
        circuit.state = CircuitState.HALF_OPEN;
        circuit.successCountInHalfOpen = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  recordSuccess(serviceName) {
    const circuit = this.getCircuit(serviceName);
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCountInHalfOpen += 1;
      if (circuit.successCountInHalfOpen >= 2) {
        circuit.state = CircuitState.CLOSED;
        circuit.failureCount = 0;
      }
    } else {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
    }
  }

  recordFailure(serviceName) {
    const circuit = this.getCircuit(serviceName);
    circuit.failureCount += 1;
    circuit.lastFailureTime = Date.now();

    if (circuit.failureCount >= this.failureThreshold || circuit.state === CircuitState.HALF_OPEN) {
      circuit.state = CircuitState.OPEN;
    }
  }

  async execute(serviceName, actionFn, fallbackFn = null) {
    if (this.isOpen(serviceName)) {
      if (fallbackFn) {
        return fallbackFn(new Error(`Circuit breaker is OPEN for service '${serviceName}'`));
      }
      throw new Error(`Service '${serviceName}' is temporarily unavailable (circuit open)`);
    }

    let timerId = null;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timerId = setTimeout(() => reject(new Error(`Operation timed out after ${this.timeoutMs}ms`)), this.timeoutMs);
      });

      const result = await Promise.race([actionFn(), timeoutPromise]);
      if (timerId) clearTimeout(timerId);
      this.recordSuccess(serviceName);
      return result;
    } catch (err) {
      if (timerId) clearTimeout(timerId);
      this.recordFailure(serviceName);
      if (fallbackFn) {
        return fallbackFn(err);
      }
      throw err;
    }
  }

  reset(serviceName) {
    this.circuits.delete(serviceName);
  }
}

export const circuitBreaker = new ServiceCircuitBreaker();

export default cloudCircuitBreaker;
