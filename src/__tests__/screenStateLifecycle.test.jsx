import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScreenState } from '@/components/ui/ScreenState';

describe('Enterprise 4-State UI Lifecycle (ScreenState)', () => {
  it('exports ScreenState as a valid React component', () => {
    expect(ScreenState).toBeDefined();
    expect(typeof ScreenState).toBe('function');
  });

  it('renders loading state with skeleton pulse elements when isLoading is true', () => {
    const html = renderToStaticMarkup(
      <ScreenState isLoading={true}>
        <div data-testid="actual-content">Loaded Content</div>
      </ScreenState>
    );

    expect(html).toContain('screen-state-loading');
    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('actual-content');
  });

  it('renders custom loading skeleton when provided', () => {
    const html = renderToStaticMarkup(
      <ScreenState
        isLoading={true}
        loadingSkeleton={<div data-testid="custom-skeleton">Custom Loader</div>}
      >
        <div>Loaded Content</div>
      </ScreenState>
    );

    expect(html).toContain('custom-skeleton');
    expect(html).toContain('Custom Loader');
    expect(html).toContain('screen-state-loading');
  });

  it('renders error state with error message and retry button', () => {
    const onRetry = vi.fn();
    const html = renderToStaticMarkup(
      <ScreenState
        error={new Error('فشل الاتصال بقاعدة البيانات')}
        onRetry={onRetry}
      >
        <div>Loaded Content</div>
      </ScreenState>
    );

    expect(html).toContain('screen-state-error');
    expect(html).toContain('فشل الاتصال بقاعدة البيانات');
    expect(html).toContain('إعادة المحاولة');
    expect(html).not.toContain('Loaded Content');
  });

  it('renders contextual empty state with title, description and CTA button', () => {
    const onAction = vi.fn();
    const html = renderToStaticMarkup(
      <ScreenState
        isEmpty={true}
        emptyTitle="لا توجد فواتير"
        emptyDescription="لم يتم إصدار أي فواتير لهذه العيادة بعد."
        emptyActionLabel="إنشاء فاتورة جديدة"
        onEmptyAction={onAction}
      >
        <div>Loaded Content</div>
      </ScreenState>
    );

    expect(html).toContain('screen-state-empty');
    expect(html).toContain('لا توجد فواتير');
    expect(html).toContain('لم يتم إصدار أي فواتير لهذه العيادة بعد.');
    expect(html).toContain('إنشاء فاتورة جديدة');
    expect(html).not.toContain('Loaded Content');
  });

  it('renders loaded children seamlessly when not loading, no error, and not empty', () => {
    const html = renderToStaticMarkup(
      <ScreenState
        isLoading={false}
        error={null}
        isEmpty={false}
      >
        <div data-testid="actual-content">بيانات المريض الفعلية</div>
      </ScreenState>
    );

    expect(html).toContain('actual-content');
    expect(html).toContain('بيانات المريض الفعلية');
    expect(html).not.toContain('screen-state-loading');
    expect(html).not.toContain('screen-state-error');
    expect(html).not.toContain('screen-state-empty');
  });
});
