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

export async function getInvoices(clinicId, { limit = 200 } = {}) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to prevent multi-tenant data leaks') };
  }

  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []).map(fromDbInvoice), error: null };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return { data: [], error };
  }
}

/**
 * Get paginated invoices for high scale (financial records)
 */
export async function getInvoicesPaginated({ clinicId, page = 1, pageSize = 25, paymentStatus = null } = {}) {
  if (!isSupabaseConfigured()) {
    return { data: [], total: 0, page, pageSize, totalPages: 1, error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: [], total: 0, page, pageSize, totalPages: 1, error: new Error('Clinic ID is strictly required to prevent multi-tenant data leaks') };
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (paymentStatus) query = query.eq('payment_status', paymentStatus);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(fromDbInvoice),
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize) || 1,
      error: null
    };
  } catch (error) {
    console.error('Error fetching paginated invoices:', error);
    return { data: [], total: 0, page, pageSize, totalPages: 1, error };
  }
}

export async function addInvoice(invoice) {
  if (!isSupabaseConfigured()) {
    return { data: invoice, error: NOT_CONFIGURED_ERROR };
  }

  if (!invoice || (!invoice.clinicId && !invoice.clinic_id)) {
    return { data: null, error: new Error('Clinic ID is strictly required to add an invoice') };
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

  if (!invoiceId) {
    return { success: false, error: new Error('Invoice ID is required to record a payment') };
  }

  try {
    // 1. Fetch current invoice to guarantee isolation and get clinic_id
    const { data: currentInv, error: fetchErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (fetchErr || !currentInv) {
      throw fetchErr || new Error('Invoice not found');
    }

    const clinicId = paymentData.clinicId || paymentData.clinic_id || currentInv.clinic_id;

    // 2. Insert payment row with strict clinic_id scoping
    await supabase.from('payments').insert({
      clinic_id: clinicId,
      invoice_id: invoiceId,
      patient_id: paymentData.patientId || currentInv.patient_id,
      amount: Number(paymentData.amount),
      payment_method: paymentData.paymentMethod || 'cash',
      transaction_ref: paymentData.transactionRef || '',
      notes: paymentData.notes || ''
    });

    // 3. Update invoice status
    const newPaid = Number(currentInv.paid_amount || 0) + Number(paymentData.amount);
    const remaining = Math.max(0, Number(currentInv.patient_share || currentInv.total) - newPaid);
    const newStatus = remaining <= 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

    await supabase.from('invoices').update({
      paid_amount: newPaid,
      remaining_balance: remaining,
      payment_status: newStatus
    }).eq('id', invoiceId);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error recording payment:', error);
    return { success: false, error };
  }
}
