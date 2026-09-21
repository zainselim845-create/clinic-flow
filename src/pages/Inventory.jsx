import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import { 
  Package, Plus, Search, 
  Clock, CheckCircle2, ShieldAlert, Settings 
} from 'lucide-react';
import InventoryItemModal from '../components/InventoryItemModal';
import { 
  getInventoryItems, addInventoryItem, adjustItemStock, 
  INVENTORY_CATEGORIES 
} from '../services/inventoryService';
import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import './Inventory.css';

const Inventory = () => {
  const { state } = useApp();
  const { tenant } = useTenant();
  const currentClinicId = tenant?.id || state?.clinicInfo?.id;

  const currentSlug = tenant?.slug || state?.clinicInfo?.slug || 'dr-ahmed';

  const clinicModules = tenant?.modules || state.clinicInfo?.modules || {};
  const isEnabled = Boolean(tenant?.enableInventory ?? state.clinicInfo?.enableInventory ?? clinicModules.inventory);

  const loadScopedInventory = () => {
    const parsed = safeGetJSON(`clinicflow_inventory_${currentSlug}`, null);
    if (Array.isArray(parsed)) return parsed;
    return [];
  };

  const [items, setItems] = useState(loadScopedInventory);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setItems(loadScopedInventory());
  }, [currentSlug]);

  useEffect(() => {
    safeSetJSON(`clinicflow_inventory_${currentSlug}`, items);
  }, [items, currentSlug]);

  useEffect(() => {
    async function load() {
      if (!currentClinicId) return;
      const { data } = await getInventoryItems(currentClinicId);
      if (data && data.length > 0) {
        setItems(data);
      }
    }
    load();
  }, [currentClinicId]);

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      // Tenant scoping
      if (!currentClinicId) return false;
      const itClinicId = it.clinicId || it.clinic_id;
      if (itClinicId && itClinicId !== currentClinicId) return false;

      const matchesSearch = 
        it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.lotNumber && it.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || it.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, selectedCategory, currentClinicId]);

  // Adjust stock quantity
  const handleStockChange = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.currentQty + delta);
    await adjustItemStock(id, newQty);
    setItems(prev => prev.map(i => i.id === id ? { ...i, currentQty: newQty } : i));
  };

  const handleSaveItem = async (newItem) => {
    const itemWithClinic = {
      ...newItem,
      clinicId: currentClinicId,
      clinic_id: currentClinicId
    };
    await addInventoryItem(itemWithClinic);
    setItems(prev => [itemWithClinic, ...prev]);
  };

  if (!isEnabled) {
    return (
      <div className="inventory-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '540px', margin: '3rem auto', padding: '2.5rem', borderRadius: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Package size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
            ميزة إدارة المخزن والمستلزمات غير مفعلة
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            هذه الميزة مخصصة لتتبع حركات الأدوية والمستهلكات والمخزون وحساب تكلفة الجلسات. يمكنك تفعيلها فوراً من إعدادات العيادة.
          </p>
          <a 
            href="/settings?tab=clinic"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', textDecoration: 'none' }}
          >
            <Settings size={18} />
            <span>الانتقال لإعدادات العيادة لتفعيل الميزة</span>
          </a>
        </div>
      </div>
    );
  }

  // Metrics
  const lowStockCount = items.filter(i => i.currentQty <= i.minQuantity).length;
  const totalValuation = items.reduce((acc, i) => acc + (i.currentQty * i.costPerUnit), 0);

  return (
    <div className="inventory-page">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>مخزون المستلزمات الطبية (Dental Materials & Inventory)</h1>
          <p>متابعة كميات الكومبوزيت، البنج، مواد الطبعات، والتعقيم مع إنذارات النقص والصلاحية</p>
        </div>
        <div className="header-actions-btns">
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="inv-metrics-row">
        <div className="inv-stat-card">
          <div className="stat-icon-wrap blue"><Package size={22} /></div>
          <div>
            <span className="stat-lbl">إجمالي الأصناف المسجلة</span>
            <strong className="stat-val">{items.length} صنف</strong>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="stat-icon-wrap red"><ShieldAlert size={22} /></div>
          <div>
            <span className="stat-lbl">أصناف قاربت على النفاد</span>
            <strong className="stat-val text-danger">{lowStockCount} أصناف حرجة</strong>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="stat-icon-wrap green"><CheckCircle2 size={22} /></div>
          <div>
            <span className="stat-lbl">إجمالي القيمة التقديرية للمخزون</span>
            <strong className="stat-val text-success">{totalValuation.toLocaleString()} ج.م</strong>
          </div>
        </div>
      </div>

      {/* Search & Category Pills */}
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

      {/* Inventory Table */}
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
            {filteredItems.length === 0 ? (
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
                        onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="cat-pill active"
                        style={{ marginTop: '0.5rem', padding: '0.45rem 1rem', background: 'var(--primary)', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => setIsModalOpen(true)}
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
                          onClick={() => handleStockChange(item.id, -1)}
                          className="btn-counter minus"
                          title="صرف وحدة من المخزون"
                        >
                          -
                        </button>
                        <span className="counter-num">{item.currentQty}</span>
                        <button 
                          type="button" 
                          onClick={() => handleStockChange(item.id, 1)}
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

      {/* Modal */}
      <InventoryItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveItem={handleSaveItem}
      />

    </div>
  );
};

export default Inventory;
