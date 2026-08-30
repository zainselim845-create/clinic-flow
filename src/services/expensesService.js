import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export function fromDbExpense(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    title: row.title,
    amount: Number(row.amount) || 0,
    category: row.category || 'نثريات',
    date: row.date,
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

export function toDbExpense(data) {
  if (!data) return {};
  const payload = {};
  if (data.id && typeof data.id === 'string' && data.id.includes('-') && data.id.length > 20) {
    payload.id = data.id;
  }
  if (data.clinicId && typeof data.clinicId === 'string' && data.clinicId.includes('-')) {
    payload.clinic_id = data.clinicId;
  }
  if (data.title !== undefined) payload.title = data.title;
  if (data.amount !== undefined) payload.amount = Number(data.amount) || 0;
  if (data.category !== undefined) payload.category = data.category;
  if (data.date !== undefined) payload.date = data.date;
  if (data.notes !== undefined) payload.notes = data.notes;
  return payload;
}

export async function getExpenses(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  try {
    let query = supabase.from('expenses').select('*');
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return { data: (data || []).map(fromDbExpense), error: null };
  } catch (error) {
    console.warn('Expenses table fetch notice:', error.message);
    return { data: null, error };
  }
}

export async function addExpense(expense) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  try {
    const dbPayload = toDbExpense(expense);
    const { data, error } = await supabase
      .from('expenses')
      .insert([dbPayload])
      .select()
      .single();
    if (error) throw error;
    return { data: fromDbExpense(data), error: null };
  } catch (error) {
    console.warn('Expenses add notice:', error.message);
    return { data: null, error };
  }
}

export async function deleteExpense(id) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.warn('Expenses delete notice:', error.message);
    return { success: false, error };
  }
}
