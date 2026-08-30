import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Search, 
  Clock, CheckCircle2, ShieldAlert 
} from 'lucide-react';
import InventoryItemModal from '../components/InventoryItemModal';
import { 
  getInventoryItems, addInventoryItem, adjustItemStock, 
  INVENTORY_CATEGORIES 
} from '../services/inventoryService';
import './Inventory.css';

const Inventory = () => {
  const [items, setItems] = useState([
    {
      id: 'inv-item-1',
      name: 'كومبوزيت تجميلي 3M Filtek Z250 (A2)',
      category: 'composite',
      unit: 'سرنجة 4g',
      minQuantity: 3,
      currentQty: 2, // Low stock!
      costPerUnit: 350,
      lotNumber: 'LOT-3M-889',
      expiryDate: '2027-05-15'
    },
    {
      id: 'inv-item-2',
      name: 'بنج موضعي ميبافاكيين أحمر (Mepivacaine 2%)',
      category: 'anesthetics',
      unit: 'علبة (50 كاربول)',
      minQuantity: 2,
      currentQty: 5,
      costPerUnit: 420,
      lotNumber: 'LOT-MEP-102',
      expiryDate: '2026-11-20' // Soon!
    },
    {
      id: 'inv-item-3',
      name: 'بودرة مقاسات هيدروجوم الجينات (Hydrogum 5)',
      category: 'impression',
      unit: 'كيس 453g',
      minQuantity: 4,
      currentQty: 8,
      costPerUnit: 280,
      lotNumber: 'LOT-ALG-44',
      expiryDate: '2028-01-10'
    },
    {
      id: 'inv-item-4',
      name: 'قفازات لاتكس فحص طبي مقاس M (Latex Gloves)',
      category: 'infection_control',
      unit: 'علبة (100 قفاز)',
      minQuantity: 5,
      currentQty: 1, // Critical!
      costPerUnit: 180,
      lotNumber: 'LOT-GLV-09',
      expiryDate: '2029-08-30'
    },
    {
      id: 'inv-item-5',
      name: 'سنابل توربين حفر ماسية ألمانية (Diamond Burs Kit)',
      category: 'burs',
      unit: 'طقم 10 بيرز',
      minQuantity: 2,
      currentQty: 4,
      costPerUnit: 450,
      lotNumber: 'LOT-BUR-77',
      expiryDate: '2030-01-01'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await getInventoryItems();
      if (data && data.length > 0) {
        setItems(data);
      }
    }
    load();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchesSearch = 
        it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.lotNumber && it.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || it.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, selectedCategory]);

  // Adjust stock quantity
  const handleStockChange = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.currentQty + delta);
    await adjustItemStock(id, newQty);
    setItems(prev => prev.map(i => i.id === id ? { ...i, currentQty: newQty } : i));
  };

  const handleSaveItem = async (newItem) => {
    await addInventoryItem(newItem);
    setItems(prev => [newItem, ...prev]);
  };

  // Metrics
  const lowStockCount = items.filter(i => i.currentQty <= i.minQuantity).length;
  const totalValuation = items.reduce((acc, i) => acc + (i.currentQty * i.costPerUnit), 0);

  return (
    <div className="inventory-page">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>مخزون المستلزمات الطبية (Dental Materials & Inventory)</h2>
          <p>متابعة كميات الكومبوزيت، البنج، مواد الطبعات، والتعقيم مع إنذارات النقص والصلاحية</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
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
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="بحث باسم الصنف أو رقم التشغيلة..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-pills-wrap">
          {INVENTORY_CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
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
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  لا توجد أصناف مسجلة في هذا التصنيف.
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
                    <td><span className="category-badge">{item.category}</span></td>
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
