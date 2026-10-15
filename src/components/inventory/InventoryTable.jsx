import React from 'react';
import { Package, Plus, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import ScreenState from '@/components/ui/ScreenState';
import { INVENTORY_CATEGORIES } from '@/features/inventory/services/inventoryService';

/**
 * InventoryTable
 * Data table presenting stock items, expiration status, and one-click qty adjusters.
 * Lifecycle handled by the canonical ScreenState primitive
 * (Loading → Error+Retry → Empty+CTA → Loaded).
 */
export const InventoryTable = ({
  filteredItems = [],
  isLoading = false,
  loadError = null,
  searchQuery = '',
  selectedCategory = 'all',
  onResetFilters,
  onOpenNewItemModal,
  onRetryFetch,
  onStockChange
}) => {
  const hasActiveFilters = Boolean(searchQuery) || selectedCategory !== 'all';

  const skeletonTable = (
    <table className="inventory-main-table" aria-hidden="true">
      <tbody>
        {Array.from({ length: 5 }).map((_, idx) => (
          <tr key={`inv-item-skel-${idx}`}>
            <td><Skeleton style={{ height: '18px', width: '140px', borderRadius: '4px' }} /></td>
            <td><Skeleton style={{ height: '18px', width: '80px', borderRadius: '12px' }} /></td>
            <td><Skeleton style={{ height: '18px', width: '60px', borderRadius: '4px' }} /></td>
            <td><Skeleton style={{ height: '18px', width: '70px', borderRadius: '4px' }} /></td>
            <td><Skeleton style={{ height: '18px', width: '70px', borderRadius: '4px' }} /></td>
            <td><Skeleton style={{ height: '18px', width: '70px', borderRadius: '4px' }} /></td>
            <td><Skeleton style={{ height: '18px', width: '90px', borderRadius: '4px' }} /></td>
            <td><Skeleton style={{ height: '28px', width: '100px', borderRadius: '6px' }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="glass-card table-responsive-container">
      <ScreenState
        isLoading={isLoading}
        loadError={loadError}
        isEmpty={!isLoading && !loadError && filteredItems.length === 0}
        skeleton={skeletonTable}
        errorTitle={loadError || 'تعذّر تحميل بيانات المخزون'}
        onRetry={onRetryFetch}
        retryLabel="إعادة المحاولة الآن"
        emptyIcon={<Package size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />}
        emptyTitle={hasActiveFilters ? 'لا توجد أصناف مطابقة لمعايير البحث والتصنيف' : 'مخزن العيادة فارغ حتى الآن'}
        emptyMessage={
          hasActiveFilters
            ? 'جرّب البحث باسم صنف آخر أو اختيار تصنيف الكل.'
            : 'يمكنك إضافة المستلزمات الطبية والأدوية وتتبع المخزون وحد الطلب.'
        }
        emptyActionLabel={hasActiveFilters ? null : 'إضافة أول مستلزم'}
        onEmptyAction={hasActiveFilters ? null : onOpenNewItemModal}
        secondaryActionLabel={hasActiveFilters ? 'إعادة ضبط الفلاتر' : null}
        onSecondaryAction={hasActiveFilters ? onResetFilters : null}
      >
        <table className="inventory-main-table">
          <thead>
            <tr>
              <th>اسم المستلزم الطبي</th>
              <th>التصنيف</th>
              <th>وحدة الصرف</th>
              <th>الرصيد المتوفر</th>
              <th>حد الطلب الأدنى</th>
              <th>تكلفة الوحدة</th>
              <th>تاريخ الصلاحية</th>
              <th>تعديل الرصيد السريع</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const isLow = item.currentQty <= item.minQuantity;
              return (
                <tr key={item.id} className={isLow ? 'row-low-stock' : ''}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.lotNumber && <span className="lot-tag">{item.lotNumber}</span>}
                  </td>
                  <td>
                    <span className="category-badge">
                      {INVENTORY_CATEGORIES.find(c => c.id === item.category)?.labelAr || item.category}
                    </span>
                  </td>
                  <td>{item.unit}</td>
                  <td>
                    <span className={`qty-indicator ${isLow ? 'critical' : 'normal'}`}>
                      {item.currentQty} {item.unit}
                    </span>
                  </td>
                  <td>{item.minQuantity}</td>
                  <td>{item.costPerUnit} ج.م</td>
                  <td>
                    <span className="exp-badge">
                      <Clock size={12} />
                      {item.expiryDate || 'غير محدد'}
                    </span>
                  </td>
                  <td>
                    <div className="stock-counter-ctrls">
                      <button
                        type="button"
                        onClick={() => onStockChange(item.id, -1)}
                        className="btn-counter minus"
                        title="صرف وحدة من المخزون"
                      >
                        -
                      </button>
                      <span className="counter-num">{item.currentQty}</span>
                      <button
                        type="button"
                        onClick={() => onStockChange(item.id, 1)}
                        className="btn-counter plus"
                        title="إضافة وتوريد وحدة"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScreenState>
    </div>
  );
};

export default InventoryTable;
