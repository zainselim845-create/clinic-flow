import React from 'react';
import { 
  Users, RefreshCw, Smile, AlertTriangle, 
  ChevronLeft, Zap, Star, MessageCircle 
} from 'lucide-react';

export function CrmOverviewTab({ 
  crmStats, 
  unfinishedPlans, 
  abandonedLeads, 
  noShowAppointments, 
  crossSellOpportunities, 
  feedbacksList, 
  setActiveTab 
}) {
  return (
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
            <ChevronLeft size={16} />
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
            <ChevronLeft size={16} />
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
            <ChevronLeft size={16} />
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
            <ChevronLeft size={16} />
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
                  href={`sms:+${(opp.patientPhone || '').replace(/^0/, '20')}?body=${encodeURIComponent(opp.smsMessage || opp.whatsappMessage)}`}
                  className="btn-action-primary"
                >
                  <MessageCircle size={14} />
                  <span>SMS</span>
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
  );
}
