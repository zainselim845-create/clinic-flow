import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeStorage } from '../utils/safeStorage';

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
    notes: data.notes || ''
  };
}

const DEFAULT_PLANS = [
  {
    id: 'tp-1',
    patientId: 'patient_1',
    patientName: 'أحمد محمود العوضي',
    patientPhone: '01012345678',
    title: 'خطة علاج ضرس العصب والتركيبة',
    status: 'in_progress',
    items: [
      { id: 'tpi-1', procedureName: 'تنظيف وتجهيز القنوات', status: 'completed' },
      { id: 'tpi-2', procedureName: 'حشو عصب نهائي (ضرس 16)', status: 'completed' },
      { id: 'tpi-3', procedureName: 'بناء الضرس وحشو دعامة (Core)', status: 'pending' },
      { id: 'tpi-4', procedureName: 'تاج زركونيا تجميلي (Crown)', status: 'pending' }
    ],
    createdAt: '2026-08-10'
  },
  {
    id: 'tp-2',
    patientId: 'patient_2',
    patientName: 'مريم السيد البدوي',
    patientPhone: '01223456789',
    title: 'خطة تجميل وتبييض الأسنان',
    status: 'in_progress',
    items: [
      { id: 'tpi-5', procedureName: 'جلسة تنظيف وتلميع الجير', status: 'completed' },
      { id: 'tpi-6', procedureName: 'جلسة تبييض ليزر زووم', status: 'pending' }
    ],
    createdAt: '2026-08-15'
  }
];

export function getLocalTreatmentPlans() {
  const stored = safeStorage.getItem(PLANS_STORAGE_KEY, DEFAULT_PLANS);
  return Array.isArray(stored) ? stored : DEFAULT_PLANS;
}

export function saveLocalTreatmentPlans(plans) {
  const safePlans = Array.isArray(plans) ? plans : DEFAULT_PLANS;
  safeStorage.setItem(PLANS_STORAGE_KEY, safePlans);
  return safePlans;
}

/**
 * Detect patients with unfinished treatment plans
 */
export function detectUnfinishedTreatmentPlans(plans = []) {
  const local = getLocalTreatmentPlans();
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
 * Generate Treatment Plan Follow-up WhatsApp Message
 */
export function generateTreatmentPlanFollowUpMessage(plan, patient, clinicInfo) {
  const patientFirstName = (patient?.name || plan?.patientName || 'مريضنا العزيز').split(' ')[0];
  const clinicName = clinicInfo?.name || 'مركز النخبة لطب الأسنان';
  const pending = plan?.pendingProcedures || 'المراحل المتبقية في خطتك العلاجية';

  return (
    `مرحباً يا ${patientFirstName} 🦷🌸\n\n` +
    `نود تذكيرك من ${clinicName} بأهمية استكمال خطتك العلاجية: (${plan?.title || 'علاج الأسنان'}).\n\n` +
    `📊 نسبة إنجازك الحالية: ${plan?.progressPercent || 0}%\n` +
    `⏳ الإجراءات المتبقية: ${pending}\n\n` +
    `⚠️ استكمال هذه الخطوة في موعدها يمنع حدوث أي انتكاسة للسن المعالج ويحافظ على دوام النتيجة.\n\n` +
    `يسعدنا حجز جلستك القادمة في الموعد الأنسب لك!`
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
