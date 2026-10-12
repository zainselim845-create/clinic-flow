import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import { Plus } from 'lucide-react';
import InventoryItemModal from '../components/InventoryItemModal';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import { 
  getInventoryItems, addInventoryItem, adjustItemStock 
} from '../services/inventoryService';
import { isSupabaseConfigured } from '../lib/supabase';
import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import {
  InventoryMetricsRow,
  InventoryFiltersBar,
  InventoryTable
} from '../components/inventory';
import './Inventory.css';

const Inventory = () => {
  const location = useLocation();
  const { state } = useApp();
  const { tenant } = useTenant();
  const currentClinicId = tenant?.id || state?.clinicInfo?.id;

  const currentSlug = tenant?.slug || state?.clinicInfo?.slug || '';

  const clinicModules = tenant?.modules || state.clinicInfo?.modules || {};
  const isEnabled = Boolean(tenant?.enableInventory ?? state.clinicInfo?.enableInventory ?? clinicModules.inventory);

  const loadScopedInventory = useCallback((slug) => {
    if (!slug) return [];
    const parsed = safeGetJSON(`clinicflow_inventory_${slug}`, null);
    if (Array.isArray(parsed)) return parsed;
    return [];
  }, []);

  const [items, setItems] = useState(() => loadScopedInventory(currentSlug));
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deep-linking from Command Palette (action=new)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    setItems(loadScopedInventory(currentSlug));
  }, [currentSlug, loadScopedInventory]);

  useEffect(() => {
    safeSetJSON(`clinicflow_inventory_${currentSlug}`, items);
  }, [items, currentSlug]);

  const fetchInventory = useCallback(async () => {
    if (!currentClinicId || !isSupabaseConfigured()) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await getInventoryItems(currentClinicId);
      if (error) throw error;
      if (data && data.length > 0) {
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to load inventory items:', err);
      setLoadError('تعذر تحميل بيانات المخزون من الخادم. يرجى إعادة المحاولة.');
    } finally {
      setIsLoading(false);
    }
  }, [currentClinicId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredItems = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return items.filter(it => {
      if (!it) return false;
      // Tenant scoping
      if (!currentClinicId) return false;
      const itClinicId = it.clinicId || it.clinic_id;
      if (itClinicId && itClinicId !== currentClinicId) return false;

      const itName = it.name ? String(it.name).toLowerCase() : '';
      const itLot = it.lotNumber ? String(it.lotNumber).toLowerCase() : '';
      const matchesSearch = !q || itName.includes(q) || itLot.includes(q);

      const matchesCat = selectedCategory === 'all' || it.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, selectedCategory, currentClinicId]);

  const handleStockChange = async (itemId, delta) => {
    setItems(prev => prev.map(it => {
      if (it.id === itemId) {
        const nextQty = Math.max(0, it.currentQty + delta);
        return { ...it, currentQty: nextQty };
      }
      return it;
    }));

    if (currentClinicId && isSupabaseConfigured()) {
      try {
        await adjustItemStock(itemId, delta, currentClinicId);
      } catch (err) {
        console.error('Remote stock adjust failed:', err);
      }
    }
  };

  const handleSaveItem = async (newItem) => {
    const itemWithClinic = {
      ...newItem,
      clinicId: currentClinicId
    };

    setItems(prev => [itemWithClinic, ...prev]);

    if (currentClinicId && isSupabaseConfigured()) {
      try {
        await addInventoryItem(itemWithClinic, currentClinicId);
      } catch (err) {
        console.error('Remote inventory save failed:', err);
      }
    }
  };

  const lowStockCount = useMemo(() => {
    return items.filter(it => it.currentQty <= it.minQuantity).length;
  }, [items]);

  const totalValuation = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.currentQty || 0) * Number(it.costPerUnit || 0)), 0);
  }, [items]);

  if (!isEnabled) {
    return (
      <div className="inventory-page">
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '4rem auto' }}>
          <h2>وحدة المخزون غير مفعّلة</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: 1.6 }}>
            مخزون المستلزمات الطبية والتعقيم معطل لهذه العيادة حالياً. يمكنك تفعيل الموديل من خلال ترقية الباقة أو التواصل مع الدعم الفني.
          </p>
        </div>
      </div>
    );
  }

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
      <FeatureErrorBoundary featureName="إحصائيات المخزون">
        <InventoryMetricsRow
          totalItems={items.length}
          lowStockCount={lowStockCount}
          totalValuation={totalValuation}
        />
      </FeatureErrorBoundary>

      {/* Search & Category Pills */}
      <FeatureErrorBoundary featureName="فلاتر تصنيفات المخزون">
        <InventoryFiltersBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      </FeatureErrorBoundary>

      {/* Inventory Table */}
      <FeatureErrorBoundary featureName="جدول أصناف المخزون">
        <InventoryTable
          filteredItems={filteredItems}
          isLoading={isLoading}
          loadError={loadError}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onResetFilters={() => { setSearchQuery(''); setSelectedCategory('all'); }}
          onOpenNewItemModal={() => setIsModalOpen(true)}
          onRetryFetch={fetchInventory}
          onStockChange={handleStockChange}
        />
      </FeatureErrorBoundary>

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
