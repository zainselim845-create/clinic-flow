import React from 'react';

/**
 * Base Skeleton shimmer loader component
 */
export function Skeleton({ className = '', width, height, style = {}, ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700/60 rounded-md ${className}`}
      style={{
        width,
        height,
        ...style
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Skeleton for Dashboard/Stats KPI cards
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

/**
 * Skeleton for Data Tables (Patients, Appointments, Invoices)
 */
export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton key={`th-${idx}`} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={`tr-${rIdx}`} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <Skeleton
              key={`td-${rIdx}-${cIdx}`}
              className={`h-4 ${cIdx === 0 ? 'w-32' : cIdx === 1 ? 'w-24' : 'w-16'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
