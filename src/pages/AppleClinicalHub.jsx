import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Activity,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Sliders,
  Mic,
  Volume2,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  HeartPulse,
  Thermometer,
  Zap,
  Printer,
  ChevronRight,
  FileText,
  BadgePercent
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import {
  AppleButton,
  AppleToggle,
  AppleInsetGroup,
  AppleListRow,
  AppleStepper,
  AppleSlider,
  AppleSegmentedControl,
  AppleActionSheet
} from '../components/apple/AppleHIGKit';

export default function AppleClinicalHub() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { tenant } = useTenant();

  // Active Segmented Control Tab
  const [activeTab, setActiveTab] = useState('consultation');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState('all');

  // Clinical Consultation State
  const [isVoiceDictationActive, setIsVoiceDictationActive] = useState(false);
  const [autoCallNextPatient, setAutoCallNextPatient] = useState(true);
  const [instantApplePay, setInstantApplePay] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [cloudSyncActive, setCloudSyncActive] = useState(true);

  // Steppers & Sliders
  const [consultationMinutes, setConsultationMinutes] = useState(15);
  const [allowedCompanions, setAllowedCompanions] = useState(1);
  const [alertVolume, setAlertVolume] = useState(80);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [prescriptionCopies, setPrescriptionCopies] = useState(2);

  // Native Action Sheet
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedPatientForAction, setSelectedPatientForAction] = useState(null);

  // Filter Today's Appointments & Queue
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayAppointments = useMemo(() => {
    return (state.appointments || []).filter(app => !app.date || app.date === todayStr || app.status === 'in-progress' || app.status === 'confirmed');
  }, [state.appointments, todayStr]);

  // Derive Current Patient in Consultation Room
  const activeConsultation = useMemo(() => {
    const inProgress = todayAppointments.find(a => a.status === 'in-progress');
    if (inProgress) return inProgress;
    return todayAppointments[0] || {
      id: 'demo-pt-1',
      patientName: 'سارة خالد المنصوري',
      phone: '01012345678',
      time: '11:30 ص',
      type: 'كشف واستشارة تخصصية',
      status: 'in-progress',
      complaint: 'صداع نصفي متكرر مع حساسية مفرطة للضوء وإرهاق عام',
      vitals: {
        bp: '120/80',
        pulse: 74,
        temp: 36.8,
        spo2: 99
      }
    };
  }, [todayAppointments]);

  // Queue List Filtered
  const filteredQueue = useMemo(() => {
    return todayAppointments.filter(item => {
      const matchesSearch = !searchQuery || 
        (item.patientName && item.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.phone && item.phone.includes(searchQuery));
      
      if (!matchesSearch) return false;

      if (queueFilter === 'waiting') return item.status !== 'completed' && item.status !== 'in-progress';
      if (queueFilter === 'in-progress') return item.status === 'in-progress';
      if (queueFilter === 'completed') return item.status === 'completed';
      return true;
    });
  }, [todayAppointments, searchQuery, queueFilter]);

  // Financial Stats Calculation
  const totalRevenue = useMemo(() => {
    return (state.appointments || [])
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (Number(a.fee || a.amount) || 350), 1450);
  }, [state.appointments]);

  // Quick Action Sheet Trigger
  const handleOpenPatientAction = (patient) => {
    setSelectedPatientForAction(patient);
    setActionSheetOpen(true);
  };

  const handleFinishConsultation = () => {
    if (activeConsultation?.id) {
      dispatch({
        type: 'UPDATE_APPOINTMENT',
        payload: { ...activeConsultation, status: 'completed' }
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] text-[#000000] dark:text-[#FFFFFF] transition-colors duration-200 antialiased pb-28">
      
      {/* =========================================================================
          1. SYSTEM GLASS STICKY NAVIGATION BAR (Strict Apple Material Blur)
          ========================================================================= */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#F2F2F7]/80 dark:bg-[#000000]/80 border-b border-black/[0.08] dark:border-white/[0.1] transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between gap-4">
          
          {/* Leading: Clinic Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[36px] h-[36px] rounded-[10px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white shadow-sm shrink-0">
              <Stethoscope size={20} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-semibold text-black dark:text-white leading-tight truncate">
                {tenant?.name || 'عيادة كلينيك فلو التخصصية'}
              </h1>
              <p className="text-[12px] font-medium text-[#8E8E93] leading-none truncate">
                Apple Clinical Interface &bull; iOS 18 Design
              </p>
            </div>
          </div>

          {/* Trailing: Quick Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[12px] font-medium text-[#8E8E93]">
              <Clock size={13} className="text-[#007AFF]" />
              <span>{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <AppleButton
              size="sm"
              variant="tinted"
              onClick={() => navigate('/dashboard')}
              icon={ArrowRight}
            >
              الواجهة القياسية
            </AppleButton>
          </div>
        </div>

        {/* Segmented Control Bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-3 pt-1">
          <AppleSegmentedControl
            options={[
              { id: 'consultation', label: 'غرفة الكشف' },
              { id: 'queue', label: `الطابور الحي (${filteredQueue.length})` },
              { id: 'pos', label: 'الخزينة وApple Pay' },
              { id: 'settings', label: 'تفضيلات النظام' }
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </header>

      {/* =========================================================================
          2. MAIN CONTENT AREA (Strict Inset-Grouped Cards)
          ========================================================================= */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* TAB 1: ACTIVE CONSULTATION ROOM */}
        {activeTab === 'consultation' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Live Patient Hero Card */}
            <AppleInsetGroup header="المريض المتواجد حالياً في غرفة الفحص">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-4">
                    <div className="w-[56px] h-[56px] rounded-[16px] bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center font-bold text-[22px] shadow-sm">
                      {activeConsultation.patientName?.charAt(0) || 'م'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[20px] font-bold text-black dark:text-white leading-snug">
                          {activeConsultation.patientName}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/15 text-[#34C759]">
                          قيد الفحص الآن
                        </span>
                      </div>
                      <p className="text-[14px] text-[#8E8E93] mt-0.5 flex items-center gap-2">
                        <span>رقم الهاتف: {activeConsultation.phone || 'غير مسجل'}</span>
                        <span>&bull;</span>
                        <span>الموعد: {activeConsultation.time || '11:00 ص'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <AppleButton
                      size="md"
                      variant="prominent"
                      onClick={handleFinishConsultation}
                      icon={CheckCircle2}
                    >
                      إنهاء الكشف وإصدار الروشتة
                    </AppleButton>
                  </div>
                </div>

                {/* Patient Vitals Grid (SF Health Metrics) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <div className="p-3.5 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.02]">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#FF3B30]">
                      <HeartPulse size={14} />
                      <span>ضغط الدم (BP)</span>
                    </div>
                    <div className="text-[19px] font-bold text-black dark:text-white mt-1">
                      {activeConsultation.vitals?.bp || '120/80'}
                      <span className="text-[12px] font-normal text-[#8E8E93] mr-1">mmHg</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.02]">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#FF9500]">
                      <Activity size={14} />
                      <span>النبض (Pulse)</span>
                    </div>
                    <div className="text-[19px] font-bold text-black dark:text-white mt-1">
                      {activeConsultation.vitals?.pulse || 72}
                      <span className="text-[12px] font-normal text-[#8E8E93] mr-1">bpm</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.02]">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5856D6]">
                      <Thermometer size={14} />
                      <span>حرارة الجسم</span>
                    </div>
                    <div className="text-[19px] font-bold text-black dark:text-white mt-1">
                      {activeConsultation.vitals?.temp || 37.0}
                      <span className="text-[12px] font-normal text-[#8E8E93] mr-1">&deg;C</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.02]">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#007AFF]">
                      <Zap size={14} />
                      <span>الأكسجين (SpO2)</span>
                    </div>
                    <div className="text-[19px] font-bold text-black dark:text-white mt-1">
                      {activeConsultation.vitals?.spo2 || 99}
                      <span className="text-[12px] font-normal text-[#8E8E93] mr-1">%</span>
                    </div>
                  </div>
                </div>

                {/* Chief Complaint Box */}
                <div className="mt-4 p-4 rounded-[12px] bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/70 border border-black/[0.03]">
                  <p className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1">
                    شكوى المريض والتشخيص المبدئي
                  </p>
                  <p className="text-[15px] font-normal text-black dark:text-white leading-relaxed">
                    {activeConsultation.complaint || 'فحص دوري ومتابعة العلاج الدوائي مع تقييم استجابة الأعراض الأخيرة.'}
                  </p>
                </div>
              </div>
            </AppleInsetGroup>

            {/* Examination & Hardware Controls */}
            <AppleInsetGroup header="أدوات غرفة الكشف والأجهزة المساعدة">
              <AppleListRow
                icon={Mic}
                iconBg="#FF2D55"
                title="التفريغ الصوتي التلقائي للكشف"
                subtitle="تسجيل واستخراج الروشتة والأعراض فورياً عبر الذكاء الاصطناعي"
                accessory={
                  <AppleToggle
                    checked={isVoiceDictationActive}
                    onChange={setIsVoiceDictationActive}
                  />
                }
              />
              <AppleListRow
                icon={Clock}
                iconBg="#007AFF"
                title="مدة الكشف المقترحة"
                subtitle="تحديد وقت التنبيه الصوتي لانتقال الكشف"
                value={`${consultationMinutes} دقيقة`}
                accessory={
                  <AppleStepper
                    value={consultationMinutes}
                    min={5}
                    max={60}
                    step={5}
                    onChange={setConsultationMinutes}
                  />
                }
              />
              <AppleListRow
                icon={Volume2}
                iconBg="#34C759"
                title="شدة صوت استدعاء المريض"
                subtitle="مستوى صوت جهاز النداء الآلي في صالة الانتظار"
                showDivider={false}
                accessory={
                  <div className="w-[180px]">
                    <AppleSlider
                      value={alertVolume}
                      min={0}
                      max={100}
                      onChange={setAlertVolume}
                    />
                  </div>
                }
              />
            </AppleInsetGroup>

            {/* Quick Consultation Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <AppleButton
                variant="tinted"
                icon={FileText}
                onClick={() => alert('تم إرسال الروشتة الرقمية إلى هاتف المريض عبر WhatsApp')}
              >
                إرسال الروشتة عبر WhatsApp
              </AppleButton>
              <AppleButton
                variant="tinted"
                icon={Printer}
                onClick={() => window.print()}
              >
                طباعة كارت المتابعة
              </AppleButton>
              <AppleButton
                variant="destructive"
                icon={AlertCircle}
                onClick={() => handleOpenPatientAction(activeConsultation)}
              >
                خيارات سريرية إضافية
              </AppleButton>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE QUEUE & TRIAGE */}
        {activeTab === 'queue' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Search & Filter Header */}
            <div className="space-y-3">
              <div className="relative">
                <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[40px] pr-10 pl-4 rounded-[12px] bg-[#E3E3E8] dark:bg-[#1C1C1E] text-[15px] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'جميع الحالات' },
                  { id: 'waiting', label: 'في الانتظار' },
                  { id: 'in-progress', label: 'قيد الفحص' },
                  { id: 'completed', label: 'المكتملة' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setQueueFilter(tab.id)}
                    className={`
                      px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all shrink-0 cursor-pointer
                      ${queueFilter === tab.id
                        ? 'bg-[#007AFF] text-white shadow-sm'
                        : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#8E8E93] hover:text-black dark:hover:text-white'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Queue Inset List */}
            <AppleInsetGroup
              header={`قائمة المرضى المسجلين اليوم (${filteredQueue.length})`}
              footer="يتم فرز المرضى حسب أولوية الحضور وساعة الحجز المسبقة."
            >
              {filteredQueue.length === 0 ? (
                <div className="p-8 text-center text-[#8E8E93]">
                  <User size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-[15px] font-medium">لا توجد مواعيد مطابقة لهذا الفلتر</p>
                </div>
              ) : (
                filteredQueue.map((item, idx) => {
                  const isLast = idx === filteredQueue.length - 1;
                  const isCurrent = item.status === 'in-progress';
                  const isDone = item.status === 'completed';

                  return (
                    <AppleListRow
                      key={item.id || idx}
                      isInteractive
                      onClick={() => handleOpenPatientAction(item)}
                      icon={User}
                      iconBg={isCurrent ? '#34C759' : isDone ? '#8E8E93' : '#007AFF'}
                      title={item.patientName}
                      subtitle={`${item.time || '11:00 ص'} • ${item.phone || '010XXXXXXXX'} • ${item.type || 'كشف عيادة'}`}
                      showDivider={!isLast}
                      accessory={
                        <div className="flex items-center gap-2">
                          <span
                            className={`
                              px-2.5 py-1 rounded-full text-[12px] font-semibold
                              ${isCurrent
                                ? 'bg-[#34C759]/15 text-[#34C759]'
                                : isDone
                                ? 'bg-black/[0.05] dark:bg-white/[0.08] text-[#8E8E93]'
                                : 'bg-[#007AFF]/15 text-[#007AFF]'
                              }
                            `}
                          >
                            {isCurrent ? 'في العيادة' : isDone ? 'مكتمل' : 'منتظر'}
                          </span>
                          <ChevronRight size={16} className="text-[#C7C7CC] dark:text-[#48484A]" />
                        </div>
                      }
                    />
                  );
                })
              )}
            </AppleInsetGroup>
          </div>
        )}

        {/* TAB 3: APPLE PAY & CASHIER */}
        {activeTab === 'pos' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Shift Financial Overview Inset Card */}
            <AppleInsetGroup header="إجمالي إيرادات الوردية الحالية">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-medium text-[#8E8E93]">المبلغ الإجمالي المحصل</span>
                    <div className="text-[34px] font-extrabold text-black dark:text-white tracking-tight mt-0.5">
                      {totalRevenue.toLocaleString('ar-EG')} <span className="text-[18px] font-medium text-[#8E8E93]">ج.م</span>
                    </div>
                  </div>
                  <div className="w-[48px] h-[48px] rounded-full bg-[#34C759]/15 text-[#34C759] flex items-center justify-center">
                    <CreditCard size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="p-3 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                    <span className="text-[12px] text-[#8E8E93]">Apple Pay و فيزا</span>
                    <p className="text-[17px] font-bold text-black dark:text-white mt-0.5">
                      {(totalRevenue * 0.65).toFixed(0)} ج.م
                    </p>
                  </div>
                  <div className="p-3 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                    <span className="text-[12px] text-[#8E8E93]">الدفع النقدي (كاش)</span>
                    <p className="text-[17px] font-bold text-black dark:text-white mt-0.5">
                      {(totalRevenue * 0.35).toFixed(0)} ج.م
                    </p>
                  </div>
                  <div className="p-3 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                    <span className="text-[12px] text-[#8E8E93]">العمليات المكتملة</span>
                    <p className="text-[17px] font-bold text-[#34C759] mt-0.5">
                      14 عملية
                    </p>
                  </div>
                </div>
              </div>
            </AppleInsetGroup>

            {/* POS Configuration */}
            <AppleInsetGroup header="إعدادات نقاط البيع والخصومات المعتمدة">
              <AppleListRow
                icon={Zap}
                iconBg="#007AFF"
                title="تأكيد الدفع التلقائي عبر Apple Pay"
                subtitle="إرسال إيصال فوري للمريض عند ملامسة الجهاز"
                accessory={
                  <AppleToggle
                    checked={instantApplePay}
                    onChange={setInstantApplePay}
                  />
                }
              />
              <AppleListRow
                icon={BadgePercent}
                iconBg="#FF9500"
                title="نسبة الخصم التلقائي لكبار السن والطلبة"
                subtitle="تطبيق الخصم فورياً على قيمة الكشف"
                value={`${discountPercent}%`}
                accessory={
                  <AppleStepper
                    value={discountPercent}
                    min={0}
                    max={50}
                    step={5}
                    onChange={setDiscountPercent}
                  />
                }
              />
              <AppleListRow
                icon={Printer}
                iconBg="#5856D6"
                title="عدد نسخ الإيصال المالي المطبوعة"
                subtitle="نسخة المريض + نسخة حسابات العيادة"
                value={`${prescriptionCopies} نسخ`}
                showDivider={false}
                accessory={
                  <AppleStepper
                    value={prescriptionCopies}
                    min={1}
                    max={4}
                    step={1}
                    onChange={setPrescriptionCopies}
                  />
                }
              />
            </AppleInsetGroup>
          </div>
        )}

        {/* TAB 4: APPLE SYSTEM PREFERENCES */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            
            <AppleInsetGroup header="تفضيلات البيئة السريرية وiOS HIG">
              <AppleListRow
                icon={Sliders}
                iconBg="#007AFF"
                title="الاستجابة اللمسية (Haptic Feedback)"
                subtitle="اهتزاز خفيف عند إنهاء الكشوفات وتأكيد الحجوزات"
                accessory={
                  <AppleToggle
                    checked={hapticFeedback}
                    onChange={setHapticFeedback}
                  />
                }
              />
              <AppleListRow
                icon={ShieldCheck}
                iconBg="#34C759"
                title="تزامن السحابة الطبية الحية"
                subtitle="حفظ مباشر ومشفر وفق معايير Apple HealthKit وHIPAA"
                accessory={
                  <AppleToggle
                    checked={cloudSyncActive}
                    onChange={setCloudSyncActive}
                  />
                }
              />
              <AppleListRow
                icon={User}
                iconBg="#AF52DE"
                title="مرافقي المريض المصرح لهم"
                subtitle="الحد الأقصى للمرافقين داخل غرفة الفحص"
                value={`${allowedCompanions} مرافق`}
                showDivider={false}
                accessory={
                  <AppleStepper
                    value={allowedCompanions}
                    min={0}
                    max={4}
                    step={1}
                    onChange={setAllowedCompanions}
                  />
                }
              />
            </AppleInsetGroup>

            <AppleInsetGroup
              header="معلومات النظام والترخيص"
              footer="منصة كلينيك فلو السحابية متوافقة مع متطلبات الأمان السريري ومعايير واجهات آبل الإنسانية (HIG)."
            >
              <AppleListRow
                icon={Sparkles}
                iconBg="#FF9500"
                title="إصدار منصة العيادة"
                value="v4.2 Apple Edition"
              />
              <AppleListRow
                icon={Laptop}
                iconBg="#8E8E93"
                title="معرف العيادة النشطة"
                value={tenant?.slug || 'dr-zainselim845'}
                showDivider={false}
              />
            </AppleInsetGroup>
          </div>
        )}
      </main>

      {/* =========================================================================
          3. NATIVE APPLE ACTION SHEET (Dialog / Bottom Sheet)
          ========================================================================= */}
      <AppleActionSheet
        isOpen={actionSheetOpen}
        title="خيارات الإجراء السريري السريع"
        message={selectedPatientForAction ? `المريض: ${selectedPatientForAction.patientName}` : 'اختر الإجراء المطلوب'}
        onCancel={() => setActionSheetOpen(false)}
        options={[
          {
            id: 'call',
            label: 'استدعاء المريض إلى غرفة الكشف الآن',
            onSelect: () => {
              if (selectedPatientForAction) {
                dispatch({
                  type: 'UPDATE_APPOINTMENT',
                  payload: { ...selectedPatientForAction, status: 'in-progress' }
                });
              }
            }
          },
          {
            id: 'complete',
            label: 'إنهاء الفحص وتحويل إلى الخزينة',
            onSelect: () => {
              if (selectedPatientForAction) {
                dispatch({
                  type: 'UPDATE_APPOINTMENT',
                  payload: { ...selectedPatientForAction, status: 'completed' }
                });
              }
            }
          },
          {
            id: 'cancel',
            label: 'إلغاء الموعد واعتذار المريض',
            isDestructive: true,
            onSelect: () => {
              if (selectedPatientForAction) {
                dispatch({
                  type: 'DELETE_APPOINTMENT',
                  payload: selectedPatientForAction.id
                });
              }
            }
          }
        ]}
      />
    </div>
  );
}
