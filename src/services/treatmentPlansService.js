import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';
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

export function getLocalTreatmentPlans() {
  return safeStorage.getItem(PLANS_STORAGE_KEY, [
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
  ]);
}

export function saveLocalTreatmentPlans(plans) {
  safeStorage.setItem(PLANS_STORAGE_KEY, plans);
  return plans;
}

/**
 * Detect patients with unfinished treatment plans
 */
export function detectUnfinishedTreatmentPlans(plans = []) {
  const allPlans = plans.length > 0 ? plans : getLocalTreatmentPlans();

  return allPlans
    .filter(p => p.status === 'in_progress' || p.items?.some(it => it.status === 'pending'))
    .map(p => {
      const completedItems = (p.items || []).filter(it => it.status === 'completed');
      const pendingItems = (p.items || []).filter(it => it.status === 'pending');
      const progressPercent = p.items?.length 
        ? Math.round((completedItems.length / p.items.length) * 100) 
        : 0;

      return {
        ...p,
        completedCount: completedItems.length,
        pendingCount: pendingItems.length,
        totalItemsCount: p.items?.length || 0,
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
  const pending = plan.pendingProcedures || 'المراحل المتبقية في خطتك العلاجية';

  return (
    `مرحباً يا ${patientFirstName} 🦷🌸\n\n` +
    `نود تذكيرك من ${clinicName} بأهمية استكمال خطتك العلاجية: (${plan.title || 'علاج الأسنان'}).\n\n` +
    `📊 نسبة إنجازك الحالية: ${plan.progressPercent}%\n` +
    `⏳ الإجراءات المتبقية: ${pending}\n\n` +
    `⚠️ استكمال هذه الخطوة في موعدها يمنع حدوث أي انتكاسة للسن المعالج ويحافظ على دوام النتيجة.\n\n` +
    `يسعدنا حجز جلستك القادمة في الموعد الأنسب لك!`
  );
}

export async function getPatientTreatmentPlans(patientId) {
  if (!isSupabaseConfigured() || !patientId) {
    const local = getLocalTreatmentPlans();
    return { data: local.filter(p => p.patientId === patientId), error: null };
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
