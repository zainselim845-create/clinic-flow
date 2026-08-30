import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

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

export async function getInventoryItems(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('inventory_items').select('*').order('name', { ascending: true });
    if (clinicId) query = query.eq('clinic_id', clinicId);

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

export async function adjustItemStock(id, newQty) {
  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase
      .from('inventory_items')
      .update({ current_qty: Math.max(0, Number(newQty)) })
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating inventory stock:', error);
    return { success: false, error };
  }
}
