import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeStorage } from '@/utils/safeStorage';

const PLANS_STORAGE_KEY = 'clinicflow_treatment_plans';

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
    status: row.status || 'draft', // draft, in_progress, completed
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
    notes: data.notes || '',
    items: Array.isArray(data.items) ? data.items : []
  };
}

const DEFAULT_PLANS = [];

export function getLocalTreatmentPlans(clinicId) {
  const key = clinicId ? `${PLANS_STORAGE_KEY}_${clinicId}` : PLANS_STORAGE_KEY;
  const stored = safeStorage.getItem(key, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveLocalTreatmentPlans(plans, clinicId) {
  const key = clinicId ? `${PLANS_STORAGE_KEY}_${clinicId}` : PLANS_STORAGE_KEY;
  const safePlans = Array.isArray(plans) ? plans : (clinicId ? [] : DEFAULT_PLANS);
  safeStorage.setItem(key, safePlans);
  return safePlans;
}

/**
 * Detect patients with unfinished treatment plans
 */
export function detectUnfinishedTreatmentPlans(plans = [], clinicId) {
  const local = getLocalTreatmentPlans(clinicId);
  const allPlans = (Array.isArray(plans) && plans.length > 0) ? plans : (Array.isArray(local) ? local : DEFAULT_PLANS);

  return (allPlans || [])
    .filter(p => p && (p.status === 'in_progress' || (p.items || []).some(it => it && it.status === 'pending')))
    .map(p => {
      const items = Array.isArray(p.items) ? p.items : [];
      const completedItems = items.filter(it => it && it.status === 'completed');
      const pendingItems = items.filter(it => it && it.status === 'pending');
      const progressPercent = items.length 
        ? Math.round((completedItems.length / items.length) * 100) 
        : 0;

      return {
        ...p,
        completedCount: completedItems.length,
        pendingCount: pendingItems.length,
        totalItemsCount: items.length,
        progressPercent,
        pendingProcedures: pendingItems.map(it => it.procedureName).join(' + ')
      };
    });
}

/**
 * Generate Treatment Plan Follow-up SMS Message
 */
export function generateTreatmentPlanFollowUpMessage(plan, patient, clinicInfo) {
  const patientFirstName = (patient?.name || plan?.patientName || 'مريضنا العزيز').split(' ')[0];
  const clinicName = clinicInfo?.name || 'العيادة';
  const pending = plan?.pendingProcedures || 'المراحل المتبقية في خطتك العلاجية';

  return (
    `مرحباً بك ${patientFirstName}.\n\n` +
    `نود تذكيرك من ${clinicName} بأهمية استكمال خطتك العلاجية: (${plan?.title || 'علاج الأسنان'}).\n\n` +
    `نسبة إنجازك الحالية: ${plan?.progressPercent || 0}%\n` +
    `الإجراءات المتبقية: ${pending}\n\n` +
    `استكمال هذه الخطوة في موعدها يمنع حدوث أي انتكاسة للسن المعالج ويحافظ على دوام النتيجة.\n\n` +
    `يسعدنا حجز جلستك القادمة في الموعد الأنسب لك.`
  );
}

export async function getPatientTreatmentPlans(patientId) {
  if (!isSupabaseConfigured() || !patientId) {
    const local = getLocalTreatmentPlans();
    return { data: (local || []).filter(p => p && p.patientId === patientId), error: null };
  }

  try {
    const { data: plans, error: plansError } = await supabase
      .from('treatment_plans')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (plansError) throw plansError;

    return { data: (plans || []).map(fromDbTreatmentPlan), error: null };
  } catch (error) {
    console.error('Error fetching treatment plans:', error);
    return { data: [], error };
  }
}

export async function addTreatmentPlan(plan) {
  if (!isSupabaseConfigured()) {
    const local = getLocalTreatmentPlans();
    const newPlan = { ...plan, id: 'tp_' + Date.now(), createdAt: new Date().toISOString() };
    saveLocalTreatmentPlans([newPlan, ...local]);
    return { data: newPlan, error: null };
  }

  try {
    const row = toDbTreatmentPlan(plan);
    const { data: createdPlan, error } = await supabase
      .from('treatment_plans')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbTreatmentPlan(createdPlan), error: null };
  } catch (error) {
    console.error('Error adding treatment plan:', error);
    return { data: plan, error };
  }
}

export async function updateTreatmentPlanStatus(id, status) {
  if (!isSupabaseConfigured()) {
    const local = getLocalTreatmentPlans();
    const updated = (local || []).map(p => p && p.id === id ? { ...p, status } : p);
    saveLocalTreatmentPlans(updated);
    return { success: true, error: null };
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
    const local = getLocalTreatmentPlans();
    const updated = (local || []).filter(p => p && p.id !== id);
    saveLocalTreatmentPlans(updated);
    return { success: true, error: null };
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

/* =========================================================================
 * Clinic-scoped cloud layer (strict tenant binding — prescriptionService pattern)
 * The legacy getPatientTreatmentPlans() filters by patient only; these
 * canonical helpers always bind clinic_id explicitly.
 * ========================================================================= */

/**
 * Fetches all treatment plans for a clinic, strictly tenant-scoped.
 */
export async function getClinicTreatmentPlans(clinicId) {
  if (!clinicId) {
    throw new Error('clinicId is strictly required to fetch treatment plans');
  }
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase is not configured') };
  }
  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return { data: null, error };
  return { data: (data || []).map(fromDbTreatmentPlan), error: null };
}

/**
 * Merges cloud plans into the clinic local store (union by id).
 */
export async function syncTreatmentPlansFromCloud(clinicId) {
  const { data, error } = await getClinicTreatmentPlans(clinicId);
  if (error || !data) {
    return { synced: 0, error: error || new Error('Cloud treatment plans unavailable') };
  }
  const existing = getLocalTreatmentPlans(clinicId);
  const knownIds = new Set(existing.map(p => p && p.id));
  const fresh = data.filter(p => p.id && !knownIds.has(p.id));
  if (fresh.length > 0) {
    saveLocalTreatmentPlans([...existing, ...fresh], clinicId);
  }
  return { synced: fresh.length, error: null };
}

/**
 * Offline-first save: local store immediately, cloud upsert best-effort.
 * Never rejects; cloud failures are surfaced in the result envelope.
 */
export async function saveTreatmentPlanHybrid(plan) {
  const clinicId = plan?.clinicId || plan?.clinic_id;
  if (!clinicId) {
    throw new Error('clinicId is strictly required to save a treatment plan');
  }
  const localPlans = getLocalTreatmentPlans(clinicId);
  const stamped = { ...plan, id: plan.id || ('tp_' + Date.now()), createdAt: plan.createdAt || new Date().toISOString() };
  const idx = localPlans.findIndex(p => p && p.id === stamped.id);
  if (idx >= 0) {
    localPlans[idx] = stamped;
  } else {
    localPlans.unshift(stamped);
  }
  saveLocalTreatmentPlans(localPlans, clinicId);

  let cloud = { data: null, error: new Error('Cloud save not attempted') };
  try {
    if (!isSupabaseConfigured()) {
      cloud = { data: null, error: new Error('Supabase is not configured') };
    } else {
      const { data, error } = await supabase
        .from('treatment_plans')
        .upsert(toDbTreatmentPlan(stamped), { onConflict: 'id' })
        .select()
        .single();
      cloud = error ? { data: null, error } : { data: fromDbTreatmentPlan(data), error: null };
    }
  } catch (cloudErr) {
    cloud = { data: null, error: cloudErr };
  }
  return { local: stamped, cloud };
}
