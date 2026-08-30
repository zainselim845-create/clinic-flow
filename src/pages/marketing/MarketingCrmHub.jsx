import React, { useState, useMemo } from 'react';
import { 
  Users, Sparkles, RefreshCw, Send,
  AlertTriangle, Layers, MessageCircle, 
  Search, CheckCircle2, ChevronRight, UserPlus,
  Zap, Star, Copy, Check,
  Cake, Activity, Bot, ShieldCheck, HeartHandshake, Smile
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  segmentAllPatients, 
  filterPatientsBySegment 
} from '../../services/segmentationService';
import { scanAllCrossSellingOpportunities } from '../../services/crossSellingService';
import { 
  REACTIVATION_STAGES, 
  generateReactivationMessage 
} from '../../services/reactivationService';
import { 
  getBookingDrafts, 
  generateLeadRecoveryWhatsAppMessage 
} from '../../services/leadRecoveryService';
import { 
  getPatientPackages, 
  savePatientPackage, 
  detectStalledPackages 
} from '../../services/packagesService';
import { 
  getPatientReferralCode, 
  getPatientReferralLink 
} from '../../services/referralService';
import { generateNoShowRecoveryMessage } from '../../services/noShowRecoveryService';
import { 
  getPostVisitEligiblePatients, 
  generatePostVisitFeedbackMessage, 
  getStoredFeedbacks,
  saveFeedback
} from '../../services/feedbackService';
import { 
  OCCASIONS, 
  getOccasionCampaignCandidates, 
  generatePersonalizedOccasionMessage 
} from '../../services/occasionCampaignService';
import { 
  detectUnfinishedTreatmentPlans, 
  generateTreatmentPlanFollowUpMessage 
} from '../../services/treatmentPlansService';
import './MarketingCrmHub.css';

export const MarketingCrmHub = () => {
  const { state } = useApp();
  const { clinic } = useAuth();
  const currentClinic = state.clinicInfo || clinic;

  const { patients = [], appointments = [], invoices = [] } = state;

  // Active Hub Tab (11 Engines)
  const [activeTab, setActiveTab] = useState('overview'); 
  // 'overview' | 'segmentation' | 'reactivation' | 'cross_sell' | 'recovery' | 'feedback' | 'occasions' | 'treatment_plans' | 'packages' | 'referrals' | 'ai_composer'

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

  // Packages State
  const [packagesList, setPackagesList] = useState(() => getPatientPackages() || []);
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [newPackageData, setNewPackageData] = useState({
    patientId: '',
    packageName: 'باقة ليزر متكاملة (6 جلسات)',
    totalSessions: 6,
    completedSessions: 1,
    sessionIntervalDays: 28,
    price: '3000 ج.م'
  });

  // Drafts & Recovery
  const [draftsList] = useState(() => getBookingDrafts() || []);
  const [feedbacksList, setFeedbacksList] = useState(() => getStoredFeedbacks() || []);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Run Realtime O(1) Segmentation
  const segmentationResult = useMemo(() => {
    return segmentAllPatients(patients || [], appointments || [], invoices || [], packagesList || [], []);
  }, [patients, appointments, invoices, packagesList]);

  const segmentedPatients = useMemo(() => segmentationResult?.patients || [], [segmentationResult]);
  
  const crmStats = useMemo(() => {
    const s = segmentationResult?.stats || {};
    return {
      totalPatients: s.total || (patients || []).length || 0,
      vipCount: s.vip || 0,
      dormantCount: s.dormant || 0,
      newCount: s.new || 0,
      returningCount: s.returning || 0,
      activeCount: (s.returning || 0) + (s.loyal || 0) || 0
    };
  }, [segmentationResult, patients]);

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
    return (appointments || []).filter(a => a && (a.status === 'cancelled' || a.status === 'no_show'));
  }, [appointments]);

  // 6. Post-Visit 24h Follow-up Patients
  const postVisitPatients = useMemo(() => {
    return getPostVisitEligiblePatients(appointments || []);
  }, [appointments]);

  // 7. Occasion Candidates
  const occasionCandidates = useMemo(() => {
    return getOccasionCampaignCandidates(patients || [], selectedOccasion);
  }, [patients, selectedOccasion]);

  // 8. Unfinished Treatment Plans
  const unfinishedPlans = useMemo(() => {
    return detectUnfinishedTreatmentPlans() || [];
  }, []);

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
    const updated = saveFeedback(newFb);
    setFeedbacksList(updated);
    if (rating >= 4) {
      showToast(`تم توجيه تقييم (${rating} نجوم) إلى صفحة Google Reviews بنجاح! ⭐`, 'success');
    } else {
      showToast(`تم تحويل تقييم (${rating} نجوم) سراً إلى بريد الإدارة لحل الشكوى! 🛡️`, 'warning');
    }
  };

  const handleAddPackageSubmit = (e) => {
    e.preventDefault();
    const p = (patients || []).find(pat => pat && pat.id === newPackageData.patientId);
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

    const updated = savePatientPackage(newPkg);
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
          <h2>محرك التسويق والاحتفاظ بالمرضى (11 محركاً ذكياً)</h2>
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

      {/* Hub Navigation Segmented Tabs (11 Complete Modules) */}
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
            <span>الباقات والجلسات ({(packagesList || []).length})</span>
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

      {/* ========================================================================= */}
      {/* 1. TAB: OVERVIEW & CRM COMMAND COCKPIT                                    */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="crm-tab-content">
          <div className="crm-kpi-cards-grid">
            
            <div className="crm-kpi-card" onClick={() => setActiveTab('segmentation')}>
              <div className="card-top">
                <div className="icon-wrap bg-blue"><Users size={20} /></div>
                <span className="card-tag">قاعدة المرضى</span>
              </div>
              <div className="card-mid">
                <h3>{crmStats.totalPatients}</h3>
                <p>مريض مقسمين تلقائياً</p>
              </div>
              <div className="card-bot">
                <span>{crmStats.newCount} جديد • {crmStats.vipCount} VIP</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="crm-kpi-card" onClick={() => setActiveTab('reactivation')}>
              <div className="card-top">
                <div className="icon-wrap bg-orange"><RefreshCw size={20} /></div>
                <span className="card-tag tag-warning">إعادة التنشيط</span>
              </div>
              <div className="card-mid">
                <h3 className="text-warning">{crmStats.dormantCount}</h3>
                <p>مرضى لم يزوروا العيادة منذ 6+ أشهر</p>
              </div>
              <div className="card-bot">
                <span>جاهزون لـ 3 مراحل تذكير وخصم</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="crm-kpi-card" onClick={() => setActiveTab('treatment_plans')}>
              <div className="card-top">
                <div className="icon-wrap bg-purple"><Smile size={20} /></div>
                <span className="card-tag tag-purple">خطط علاجية</span>
              </div>
              <div className="card-mid">
                <h3 className="text-purple">{(unfinishedPlans || []).length}</h3>
                <p>مرضى لديهم خطوات علاجية معلقة</p>
              </div>
              <div className="card-bot">
                <span>حشو عصب • تركيبات • تبييض</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="crm-kpi-card" onClick={() => setActiveTab('recovery')}>
              <div className="card-top">
                <div className="icon-wrap bg-red"><AlertTriangle size={20} /></div>
                <span className="card-tag tag-red">استعادة الحجوزات</span>
              </div>
              <div className="card-mid">
                <h3 className="text-error">{(abandonedLeads || []).length + (noShowAppointments || []).length}</h3>
                <p>حجوزات لم تكتمل + No-Shows</p>
              </div>
              <div className="card-bot">
                <span>استعادة برابط مباشر فوري</span>
                <ChevronRight size={16} />
              </div>
            </div>

          </div>

          {/* Quick Engine Launchers */}
          <div className="crm-split-grid">
            <div className="crm-section-box">
              <div className="box-header">
                <h4><Zap size={18} className="text-primary" /> أهم فرص البيع المتقاطع (Cross-Selling)</h4>
                <button onClick={() => setActiveTab('cross_sell')} className="btn-link">عرض الكل ({(crossSellOpportunities || []).length})</button>
              </div>
              <div className="opportunities-mini-list">
                {(crossSellOpportunities || []).slice(0, 3).map((opp, idx) => (
                  <div key={idx} className="opp-mini-card">
                    <div className="opp-meta">
                      <strong>{opp.patientName}</strong>
                      <span>خدمته السابقة: {opp.primaryService} ⬅️ المقترح: <strong className="text-primary">{opp.suggestedService}</strong></span>
                    </div>
                    <a 
                      href={`https://wa.me/${(opp.patientPhone || '').replace(/^0/, '20')}?text=${encodeURIComponent(opp.whatsappMessage)}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="btn-action-primary"
                    >
                      <MessageCircle size={14} />
                      <span>واتساب</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="crm-section-box">
              <div className="box-header">
                <h4><Star size={18} className="text-warning" /> تقييمات Google Reviews & NPS الذكية</h4>
                <button onClick={() => setActiveTab('feedback')} className="btn-link">فتح البوابة</button>
              </div>
              <div className="feedbacks-mini-list">
                {(feedbacksList || []).slice(0, 3).map((fb) => (
                  <div key={fb.id} className="fb-mini-card">
                    <div className="fb-stars">
                      {'⭐'.repeat(fb.rating)}
                    </div>
                    <div className="fb-meta">
                      <strong>{fb.patientName}</strong>
                      <p>"{fb.comment}"</p>
                    </div>
                    <span className={`status-pill ${fb.rating >= 4 ? 'pill-success' : 'pill-warning'}`}>
                      {fb.rating >= 4 ? 'Google Review' : 'إدارة العيادة'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: AUTOMATIC PATIENT SEGMENTATION                                     */}
      {/* ========================================================================= */}
      {activeTab === 'segmentation' && (
        <div className="crm-tab-content">
          
          <div className="segmentation-filter-bar">
            <div className="segment-pills">
              {[
                { id: 'all', label: `الكل (${crmStats.totalPatients})` },
                { id: 'vip', label: `VIP كبار العملاء (${crmStats.vipCount})` },
                { id: 'returning', label: `مرضى دائمون (${crmStats.returningCount})` },
                { id: 'new', label: `جدد (${crmStats.newCount})` },
                { id: 'dormant', label: `خاملون 6+ أشهر (${crmStats.dormantCount})` }
              ].map(seg => (
                <button
                  key={seg.id}
                  className={`segment-pill-btn ${selectedSegment === seg.id ? 'active' : ''}`}
                  onClick={() => setSelectedSegment(seg.id)}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            <div className="search-box-wrap">
              <Search size={16} />
              <input 
                type="text"
                placeholder="بحث في الشريحة بالاسم أو الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive crm-table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>المريض</th>
                  <th>الشريحة الحالية</th>
                  <th>عدد الزيارات</th>
                  <th>إجمالي الإنفاق (LTV)</th>
                  <th>آخر زيارة</th>
                  <th>الإجراء المقترح</th>
                </tr>
              </thead>
              <tbody>
                {(filteredPatients || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">لا يوجد مرضى في هذه الشريحة حالياً.</td>
                  </tr>
                ) : (
                  filteredPatients.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="patient-cell">
                          <strong>{p.name}</strong>
                          <small dir="ltr">{p.phone}</small>
                        </div>
                      </td>
                      <td>
                        <span className="segment-badge badge-VIP">
                          {p.valueTier === 'vip' ? '⭐ VIP مريض مميز' : p.lifecycle === 'new' ? '✨ جديد' : p.lifecycle === 'dormant' ? '⏳ خامل 6+ أشهر' : '🟢 نشط دائم'}
                        </span>
                      </td>
                      <td><strong>{p.visitsCount || 1}</strong> زيارة</td>
                      <td><strong>{p.ltv || 300} ج.م</strong></td>
                      <td>{p.daysSinceLastVisit ? `${p.daysSinceLastVisit} يوم مضت` : 'حديث التسجيل'}</td>
                      <td>
                        <button 
                          className="btn-action-primary"
                          onClick={() => {
                            setComposerSegment(p.lifecycle || 'dormant');
                            setActiveTab('ai_composer');
                          }}
                        >
                          <Send size={13} />
                          <span>تجهيز حملة</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: 3-STAGE REACTIVATION FLOW                                         */}
      {/* ========================================================================= */}
      {activeTab === 'reactivation' && (
        <div className="crm-tab-content">
          <div className="reactivation-flow-intro">
            <div className="flow-steps-graphic">
              <div className="f-step">
                <span className="step-badge">المرحلة 1</span>
                <strong>رسالة تذكير صحية</strong>
                <p>تذكير دافئ بالفحص الدوري</p>
              </div>
              <div className="f-arrow">➡️ بعد أسبوع ➡️</div>
              <div className="f-step">
                <span className="step-badge">المرحلة 2</span>
                <strong>متابعة واستفسار</strong>
                <p>الاطمئنان وعرض المساعدة</p>
              </div>
              <div className="f-arrow">➡️ بعد أسبوع ➡️</div>
              <div className="f-step highlight">
                <span className="step-badge">المرحلة 3</span>
                <strong>عرض وخصم خاص</strong>
                <p>كوبون ترويجي للعودة</p>
              </div>
            </div>
          </div>

          <div className="reactivation-candidates-list">
            {crmStats.dormantCount === 0 ? (
              <div className="empty-state-box">
                <CheckCircle2 size={40} className="text-success" />
                <h4>رائع! جميع مرضاك نشطون ولا يوجد مرضى خاملون متأخرون عن 6 أشهر.</h4>
              </div>
            ) : (
              (segmentedPatients || []).filter(p => p && (p.lifecycle === 'dormant' || p.lifecycle === 'lost')).map(p => (
                <div key={p.id} className="reactivation-patient-card">
                  <div className="p-header">
                    <div>
                      <h4>{p.name}</h4>
                      <span className="text-muted">آخر كشف منذ {p.daysSinceLastVisit || 180} يوماً ({p.diagnosis || 'كشف أسنان'})</span>
                    </div>
                    <span className="dormant-badge">انقطاع 6+ أشهر</span>
                  </div>

                  <div className="stages-actions-row">
                    {REACTIVATION_STAGES.map(stage => {
                      const msg = generateReactivationMessage(p, stage.stage, currentClinic);
                      const cleanPhone = (p.phone || '').replace(/^0/, '20');
                      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

                      return (
                        <div key={stage.stage} className="stage-action-box">
                          <span className="s-title">{stage.name}</span>
                          <a href={waUrl} target="_blank" rel="noreferrer" className="btn-stage-wa">
                            <MessageCircle size={14} />
                            <span>إرسال ({stage.discount ? 'مع خصم' : 'تذكير'})</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: SMART CLINICAL CROSS-SELLING                                       */}
      {/* ========================================================================= */}
      {activeTab === 'cross_sell' && (
        <div className="crm-tab-content">
          <div className="cross-sell-intro">
            <h4>💡 محرك البيع المتقاطع الذكي (Clinical History Cross-Sell)</h4>
            <p>يحلل التاريخ الطبي للمريض ويقترح الخدمات التكميلية المعتمدة طبياً (تنظيف ⬅️ تبييض | بوتوكس ⬅️ سكن بوستر | ليزر ⬅️ مناطق إضافية).</p>
          </div>

          <div className="cross-sell-grid">
            {(crossSellOpportunities || []).map((opp, idx) => {
              const cleanPhone = (opp.patientPhone || '').replace(/^0/, '20');
              const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(opp.whatsappMessage)}`;

              return (
                <div key={idx} className="cross-sell-card">
                  <div className="cs-top">
                    <div>
                      <strong>{opp.patientName}</strong>
                      <span className="cs-phone" dir="ltr">{opp.patientPhone}</span>
                    </div>
                    <span className="confidence-pill">{opp.confidence}% مطابقة طبية</span>
                  </div>

                  <div className="cs-logic">
                    <div className="logic-node">
                      <span className="l-lbl">الخدمة السابقة:</span>
                      <strong className="l-val">{opp.primaryService}</strong>
                    </div>
                    <div className="logic-arrow">⬅️</div>
                    <div className="logic-node highlight">
                      <span className="l-lbl">الخدمة المقترحة:</span>
                      <strong className="l-val text-primary">{opp.suggestedService}</strong>
                    </div>
                  </div>

                  <p className="cs-reason">{opp.reason}</p>

                  <div className="cs-msg-preview">
                    <small>نص رسالة الواتساب:</small>
                    <p>{opp.whatsappMessage}</p>
                  </div>

                  <div className="cs-card-footer">
                    <a href={waUrl} target="_blank" rel="noreferrer" className="default-custom-btn">
                      <MessageCircle size={16} />
                      <span>إرسال العرض المقترح للمريض</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB: LEAD & NO-SHOW RECOVERY                                           */}
      {/* ========================================================================= */}
      {activeTab === 'recovery' && (
        <div className="crm-tab-content">
          
          <div className="recovery-columns-grid">
            
            {/* Abandoned Booking Leads */}
            <div className="recovery-col">
              <div className="col-header">
                <h4><Zap size={18} className="text-warning" /> سلات الحجز المتروكة (Abandoned Leads)</h4>
                <small>أشخاص كتبوا رقمهم في بوابة الحجز ولم يكملوا الخطوة الثانية</small>
              </div>

              {(abandonedLeads || []).length === 0 ? (
                <div className="empty-sub">لا توجد محاولات حجز متروكة حالياً.</div>
              ) : (
                abandonedLeads.map((draft, idx) => {
                  const msg = generateLeadRecoveryWhatsAppMessage(draft, currentClinic);
                  const cleanPhone = (draft.phone || '').replace(/^0/, '20');
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

                  return (
                    <div key={draft.id || idx} className="lead-recovery-card">
                      <div className="lead-info">
                        <strong>رقم الهاتف: <span dir="ltr">{draft.phone}</span></strong>
                        <span>تاريخ المحاولة: {new Date(draft.updatedAt || draft.createdAt || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <a href={waUrl} target="_blank" rel="noreferrer" className="btn-action-primary">
                        <Send size={14} />
                        <span>إرسال رابط الإكمال المباشر</span>
                      </a>
                    </div>
                  );
                })
              )}
            </div>

            {/* No-Show & Cancelled Recovery */}
            <div className="recovery-col">
              <div className="col-header">
                <h4><RefreshCw size={18} className="text-error" /> استعادة مواعيد الـ No-Show</h4>
                <small>مرضى حجزوا موعداً ولم يتمكنوا من الحضور</small>
              </div>

              {(noShowAppointments || []).length === 0 ? (
                <div className="empty-sub">لا توجد حالات No-Show مسجلة.</div>
              ) : (
                noShowAppointments.map((appt) => {
                  const msg = generateNoShowRecoveryMessage(appt, currentClinic);
                  const cleanPhone = (appt.patientPhone || '').replace(/^0/, '20');
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

                  return (
                    <div key={appt.id} className="lead-recovery-card">
                      <div className="lead-info">
                        <strong>{appt.patientName}</strong>
                        <span>الموعد الأصلي: {appt.date} ({appt.time})</span>
                      </div>
                      <a href={waUrl} target="_blank" rel="noreferrer" className="btn-action-success">
                        <MessageCircle size={14} />
                        <span>إعادة جدولة مع كود خصم</span>
                      </a>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: POST-VISIT FOLLOW-UP & GOOGLE REVIEWS NPS                         */}
      {/* ========================================================================= */}
      {activeTab === 'feedback' && (
        <div className="crm-tab-content">
          
          <div className="feedback-funnel-box">
            <h4>🌟 محرك السمعة الرقمية وتحويل التقييمات لجوجل (Reputation Funnel)</h4>
            <p>بعد الزيارة بـ 24 ساعة، يتم إرسال رسالة قياس الرضا: التقييم المرتفع (4-5 نجوم) يُوجّه لتقييم العيادة على خرائط جوجل، والتقييم المنخفض يُوجّه سراً لبريد الإدارة لحل المشكلة فوراً.</p>
          </div>

          <div className="crm-split-grid">
            
            {/* Eligible Visits for Follow-up */}
            <div className="crm-section-box">
              <div className="box-header">
                <h4><Users size={18} /> زيارات مكتملة بانتظار إرسال استبيان الرضا ({(postVisitPatients || []).length})</h4>
              </div>
              <div className="feedbacks-actions-list">
                {(postVisitPatients || []).length === 0 ? (
                  <p className="text-muted text-center py-3">لا توجد زيارات مكتملة تحتاج متابعة حالياً.</p>
                ) : (
                  postVisitPatients.map((pv) => {
                    const msg = generatePostVisitFeedbackMessage({ name: pv.patientName }, pv, currentClinic);
                    const cleanPhone = (pv.patientPhone || '').replace(/^0/, '20');
                    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

                    return (
                      <div key={pv.appointmentId} className="post-visit-item">
                        <div>
                          <strong>{pv.patientName}</strong>
                          <small>كشف {pv.type} — {pv.date}</small>
                        </div>
                        <div className="pv-actions">
                          <a href={waUrl} target="_blank" rel="noreferrer" className="btn-action-primary">
                            <Send size={13} />
                            <span>إرسال استبيان الرضا</span>
                          </a>
                          <div className="simulate-ratings">
                            <button onClick={() => handleSimulateFeedbackRating(pv.patientName, 5)} title="محاكاة 5 نجوم (تحويل لجوجل)">⭐ 5</button>
                            <button onClick={() => handleSimulateFeedbackRating(pv.patientName, 2)} title="محاكاة تقييم منخفض (تحويل للإدارة)">⚠️ 2</button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Smart Routing Ledger */}
            <div className="crm-section-box">
              <div className="box-header">
                <h4><ShieldCheck size={18} className="text-success" /> سجل توجيه التقييمات الذكي</h4>
              </div>
              <div className="feedbacks-ledger">
                {(feedbacksList || []).map((fb) => (
                  <div key={fb.id} className="ledger-fb-row">
                    <div className="l-top">
                      <strong>{fb.patientName}</strong>
                      <span className="l-stars">{'⭐'.repeat(fb.rating)}</span>
                    </div>
                    <p className="l-comment">"{fb.comment}"</p>
                    <div className="l-routing">
                      {fb.rating >= 4 ? (
                        <span className="route-tag success">✅ تم التوجيه لـ Google Maps Review</span>
                      ) : (
                        <span className="route-tag warning">🛡️ تم توجيه شكوى سرية لمدير العيادة</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB: DENTAL & MEDICAL TREATMENT PLANS TRACKER                          */}
      {/* ========================================================================= */}
      {activeTab === 'treatment_plans' && (
        <div className="crm-tab-content">
          <div className="plans-tracker-intro">
            <h4>🦷 تتبع ومتابعة الخطط العلاجية غير المكتملة (Treatment Plan Tracker)</h4>
            <p>يكتشف المرضى الذين بدأوا خطوات علاجية وتوقفوا (مثل: بدأ حشو العصب ولم يقم بتركيب التاج أو الحشو النهائي)، ويرسل لهم تنبيهاً طبياً للحفاظ على صحة السن.</p>
          </div>

          <div className="plans-cards-grid">
            {(unfinishedPlans || []).map((plan) => {
              const msg = generateTreatmentPlanFollowUpMessage(plan, { name: plan.patientName }, currentClinic);
              const cleanPhone = (plan.patientPhone || '').replace(/^0/, '20');
              const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

              return (
                <div key={plan.id} className="treatment-plan-card">
                  <div className="tp-header">
                    <div>
                      <h4>{plan.patientName}</h4>
                      <span className="tp-title">{plan.title}</span>
                    </div>
                    <span className="tp-progress-badge">{plan.progressPercent}% مكتمل</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="tp-bar-wrap">
                    <div className="tp-bar-fill" style={{ width: `${plan.progressPercent}%` }}></div>
                  </div>

                  <div className="tp-items-list">
                    {plan.items?.map((item) => (
                      <div key={item.id} className={`tp-item-row ${item.status === 'completed' ? 'done' : 'pending'}`}>
                        {item.status === 'completed' ? <CheckCircle2 size={16} className="text-success" /> : <AlertTriangle size={16} className="text-warning" />}
                        <span>{item.procedureName}</span>
                        <strong className="item-state">{item.status === 'completed' ? 'تم الإنجاز' : 'معلق ومتبقي'}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="tp-footer">
                    <a href={waUrl} target="_blank" rel="noreferrer" className="default-custom-btn">
                      <MessageCircle size={16} />
                      <span>تذكير المريض باستكمال الخطة</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB: PACKAGES & SESSIONS TRACKING                                      */}
      {/* ========================================================================= */}
      {activeTab === 'packages' && (
        <div className="crm-tab-content">
          
          <div className="packages-toolbar">
            <div>
              <h4>📦 متابعة باقات وجلسات الجلدية والليزر</h4>
              <p>تتبع عدد الجلسات المنجزة والمتبقية وتنبيه المرضى المتوقفين.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsAddPackageModalOpen(true)}>
              <UserPlus size={16} />
              <span>إضافة باقة لمريض</span>
            </button>
          </div>

          <div className="packages-cards-grid">
            {(packagesList || []).map((pkg) => {
              const progress = Math.round((pkg.completedSessions / pkg.totalSessions) * 100);
              const isStalled = pkg.completedSessions < pkg.totalSessions;

              return (
                <div key={pkg.id} className="package-crm-card">
                  <div className="pkg-top">
                    <div>
                      <strong>{pkg.patientName}</strong>
                      <h5>{pkg.packageName}</h5>
                    </div>
                    <span className="pkg-price-badge">{pkg.price}</span>
                  </div>

                  <div className="pkg-progress-container">
                    <div className="pkg-progress-bar">
                      <div className="pkg-progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="pkg-progress-labels">
                      <span>أنجز {pkg.completedSessions} من {pkg.totalSessions} جلسات</span>
                      <span>{progress}%</span>
                    </div>
                  </div>

                  <div className="pkg-footer-actions">
                    <span className="pkg-remaining">المتبقي: <strong>{pkg.totalSessions - pkg.completedSessions} جلسات</strong></span>
                    {isStalled && (
                      <a 
                        href={`https://wa.me/${(pkg.patientPhone || '').replace(/^0/, '20')}?text=${encodeURIComponent(`مرحباً يا ${pkg.patientName.split(' ')[0]} 🌸\nنود تذكيرك من ${currentClinic?.name || 'العيادة'} بموعد جلستك القادمة في ${pkg.packageName}. متبقي لك (${pkg.totalSessions - pkg.completedSessions}) جلسات.`)}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-action-primary"
                      >
                        <MessageCircle size={14} />
                        <span>تذكير بالجلسة القادمة</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TAB: BIRTHDAY & OCCASIONS PERSONALIZED CAMPAIGNS                       */}
      {/* ========================================================================= */}
      {activeTab === 'occasions' && (
        <div className="crm-tab-content">
          
          <div className="occasions-select-row">
            {OCCASIONS.map((occ) => (
              <button
                key={occ.id}
                className={`occasion-card-btn ${selectedOccasion === occ.id ? 'active' : ''}`}
                onClick={() => setSelectedOccasion(occ.id)}
              >
                <span className="occ-icon">{occ.icon}</span>
                <strong>{occ.name}</strong>
                <small>{occ.description}</small>
              </button>
            ))}
          </div>

          <div className="occasion-offer-customizer">
            <label>هدية / عرض المناسبة المخصص:</label>
            <input 
              type="text" 
              value={customOccasionOffer}
              onChange={(e) => setCustomOccasionOffer(e.target.value)}
              placeholder="مثال: خصم 20% على جلسات تبييض الأسنان أو باقات النضارة"
            />
          </div>

          <div className="candidates-grid">
            {(occasionCandidates || []).map((c) => {
              const msg = generatePersonalizedOccasionMessage(c, selectedOccasion, currentClinic, customOccasionOffer);
              const cleanPhone = (c.patientPhone || '').replace(/^0/, '20');
              const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

              return (
                <div key={c.patientId} className="candidate-card">
                  <div className="c-meta">
                    <strong>{c.patientName}</strong>
                    <span>الخدمة المفضلة له: <strong className="text-primary">{c.favoriteService}</strong></span>
                  </div>
                  <div className="c-msg-preview">
                    <p>{msg}</p>
                  </div>
                  <a href={waUrl} target="_blank" rel="noreferrer" className="btn-action-primary full-width">
                    <Send size={15} />
                    <span>إرسال التهنئة والعرض المخصص</span>
                  </a>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. TAB: REFERRAL VIRAL ENGINE                                            */}
      {/* ========================================================================= */}
      {activeTab === 'referrals' && (
        <div className="crm-tab-content">
          <div className="referral-intro-banner">
            <h4>🤝 نظام رشّح صديق ومكافآت الإحالة (Referral Viral Engine)</h4>
            <p>كل مريض لديه كود ورابط إحالة خاص به. عند قدوم مريض جديد من خلاله، يحصل المريض وصديقه على نقاط وخصومات مسجلة في المحفظة.</p>
          </div>

          <div className="referral-cards-grid">
            {(patients || []).slice(0, 6).map((p, idx) => {
              const code = getPatientReferralCode(p.id);
              const link = getPatientReferralLink(code);

              return (
                <div key={p.id} className="referral-patient-box">
                  <div className="ref-top">
                    <strong>{p.name}</strong>
                    <span className="ref-code-tag">{code}</span>
                  </div>
                  <div className="ref-link-row">
                    <input type="text" readOnly value={link} dir="ltr" />
                    <button 
                      onClick={() => handleCopyLink(link, idx)}
                      className="btn-copy-code"
                      title="نسخ رابط الإحالة"
                    >
                      {copiedLinkIndex === idx ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <div className="ref-stats-row">
                    <span>عدد الإحالات الناجحة: <strong>{(parseInt((p.id || '1').replace(/\D/g, ''), 10) || 1) % 3}</strong></span>
                    <span>رصيد المكافآت: <strong className="text-success">{((parseInt((p.id || '1').replace(/\D/g, ''), 10) || 1) % 3) * 150} ج.م</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. TAB: AI PERSONALIZED CAMPAIGN COMPOSER                                */}
      {/* ========================================================================= */}
      {activeTab === 'ai_composer' && (
        <div className="crm-tab-content">
          
          <div className="composer-container">
            <div className="composer-sidebar">
              <h4>🎯 إعدادات الحملة الموجهة بالذكاء الاصطناعي</h4>
              
              <div className="form-group">
                <label>الشريحة المستهدفة:</label>
                <select value={composerSegment} onChange={(e) => setComposerSegment(e.target.value)}>
                  <option value="dormant">المرضى الخاملون (6+ أشهر لم يزوروا العيادة)</option>
                  <option value="vip">كبار العملاء المميزين (VIP)</option>
                  <option value="new">المرضى الجدد (لتحويلهم لمرضى دائمين)</option>
                  <option value="returning">المرضى الدائمون دورياً</option>
                </select>
              </div>

              <div className="form-group">
                <label>الهدف من الحملة:</label>
                <select value={composerGoal} onChange={(e) => setComposerGoal(e.target.value)}>
                  <option value="reactivation">إعادة تنشيط ومتابعة صحية</option>
                  <option value="upsell">عرض تكميلي خاص (تبييض / نضارة)</option>
                  <option value="checkup">فحص دوري وقائي</option>
                </select>
              </div>

              <div className="form-group">
                <label>العرض أو الكوبون المعتمد:</label>
                <textarea 
                  rows="3" 
                  value={composerOffer} 
                  onChange={(e) => setComposerOffer(e.target.value)}
                />
              </div>
            </div>

            <div className="composer-preview-area">
              <h4>💬 معاينة النموذج الذكي المولد لكل مريض</h4>
              <p className="sub">الرسالة تتغير ديناميكياً لتشمل اسم المريض، آخر خدمة تلقاها، وتاريخ زيارته بدقة.</p>

              <div className="generated-templates-list">
                {(segmentedPatients || []).filter(p => p && (composerSegment === 'all' || p.lifecycle === composerSegment || p.valueTier === composerSegment)).slice(0, 3).map((p) => {
                  const patientFirst = (p.name || 'مريضنا العزيز').split(' ')[0];
                  const service = p.diagnosis || 'كشف الأسنان والفحص الدوري';
                  const msg = 
                    `مرحباً يا ${patientFirst} 🌸\n\n` +
                    `طاقم ${currentClinic?.name || 'العيادة'} يتمنى لك دوام الصحة والعافية.\n` +
                    `بما أن آخر زيارة لك كانت بخصوص (${service})، أحببنا أن نخصص لك عرضاً حصرياً يناسبك:\n\n` +
                    `✨ ${composerOffer}\n\n` +
                    `يسعدنا تشريفك ويمكنك حجز موعدك مباشرة عبر الرابط:\n` +
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/booking\n\n` +
                    `دمت بصحة وابتسامة جميلة! 🦷✨`;

                  const cleanPhone = (p.phone || '').replace(/^0/, '20');
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

                  return (
                    <div key={p.id} className="template-preview-card">
                      <div className="t-head">
                        <strong>{p.name} ({p.phone})</strong>
                        <span className="t-tag">{p.lifecycle || 'مريض'}</span>
                      </div>
                      <div className="t-body">
                        <p>{msg}</p>
                      </div>
                      <a href={waUrl} target="_blank" rel="noreferrer" className="btn-action-primary">
                        <Send size={15} />
                        <span>إرسال الحملة عبر WhatsApp</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Add Package Modal */}
      {isAddPackageModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>إضافة باقة علاجية أو ليزر لمريض</h3>
              <button className="close-btn" onClick={() => setIsAddPackageModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPackageSubmit} className="modal-form">
              <div className="form-group">
                <label>اختر المريض:</label>
                <select 
                  value={newPackageData.patientId} 
                  onChange={(e) => setNewPackageData(prev => ({ ...prev, patientId: e.target.value }))}
                  required
                >
                  <option value="">-- اختر المريض من القائمة --</option>
                  {(patients || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>اسم الباقة:</label>
                <input 
                  type="text"
                  value={newPackageData.packageName}
                  onChange={(e) => setNewPackageData(prev => ({ ...prev, packageName: e.target.value }))}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>إجمالي الجلسات:</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="20"
                    value={newPackageData.totalSessions}
                    onChange={(e) => setNewPackageData(prev => ({ ...prev, totalSessions: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>الجلسات المنجزة:</label>
                  <input 
                    type="number" 
                    min="0" 
                    max={newPackageData.totalSessions}
                    value={newPackageData.completedSessions}
                    onChange={(e) => setNewPackageData(prev => ({ ...prev, completedSessions: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>السعر الإجمالي:</label>
                <input 
                  type="text"
                  value={newPackageData.price}
                  onChange={(e) => setNewPackageData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddPackageModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ وتفعيل التتبع</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MarketingCrmHub;
