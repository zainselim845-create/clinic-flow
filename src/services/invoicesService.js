import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

export function fromDbInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    patientName: row.patient_name || '',
    patientPhone: row.patient_phone || '',
    appointmentId: row.appointment_id,
    invoiceNumber: row.invoice_number,
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    taxPercentage: Number(row.tax_percentage || 0),
    taxAmount: Number(row.tax_amount || 0),
    total: Number(row.total || 0),
    insuranceShare: Number(row.insurance_share || 0),
    patientShare: Number(row.patient_share || row.total || 0),
    paidAmount: Number(row.paid_amount || 0),
    remainingBalance: Number(row.remaining_balance || 0),
    paymentStatus: row.payment_status || 'unpaid', // unpaid, partial, paid, refunded
    items: row.items || [],
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

export function toDbInvoice(data) {
  if (!data) return {};
  return {
    id: data.id || undefined,
    clinic_id: data.clinicId || undefined,
    patient_id: data.patientId,
    appointment_id: data.appointmentId || null,
    invoice_number: data.invoiceNumber,
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    tax_percentage: Number(data.taxPercentage || 0),
    tax_amount: Number(data.taxAmount || 0),
    total: Number(data.total || 0),
    insurance_share: Number(data.insuranceShare || 0),
    patient_share: Number(data.patientShare || data.total || 0),
    paid_amount: Number(data.paidAmount || 0),
    remaining_balance: Number(data.remainingBalance || 0),
    payment_status: data.paymentStatus || 'unpaid',
    items: data.items || [],
    notes: data.notes || ''
  };
}

export async function getInvoices(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (clinicId) query = query.eq('clinic_id', clinicId);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []).map(fromDbInvoice), error: null };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return { data: [], error };
  }
}

export async function addInvoice(invoice) {
  if (!isSupabaseConfigured()) {
    return { data: invoice, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const row = toDbInvoice(invoice);
    const { data, error } = await supabase
      .from('invoices')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbInvoice(data), error: null };
  } catch (error) {
    console.error('Error adding invoice:', error);
    return { data: invoice, error };
  }
}

export async function recordPayment(invoiceId, paymentData) {
  if (!isSupabaseConfigured()) {
    return { data: paymentData, error: NOT_CONFIGURED_ERROR };
  }

  try {
    // 1. Insert payment row
    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      patient_id: paymentData.patientId,
      amount: Number(paymentData.amount),
      payment_method: paymentData.paymentMethod || 'cash',
      transaction_ref: paymentData.transactionRef || '',
      notes: paymentData.notes || ''
    });

    // 2. Update invoice status
    const { data: currentInv } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
    if (currentInv) {
      const newPaid = Number(currentInv.paid_amount || 0) + Number(paymentData.amount);
      const remaining = Math.max(0, Number(currentInv.patient_share || currentInv.total) - newPaid);
      const newStatus = remaining <= 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

      await supabase.from('invoices').update({
        paid_amount: newPaid,
        remaining_balance: remaining,
        payment_status: newStatus
      }).eq('id', invoiceId);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error recording payment:', error);
    return { success: false, error };
  }
}
