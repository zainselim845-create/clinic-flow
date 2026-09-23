/**
 * Enterprise SaaS Billing, Stripe Integration & Subscription State Machine
 * Manages recurring revenue, webhook idempotency, plan upgrades, and regional payment methods.
 */

import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import { updateClinicSubscriptionStatus, broadcastTenantUpdate } from './authService';
import { getSaaSSubscriptionPlans } from './saasSubscriptionPlansService';

export const SUBSCRIPTION_STATES = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELED: 'canceled',
  LIFETIME: 'lifetime'
};

const PROCESSED_WEBHOOKS_KEY = 'clinicflow_processed_billing_events';
const MANUAL_PAYMENTS_KEY = 'clinicflow_manual_payment_receipts';

/**
 * Checks if a webhook event ID has already been processed (Idempotency Guard)
 * @param {string} eventId 
 * @returns {boolean}
 */
export function isWebhookEventProcessed(eventId) {
  if (!eventId) return false;
  const processed = safeGetJSON(PROCESSED_WEBHOOKS_KEY, []);
  return processed.includes(eventId);
}

/**
 * Records a webhook event ID as successfully processed
 * @param {string} eventId 
 */
export function recordWebhookEventProcessed(eventId) {
  if (!eventId) return;
  const processed = safeGetJSON(PROCESSED_WEBHOOKS_KEY, []);
  if (!processed.includes(eventId)) {
    processed.push(eventId);
    // Keep last 1,000 processed events to prevent storage bloat
    if (processed.length > 1000) processed.shift();
    safeSetJSON(PROCESSED_WEBHOOKS_KEY, processed);
  }
}

/**
 * Evaluates subscription state transition
 * @param {string} currentState 
 * @param {string} targetState 
 * @returns {boolean} Whether the transition is valid
 */
export function canTransitionSubscription(currentState, targetState) {
  if (currentState === targetState) return true;
  if (currentState === SUBSCRIPTION_STATES.LIFETIME) return false; // Lifetime cannot be downgraded or suspended automatically

  const allowedTransitions = {
    [SUBSCRIPTION_STATES.TRIALING]: [SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.PAST_DUE, SUBSCRIPTION_STATES.SUSPENDED, SUBSCRIPTION_STATES.CANCELED, SUBSCRIPTION_STATES.LIFETIME],
    [SUBSCRIPTION_STATES.ACTIVE]: [SUBSCRIPTION_STATES.PAST_DUE, SUBSCRIPTION_STATES.SUSPENDED, SUBSCRIPTION_STATES.CANCELED, SUBSCRIPTION_STATES.LIFETIME],
    [SUBSCRIPTION_STATES.PAST_DUE]: [SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.SUSPENDED, SUBSCRIPTION_STATES.CANCELED],
    [SUBSCRIPTION_STATES.SUSPENDED]: [SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.CANCELED, SUBSCRIPTION_STATES.LIFETIME],
    [SUBSCRIPTION_STATES.CANCELED]: [SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.LIFETIME]
  };

  return (allowedTransitions[currentState] || []).includes(targetState);
}

/**
 * Handles incoming Stripe / Payment Webhook event
 * @param {Object} event - Webhook payload
 * @returns {{ processed: boolean, status: string, clinicId?: string }}
 */
export function processBillingWebhook(event = {}) {
  const eventId = event.id;
  const eventType = event.type;
  const data = event.data?.object || {};

  if (!eventId || !eventType) {
    throw new Error('Invalid webhook payload: Missing event id or type.');
  }

  // Idempotency check: Return existing status if already processed
  if (isWebhookEventProcessed(eventId)) {
    return { processed: true, status: 'already_processed', eventId };
  }

  const clinicId = data.metadata?.clinicId || data.client_reference_id;
  const planId = data.metadata?.planId || 'pro';

  switch (eventType) {
    case 'checkout.session.completed':
    case 'invoice.payment_succeeded': {
      if (clinicId) {
        updateClinicSubscriptionStatus(clinicId, SUBSCRIPTION_STATES.ACTIVE);
      }
      break;
    }

    case 'invoice.payment_failed': {
      if (clinicId) {
        updateClinicSubscriptionStatus(clinicId, SUBSCRIPTION_STATES.PAST_DUE, 'فشل تحصيل القسط الدوري للبطاقة البنكية');
      }
      break;
    }

    case 'customer.subscription.deleted': {
      if (clinicId) {
        updateClinicSubscriptionStatus(clinicId, SUBSCRIPTION_STATES.CANCELED, 'تم إلغاء الاشتراك من قبل العميل');
      }
      break;
    }

    default:
      console.warn(`[StripeBilling] Unhandled webhook event type: ${eventType}`);
  }

  recordWebhookEventProcessed(eventId);
  return { processed: true, status: 'success', eventType, clinicId };
}

/**
 * Submits proof of manual regional payment (InstaPay, Vodafone Cash, Fawry)
 * @param {Object} receipt
 * @param {string} receipt.clinicId
 * @param {string} receipt.method - 'instapay' | 'vodafone_cash' | 'fawry' | 'bank_transfer'
 * @param {string} receipt.referenceNumber
 * @param {number} receipt.amount
 * @returns {Object}
 */
export function submitRegionalPaymentProof(receipt = {}) {
  if (!receipt.clinicId || !receipt.referenceNumber || !receipt.amount) {
    throw new Error('بيانات إيصال التحويل غير مكتملة (كود المرجع، العيادة، والمبلغ مطلوبان).');
  }

  const receipts = safeGetJSON(MANUAL_PAYMENTS_KEY, []);
  const newReceipt = {
    id: `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...receipt,
    status: 'pending_verification',
    submittedAt: new Date().toISOString()
  };

  receipts.unshift(newReceipt);
  safeSetJSON(MANUAL_PAYMENTS_KEY, receipts);

  broadcastTenantUpdate('MANUAL_PAYMENT_SUBMITTED', newReceipt);
  return newReceipt;
}

/**
 * Retrieves all submitted manual payment receipts for Super Admin review
 * @returns {Array<Object>}
 */
export function getRegionalPaymentReceipts() {
  return safeGetJSON(MANUAL_PAYMENTS_KEY, []);
}

/**
 * Approves a manual payment and activates the clinic
 * @param {string} receiptId 
 * @param {string} clinicId 
 * @returns {boolean}
 */
export function approveRegionalPayment(receiptId, clinicId) {
  const receipts = safeGetJSON(MANUAL_PAYMENTS_KEY, []);
  const idx = receipts.findIndex(r => r.id === receiptId);
  if (idx >= 0) {
    receipts[idx].status = 'approved';
    receipts[idx].approvedAt = new Date().toISOString();
    safeSetJSON(MANUAL_PAYMENTS_KEY, receipts);
  }

  if (clinicId) {
    updateClinicSubscriptionStatus(clinicId, SUBSCRIPTION_STATES.ACTIVE);
  }

  return true;
}
