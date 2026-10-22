import React from 'react';
import { 
  Users, RefreshCw, Smile, AlertTriangle, 
  ChevronLeft, Zap, Star, MessageCircle, Bot,
  PlusCircle, Sparkles, ShieldCheck, ArrowUpRight
} from 'lucide-react';

export function CrmOverviewTab({ 
  crmStats, 
  unfinishedPlans, 
  abandonedLeads, 
  noShowAppointments, 
  crossSellOpportunities, 
  feedbacksList, 
  setActiveTab,
  onOpenAddPackage
}) {
  const totalRecoveryCount = (abandonedLeads || []).length + (noShowAppointments || []).length;
  const unfinishedPlansCount = (unfinishedPlans || []).length;
  const crossSellCount = (crossSellOpportunities || []).length;
  const feedbacksCount = (feedbacksList || []).length;

  return (
    <div className="crm-tab-content">
      {/* 1. Quick Growth Actions Bar */}
      <div className="crm-quick-actions-bar">
        <div className="quick-actions-title">
          <Sparkles size={16} className="text-primary" />
          <span>إجراءات نمو ورعاية سريعة:</span>
        </div>
        <div className="quick-actions-pills">
          <button 
            type="button" 
            onClick={() => setActiveTab('ai_composer')} 
            className="quick-action-pill pill-ai"
          >
            <Bot size={15} />
            <span>منشئ الحملات الذكي (AI)</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => setActiveTab('reactivation')} 
            className="quick-action-pill pill-reactivate"
          >
            <RefreshCw size={15} />
            <span>تنشيط المرضى الخاملين</span>
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('recovery')} 
            className="quick-action-pill pill-recovery"
          >
            <AlertTriangle size={15} />
            <span>استعادة المواعيد المهدرة</span>
          </button>

          <button 
            type="button" 
            onClick={() => onOpenAddPackage ? onOpenAddPackage() : setActiveTab('packages')} 
            className="quick-action-pill pill-package"
          >
            <PlusCircle size={15} />
            <span>إضافة باقة جديدة</span>
          </button>
        </div>
      </div>

      {/* 2. Enhanced KPI Cards Grid */}
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
            <p>{crmStats.dormantCount > 0 ? 'مرضى لم يزوروا العيادة منذ 6+ أشهر' : 'كافة المرضى يتواصلون بانتظام'}</p>
          </div>
          <div className="card-bot">
            <span className="bot-meta">{crmStats.dormantCount > 0 ? 'جاهزون لـ 3 مراحل تذكير' : 'لا يوجد خاملون'}</span>
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
            <p>{totalRecoveryCount > 0 ? 'حجوزات لم تكتمل + No-Shows' : 'لا توجد حجوزات مهدرة حالياً'}</p>
          </div>
          <div className="card-bot">
            <span className="bot-meta">{totalRecoveryCount > 0 ? 'استعادة برابط مباشر فوري' : 'حجوزاتك مكتملة'}</span>
            <span className="bot-action text-error">
              استعادة فورية <ChevronLeft size={15} />
            </span>
          </div>
        </div>

      </div>

      {/* 3. Quick Engine Launchers with Apple-Tier Empty States */}
      <div className="crm-split-grid">
        
        {/* Box A: Cross-Selling */}
        <div className="crm-section-box">
          <div className="box-header">
            <h4>
              <Zap size={18} className="text-primary" />
              <span>أهم فرص البيع المتقاطع (Cross-Selling)</span>
            </h4>
            <button onClick={() => setActiveTab('cross_sell')} className="btn-link">
              <span>عرض المحرك</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {crossSellCount === 0 ? (
            <div className="crm-empty-state-box">
              <div className="empty-state-icon-wrap bg-teal">
                <Zap size={28} />
              </div>
              <h5>محرك البيع المتقاطع جاهز للتحليل التلقائي</h5>
              <p>
                يقوم الذكاء الاصطناعي بتحليل تاريخ كشوفات المرضى واقتراح خدمات تكميلية متوافقة طبياً (مثل: تبييض بعد التنظيف، أو ليزر إضافي) لزيادة عوائد العيادة ورضا المرضى.
              </p>
              <button 
                type="button" 
                onClick={() => setActiveTab('segmentation')}
                className="btn-action-primary empty-state-btn"
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
                    <span>خدمته السابقة: {opp.primaryService} | المقترح: <strong className="text-primary">{opp.suggestedService}</strong></span>
                  </div>
                  <a 
                    href={`sms:+${(opp.patientPhone || '').replace(/^0/, '20')}?body=${encodeURIComponent(opp.smsMessage || opp.whatsappMessage)}`}
                    className="btn-action-primary"
                  >
                    <MessageCircle size={14} />
                    <span>SMS</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Box B: Google Reviews & NPS */}
        <div className="crm-section-box">
          <div className="box-header">
            <h4>
              <Star size={18} className="text-warning" />
              <span>تقييمات Google Reviews & NPS الذكية</span>
            </h4>
            <button onClick={() => setActiveTab('feedback')} className="btn-link">
              <span>فتح البوابة</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {feedbacksCount === 0 ? (
            <div className="crm-empty-state-box">
              <div className="empty-state-icon-wrap bg-amber">
                <ShieldCheck size={28} />
              </div>
              <h5>محرك السمعة الرقمية وحماية تقييم العيادة</h5>
              <p>
                يُرسل النظام استبيان رضا ذكياً تلقائياً بعد الزيارة بـ 24 ساعة: التقييمات الإيجابية (4-5 نجوم) تُوجّه مباشرة لصفحة خرائط جوجل، والملاحظات السلبية تُحوّل للإدارة فوراً لمعالجتها.
              </p>
              <button 
                type="button" 
                onClick={() => setActiveTab('feedback')}
                className="btn-action-primary empty-state-btn"
              >
                <span>فتح بوابة التقييمات والاستبيانات</span>
                <ChevronLeft size={14} />
              </button>
            </div>
          ) : (
            <div className="feedbacks-mini-list">
              {(feedbacksList || []).slice(0, 3).map((fb) => (
                <div key={fb.id} className="fb-mini-card">
                  <div className="fb-stars">
                    {fb.rating} من 5
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
          )}
        </div>

      </div>
    </div>
  );
}
