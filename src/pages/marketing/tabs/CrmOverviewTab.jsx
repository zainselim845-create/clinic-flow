import React, { useState, useMemo } from 'react';
import { 
  Users, RefreshCw, Smile, AlertTriangle, 
  ChevronLeft, Zap, Star, MessageCircle, Bot,
  PlusCircle, Sparkles, ShieldCheck, ArrowUpRight,
  CheckCircle2, Send, Phone, Clock, Copy, ExternalLink,
  Calendar, Check, AlertCircle, ArrowLeft
} from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';

export function CrmOverviewTab({ 
  crmStats, 
  unfinishedPlans = [], 
  abandonedLeads = [], 
  noShowAppointments = [], 
  crossSellOpportunities = [], 
  feedbacksList = [], 
  postVisitPatients = [],
  scopedPatients = [],
  currentClinic,
  setActiveTab,
  onOpenAddPackage,
  showToast = () => {}
}) {
  const totalRecoveryCount = (abandonedLeads || []).length + (noShowAppointments || []).length;
  const unfinishedPlansCount = (unfinishedPlans || []).length;
  const crossSellCount = (crossSellOpportunities || []).length;
  const feedbacksCount = (feedbacksList || []).length;

  // Local state for queue filter, completed items, and instant dispatcher
  const [queueFilter, setQueueFilter] = useState('all'); // 'all' | 'followup' | 'treatment' | 'recovery'
  const [completedItemIds, setCompletedItemIds] = useState(new Set());
  const [dispatcherTemplate, setDispatcherTemplate] = useState('reminder');
  const [dispatcherPhone, setDispatcherPhone] = useState('01012345678');
  const [dispatcherCustomText, setDispatcherCustomText] = useState('');
  const [hasCopiedDispatcher, setHasCopiedDispatcher] = useState(false);

  const clinicName = currentClinic?.name || 'العيادة';

  // 1. Build Real / Sample Operational Action Queue
  const liveActionQueue = useMemo(() => {
    const items = [];

    // Category A: 24h Post-Visit Follow-up & Review Check
    (postVisitPatients || []).slice(0, 5).forEach((p, idx) => {
      const pName = p.name || p.patientName || `مريض ${idx + 1}`;
      const pPhone = p.phone || p.patientPhone || '01012345678';
      items.push({
        id: `postvisit_${p.id || idx}`,
        type: 'followup',
        typeLabel: 'متابعة بعد الكشف',
        typeColor: 'blue',
        priority: 'اليوم',
        patientName: pName,
        phone: pPhone,
        service: p.service || 'كشف واستشارة',
        reason: 'الاطمئنان على الحالة بعد 24 ساعة وطلب تقييم Google Reviews',
        message: `أهلاً بك أستاذ/ة ${pName} في ${clinicName}. نأمل أن تكون بأفضل صحة بعد زيارتك أمس. نرجو مشاركتنا تجربتك لتطوير خدماتنا: https://g.page/r/sample/review`
      });
    });

    // Category B: Unfinished Treatment Plans
    (unfinishedPlans || []).slice(0, 5).forEach((plan, idx) => {
      items.push({
        id: `plan_${plan.patientId || idx}`,
        type: 'treatment',
        typeLabel: 'استكمال خطة علاج',
        typeColor: 'purple',
        priority: 'متأخر 3 أيام',
        patientName: plan.patientName || `مريض ${idx + 1}`,
        phone: plan.phone || '01123456789',
        service: plan.procedure || 'جلسة علاجية متبقية',
        reason: `متبقي جلسة: ${plan.nextStep || 'المرحلة التالية'} من الخطة العلاجية`,
        message: `مرحباً أستاذ/ة ${plan.patientName || ''}. نذكرك بضرورة استكمال خطتك العلاجية لدى ${clinicName} للحفاظ على النتيجة الطبية. يرجى اختيار موعد جلستك القادمة.`
      });
    });

    // Category C: Abandoned Bookings & No-Shows
    (abandonedLeads || []).slice(0, 3).forEach((lead, idx) => {
      items.push({
        id: `abandoned_${lead.id || idx}`,
        type: 'recovery',
        typeLabel: 'حجز غير مكتمل',
        typeColor: 'rose',
        priority: 'عاجل',
        patientName: lead.patientName || lead.name || 'عميل محتمل',
        phone: lead.phone || lead.patientPhone || '01223456789',
        service: lead.serviceName || 'حجز عيادة',
        reason: 'بدأ الحجز الإلكتروني ولم يكمله',
        message: `مرحباً بك! لاحظنا أنك لم تكمل حجز موعدك لدى ${clinicName}. يسعدنا مساعدتك في اختيار الموعد المناسب وتأكيده مباشرة.`
      });
    });

    (noShowAppointments || []).slice(0, 3).forEach((apt, idx) => {
      items.push({
        id: `noshow_${apt.id || idx}`,
        type: 'recovery',
        typeLabel: 'موعد لم يحضر (No-Show)',
        typeColor: 'rose',
        priority: 'أمس',
        patientName: apt.patientName || apt.name || 'مريض مسجل',
        phone: apt.patientPhone || apt.phone || '01098765432',
        service: apt.serviceName || 'كشف',
        reason: 'فات موعد الأمس دون إلغاء مسبق',
        message: `أهلاً بك أستاذ/ة ${apt.patientName || ''}. نرجو أن تكون بخير! لاحظنا تعذر حضورك لموعدك أمس لدى ${clinicName}. هل تود إعادة جدولة الموعد لوقت آخر يناسبك؟`
      });
    });

    // If queue is empty (e.g. brand new clinic / fresh state), provide 3 high-realism interactive test cases
    if (items.length === 0) {
      items.push(
        {
          id: 'demo_case_1',
          type: 'followup',
          typeLabel: 'متابعة بعد كشف (حالة تجريبية)',
          typeColor: 'blue',
          priority: 'اليوم',
          patientName: 'سارة إبراهيم الشناوي',
          phone: '01012345678',
          service: 'خلع جراحي لضرس العقل',
          reason: 'متابعة مسكنات الألم والاطمئنان بعد 24 ساعة + طلب تقييم جوجل',
          message: `أهلاً بكِ أ. سارة من ${clinicName}. نود الاطمئنان عليكِ بعد جراحة الأمس وتذكيرك باتباع تعليمات الكمادات والمسكنات الموصوفة. للاستفسار الطبي أو مشاركة رأيك: https://g.page/r/sample`
        },
        {
          id: 'demo_case_2',
          type: 'treatment',
          typeLabel: 'خطة علاجية معلقة (حالة تجريبية)',
          typeColor: 'purple',
          priority: 'متأخر 4 أيام',
          patientName: 'محمود عبد الرحمن السيد',
          phone: '01123456789',
          service: 'تركيبات زيركون (التاج النهائي)',
          reason: 'انتهت مرحلة القياسات والمقاسات جاهزة من المعمل لتركيب التاج',
          message: `مرحباً أستاذ محمود من ${clinicName}. نود إعلامك بوصول تركيبات الأسنان النهائية من المختبر وجاهزيتها للتثبيت النهائي. برجاء التواصل لحجز جلسة التركيب.`
        },
        {
          id: 'demo_case_3',
          type: 'recovery',
          typeLabel: 'استعادة حجز مهدر (حالة تجريبية)',
          typeColor: 'rose',
          priority: 'عاجل',
          patientName: 'كريم وائل الدسوقي',
          phone: '01234567890',
          service: 'تنظيف أسنان وتبييض بالليزر',
          reason: 'بدأ الحجز عبر صفحة العيادة وتوقف عند خطوة اختيار الوقت',
          message: `أهلاً بك أستاذ كريم من ${clinicName}. لاحظنا رغبتك في حجز جلسة تنظيف وتبييض. وفرنا لك خصماً 15% عند إتمام الحجز اليوم عبر هذا الرابط المباشر.`
        }
      );
    }

    return items;
  }, [postVisitPatients, unfinishedPlans, abandonedLeads, noShowAppointments, clinicName]);

  // Filter items by active tab
  const filteredQueue = useMemo(() => {
    if (queueFilter === 'all') return liveActionQueue;
    return liveActionQueue.filter(item => item.type === queueFilter);
  }, [liveActionQueue, queueFilter]);

  const toggleItemCompleted = (id) => {
    setCompletedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        showToast('تم تسجيل إتمام المتابعة بنجاح', 'success');
      }
      return next;
    });
  };

  // Dispatcher Templates Dictionary
  const dispatcherTemplates = {
    reminder: {
      title: 'تذكير بموعد الغد',
      body: `تذكير بموعدك لدى ${clinicName} غداً الساعة [الوقت]. نرجو تأكيد الحضور أو إعلامنا في حال الرغبة في التعديل.`
    },
    followup: {
      title: 'اطمئنان بعد الزيارة بـ 24 ساعة',
      body: `مرحباً بك من ${clinicName}. نود الاطمئنان على صحتك بعد كشف الأمس. إذا كان لديك أي استفسار طبي نحن في خدمتك دائماً.`
    },
    review: {
      title: 'طلب تقييم خرائط جوجل (Google Reviews)',
      body: `يسعدنا دائماً تقديم أفضل رعاية لك لدى ${clinicName}. هل يمكنك مشاركتنا تقييمك ورأيك على خرائط جوجل؟ https://g.page/r/sample/review`
    },
    recovery: {
      title: 'استعادة حجز معلق مع رابط مباشر',
      body: `أهلاً بك! لاحظنا أنك لم تكمل حجزك لدى ${clinicName}. يسعدنا الرد على استفسارك ومساعدتك في اختيار الموعد فوراً.`
    },
    offer: {
      title: 'عرض تنظيف وتبييض الأسنان الدوري',
      body: `عرض خاص لرواد ${clinicName}: فحص شامل للأسنان + إزالة الجير والتنظيف بخصم حصري لفترة محدودة. احجز الآن.`
    }
  };

  const currentTemplateBody = dispatcherCustomText || (dispatcherTemplates[dispatcherTemplate]?.body || '');

  const handleCopyDispatcherMessage = async () => {
    const success = await copyToClipboard(currentTemplateBody);
    if (success) {
      setHasCopiedDispatcher(true);
      showToast('تم نسخ نص الرسالة إلى الحافظة بنجاح');
      setTimeout(() => setHasCopiedDispatcher(false), 2500);
    }
  };

  const getCleanPhone = (rawPhone) => {
    if (!rawPhone) return '201012345678';
    const digits = String(rawPhone).replace(/\D/g, '');
    if (digits.startsWith('0')) return '2' + digits;
    if (digits.startsWith('20')) return digits;
    return '20' + digits;
  };

  return (
    <div className="crm-tab-content">
      
      {/* 1. Tactical KPI Cards Grid (Solid High-Contrast Borders & Color Accents) */}
      <div className="crm-kpi-cards-grid">
        
        {/* Card 1: Patients Base */}
        <div className="crm-kpi-card card-theme-blue" onClick={() => setActiveTab('segmentation')}>
          <div className="card-top">
            <div className="icon-wrap bg-blue"><Users size={20} /></div>
            <span className="card-tag">قاعدة المرضى</span>
          </div>
          <div className="card-mid">
            <h3>{crmStats.totalPatients}</h3>
            <p>إجمالي المرضى المسجلين بالعيادة</p>
          </div>
          <div className="card-bot">
            <span className="bot-meta">{crmStats.newCount} جديد • {crmStats.vipCount} VIP</span>
            <span className="bot-action">
              استعراض الشرائح <ChevronLeft size={15} />
            </span>
          </div>
        </div>

        {/* Card 2: Reactivation */}
        <div className="crm-kpi-card card-theme-amber" onClick={() => setActiveTab('reactivation')}>
          <div className="card-top">
            <div className="icon-wrap bg-orange"><RefreshCw size={20} /></div>
            <span className="card-tag tag-warning">إعادة التنشيط</span>
          </div>
          <div className="card-mid">
            <h3 className="text-warning">{crmStats.dormantCount}</h3>
            <p>{crmStats.dormantCount > 0 ? 'مرضى انقطعوا منذ 6+ أشهر' : 'المرضى يتواصلون بانتظام'}</p>
          </div>
          <div className="card-bot">
            <span className="bot-meta">{crmStats.dormantCount > 0 ? 'جاهزون لـ 3 مراحل تذكير' : 'حالة النشاط ممتازة'}</span>
            <span className="bot-action text-warning">
              بدء التنشيط <ChevronLeft size={15} />
            </span>
          </div>
        </div>

        {/* Card 3: Treatment Plans */}
        <div className="crm-kpi-card card-theme-purple" onClick={() => setActiveTab('treatment_plans')}>
          <div className="card-top">
            <div className="icon-wrap bg-purple"><Smile size={20} /></div>
            <span className="card-tag tag-purple">خطط علاجية</span>
          </div>
          <div className="card-mid">
            <h3 className="text-purple">{unfinishedPlansCount}</h3>
            <p>{unfinishedPlansCount > 0 ? 'مرضى لديهم خطوات علاجية معلقة' : 'كافة الخطط العلاجية منتظمة'}</p>
          </div>
          <div className="card-bot">
            <span className="bot-meta">{unfinishedPlansCount > 0 ? 'حشو عصب • تركيبات • تبييض' : 'متابعة دورية'}</span>
            <span className="bot-action text-purple">
              متابعة الخطط <ChevronLeft size={15} />
            </span>
          </div>
        </div>

        {/* Card 4: Booking Recovery */}
        <div className="crm-kpi-card card-theme-rose" onClick={() => setActiveTab('recovery')}>
          <div className="card-top">
            <div className="icon-wrap bg-red"><AlertTriangle size={20} /></div>
            <span className="card-tag tag-red">استعادة الحجوزات</span>
          </div>
          <div className="card-mid">
            <h3 className="text-error">{totalRecoveryCount}</h3>
            <p>{totalRecoveryCount > 0 ? 'حجوزات غير مكتملة + No-Shows' : 'لا توجد حجوزات مهدرة حالياً'}</p>
          </div>
          <div className="card-bot">
            <span className="bot-meta">{totalRecoveryCount > 0 ? 'استعادة برابط مباشر فوري' : 'حجوزاتك مكتملة'}</span>
            <span className="bot-action text-error">
              استعادة فورية <ChevronLeft size={15} />
            </span>
          </div>
        </div>

      </div>

      {/* 2. Executive Daily Action Queue (طابور المتابعة والعمليات الفورية اليومية) */}
      <div className="crm-operational-panel">
        <div className="panel-header-row">
          <div className="panel-title-group">
            <div className="panel-icon-badge bg-primary-soft">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="panel-title">طابور العمليات والمتابعة اليومية الفورية</h3>
              <p className="panel-subtitle">إجراءات سريرية ومتابعات فورية تتطلب تدخل العيادة اليوم لتعزيز الرضا واستعادة المواعيد.</p>
            </div>
          </div>

          <div className="panel-actions-group">
            {/* Filter buttons */}
            <div className="queue-filter-buttons">
              <button 
                type="button" 
                className={`queue-btn ${queueFilter === 'all' ? 'active' : ''}`}
                onClick={() => setQueueFilter('all')}
              >
                الكل ({liveActionQueue.length})
              </button>
              <button 
                type="button" 
                className={`queue-btn ${queueFilter === 'followup' ? 'active' : ''}`}
                onClick={() => setQueueFilter('followup')}
              >
                متابعة بعد الكشف
              </button>
              <button 
                type="button" 
                className={`queue-btn ${queueFilter === 'treatment' ? 'active' : ''}`}
                onClick={() => setQueueFilter('treatment')}
              >
                خطط علاج
              </button>
              <button 
                type="button" 
                className={`queue-btn ${queueFilter === 'recovery' ? 'active' : ''}`}
                onClick={() => setQueueFilter('recovery')}
              >
                استعادة حجوزات
              </button>
            </div>

            <button 
              type="button" 
              onClick={() => onOpenAddPackage ? onOpenAddPackage() : setActiveTab('packages')}
              className="btn-action-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
            >
              <PlusCircle size={15} />
              <span>إضافة باقة جديدة</span>
            </button>
          </div>
        </div>

        {/* Operational Queue Table */}
        <div className="crm-queue-table-wrapper">
          <table className="crm-queue-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>الحالة</th>
                <th>المريض ورقم الهاتف</th>
                <th>سبب المتابعة / الإجراء السريري</th>
                <th>الأولوية والتوقيت</th>
                <th>معاينة الرسالة الذكية المقترحة</th>
                <th style={{ textAlign: 'center', width: '255px', minWidth: '255px' }}>إجراء فوري بنقرة واحدة</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((item) => {
                const isCompleted = completedItemIds.has(item.id);
                const cleanPhone = getCleanPhone(item.phone);
                const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(item.message)}`;
                const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(item.message)}`;

                return (
                  <tr key={item.id} className={isCompleted ? 'row-completed' : ''}>
                    {/* Status checkbox */}
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button"
                        onClick={() => toggleItemCompleted(item.id)}
                        className={`btn-check-toggle ${isCompleted ? 'checked' : ''}`}
                        title={isCompleted ? 'إعادة فتح المهمة' : 'تعليم كمكتمل'}
                      >
                        {isCompleted ? <Check size={14} /> : null}
                      </button>
                    </td>

                    {/* Patient & Phone */}
                    <td>
                      <div className="patient-cell-info">
                        <strong className="patient-name">{item.patientName}</strong>
                        <span className="patient-phone" dir="ltr">{item.phone}</span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td>
                      <div className="reason-cell-info">
                        <span className={`reason-type-badge badge-${item.typeColor}`}>
                          {item.typeLabel}
                        </span>
                        <span className="reason-text">{item.reason}</span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td>
                      <span className="priority-pill">
                        <Clock size={12} />
                        <span>{item.priority}</span>
                      </span>
                    </td>

                    {/* Message Preview */}
                    <td>
                      <div className="msg-preview-cell" title={item.message}>
                        <span>{item.message}</span>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td>
                      <div className="cell-actions-row">
                        {/* WhatsApp button */}
                        <a 
                          href={whatsappUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="action-btn btn-whatsapp"
                          title="إرسال عبر واتساب مباشرة"
                        >
                          <Send size={13} />
                          <span>واتساب</span>
                        </a>

                        {/* SMS button */}
                        <a 
                          href={smsUrl}
                          className="action-btn btn-sms"
                          title="إرسال رسالة SMS"
                        >
                          <MessageCircle size={13} />
                          <span>SMS</span>
                        </a>

                        {/* Complete action */}
                        <button
                          type="button"
                          onClick={() => toggleItemCompleted(item.id)}
                          className={`action-btn btn-resolve ${isCompleted ? 'resolved' : ''}`}
                          title="تأكيد اكتمال المتابعة"
                        >
                          <CheckCircle2 size={13} />
                          <span>{isCompleted ? 'مكتمل' : 'تم'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Instant Message & Campaign Dispatcher (مختبر الإرسال والمراسلة السريعة المباشرة) */}
      <div className="crm-dispatcher-card">
        <div className="dispatcher-header">
          <div className="disp-title-row">
            <div className="disp-icon bg-purple">
              <Bot size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                مختبر الإرسال السريع والمراسلات الفورية (Instant Dispatcher)
              </h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                أرسل تذكيراً، متابعة، أو عرضاً مخصصاً لأي مريض فوراً عبر واتساب أو SMS بدون مغادرة الصفحة.
              </p>
            </div>
          </div>
          <span className="ready-badge">
            <CheckCircle2 size={14} className="text-success" />
            <span>جاهز للإرسال الفوري</span>
          </span>
        </div>

        <div className="dispatcher-body-grid">
          {/* Column 1: Template Selection & Phone */}
          <div className="dispatcher-controls">
            <div className="form-group-compact">
              <label>اختر نوع ونموذج الرسالة:</label>
              <select 
                value={dispatcherTemplate} 
                onChange={(e) => {
                  setDispatcherTemplate(e.target.value);
                  setDispatcherCustomText('');
                }}
                className="select-bordered"
              >
                {Object.entries(dispatcherTemplates).map(([key, tpl]) => (
                  <option key={key} value={key}>{tpl.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group-compact">
              <label>رقم هاتف المريض المستلم:</label>
              <div className="input-with-icon">
                <Phone size={15} className="text-muted" />
                <input 
                  type="tel"
                  dir="ltr"
                  value={dispatcherPhone}
                  onChange={(e) => setDispatcherPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="input-bordered"
                />
              </div>
            </div>

            <div className="dispatcher-quick-tips">
              <small>💡 يدعم الإرسال المباشر لخدمة WhatsApp Web وتطبيق الهواتف بدون أي إعدادات خارجية معقدة.</small>
            </div>
          </div>

          {/* Column 2: Message Textarea & Live Actions */}
          <div className="dispatcher-editor">
            <label>نص الرسالة المجهزة طبياً (قابلة للتعديل):</label>
            <textarea 
              rows={4}
              value={currentTemplateBody}
              onChange={(e) => setDispatcherCustomText(e.target.value)}
              className="textarea-bordered"
            />
            
            <div className="dispatcher-footer-actions">
              <div className="left-actions">
                <button 
                  type="button" 
                  onClick={handleCopyDispatcherMessage}
                  className="btn-secondary-bordered"
                >
                  {hasCopiedDispatcher ? <Check size={14} /> : <Copy size={14} />}
                  <span>{hasCopiedDispatcher ? 'تم النسخ' : 'نسخ النص'}</span>
                </button>
              </div>

              <div className="right-actions">
                <a 
                  href={`sms:+${getCleanPhone(dispatcherPhone)}?body=${encodeURIComponent(currentTemplateBody)}`}
                  className="btn-action-sms"
                >
                  <MessageCircle size={15} />
                  <span>إرسال SMS</span>
                </a>

                <a 
                  href={`https://wa.me/${getCleanPhone(dispatcherPhone)}?text=${encodeURIComponent(currentTemplateBody)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-action-whatsapp-primary"
                >
                  <Send size={15} />
                  <span>إرسال تجريبي عبر واتساب</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Split Operational Summary Grid (فرص البيع المتقاطع ورادار السمعة) */}
      <div className="crm-split-grid">
        
        {/* Box A: Cross-Selling Opportunities */}
        <div className="crm-section-box">
          <div className="box-header">
            <h4>
              <Zap size={18} className="text-primary" />
              <span>أهم فرص البيع المتقاطع السريري (Clinical Cross-Selling)</span>
            </h4>
            <button onClick={() => setActiveTab('cross_sell')} className="btn-link">
              <span>عرض المحرك الكامل</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {crossSellCount === 0 ? (
            <div className="crm-compact-utility-box">
              <div className="compact-util-info">
                <Zap size={22} className="text-primary" />
                <div>
                  <strong>محرك التحليل السريري للخدمات التكميلية نشط</strong>
                  <p>يقوم النظام تلقائياً بمطابقة خدمات المرضى السابقة (تنظيف، ليزر، كشف) واقتراح خدمات مكملة متوافقة طبياً عند تسجيل كشوفات جديدة.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveTab('segmentation')}
                className="btn-secondary-bordered"
                style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                <span>استعراض شرائح المرضى</span>
                <ChevronLeft size={14} />
              </button>
            </div>
          ) : (
            <div className="opportunities-mini-list">
              {(crossSellOpportunities || []).slice(0, 3).map((opp, idx) => (
                <div key={idx} className="opp-mini-card">
                  <div className="opp-meta">
                    <strong>{opp.patientName}</strong>
                    <span>خدمته: {opp.primaryService} ← <strong className="text-primary">{opp.suggestedService}</strong></span>
                  </div>
                  <a 
                    href={`https://wa.me/${getCleanPhone(opp.patientPhone)}?text=${encodeURIComponent(opp.smsMessage || opp.whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-btn btn-whatsapp"
                  >
                    <Send size={13} />
                    <span>واتساب</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Box B: Google Reviews & NPS Reputation Radar */}
        <div className="crm-section-box">
          <div className="box-header">
            <h4>
              <Star size={18} className="text-warning" />
              <span>رادار السمعة الرقمية وتقييمات Google Reviews & NPS</span>
            </h4>
            <button onClick={() => setActiveTab('feedback')} className="btn-link">
              <span>فتح البوابة</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="crm-compact-utility-box">
            <div className="compact-util-info">
              <ShieldCheck size={22} className="text-warning" />
              <div>
                <strong>نظام حماية السمعة الرقمية للعيادة مفعّل</strong>
                <p>يتم إرسال استبيان الرضا بعد الكشف بـ 24 ساعة. التقييمات الممتازة (4-5 نجوم) تُوجّه مباشرة لخرائط جوجل، والشكاوى تُحوّل للإدارة فوراً.</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setActiveTab('feedback')}
              className="btn-secondary-bordered"
              style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              <span>إدارة التقييمات والاستبيانات</span>
              <ChevronLeft size={14} />
            </button>
          </div>

          {feedbacksCount > 0 && (
            <div className="feedbacks-mini-list" style={{ marginTop: '0.75rem' }}>
              {(feedbacksList || []).slice(0, 2).map((fb) => (
                <div key={fb.id} className="fb-mini-card">
                  <div className="fb-stars">
                    {fb.rating} من 5 ★
                  </div>
                  <div className="fb-meta">
                    <strong>{fb.patientName}</strong>
                    <p>"{fb.comment}"</p>
                  </div>
                  <span className={`status-pill ${fb.rating >= 4 ? 'pill-success' : 'pill-warning'}`}>
                    {fb.rating >= 4 ? 'Google Review' : 'متابعة داخلية'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default CrmOverviewTab;
