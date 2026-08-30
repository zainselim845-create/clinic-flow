import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

export const DEFAULT_INSURANCE_COMPANIES = [
  {
    id: 'ins-comp-1',
    name: 'بوبا للتأمين الطبي (Bupa Egypt)',
    phone: '16816',
    contactPerson: 'إدارة الموافقات الطبية',
    plans: [
      { id: 'plan-bupa-gold', name: 'الخطة الذهبية (Gold 90%)', coveragePct: 90, maxAnnual: 50000 },
      { id: 'plan-bupa-silver', name: 'الخطة الفضية (Silver 80%)', coveragePct: 80, maxAnnual: 30000 }
    ]
  },
  {
    id: 'ins-comp-2',
    name: 'مصر للتأمين التكافلي (Misr Takaful)',
    phone: '19044',
    contactPerson: 'قسم شبكة الأطباء والأسنان',
    plans: [
      { id: 'plan-misr-vip', name: 'كبار العملاء VIP (85%)', coveragePct: 85, maxAnnual: 25000 },
      { id: 'plan-misr-std', name: 'التغطية القياسية (75%)', coveragePct: 75, maxAnnual: 15000 }
    ]
  },
  {
    id: 'ins-comp-3',
    name: 'أكسا للتأمين (AXA Egypt Dental)',
    phone: '19753',
    contactPerson: 'مركز الموافقات الفورية',
    plans: [
      { id: 'plan-axa-diamond', name: 'دايموند شامل تركيبات (80%)', coveragePct: 80, maxAnnual: 40000 }
    ]
  }
];

export async function getInsuranceCompanies(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: DEFAULT_INSURANCE_COMPANIES, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('insurance_companies')
      .select('*, insurance_plans(*)');

    if (error) throw error;
    return { 
      data: data && data.length > 0 ? data : DEFAULT_INSURANCE_COMPANIES, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching insurance companies:', error);
    return { data: DEFAULT_INSURANCE_COMPANIES, error };
  }
}
