import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Sparkles, RefreshCw, 
  AlertTriangle, Layers, Star, 
  Activity, Bot, HeartHandshake, Smile, CheckCircle2, Zap, Cake
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { 
  segmentAllPatients, 
  filterPatientsBySegment 
} from '../../services/segmentationService';
import { scanAllCrossSellingOpportunities } from '../../services/crossSellingService';
import { getBookingDrafts } from '../../services/leadRecoveryService';
import { 
  getPatientPackages, 
  savePatientPackage, 
  detectStalledPackages 
} from '../../services/packagesService';
import { 
  getPostVisitEligiblePatients, 
  getStoredFeedbacks,
  saveFeedback
} from '../../services/feedbackService';
import { getOccasionCampaignCandidates } from '../../services/occasionCampaignService';
import { detectUnfinishedTreatmentPlans } from '../../services/treatmentPlansService';
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
} from './tabs';
import { AddPackageModal } from './tabs/AddPackageModal';
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

  // Active Hub Tab (11 Engines)
  const [activeTab, setActiveTab] = useState('overview'); 
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
  const [draftsList, setDraftsList] = useState(() => getBookingDrafts(currentClinicId) || []);
  const [feedbacksList, setFeedbacksList] = useState(() => getStoredFeedbacks(currentClinicId) || []);

  // Re-sync clinic-scoped CRM data when active clinic changes
  useEffect(() => {
    setPackagesList(getPatientPackages(currentClinicId) || []);
    setDraftsList(getBookingDrafts(currentClinicId) || []);
    setFeedbacksList(getStoredFeedbacks(currentClinicId) || []);
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

  const handleCopyLink = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkIndex(index);
    showToast('تم نسخ الرابط بنجاح');
    setTimeout(() => setCopiedLinkIndex(null), 2500);
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
            <Sparkles size={15} />
            <span>منظومة الـ CRM والنمو الذكي المتكاملة</span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.35rem 0', color: 'var(--text-primary)' }}>محرك التسويق والاحتفاظ بالمرضى (11 محركاً ذكياً)</h1>
          <p>تقسيم تلقائي، استعادة المواعيد، تتبع الخطط العلاجية، تحويل التقييمات لجوجل، وبرامج ولاء وإحالة المرضى.</p>
        </div>
        <div className="hero-kpis-pill">
          <div className="kpi-micro">
            <span className="lbl">إجمالي المرضى</span>
            <strong className="val">{crmStats.totalPatients}</strong>
          </div>
          <div className="divider-v"></div>
          <div className="kpi-micro">
            <span className="lbl">عملاء مميزين (VIP)</span>
            <strong className="val text-primary">{crmStats.vipCount}</strong>
          </div>
          <div className="divider-v"></div>
          <div className="kpi-micro">
            <span className="lbl">فرص إعادة التنشيط</span>
            <strong className="val text-warning">{crmStats.dormantCount}</strong>
          </div>
        </div>
      </div>

      {/* Hub Navigation Segmented Tabs */}
      <div className="crm-nav-tabs-wrapper">
        <div className="crm-nav-tabs">
          <button 
            className={`crm-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={16} />
            <span>نظرة عامة</span>
          </button>
          
          <button 
            className={`crm-tab-btn ${activeTab === 'segmentation' ? 'active' : ''}`}
            onClick={() => setActiveTab('segmentation')}
          >
            <Users size={16} />
            <span>التقسيم التلقائي ({crmStats.totalPatients})</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'reactivation' ? 'active' : ''}`}
            onClick={() => setActiveTab('reactivation')}
          >
            <RefreshCw size={16} />
            <span>إعادة التنشيط ({crmStats.dormantCount})</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'cross_sell' ? 'active' : ''}`}
            onClick={() => setActiveTab('cross_sell')}
          >
            <Zap size={16} />
            <span>البيع المتقاطع ({(crossSellOpportunities || []).length})</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'recovery' ? 'active' : ''}`}
            onClick={() => setActiveTab('recovery')}
          >
            <AlertTriangle size={16} />
            <span>استعادة الفرص ({(abandonedLeads || []).length + (noShowAppointments || []).length})</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <Star size={16} />
            <span>متابعة ما بعد الكشف وجوجل</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'treatment_plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('treatment_plans')}
          >
            <Smile size={16} />
            <span>الخطط غير المكتملة ({(unfinishedPlans || []).length})</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
            onClick={() => setActiveTab('packages')}
          >
            <Layers size={16} />
            <span>الباقات والجلسات ({stalledPackages.length > 0 ? `${stalledPackages.length} متوقفة / ${(packagesList || []).length}` : (packagesList || []).length})</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'occasions' ? 'active' : ''}`}
            onClick={() => setActiveTab('occasions')}
          >
            <Cake size={16} />
            <span>الأعياد والمناسبات</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            <HeartHandshake size={16} />
            <span>برنامج الإحالة (Referral)</span>
          </button>

          <button 
            className={`crm-tab-btn ${activeTab === 'ai_composer' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai_composer')}
          >
            <Bot size={16} />
            <span>منشئ الحملات الذكي (AI)</span>
          </button>
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
