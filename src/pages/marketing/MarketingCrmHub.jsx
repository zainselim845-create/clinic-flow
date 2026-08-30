import React, { useState, useMemo } from 'react';
import { 
  Users, Sparkles, TrendingUp, RefreshCw, Send,
  AlertTriangle, Gift, Layers, MessageCircle, 
  Search, CheckCircle2, ChevronRight, UserPlus,
  DollarSign, Zap, Target, Star, Copy, Check
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
import { formatDoctorName } from '../../utils/doctorAgentHelpers';
import './MarketingCrmHub.css';

export const MarketingCrmHub = () => {
  const { state } = useApp();
  const { clinic } = useAuth();
  const currentClinic = state.clinicInfo || clinic;
  const doctorName = formatDoctorName(currentClinic?.doctorName || 'طبيب العيادة');

  const { patients = [], appointments = [], invoices = [] } = state;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'segmentation' | 'reactivation' | 'cross_sell' | 'recovery' | 'packages' | 'referrals'
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLinkIndex, setCopiedLinkIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Packages state
  const [packagesList, setPackagesList] = useState(() => getPatientPackages());
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [newPackageData, setNewPackageData] = useState({
    patientId: '',
    packageName: 'باقة ليزر متكاملة (6 جلسات)',
    totalSessions: 6,
    completedSessions: 1,
    sessionIntervalDays: 28,
    price: '3000 ج.م'
  });

  // Drafts
  const [draftsList, setDraftsList] = useState(() => getBookingDrafts());

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Run Realtime O(1) Segmentation
  const segmentationResult = useMemo(() => {
    return segmentAllPatients(patients, appointments, invoices, packagesList, []);
  }, [patients, appointments, invoices, packagesList]);

  const { patients: segmentedPatients, stats: crmStats } = segmentationResult;

  // 2. Cross-Selling Opportunities
  const crossSellOpportunities = useMemo(() => {
    return scanAllCrossSellingOpportunities(segmentedPatients, []);
  }, [segmentedPatients]);

  // 3. Stalled Packages
  const stalledPackages = useMemo(() => {
    return detectStalledPackages(packagesList);
  }, [packagesList]);

  // 4. Abandoned Leads
  const abandonedLeads = useMemo(() => {
    return draftsList.filter(d => d.status === 'abandoned');
  }, [draftsList]);

  // 5. No-Show Appointments
  const noShowAppointments = useMemo(() => {
    return appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show');
  }, [appointments]);

  // Filtered patients for segment explorer
  const filteredPatients = useMemo(() => {
    let list = filterPatientsBySegment(segmentedPatients, selectedSegment);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.phone && p.phone.includes(q)));
    }
    return list;
  }, [segmentedPatients, selectedSegment, searchQuery]);

  const handleCopyLink = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkIndex(index);
    showToast('تم نسخ الرابط بنجاح');
    setTimeout(() => setCopiedLinkIndex(null), 2500);
  };

  const handleAddPackageSubmit = (e) => {
    e.preventDefault();
    const p = patients.find(pat => pat.id === newPackageData.patientId);
    if (!p) {
      showToast('يرجى اختيار المريض أولاً', 'error');
      return;
    }
    const saved = savePatientPackage({
      ...newPackageData,
      patientName: p.name
    });
    if (saved) {
      setPackagesList(getPatientPackages());
      setIsAddPackageModalOpen(false);
      showToast('تم تسجيل الباقة الجديدة للمريض بنجاح');
    }
  };

  return (
    <div className="crm-marketing-hub">
      {toastMessage && (
        <div className={`crm-toast-banner ${toastMessage.type}`}>
          <CheckCircle2 size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="crm-header-card glass-card">
        <div className="crm-brand-row">
          <div className="crm-icon-wrapper">
            <Sparkles size={28} className="text-primary" />
          </div>
          <div>
            <h2>مركز الـ CRM والتسويق الطبي الذكي (Growth & Retention Engine)</h2>
            <p>منظومة زيادة الولاء ومضاعفة الإيرادات عبر استعادة الحجوزات، البيع المتقاطع، ومسارات إعادة التنشيط الآلية</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="crm-nav-tabs">
          <button 
            className={`crm-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={16} />
            <span>نظرة عامة ومؤشرات النمو</span>
          </button>
          <button 
            className={`crm-tab-btn ${activeTab === 'segmentation' ? 'active' : ''}`}
            onClick={() => setActiveTab('segmentation')}
          >
            <Users size={16} />
            <span>تقسيم المرضى ({crmStats.total})</span>
          </button>
          <button 
            className={`crm-tab-btn ${activeTab === 'reactivation' ? 'active' : ''}`}
            onClick={() => setActiveTab('reactivation')}
          >
            <RefreshCw size={16} />
            <span>حملات إعادة التنشيط ({crmStats.dormant + crmStats.lost})</span>
          </button>
          <button 
            className={`crm-tab-btn ${activeTab === 'cross_sell' ? 'active' : ''}`}
            onClick={() => setActiveTab('cross_sell')}
          >
            <Zap size={16} />
            <span>البيع المتقاطع الطبي ({crossSellOpportunities.length})</span>
          </button>
          <button 
            className={`crm-tab-btn ${activeTab === 'recovery' ? 'active' : ''}`}
            onClick={() => setActiveTab('recovery')}
          >
            <Target size={16} />
            <span>استعادة الحجوزات ({abandonedLeads.length + noShowAppointments.length})</span>
          </button>
          <button 
            className={`crm-tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
            onClick={() => setActiveTab('packages')}
          >
            <Layers size={16} />
            <span>باقات الجلسات ({packagesList.length})</span>
          </button>
          <button 
            className={`crm-tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            <Gift size={16} />
            <span>نظام الإحالات (Referrals)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & GROWTH DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="crm-tab-content">
          <div className="crm-kpi-grid">
            <div className="crm-kpi-card glass-card">
              <div className="kpi-icon-box bg-purple-light text-purple">
                <Users size={24} />
              </div>
              <div className="kpi-data">
                <span className="kpi-label">إجمالي المرضى المسجلين</span>
                <strong className="kpi-value">{crmStats.total} مريض</strong>
                <span className="kpi-hint text-success">مفهرس لحظياً O(1)</span>
              </div>
            </div>

            <div className="crm-kpi-card glass-card">
              <div className="kpi-icon-box bg-emerald-light text-emerald">
                <DollarSign size={24} />
              </div>
              <div className="kpi-data">
                <span className="kpi-label">مرضى VIP (الأعلى إنفاقاً)</span>
                <strong className="kpi-value">{crmStats.vip} مريض</strong>
                <span className="kpi-hint">قيمة مشتريات &gt; 5,000 ج.م</span>
              </div>
            </div>

            <div className="crm-kpi-card glass-card">
              <div className="kpi-icon-box bg-amber-light text-amber">
                <RefreshCw size={24} />
              </div>
              <div className="kpi-data">
                <span className="kpi-label">مرضى غائبون بحاجة لتنشيط</span>
                <strong className="kpi-value">{crmStats.dormant + crmStats.lost} مريض</strong>
                <span className="kpi-hint text-warning">غائب لأكثر من 90 يوماً</span>
              </div>
            </div>

            <div className="crm-kpi-card glass-card">
              <div className="kpi-icon-box bg-blue-light text-primary">
                <Target size={24} />
              </div>
              <div className="kpi-data">
                <span className="kpi-label">حجوزات مهجورة قابلة للاستعادة</span>
                <strong className="kpi-value">{abandonedLeads.length} حجز</strong>
                <span className="kpi-hint text-info">سجلوا رقمهم ولم يكملوا</span>
              </div>
            </div>

            <div className="crm-kpi-card glass-card">
              <div className="kpi-icon-box bg-indigo-light text-indigo">
                <Zap size={24} />
              </div>
              <div className="kpi-data">
                <span className="kpi-label">فرص بيع متقاطع سريرية</span>
                <strong className="kpi-value">{crossSellOpportunities.length} فرصة</strong>
                <span className="kpi-hint">تبييض بعد تنظيف / طربوش بعد عصب</span>
              </div>
            </div>

            <div className="crm-kpi-card glass-card">
              <div className="kpi-icon-box bg-rose-light text-rose">
                <Layers size={24} />
              </div>
              <div className="kpi-data">
                <span className="kpi-label">باقات جلسات متوقفة (Stalled)</span>
                <strong className="kpi-value">{stalledPackages.length} باقة</strong>
                <span className="kpi-hint text-danger">توقفوا عن متابعة الجلسات</span>
              </div>
            </div>
          </div>

          {/* Quick Action Playbooks */}
          <div className="crm-playbooks-row">
            <div className="playbook-card glass-card">
              <div className="playbook-header">
                <Zap size={20} className="text-warning" />
                <h4>أفضل فرص النمو السريعة اليوم</h4>
              </div>
              <div className="playbook-list">
                <div className="playbook-item" onClick={() => setActiveTab('recovery')}>
                  <div className="playbook-bullet bg-blue-light text-primary">1</div>
                  <div className="playbook-desc">
                    <strong>استعادة {abandonedLeads.length} عميل محتمل بدأوا الحجز</strong>
                    <p>إرسال رسالة واتساب بضغطة زر مع رابط الاستئناف المباشر</p>
                  </div>
                  <ChevronRight size={18} />
                </div>

                <div className="playbook-item" onClick={() => setActiveTab('cross_sell')}>
                  <div className="playbook-bullet bg-emerald-light text-emerald">2</div>
                  <div className="playbook-desc">
                    <strong>اقتراح خدمات مكملة لـ {crossSellOpportunities.length} مريض</strong>
                    <p>بروتوكولات علاجية موجهة (تبييض، تيجان زيركون، سكين بوستر)</p>
                  </div>
                  <ChevronRight size={18} />
                </div>

                <div className="playbook-item" onClick={() => setActiveTab('reactivation')}>
                  <div className="playbook-bullet bg-purple-light text-purple">3</div>
                  <div className="playbook-desc">
                    <strong>إطلاق مسار إعادة التنشيط لـ {crmStats.dormant} مريض غائب</strong>
                    <p>مسار ثلاثي المراحل: تطمين ➡️ نصيحة ➡️ كشف متابعة مجاني</p>
                  </div>
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>

            <div className="playbook-card glass-card">
              <div className="playbook-header">
                <Star size={20} className="text-amber" />
                <h4>قمع تقييمات Google Maps الذكي (NPS Funnel)</h4>
              </div>
              <div className="nps-preview-box">
                <p>يتم إرسال استبيان تقييم تلقائي بعد 24 ساعة من زيارة المريض:</p>
                <div className="nps-branching-visual">
                  <div className="nps-branch high">
                    <span className="badge badge-success">تقييم 5 نجوم (مرتفع)</span>
                    <p>تحويل فوري إلى صفحة Google Maps الخاصة بالعيادة لرفع تقييم العيادة على الإنترنت.</p>
                  </div>
                  <div className="nps-branch low">
                    <span className="badge badge-error">تقييم &lt; 4 نجوم (منخفض)</span>
                    <p>توجيه الملاحظة لصندوق الإدارة الداخلي لحل المشكلة ودياً قبل كتابة تقييم سلبي عام.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT SEGMENTATION & OUTREACH */}
      {activeTab === 'segmentation' && (
        <div className="crm-tab-content">
          <div className="segmentation-controls glass-card">
            <div className="segment-pills-row">
              <button 
                className={`segment-pill ${selectedSegment === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedSegment('all')}
              >
                الكل ({crmStats.total})
              </button>
              <button 
                className={`segment-pill ${selectedSegment === 'vip' ? 'active' : ''}`}
                onClick={() => setSelectedSegment('vip')}
              >
                👑 مرضى VIP ({crmStats.vip})
              </button>
              <button 
                className={`segment-pill ${selectedSegment === 'loyal' ? 'active' : ''}`}
                onClick={() => setSelectedSegment('loyal')}
              >
                🌟 أوفياء (5+ زيارات) ({crmStats.loyal})
              </button>
              <button 
                className={`segment-pill ${selectedSegment === 'new' ? 'active' : ''}`}
                onClick={() => setSelectedSegment('new')}
              >
                🌱 مرضى جدد ({crmStats.new})
              </button>
              <button 
                className={`segment-pill ${selectedSegment === 'dormant' ? 'active' : ''}`}
                onClick={() => setSelectedSegment('dormant')}
              >
                ⏳ غائبون (90 - 180 يوم) ({crmStats.dormant})
              </button>
              <button 
                className={`segment-pill ${selectedSegment === 'lost' ? 'active' : ''}`}
                onClick={() => setSelectedSegment('lost')}
              >
                ⚠️ منقطعون (&gt; 180 يوم) ({crmStats.lost})
              </button>
            </div>

            <div className="search-bar-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text"
                placeholder="بحث في هذه الشريحة بالاسم أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="segmented-patients-table-card glass-card">
            {filteredPatients.length === 0 ? (
              <div className="empty-crm-state">
                <Users size={36} className="text-secondary" />
                <p>لا يوجد مرضى مطابقين لهذه الشريحة حالياً.</p>
              </div>
            ) : (
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>اسم المريض</th>
                    <th>رقم الهاتف</th>
                    <th>الشريحة</th>
                    <th>القيمة المالية (LTV)</th>
                    <th>الزيارات</th>
                    <th>آخر زيارة</th>
                    <th>إجراء مباشر</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p, idx) => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const waText = `مرحباً ${p.name.split(' ')[0]} 🌸\nتحياتنا لك من ${currentClinic?.name || 'العيادة'} مع ${doctorName}.\nنسعد دائماً بالاطمئنان على صحتك وتقديم أفضل رعاية لك. هل تود حجز موعد المتابعة الدوري؟\n${origin}/booking`;
                    const waUrl = `https://wa.me/2${p.phone}?text=${encodeURIComponent(waText)}`;

                    return (
                      <tr key={p.id || idx}>
                        <td>
                          <strong>{p.name}</strong>
                          {p.diagnosis && <small className="text-secondary block-sub">{p.diagnosis}</small>}
                        </td>
                        <td dir="ltr" style={{ textAlign: 'right' }}>{p.phone}</td>
                        <td>
                          <span className={`badge badge-${p.valueTier === 'vip' ? 'primary' : p.lifecycle === 'dormant' ? 'warning' : 'accent'}`}>
                            {p.valueTier === 'vip' ? 'VIP' : p.lifecycle === 'dormant' ? 'غائب' : p.lifecycle === 'new' ? 'جديد' : 'عادي'}
                          </span>
                        </td>
                        <td><strong>{p.ltv} ج.م</strong></td>
                        <td>{p.visitsCount} زيارة</td>
                        <td>{p.lastVisitDate ? `${p.daysSinceLastVisit} يوم مضت` : '—'}</td>
                        <td>
                          <a 
                            href={waUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-whatsapp-action"
                            title="إرسال رسالة واتساب مخصصة"
                          >
                            <MessageCircle size={14} />
                            <span>واتساب</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DRIP REACTIVATION SEQUENCES */}
      {activeTab === 'reactivation' && (
        <div className="crm-tab-content">
          <div className="drip-explainer-banner glass-card">
            <div className="drip-step-card">
              <span className="step-num">المرحلة 1</span>
              <h4>رسالة تطمين ورعاية</h4>
              <p>سؤال ودي واهتمام صحي بدون أي ضغط بيعي</p>
            </div>
            <ChevronRight size={24} className="drip-arrow" />
            <div className="drip-step-card">
              <span className="step-num">المرحلة 2 (بعد أسبوع)</span>
              <h4>قيمة ومعلومة طبية</h4>
              <p>توضيح أهمية الفحص الدوري لمنع تفاقم المشكلات</p>
            </div>
            <ChevronRight size={24} className="drip-arrow" />
            <div className="drip-step-card">
              <span className="step-num">المرحلة 3 (بعد أسبوعين)</span>
              <h4>عرض أو كشف متابعة مجاني</h4>
              <p>حافز تشجيعي لكسر التردد وإعادة حجز الموعد</p>
            </div>
          </div>

          <div className="reactivation-list-card glass-card">
            <h4>المرضى المؤهلون لمسار إعادة التنشيط ({crmStats.dormant + crmStats.lost} مريض)</h4>
            <div className="reactivation-items-grid">
              {segmentedPatients.filter(p => p.lifecycle === 'dormant' || p.lifecycle === 'lost').map((p, idx) => {
                const stage1Msg = generateReactivationMessage(REACTIVATION_STAGES.STAGE_1_CARE, p, currentClinic);
                const stage1Wa = `https://wa.me/2${p.phone}?text=${encodeURIComponent(stage1Msg)}`;

                const stage2Msg = generateReactivationMessage(REACTIVATION_STAGES.STAGE_2_VALUE, p, currentClinic);
                const stage2Wa = `https://wa.me/2${p.phone}?text=${encodeURIComponent(stage2Msg)}`;

                const stage3Msg = generateReactivationMessage(REACTIVATION_STAGES.STAGE_3_OFFER, p, currentClinic);
                const stage3Wa = `https://wa.me/2${p.phone}?text=${encodeURIComponent(stage3Msg)}`;

                return (
                  <div key={p.id || idx} className="reactivation-patient-box glass-card">
                    <div className="r-patient-header">
                      <div>
                        <strong>{p.name}</strong>
                        <span className="r-phone">{p.phone}</span>
                      </div>
                      <span className="badge badge-warning">غائب من {p.daysSinceLastVisit} يوم</span>
                    </div>

                    <div className="r-actions-row">
                      <a href={stage1Wa} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                        <Send size={13} />
                        <span>إرسال مرحلة 1 (تطمين)</span>
                      </a>
                      <a href={stage2Wa} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                        <Send size={13} />
                        <span>مرحلة 2 (نصيحة)</span>
                      </a>
                      <a href={stage3Wa} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                        <Gift size={13} />
                        <span>مرحلة 3 (عرض خاص)</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CROSS-SELLING RADAR */}
      {activeTab === 'cross_sell' && (
        <div className="crm-tab-content">
          <div className="cross-sell-banner glass-card">
            <Zap size={24} className="text-warning" />
            <div>
              <h4>البيع المتقاطع الموجه سريرياً (Clinical Cross-Selling Radar)</h4>
              <p>اقتراحات علاجية مبنية على تاريخ الإجراءات السابقة للمريض ومعتمدة من بروتوكول الطبيب</p>
            </div>
          </div>

          <div className="cross-sell-grid">
            {crossSellOpportunities.length === 0 ? (
              <div className="empty-crm-state glass-card">
                <Zap size={36} className="text-secondary" />
                <p>لا توجد فرص بيع متقاطع مطابقة لتاريخ المرضى حالياً.</p>
              </div>
            ) : (
              crossSellOpportunities.map((opp, idx) => {
                const csOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                const message = `مرحباً ${opp.patientName.split(' ')[0]} 🌸\n${doctorName} وفريق ${currentClinic?.name || 'العيادة'} بنطمن عليك.\nنظراً لإجرائك (${opp.triggerService}) منذ ${opp.daysSinceTrigger} يوماً، نوصيك سريرياً بـ (${opp.suggestedService}) ${opp.clinicalRationale}\n\nيسعدنا حجز موعدك بسهولة عبر الرابط التالي: \n${csOrigin}/booking`;
                const waUrl = `https://wa.me/2${opp.patientPhone}?text=${encodeURIComponent(message)}`;

                return (
                  <div key={idx} className="cross-sell-card glass-card">
                    <div className="cs-top-row">
                      <div>
                        <strong>{opp.patientName}</strong>
                        <span className="cs-trigger">الخدمة السابقة: {opp.triggerService} ({opp.daysSinceTrigger} يوم مضت)</span>
                      </div>
                      <span className="badge badge-primary">{opp.discountBadge}</span>
                    </div>

                    <div className="cs-suggestion-box">
                      <span className="cs-label">الخدمة المقترحة سريرياً:</span>
                      <h5>{opp.suggestedService}</h5>
                      <p className="cs-rationale">{opp.clinicalRationale}</p>
                    </div>

                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp-action full-width">
                      <MessageCircle size={16} />
                      <span>إرسال الاقتراح للمريض عبر واتساب</span>
                    </a>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: LEAD & NO-SHOW RECOVERY */}
      {activeTab === 'recovery' && (
        <div className="crm-tab-content">
          <div className="recovery-columns-grid">
            {/* Abandoned Leads Column */}
            <div className="recovery-col glass-card">
              <div className="col-header">
                <Target size={20} className="text-primary" />
                <h4>حجوزات لم تكتمل (Abandoned Leads)</h4>
                <span className="badge badge-primary">{abandonedLeads.length}</span>
              </div>
              <p className="col-subtitle">أشخاص أدخلوا رقم هاتفهم في بوابة الحجز ولم يكملوا الخطوة الأخيرة</p>

              <div className="recovery-items-list">
                {abandonedLeads.length === 0 ? (
                  <div className="empty-sub-state">لا توجد حجوزات مهجورة حالياً.</div>
                ) : (
                  abandonedLeads.map((draft, idx) => {
                    const waUrl = generateLeadRecoveryWhatsAppMessage(draft, currentClinic);

                    return (
                      <div key={draft.id || idx} className="recovery-item-card glass-card">
                        <div className="rec-info">
                          <strong>{draft.name || 'عميل بدون اسم'}</strong>
                          <span>{draft.phone}</span>
                          <small className="text-secondary">بدأ الخطوة {draft.step} من الحجز</small>
                        </div>
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-whatsapp-action">
                          <MessageCircle size={14} />
                          <span>استعادة عبر واتساب</span>
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* No-Show Appointments Column */}
            <div className="recovery-col glass-card">
              <div className="col-header">
                <AlertTriangle size={20} className="text-danger" />
                <h4>المرضى المتغيبون (No-Show Recovery)</h4>
                <span className="badge badge-error">{noShowAppointments.length}</span>
              </div>
              <p className="col-subtitle">مواعيد تم إلغاؤها أو لم يحضر أصحابها لإعادة جدولتها ذاتياً</p>

              <div className="recovery-items-list">
                {noShowAppointments.length === 0 ? (
                  <div className="empty-sub-state">لا توجد حالات غياب مسجلة.</div>
                ) : (
                  noShowAppointments.map((appt, idx) => {
                    const msg = generateNoShowRecoveryMessage(appt, currentClinic);
                    const waUrl = `https://wa.me/2${appt.patientPhone}?text=${encodeURIComponent(msg)}`;

                    return (
                      <div key={appt.id || idx} className="recovery-item-card glass-card">
                        <div className="rec-info">
                          <strong>{appt.patientName}</strong>
                          <span>{appt.patientPhone}</span>
                          <small className="text-secondary">موعد: {appt.date} ({appt.time || 'غير محدد'})</small>
                        </div>
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                          <RefreshCw size={14} />
                          <span>إرسال رابط إعادة الجدولة</span>
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: MULTI-SESSION PACKAGES */}
      {activeTab === 'packages' && (
        <div className="crm-tab-content">
          <div className="packages-header-bar glass-card">
            <div>
              <h4>تتبع باقات وجلسات الليزر والجلدية والعلاج الطبيعي</h4>
              <p>متابعة الجلسات المتبقية واكتشاف المرضى المنقطعين عن إكمال الباقة تلقائياً</p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsAddPackageModalOpen(true)}>
              <UserPlus size={16} />
              <span>إضافة باقة لمريض جديد</span>
            </button>
          </div>

          <div className="packages-grid">
            {packagesList.length === 0 ? (
              <div className="empty-crm-state glass-card">
                <Layers size={36} className="text-secondary" />
                <p>لم يتم تسجيل أي باقات جلسات بعد. اضغط على "إضافة باقة" للبدء.</p>
              </div>
            ) : (
              packagesList.map((pkg, idx) => {
                const progressPct = Math.round((pkg.completedSessions / pkg.totalSessions) * 100);
                const isStalled = stalledPackages.some(s => s.id === pkg.id);

                return (
                  <div key={pkg.id || idx} className="package-card glass-card">
                    <div className="pkg-top">
                      <div>
                        <strong>{pkg.patientName}</strong>
                        <h5>{pkg.packageName}</h5>
                      </div>
                      {isStalled && <span className="badge badge-error">جلسات متوقفة ⚠️</span>}
                    </div>

                    <div className="pkg-progress-box">
                      <div className="pkg-progress-labels">
                        <span>تم إنجاز {pkg.completedSessions} من {pkg.totalSessions} جلسات</span>
                        <strong>{progressPct}%</strong>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
                      </div>
                    </div>

                    <div className="pkg-meta-row">
                      <span>المتبقي: <strong>{pkg.remainingSessions} جلسات</strong></span>
                      <span>موعد الجلسة التالية: <strong>{pkg.nextDueDate || 'قريباً'}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Package Modal */}
          {isAddPackageModalOpen && (
            <div className="crm-modal-overlay">
              <div className="crm-modal-card glass-card">
                <h3>تسجيل باقة جلسات جديدة لمريض</h3>
                <form onSubmit={handleAddPackageSubmit}>
                  <div className="form-group">
                    <label>اختر المريض *</label>
                    <select 
                      className="input-field" 
                      value={newPackageData.patientId} 
                      onChange={(e) => setNewPackageData({ ...newPackageData, patientId: e.target.value })}
                      required
                    >
                      <option value="">-- اختر المريض --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>اسم الباقة *</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newPackageData.packageName} 
                      onChange={(e) => setNewPackageData({ ...newPackageData, packageName: e.target.value })}
                      required 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>إجمالي الجلسات</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={newPackageData.totalSessions} 
                        onChange={(e) => setNewPackageData({ ...newPackageData, totalSessions: e.target.value })}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>الجلسات المنجزة</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={newPackageData.completedSessions} 
                        onChange={(e) => setNewPackageData({ ...newPackageData, completedSessions: e.target.value })}
                        required 
                      />
                    </div>
                  </div>

                  <div className="modal-actions-row">
                    <button type="button" className="btn btn-secondary" onClick={() => setIsAddPackageModalOpen(false)}>
                      إلغاء
                    </button>
                    <button type="submit" className="btn btn-primary">
                      حفظ الباقة
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: REFERRALS & REWARDS */}
      {activeTab === 'referrals' && (
        <div className="crm-tab-content">
          <div className="referral-banner glass-card">
            <Gift size={24} className="text-primary" />
            <div>
              <h4>منظومة ترشيح الأصدقاء والمكافآت (Patient Referral Program)</h4>
              <p>لكل مريض كود ورابط حجز فريد. عند حجز صديق عبر الرابط يحصل على خصم 10% ويحصل المرشح على 100 ج.م رصيد</p>
            </div>
          </div>

          <div className="referral-patients-grid">
            {patients.slice(0, 10).map((p, idx) => {
              const refCode = getPatientReferralCode(p.id);
              const refLink = getPatientReferralLink(p.id);

              return (
                <div key={p.id || idx} className="referral-card glass-card">
                  <div className="ref-top">
                    <strong>{p.name}</strong>
                    <span className="badge badge-accent">{refCode}</span>
                  </div>
                  <p className="ref-link-text">{refLink}</p>
                  <button 
                    className="btn btn-sm btn-secondary full-width"
                    onClick={() => handleCopyLink(refLink, idx)}
                  >
                    {copiedLinkIndex === idx ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    <span>{copiedLinkIndex === idx ? 'تم النسخ!' : 'نسخ رابط الإحالة'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingCrmHub;
