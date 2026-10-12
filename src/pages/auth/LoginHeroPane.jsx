import React from 'react';
import { Stethoscope, Check, ShieldCheck } from 'lucide-react';

/**
 * LoginHeroPane - Left Column: Brand Hero & Value Proposition
 */
export default function LoginHeroPane() {
  return (
    <div className="login-hero-pane">
      <div className="hero-brand-top">
        <div className="brand-logo-badge">
          <Stethoscope size={28} className="brand-logo-icon" />
        </div>
        <div className="brand-titles">
          <span className="brand-name">Clinic<span>Flow</span></span>
          <span className="brand-tagline">السحابة الطبية لإدارة العيادات</span>
        </div>
      </div>

      <div className="hero-headline-block">
        <h2>المنظومة السحابية المعتمدة لإدارة عيادتك الطبية بكل احترافية</h2>
        <p>بيئة عمل سريرية وإدارية متكاملة تضمن أعلى درجات الخصوصية والكفاءة في متابعة المرضى والعمليات اليومية.</p>
      </div>

      <div className="hero-features-list">
        <div className="hero-feature-item">
          <div className="feature-check-icon">
            <Check size={16} strokeWidth={3} />
          </div>
          <div className="feature-text">
            <strong>بيانات وتشخيصات مشفرة</strong>
            <span>عزل تام ومستقل لبيانات كل عيادة بأعلى معايير الأمان.</span>
          </div>
        </div>

        <div className="hero-feature-item">
          <div className="feature-check-icon">
            <Check size={16} strokeWidth={3} />
          </div>
          <div className="feature-text">
            <strong>إدارة المواعيد وطوابير الانتظار</strong>
            <span>تنظيم سلس للكشوفات مع تذكيرات تلقائية عبر الرسائل القصيرة.</span>
          </div>
        </div>

        <div className="hero-feature-item">
          <div className="feature-check-icon">
            <Check size={16} strokeWidth={3} />
          </div>
          <div className="feature-text">
            <strong>فواتير إلكترونية وتقارير فورية</strong>
            <span>إصدار سندات القبض، متابعة الخزينة، وإحصائيات الإيرادات الدقيقة.</span>
          </div>
        </div>
      </div>

      <div className="hero-footer-trust">
        <ShieldCheck size={16} className="text-emerald" />
        <span>معتمد وموثوق لأكثر من 1,000 عيادة ومركز طبي متخصص</span>
      </div>
    </div>
  );
}
