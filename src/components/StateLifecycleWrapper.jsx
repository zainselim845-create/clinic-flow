import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';

/**
 * Universal 4-State Lifecycle Wrapper
 * Guarantees that any view handles:
 * 1. Loading (Shimmering Skeletons)
 * 2. Error (Diagnostic + Retry CTA)
 * 3. Empty (Empty State + Action CTA)
 * 4. Loaded (Children)
 */
export default function StateLifecycleWrapper({
  isLoading = false,
  error = null,
  isEmpty = false,
  onRetry = null,
  emptyIcon = Inbox,
  emptyTitle = 'لا توجد بيانات حالياً',
  emptyDescription = 'لم يتم تسجيل أي عناصر بعد.',
  emptyAction = null,
  skeletonRows = 3,
  children
}) {
  // 1. Loading State
  if (isLoading) {
    return (
      <div className="state-lifecycle-loading" style={{ padding: '1.5rem', width: '100%' }}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <Skeleton width="100%" height="48px" borderRadius="10px" />
          </div>
        ))}
      </div>
    );
  }

  // 2. Error State
  if (error) {
    const errorMsg = typeof error === 'string' ? error : (error?.message || 'حدث خطأ غير متوقع أثناء تحميل البيانات.');
    return (
      <div 
        className="state-lifecycle-error" 
        style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          backgroundColor: 'var(--color-bg-subtle, #F8FAFC)',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          margin: '1.5rem 0'
        }}
      >
        <div 
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            color: '#EF4444',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}
        >
          <AlertCircle size={28} />
        </div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#B91C1C', fontSize: '1.1rem', fontWeight: 'bold' }}>
          تعذر تحميل البيانات
        </h4>
        <p style={{ margin: '0 0 1.5rem 0', color: '#6B7280', fontSize: '0.9rem', maxWidth: '450px', marginLeft: 'auto', marginRight: 'auto' }}>
          {errorMsg}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.4rem'
            }}
          >
            <RefreshCw size={16} />
            <span>إعادة المحاولة</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Empty State
  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionButton={emptyAction}
      />
    );
  }

  // 4. Loaded State
  return <>{children}</>;
}
