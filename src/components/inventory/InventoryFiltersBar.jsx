import React from 'react';
import { Search } from 'lucide-react';
import { INVENTORY_CATEGORIES } from '@/features/inventory/services/inventoryService';

/**
 * InventoryFiltersBar
 * Search input and category filter tabs for inventory management.
 */
export const InventoryFiltersBar = ({
  searchQuery = '',
  setSearchQuery,
  selectedCategory = 'all',
  setSelectedCategory
}) => {
  return (
    <div className="filters-bar glass-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <div className="search-box" style={{ flex: 1, minWidth: '240px' }}>
        <Search size={18} className="search-icon" aria-hidden="true" />
        <input
          type="text"
          placeholder="بحث باسم الصنف أو رقم التشغيلة..."
          aria-label="بحث باسم الصنف أو رقم التشغيلة"
          className="input-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="category-pills-wrap" role="tablist" aria-label="تصفية المستلزمات الطبية حسب التصنيف">
        {INVENTORY_CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={selectedCategory === c.id}
            className={`cat-pill ${selectedCategory === c.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(c.id)}
          >
            {c.labelAr}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InventoryFiltersBar;
