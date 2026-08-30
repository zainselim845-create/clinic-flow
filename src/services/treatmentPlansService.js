import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

export function fromDbTreatmentPlan(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    title: row.title,
    totalCost: Number(row.total_cost || 0),
    discount: Number(row.discount || 0),
    netCost: Number(row.net_cost || 0),
    status: row.status || 'draft', // draft, presented, accepted, in_progress, completed
    notes: row.notes || '',
    items: row.items || [],
    createdAt: row.created_at
  };
}

export function toDbTreatmentPlan(data) {
  if (!data) return {};
  return {
    id: data.id || undefined,
    clinic_id: data.clinicId || undefined,
    patient_id: data.patientId,
    title: data.title,
    total_cost: Number(data.totalCost || 0),
    discount: Number(data.discount || 0),
    net_cost: Number(data.netCost || 0),
    status: data.status || 'draft',
    notes: data.notes || ''
  };
}

export async function getPatientTreatmentPlans(patientId) {
  if (!isSupabaseConfigured() || !patientId) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data: plans, error: plansError } = await supabase
      .from('treatment_plans')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (plansError) throw plansError;

    // Fetch items for plans
    const planIds = (plans || []).map(p => p.id);
    let itemsByPlan = {};

    if (planIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('treatment_plan_items')
        .select('*')
        .in('plan_id', planIds)
        .order('sequence_order', { ascending: true });

      if (!itemsError && items) {
        items.forEach(it => {
          if (!itemsByPlan[it.plan_id]) itemsByPlan[it.plan_id] = [];
          itemsByPlan[it.plan_id].push({
            id: it.id,
            planId: it.plan_id,
            toothNumber: it.tooth_number,
            surface: it.surface,
            procedureName: it.procedure_name,
            fee: Number(it.fee || 0),
            discount: Number(it.discount || 0),
            netFee: Number(it.net_fee || 0),
            status: it.status || 'pending',
            sequenceOrder: it.sequence_order
          });
        });
      }
    }

    const fullPlans = (plans || []).map(p => {
      const parsed = fromDbTreatmentPlan(p);
      parsed.items = itemsByPlan[p.id] || [];
      return parsed;
    });

    return { data: fullPlans, error: null };
  } catch (error) {
    console.error('Error fetching treatment plans:', error);
    return { data: [], error };
  }
}

export async function addTreatmentPlan(plan) {
  if (!isSupabaseConfigured()) {
    return { data: plan, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const row = toDbTreatmentPlan(plan);
    const { data: createdPlan, error } = await supabase
      .from('treatment_plans')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    // Insert items
    if (plan.items && plan.items.length > 0) {
      const itemsRows = plan.items.map((it, idx) => ({
        plan_id: createdPlan.id,
        tooth_number: it.toothNumber ? Number(it.toothNumber) : null,
        surface: it.surface || 'WHOLE',
        procedure_name: it.procedureName,
        fee: Number(it.fee || 0),
        discount: Number(it.discount || 0),
        net_fee: Number(it.netFee || it.fee || 0),
        status: it.status || 'pending',
        sequence_order: idx + 1
      }));

      await supabase.from('treatment_plan_items').insert(itemsRows);
    }

    return { data: { ...plan, id: createdPlan.id }, error: null };
  } catch (error) {
    console.error('Error saving treatment plan:', error);
    return { data: plan, error };
  }
}

export async function updateTreatmentPlanStatus(id, status) {
  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase
      .from('treatment_plans')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating treatment plan status:', error);
    return { success: false, error };
  }
}

export async function deleteTreatmentPlan(id) {
  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase
      .from('treatment_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting treatment plan:', error);
    return { success: false, error };
  }
}
