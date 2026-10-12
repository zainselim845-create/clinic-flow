import React from 'react';
import { Package, Plus, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { INVENTORY_CATEGORIES } from '../../services/inventoryService';

/**
 * InventoryTable
 * Data table presenting stock items, expiration status, and one-click qty adjusters.
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
  return (
    <div className="glass-card table-responsive-container">
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
          {isLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
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
            ))
          ) : loadError ? (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                  <AlertCircle size={36} color="var(--danger, #DC2626)" aria-hidden="true" />
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{loadError}</strong>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={onRetryFetch}
                  >
                    <RefreshCw size={15} />
                    <span>إعادة المحاولة الآن</span>
                  </button>
                </div>
              </td>
            </tr>
          ) : filteredItems.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                  <Package size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {searchQuery || selectedCategory !== 'all'
                      ? 'لا توجد أصناف مطابقة لمعايير البحث والتصنيف'
                      : 'مخزن العيادة فارغ حتى الآن'}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                    {searchQuery || selectedCategory !== 'all'
                      ? 'جرّب البحث باسم صنف آخر أو اختيار تصنيف الكل.'
                      : 'يمكنك إضافة المستلزمات الطبية والأدوية وتتبع المخزون وحد الطلب.'}
                  </p>
                  {searchQuery || selectedCategory !== 'all' ? (
                    <button
                      type="button"
                      className="cat-pill active"
                      style={{ marginTop: '0.5rem', padding: '0.45rem 1rem', border: '1px solid var(--border-color)' }}
                      onClick={onResetFilters}
                    >
                      إعادة ضبط الفلاتر
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="cat-pill active"
                      style={{ marginTop: '0.5rem', padding: '0.45rem 1rem', background: 'var(--primary)', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={onOpenNewItemModal}
                    >
                      <Plus size={16} />
                      <span>إضافة أول مستلزم</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            filteredItems.map(item => {
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
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
