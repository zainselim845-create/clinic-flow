/**
 * Application-wide constants.
 * Single source of truth for magic strings, status enums, and configuration values.
 */

// Appointment statuses
export const APPOINTMENT_STATUS = {
  BOOKED: 'booked',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  REFUNDED: 'refunded'
};

// Payment statuses
export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded'
};

// Subscription states (SaaS billing state machine)
export const SUBSCRIPTION_STATE = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
  LIFETIME: 'lifetime'
};

// User roles
export const USER_ROLE = {
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  ASSOCIATE_DOCTOR: 'associate_doctor',
  ACCOUNTANT: 'accountant',
  ASSISTANT: 'assistant',
  STAFF: 'staff',
  SUPER_ADMIN: 'super_admin'
};

// Payment methods
export const PAYMENT_METHOD = {
  CASH: 'cash',
  CARD: 'card',
  VODAFONE_CASH: 'vodafone_cash',
  INSTAPAY: 'instapay',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque'
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100
};

// Rate limiting
export const RATE_LIMITS = {
  PUBLIC_API: 60,
  AUTHENTICATED_API: 600,
  AI_API: 10
};

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400
};
