import React, { useState, useMemo, useEffect } from 'react';
import { Users, RefreshCw, AlertTriangle, Layers, Star, Activity, Bot, HeartHandshake, Smile, CheckCircle2, Zap, Cake, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { 
  segmentAllPatients, 
  filterPatientsBySegment 
} from '@/features/marketing/services/segmentationService';
import { scanAllCrossSellingOpportunities } from '@/features/marketing/services/crossSellingService';
import { getBookingDrafts } from '@/features/marketing/services/leadRecoveryService';
import { 
  getPatientPackages, 
  savePatientPackage, 
  detectStalledPackages 
} from '@/features/billing/services/packagesService';
import { 
  getPostVisitEligiblePatients, 
  getStoredFeedbacks,
  saveFeedback
} from '@/features/platform/services/feedbackService';
import { getOccasionCampaignCandidates } from '@/features/marketing/services/occasionCampaignService';
import { detectUnfinishedTreatmentPlans } from '@/features/patients/services/treatmentPlansService';
import {
  CrmOverviewTab,
  SegmentationTab,
  ReactivationTab,
  CrossSellTab,
  RecoveryTab,
  FeedbackTab,
  TreatmentPlansTab,
  PackagesTab,
  OccasionsTab,
  ReferralsTab,
  AiComposerTab
} from '@/pages/marketing/tabs';
import { AddPackageModal } from '@/pages/marketing/tabs/AddPackageModal';
import { copyToClipboard } from '@/utils/clipboard';
import './MarketingCrmHub.css';

export const MarketingCrmHub = () => {
  const { state } = useApp();
  const { clinic } = useAuth();
  const { tenant } = useTenant();
  const currentClinic = tenant || state.clinicInfo || clinic;
  const currentClinicId = currentClinic?.id;

  // Tenant data isolation: strictly scope patients, appointments, and invoices to active clinic
  const scopedPatients = useMemo(() => {
    return (state.patients || []).filter(p => !currentClinicId || !p.clinicId || p.clinicId === currentClinicId);
  }, [state.patients, currentClinicId]);

  const scopedAppointments = useMemo(() => {
    return (state.appointments || []).filter(a => !currentClinicId || !a.clinicId || a.clinicId === currentClinicId);
  }, [state.appointments, currentClinicId]);

  const scopedInvoices = useMemo(() => {
    return (state.invoices || []).filter(inv => !currentClinicId || !inv.clinicId || inv.clinicId === currentClinicId);
  }, [state.invoices, currentClinicId]);

  // Active Hub Tab (11 Engines) & Category Organization
  const [activeTab, setActiveTab] = useState('overview'); 
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLinkIndex, setCopiedLinkIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Occasions State
  const [selectedOccasion, setSelectedOccasion] = useState('birthday');
  const [customOccasionOffer, setCustomOccasionOffer] = useState('خصم حصري 20%');

  // AI Campaign Composer State
  const [composerSegment, setComposerSegment] = useState('dormant');
  const [composerGoal, setComposerGoal] = useState('reactivation');
  const [composerOffer, setComposerOffer] = useState('فحص وقائي شامل + تنظيف أسنان بخصم 25%');

  // Packages State (scoped by clinic)
  const [packagesList, setPackagesList] = useState(() => getPatientPackages(currentClinicId) || []);
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [newPackageData, setNewPackageData] = useState({
    patientId: '',
    packageName: 'باقة ليزر متكاملة (6 جلسات)',
    totalSessions: 6,
    completedSessions: 1,
    sessionIntervalDays: 28,
    price: '3000 ج.م'
  });

  // Drafts & Recovery (scoped by clinic)
  const [draftsList, setDraftsList] = useState(() => currentClinicId ? (getBookingDrafts(currentClinicId) || []) : []);
  const [feedbacksList, setFeedbacksList] = useState(() => currentClinicId ? (getStoredFeedbacks(currentClinicId) || []) : []);

  // Re-sync clinic-scoped CRM data when active clinic changes
  useEffect(() => {
    if (currentClinicId) {
      setPackagesList(getPatientPackages(currentClinicId) || []);
      setDraftsList(getBookingDrafts(currentClinicId) || []);
      setFeedbacksList(getStoredFeedbacks(currentClinicId) || []);
    } else {
      setPackagesList([]);
      setDraftsList([]);
      setFeedbacksList([]);
    }
  }, [currentClinicId]);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Run Realtime O(1) Segmentation
  const segmentationResult = useMemo(() => {
    return segmentAllPatients(scopedPatients, scopedAppointments, scopedInvoices, packagesList || [], []);
  }, [scopedPatients, scopedAppointments, scopedInvoices, packagesList]);

  const segmentedPatients = useMemo(() => segmentationResult?.patients || [], [segmentationResult]);
  
  const crmStats = useMemo(() => {
    const s = segmentationResult?.stats || {};
    return {
      totalPatients: s.total || scopedPatients.length || 0,
      vipCount: s.vip || 0,
      dormantCount: s.dormant || 0,
      newCount: s.new || 0,
      returningCount: s.returning || 0,
      activeCount: (s.returning || 0) + (s.loyal || 0) || 0
    };
  }, [segmentationResult, scopedPatients]);

  // 2. Cross-Selling Opportunities
  const crossSellOpportunities = useMemo(() => {
    return scanAllCrossSellingOpportunities(segmentedPatients, []);
  }, [segmentedPatients]);

  // 3. Stalled Packages
  const stalledPackages = useMemo(() => {
    return detectStalledPackages(packagesList || []);
  }, [packagesList]);

  // 4. Abandoned Leads
  const abandonedLeads = useMemo(() => {
    return (draftsList || []).filter(d => d && d.status === 'abandoned');
  }, [draftsList]);

  // 5. No-Show Appointments
  const noShowAppointments = useMemo(() => {
    return scopedAppointments.filter(a => a && (a.status === 'cancelled' || a.status === 'no_show'));
  }, [scopedAppointments]);

  // 6. Post-Visit 24h Follow-up Patients
  const postVisitPatients = useMemo(() => {
    return getPostVisitEligiblePatients(scopedAppointments);
  }, [scopedAppointments]);

  // 7. Occasion Candidates
  const occasionCandidates = useMemo(() => {
    return getOccasionCampaignCandidates(scopedPatients, selectedOccasion);
  }, [scopedPatients, selectedOccasion]);

  // 8. Unfinished Treatment Plans
  const unfinishedPlans = useMemo(() => {
    return detectUnfinishedTreatmentPlans([], currentClinicId) || [];
  }, [currentClinicId]);

  // Filtered patients for segment explorer
  const filteredPatients = useMemo(() => {
    let list = filterPatientsBySegment(segmentedPatients, selectedSegment) || [];
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => p && ((p.name && p.name.toLowerCase().includes(q)) || (p.phone && p.phone.includes(q))));
    }
    return list;
  }, [segmentedPatients, selectedSegment, searchQuery]);

  const handleCopyLink = async (text, index) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedLinkIndex(index);
      showToast('تم نسخ الرابط بنجاح');
      setTimeout(() => setCopiedLinkIndex(null), 2500);
    }
  };

  const handleSimulateFeedbackRating = (patientName, rating) => {
    const newFb = {
      id: 'fb_' + Date.now(),
      patientName,
      rating,
      status: rating >= 4 ? 'google_review_posted' : 'management_investigating',
      comment: rating >= 4 ? 'خدمة متميزة جداً ورعاية راقية' : 'يحتاج تسريع وقت الانتظار قليلاً',
      date: new Date().toISOString().split('T')[0]
    };
    const updated = saveFeedback(newFb, currentClinicId);
    setFeedbacksList(updated);
    if (rating >= 4) {
      showToast(`تم توجيه تقييم (${rating} من 5) إلى صفحة Google Reviews بنجاح.`, 'success');
    } else {
      showToast(`تم تحويل تقييم (${rating} من 5) إلى بريد الإدارة للمتابعة الداخلية.`, 'warning');
    }
  };

  const handleAddPackageSubmit = (e) => {
    e.preventDefault();
    const p = (scopedPatients || []).find(pat => pat && pat.id === newPackageData.patientId);
    if (!p) {
      showToast('يرجى اختيار المريض أولاً', 'error');
      return;
    }

    const newPkg = {
      id: 'pkg_' + Date.now(),
      patientId: p.id,
      patientName: p.name,
      patientPhone: p.phone,
      packageName: newPackageData.packageName,
      totalSessions: Number(newPackageData.totalSessions),
      completedSessions: Number(newPackageData.completedSessions),
      sessionIntervalDays: Number(newPackageData.sessionIntervalDays),
      price: newPackageData.price,
      lastSessionDate: new Date().toISOString().split('T')[0],
      nextRecommendedDate: new Date(Date.now() + newPackageData.sessionIntervalDays * 86400000).toISOString().split('T')[0],
      status: 'active'
    };

    const updated = savePatientPackage(newPkg, currentClinicId);
    setPackagesList(updated);
    setIsAddPackageModalOpen(false);
    showToast('تمت إضافة الباقة وتفعيل تتبع الجلسات بنجاح');
  };

  // 9. Categorized Hub Navigation Definition (Clean, Clutter-Free, Zero Zeros)
  const crmCategories = useMemo(() => [
    { id: 'all', label: 'كافة المحركات', icon: Sparkles },
    { id: 'care', label: 'رعاية واحتفاظ المرضى', icon: Users },
    { id: 'services', label: 'الخدمات والباقات', icon: Layers },
    { id: 'growth', label: 'التسويق والنمو الذكي', icon: Zap }
  ], []);

  const allCrmTabs = useMemo(() => [
    { id: 'overview', label: 'نظرة عامة', icon: Activity, category: 'all', count: null },
    { id: 'segmentation', label: 'شرائح المرضى', icon: Users, category: 'care', count: crmStats.totalPatients, badgeTheme: 'blue' },
    { id: 'reactivation', label: 'إعادة التواصل', icon: RefreshCw, category: 'care', count: crmStats.dormantCount, badgeTheme: 'amber' },
    { id: 'recovery', label: 'استعادة المواعيد', icon: AlertTriangle, category: 'care', count: (abandonedLeads || []).length + (noShowAppointments || []).length, badgeTheme: 'rose' },
    { id: 'treatment_plans', label: 'خطط العلاج', icon: Smile, category: 'care', count: (unfinishedPlans || []).length, badgeTheme: 'purple' },
    { id: 'packages', label: 'الباقات والجلسات', icon: Layers, category: 'services', count: stalledPackages.length > 0 ? stalledPackages.length : (packagesList || []).length, badgeTheme: stalledPackages.length > 0 ? 'amber' : 'blue' },
    { id: 'cross_sell', label: 'خدمات إضافية', icon: Zap, category: 'services', count: (crossSellOpportunities || []).length, badgeTheme: 'teal' },
    { id: 'feedback', label: 'التقييمات', icon: Star, category: 'growth', count: (postVisitPatients || []).length, badgeTheme: 'yellow' },
    { id: 'occasions', label: 'الأعياد والمناسبات', icon: Cake, category: 'growth', count: (occasionCandidates || []).length, badgeTheme: 'pink' },
    { id: 'referrals', label: 'برنامج الإحالة', icon: HeartHandshake, category: 'growth', count: null, badgeTheme: 'indigo' },
    { id: 'ai_composer', label: 'منشئ الحملات (AI)', icon: Bot, category: 'growth', count: null, badgeTheme: 'purple' }
  ], [crmStats, abandonedLeads, noShowAppointments, unfinishedPlans, stalledPackages, packagesList, crossSellOpportunities, postVisitPatients, occasionCandidates]);

  const visibleTabs = useMemo(() => {
    if (activeCategory === 'all') return allCrmTabs;
    return allCrmTabs.filter(tab => tab.category === 'all' || tab.category === activeCategory);
  }, [activeCategory, allCrmTabs]);

  return (
    <div className="crm-hub-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`crm-toast-banner ${toastMessage.type}`}>
          <CheckCircle2 size={16} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Hero Banner */}
      <div className="crm-header-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>محرك الرعاية والنمو الذكي</span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.35rem 0', color: 'var(--text-primary)' }}>متابعة ورعاية المرضى</h1>
          <p>تذكير بالمواعيد، متابعة الخطط العلاجية، وإعادة تنشيط المرضى بأعلى كفاءة وعائد للعيادة.</p>
        </div>
        <div className="hero-kpis-pill">
          <div className="kpi-micro">
            <span className="lbl">إجمالي المرضى</span>
            <strong className="val">{crmStats.totalPatients}</strong>
          </div>
          <div className="divider-v"></div>
          <div className="kpi-micro">
            <span className="lbl">المرضى المميزون</span>
            <strong className="val text-primary">{crmStats.vipCount}</strong>
          </div>
          <div className="divider-v"></div>
          <div className="kpi-micro">
            <span className="lbl">إعادة التواصل</span>
            <strong className="val text-warning">{crmStats.dormantCount}</strong>
          </div>
        </div>
      </div>

      {/* Category Filter Chips Bar */}
      <div className="crm-category-filter-bar">
        {crmCategories.map(cat => {
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <CatIcon size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hub Navigation Segmented Tabs (Clean & Zero-Clutter) */}
      <div className="crm-nav-tabs-wrapper">
        <div className="crm-nav-tabs">
          {visibleTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasBadge = typeof tab.count === 'number' && tab.count > 0;

            return (
              <button 
                key={tab.id}
                type="button"
                className={`crm-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.category !== 'all' && activeCategory !== 'all' && activeCategory !== tab.category) {
                    setActiveCategory(tab.category);
                  }
                }}
              >
                <TabIcon size={16} />
                <span>{tab.label}</span>
                {hasBadge && (
                  <span className={`tab-counter-badge badge-${tab.badgeTheme || 'blue'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Subcomponent */}
      {activeTab === 'overview' && (
        <CrmOverviewTab
          crmStats={crmStats}
          unfinishedPlans={unfinishedPlans}
          abandonedLeads={abandonedLeads}
          noShowAppointments={noShowAppointments}
          crossSellOpportunities={crossSellOpportunities}
          feedbacksList={feedbacksList}
          setActiveTab={setActiveTab}
          onOpenAddPackage={() => setIsAddPackageModalOpen(true)}
        />
      )}

      {activeTab === 'segmentation' && (
        <SegmentationTab
          crmStats={crmStats}
          selectedSegment={selectedSegment}
          setSelectedSegment={setSelectedSegment}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredPatients={filteredPatients}
          setComposerSegment={setComposerSegment}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'reactivation' && (
        <ReactivationTab
          crmStats={crmStats}
          segmentedPatients={segmentedPatients}
          currentClinic={currentClinic}
        />
      )}

      {activeTab === 'cross_sell' && (
        <CrossSellTab crossSellOpportunities={crossSellOpportunities} />
      )}

      {activeTab === 'recovery' && (
        <RecoveryTab
          abandonedLeads={abandonedLeads}
          noShowAppointments={noShowAppointments}
          currentClinic={currentClinic}
        />
      )}

      {activeTab === 'feedback' && (
        <FeedbackTab
          postVisitPatients={postVisitPatients}
          feedbacksList={feedbacksList}
          currentClinic={currentClinic}
          handleSimulateFeedbackRating={handleSimulateFeedbackRating}
        />
      )}

      {activeTab === 'treatment_plans' && (
        <TreatmentPlansTab
          unfinishedPlans={unfinishedPlans}
          currentClinic={currentClinic}
        />
      )}

      {activeTab === 'packages' && (
        <PackagesTab
          packagesList={packagesList}
          currentClinic={currentClinic}
          setIsAddPackageModalOpen={setIsAddPackageModalOpen}
        />
      )}

      {activeTab === 'occasions' && (
        <OccasionsTab
          selectedOccasion={selectedOccasion}
          setSelectedOccasion={setSelectedOccasion}
          customOccasionOffer={customOccasionOffer}
          setCustomOccasionOffer={setCustomOccasionOffer}
          occasionCandidates={occasionCandidates}
          currentClinic={currentClinic}
        />
      )}

      {activeTab === 'referrals' && (
        <ReferralsTab
          patients={scopedPatients}
          handleCopyLink={handleCopyLink}
          copiedLinkIndex={copiedLinkIndex}
          currentClinic={currentClinic}
        />
      )}

      {activeTab === 'ai_composer' && (
        <AiComposerTab
          composerSegment={composerSegment}
          setComposerSegment={setComposerSegment}
          composerGoal={composerGoal}
          setComposerGoal={setComposerGoal}
          composerOffer={composerOffer}
          setComposerOffer={setComposerOffer}
          segmentedPatients={segmentedPatients}
          currentClinic={currentClinic}
        />
      )}

      {/* Add Package Modal */}
      <AddPackageModal
        isOpen={isAddPackageModalOpen}
        onClose={() => setIsAddPackageModalOpen(false)}
        onSubmit={handleAddPackageSubmit}
        packageData={newPackageData}
        setPackageData={setNewPackageData}
        patients={scopedPatients}
      />
    </div>
  );
};

export default MarketingCrmHub;
