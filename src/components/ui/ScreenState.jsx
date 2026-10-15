import React from 'react';
import { AlertCircle, RefreshCw, Inbox, Plus } from 'lucide-react';

/**
 * ScreenState — Canonical Four-State Lifecycle Primitive (SaaS-Hardened)
 * =========================================================================
 * Every async screen must render exactly one of four states, in priority
 * order: Loading → Error (with retry) → Empty (with CTA) → Loaded content.
 *
 * Fully supports all standard props and aliases across the codebase.
 */
export function ScreenState({
  isLoading = false,
  loadError = null,
  error = null,
  isEmpty = false,
  loadingLabel = 'جارٍ التحميل...',
  skeleton = null,
  loadingSkeleton = null,
  skeletonRows = 4,
  skeletonCount = 4,
  errorTitle = 'تعذّر تحميل البيانات',
  onRetry = null,
  retryLabel = 'إعادة المحاولة',
  emptyIcon = null,
  emptyTitle = 'لا توجد بيانات حتى الآن',
  emptyMessage = null,
  emptyDescription = null,
  emptyActionLabel = null,
  onEmptyAction = null,
  secondaryActionLabel = null,
  onSecondaryAction = null,
  children = null
}) {
  const activeError = loadError || error;
  const activeSkeleton = skeleton || loadingSkeleton;
  const activeRowCount = skeletonRows || skeletonCount || 4;
  const activeEmptyDesc = emptyMessage || emptyDescription || 'ابدأ بإضافة أول عنصر للبدء';

  // 1. LOADING (Priority 1)
  if (isLoading) {
    if (activeSkeleton) {
      return (
        <div data-testid="screen-state-loading" role="status" aria-busy="true" aria-label={loadingLabel}>
          {activeSkeleton}
        </div>
      );
    }
    return (
      <div
        data-testid="screen-state-loading"
        role="status"
        aria-busy="true"
        aria-label={loadingLabel}
        className="space-y-3 p-4 animate-pulse"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '1.25rem' }}
      >
        {Array.from({ length: activeRowCount }).map((_, idx) => (
          <div
            key={`screen-state-skeleton-${idx}`}
            aria-hidden="true"
            className="skeleton-row h-5 rounded-md bg-border/40"
            style={{
              height: '18px',
              borderRadius: '6px',
              width: `${88 - idx * 9}%`,
              background: 'var(--surface-sunken, rgba(127,127,127,0.15))'
            }}
          />
        ))}
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loadingLabel}</span>
      </div>
    );
  }

  // 2. ERROR (Priority 2, with recovery CTA)
  if (activeError) {
    const errorText = typeof activeError === 'string' ? activeError : (activeError?.message || String(activeError));
    return (
      <div
        data-testid="screen-state-error"
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          padding: '3.5rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}
      >
        <AlertCircle size={36} color="var(--danger, #DC2626)" aria-hidden="true" />
        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{errorTitle}</strong>
        <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '420px' }}>{errorText}</p>
        {onRetry && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={onRetry}
          >
            <RefreshCw size={15} />
            <span>{retryLabel}</span>
          </button>
        )}
      </div>
    );
  }

  // 3. EMPTY (Priority 3, with primary + optional secondary CTA)
  if (isEmpty) {
    return (
      <div
        data-testid="screen-state-empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          padding: '3.5rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}
      >
        {emptyIcon || <Inbox size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />}
        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{emptyTitle}</strong>
        <p style={{ margin: 0, fontSize: '0.84rem', maxWidth: '380px' }}>{activeEmptyDesc}</p>
        {emptyActionLabel && onEmptyAction && (
          <button
            type="button"
            data-testid="screen-state-empty-cta"
            className="cat-pill active"
            style={{
              marginTop: '0.5rem',
              padding: '0.45rem 1rem',
              background: 'var(--primary)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            onClick={onEmptyAction}
          >
            <Plus size={15} />
            <span>{emptyActionLabel}</span>
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            data-testid="screen-state-empty-secondary"
            className="cat-pill active"
            style={{ marginTop: '0.25rem', padding: '0.45rem 1rem', border: '1px solid var(--border-color)' }}
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    );
  }

  // 4. LOADED (Priority 4)
  return <>{children}</>;
}

export default ScreenState;
