import React from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';

export default function PatientsFiltersBar({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode
}) {
  return (
    <div className="filters-bar glass-card">
      <div className="search-box full-width">
        <Search size={18} className="search-icon" aria-hidden="true" />
        <input 
          type="text" 
          placeholder="بحث بالاسم أو رقم الهاتف..." 
          aria-label="بحث بالاسم أو رقم الهاتف"
          className="input-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="view-toggle" role="group" aria-label="طريقة عرض المرضى">
        <button 
          type="button"
          className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
          aria-label="عرض شبكي (بطاقات)"
          aria-pressed={viewMode === 'grid'}
          onClick={() => setViewMode('grid')}
        >
          <LayoutGrid size={20} aria-hidden="true" />
        </button>
        <button 
          type="button"
          className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          aria-label="عرض قائمة"
          aria-pressed={viewMode === 'list'}
          onClick={() => setViewMode('list')}
        >
          <List size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
