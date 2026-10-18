import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '@/lib/supabase';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';

export const INVENTORY_CATEGORIES = [
  { id: 'all', labelAr: 'جميع الأصناف' },
  { id: 'composite', labelAr: 'حشوات وكومبوزيت وتثبيت' },
  { id: 'anesthetics', labelAr: 'بنج وتخدير موضعي' },
  { id: 'impression', labelAr: 'مواد مقاسات وطبقات (Alginate/Silicon)' },
  { id: 'infection_control', labelAr: 'مكافحة عدوى وقفازات وتعقيم' },
  { id: 'endo', labelAr: 'مستلزمات عصب وفايلات ومطهرات' },
  { id: 'surgical', labelAr: 'شفرات جراحية وخيوط جراحية' },
  { id: 'burs', labelAr: 'سنابل وبيرز حفر وتلميع' }
];

export function fromDbInventoryItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    category: row.category || 'composite',
    unit: row.unit || 'علبة',
    minQuantity: Number(row.min_quantity || 5),
    currentQty: Number(row.current_qty || 0),
    costPerUnit: Number(row.cost_per_unit || 0),
    lotNumber: row.lot_number || '',
    expiryDate: row.expiry_date,
    isDisposable: Boolean(row.is_disposable),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at
  };
}

export function toDbInventoryItem(data) {
  if (!data) return {};
  return {
    id: data.id || undefined,
    clinic_id: data.clinicId || undefined,
    name: data.name,
    category: data.category || 'composite',
    unit: data.unit || 'علبة',
    min_quantity: Number(data.minQuantity || 5),
    current_qty: Number(data.currentQty || 0),
    cost_per_unit: Number(data.costPerUnit || 0),
    lot_number: data.lotNumber || '',
    expiry_date: data.expiryDate || null,
    is_disposable: data.isDisposable !== undefined ? Boolean(data.isDisposable) : true,
    is_active: data.isActive !== undefined ? Boolean(data.isActive) : true
  };
}

export async function getInventoryItems(clinicId, options = {}) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to prevent multi-tenant data leaks') };
  }

  try {
    let query = supabase.from('inventory_items')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name', { ascending: true });

    const limit = options?.limit || 300;
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []).map(fromDbInventoryItem), error: null };
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return { data: [], error };
  }
}

export async function addInventoryItem(item) {
  if (!isSupabaseConfigured()) {
    return { data: item, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const row = toDbInventoryItem(item);
    const { data, error } = await supabase.from('inventory_items').insert(row).select().single();
    if (error) throw error;
    return { data: fromDbInventoryItem(data), error: null };
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return { data: item, error };
  }
}

export const STOCK_TRANSACTION_TYPES = {
  IN: { id: 'in', labelAr: 'توريد / شراء وارد', sign: '+' },
  OUT: { id: 'out', labelAr: 'صرف استهلاك كشف', sign: '-' },
  ADJUSTMENT: { id: 'adjustment', labelAr: 'تسوية جرد دوري', sign: '±' },
  WASTE: { id: 'waste', labelAr: 'تالف / منتهي الصلاحية', sign: '-' }
};

export async function recordStockTransaction(clinicId, txData) {
  if (!clinicId) {
    console.warn('[InventoryService] Clinic ID is required for stock transactions');
    return { data: null, error: new Error('Clinic ID is required') };
  }

  const tx = {
    id: txData.id || `stx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    clinicId,
    itemId: txData.itemId,
    itemName: txData.itemName || '',
    type: txData.type || 'adjustment',
    delta: Number(txData.delta || 0),
    previousQty: Number(txData.previousQty || 0),
    newQty: Number(txData.newQty || 0),
    reason: txData.reason || 'تسوية رصيد',
    performedBy: txData.performedBy || 'طاقم العيادة',
    notes: txData.notes || '',
    createdAt: txData.createdAt || new Date().toISOString()
  };

  // Local Scoped Persistence (Audit Trail)
  const scopedKey = `clinicflow_stock_tx_${clinicId}`;
  const existing = safeGetJSON(scopedKey, []);
  safeSetJSON(scopedKey, [tx, ...(Array.isArray(existing) ? existing : [])]);

  // Remote Supabase Persistence (if table exists)
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('inventory_transactions').insert({
        id: tx.id,
        clinic_id: tx.clinicId,
        item_id: tx.itemId,
        type: tx.type,
        delta: tx.delta,
        previous_qty: tx.previousQty,
        new_qty: tx.newQty,
        reason: tx.reason,
        performed_by: tx.performedBy,
        notes: tx.notes,
        created_at: tx.createdAt
      });
    } catch (remoteErr) {
      console.warn('[InventoryService] Remote stock transaction sync notice (saved locally):', remoteErr.message);
    }
  }

  return { data: tx, error: null };
}

export async function getStockTransactions(clinicId, itemId = null) {
  if (!clinicId) return { data: [], error: null };

  const scopedKey = `clinicflow_stock_tx_${clinicId}`;
  const localList = safeGetJSON(scopedKey, []);
  let results = Array.isArray(localList) ? localList : [];

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('inventory_transactions')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        results = data.map(row => ({
          id: row.id,
          clinicId: row.clinic_id,
          itemId: row.item_id,
          type: row.type,
          delta: Number(row.delta || 0),
          previousQty: Number(row.previous_qty || 0),
          newQty: Number(row.new_qty || 0),
          reason: row.reason || '',
          performedBy: row.performed_by || '',
          notes: row.notes || '',
          createdAt: row.created_at
        }));
      }
    } catch {
      // Fallback silently to local list
    }
  }

  if (itemId) {
    results = results.filter(tx => tx.itemId === itemId);
  }

  return { data: results, error: null };
}

export async function adjustItemStock(id, newQty, clinicId = null, meta = {}) {
  const safeNewQty = Math.max(0, Number(newQty));

  if (clinicId) {
    await recordStockTransaction(clinicId, {
      itemId: id,
      itemName: meta.itemName || '',
      type: meta.type || (safeNewQty > Number(meta.previousQty || 0) ? 'in' : 'out'),
      delta: safeNewQty - Number(meta.previousQty || 0),
      previousQty: Number(meta.previousQty || 0),
      newQty: safeNewQty,
      reason: meta.reason || (safeNewQty > Number(meta.previousQty || 0) ? 'توريد وإضافة للمخزون' : 'صرف استهلاك كشف'),
      performedBy: meta.performedBy || 'طاقم العيادة',
      notes: meta.notes || ''
    });
  }

  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase
      .from('inventory_items')
      .update({ current_qty: safeNewQty })
      .eq('id', id);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { error } = await query;
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating inventory stock:', error);
    return { success: false, error };
  }
}

