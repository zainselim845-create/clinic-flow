import React from 'react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionButton?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionButton,
  className = ''
}: EmptyStateProps) {
  const cta = action || actionButton;

  return (
    <div
      role="region"
      aria-label={title}
      className={`empty-state ${className}`}
      dir="rtl"
    >
      {Icon && (
        <div className="empty-state-icon flex items-center justify-center w-[var(--space-10)] h-[var(--space-10)] rounded-[var(--radius-full)] bg-[var(--clinic-primary-light)] text-[var(--clinic-primary)]">
          <Icon size={32} />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {cta && <div className="empty-state-action">{cta}</div>}
    </div>
  );
}

export default EmptyState;
