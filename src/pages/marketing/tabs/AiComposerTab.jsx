import React from 'react';
import { Send } from 'lucide-react';

export function AiComposerTab({
  composerSegment,
  setComposerSegment,
  composerGoal,
  setComposerGoal,
  composerOffer,
  setComposerOffer,
  segmentedPatients,
  currentClinic
}) {
  return (
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
              const smsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(msg)}`;

              return (
                <div key={p.id} className="template-preview-card">
                  <div className="t-head">
                    <strong>{p.name} ({p.phone})</strong>
                    <span className="t-tag">{p.lifecycle || 'مريض'}</span>
                  </div>
                  <div className="t-body">
                    <p>{msg}</p>
                  </div>
                  <a href={smsUrl} className="btn-action-primary">
                    <Send size={15} />
                    <span>إرسال الحملة عبر SMS</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
