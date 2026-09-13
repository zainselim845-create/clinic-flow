import React from 'react';
import { useAuth } from '../context/AuthContext';
import { hasCapability } from '../utils/permissions';

/**
 * Custom React hook to evaluate capability for current authenticated user
 * @param {string} capability - e.g. 'billing.revenue.view'
 * @returns {boolean}
 */
export function useCapability(capability) {
  const { user } = useAuth();
  return hasCapability(user, capability);
}

/**
 * Declarative permission boundary component (Tier-1 SaaS standard)
 * Renders children only if current user possesses the required capability.
 * 
 * @param {Object} props
 * @param {string} props.capability - Required capability
 * @param {React.ReactNode} [props.fallback=null] - Optional fallback when unauthorized
 * @param {React.ReactNode} props.children - Protected children nodes
 */
export function Can({ capability, fallback = null, children }) {
  const isAllowed = useCapability(capability);
  if (!isAllowed) {
    return fallback;
  }
  return <>{children}</>;
}

export default Can;
