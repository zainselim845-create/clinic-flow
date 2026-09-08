/**
 * Production-Grade Circuit Breaker Pattern
 * Protects against cascading failures from third-party APIs (SMS gateways, AI providers, Webhooks)
 */
export const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

export class CircuitBreaker {
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

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${this.timeoutMs}ms`)), this.timeoutMs);
      });

      const result = await Promise.race([actionFn(), timeoutPromise]);
      this.recordSuccess(serviceName);
      return result;
    } catch (err) {
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

export const circuitBreaker = new CircuitBreaker();
