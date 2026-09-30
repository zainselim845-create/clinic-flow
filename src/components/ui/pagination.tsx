import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  pageSize?: number;
  totalItems?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasPreviousPage,
  hasNextPage,
  onNextPage,
  onPreviousPage,
  pageSize,
  totalItems,
  className = ''
}: PaginationProps) {
  const canGoPrevious = hasPreviousPage ?? currentPage > 1;
  const canGoNext = hasNextPage ?? currentPage < totalPages;

  const handlePrev = () => {
    if (!canGoPrevious) return;
    if (onPreviousPage) onPreviousPage();
    else onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (onNextPage) onNextPage();
    else onPageChange(currentPage + 1);
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={`flex items-center justify-between flex-wrap gap-[var(--space-2)] p-[var(--space-2)] bg-[var(--surface)] border border-[var(--border-color)] rounded-[var(--radius-lg)] ${className}`}
      dir="rtl"
    >
      <div className="text-[0.84rem] text-[var(--text-secondary)] font-medium">
        {totalItems !== undefined && (
          <span>
            إجمالي السجلات: <strong className="text-[var(--text-primary)]">{totalItems}</strong>
          </span>
        )}
        {totalPages > 0 && (
          <span className="mr-[var(--space-2)]">
            صفحة <strong className="text-[var(--text-primary)]">{currentPage}</strong> من <strong>{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-[var(--space-1)]">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Next Page"
          className="btn btn-secondary btn-sm flex items-center gap-[var(--space-1)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>التالي</span>
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrevious}
          aria-label="Previous Page"
          className="btn btn-secondary btn-sm flex items-center gap-[var(--space-1)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
          <span>السابق</span>
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
