import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

export function fromDbWalletTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    transactionType: row.transaction_type, // deposit, deduction, refund
    amount: Number(row.amount || 0),
    balanceAfter: Number(row.balance_after || 0),
    referenceId: row.reference_id,
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

export async function getPatientWalletHistory(patientId) {
  if (!isSupabaseConfigured() || !patientId) {
    return { balance: 0, transactions: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('patient_wallet')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const transactions = (data || []).map(fromDbWalletTransaction);
    const balance = transactions.length > 0 ? transactions[0].balanceAfter : 0;
    return { balance, transactions, error: null };
  } catch (error) {
    console.error('Error fetching wallet history:', error);
    return { balance: 0, transactions: [], error };
  }
}

export async function addWalletTransaction(patientId, { type, amount, notes, referenceId, clinicId = null }) {
  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { balance } = await getPatientWalletHistory(patientId);
    const cleanAmount = Math.abs(Number(amount) || 0);
    let newBalance = balance;
    if (type === 'deposit') newBalance += cleanAmount;
    else if (type === 'deduction') newBalance = Math.max(0, newBalance - cleanAmount);
    else if (type === 'refund') newBalance += cleanAmount;

    const payload = {
      patient_id: patientId,
      transaction_type: type,
      amount: cleanAmount,
      balance_after: newBalance,
      reference_id: referenceId || null,
      notes: notes || ''
    };
    if (clinicId) payload.clinic_id = clinicId;

    const { data, error } = await supabase.from('patient_wallet').insert(payload).select().single();

    if (error) throw error;
    return { data: fromDbWalletTransaction(data), newBalance, error: null };
  } catch (error) {
    console.error('Error adding wallet transaction:', error);
    return { success: false, error };
  }
}
