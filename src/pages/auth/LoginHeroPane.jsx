import React from 'react';
import { Stethoscope, Check, Shield } from 'lucide-react';

/**
 * LoginHeroPane - Minimalist Left Column: Refined Typography & Medical Trust
 */
export default function LoginHeroPane() {
  return (
    <div className="login-hero-pane">
      {/* Brand Header */}
      <div className="hero-brand-top">
        <div className="brand-logo-badge">
          <Stethoscope size={22} className="brand-logo-icon" />
        </div>
        <div className="brand-titles">
          <span className="brand-name">Smart<span>Clinic</span></span>
          <span className="brand-tagline">اسمارت كلينك • السحابة الطبية</span>
        </div>
      </div>

      {/* Center Typographic Statement */}
      <div className="hero-headline-block">
        <h2>المنظومة السحابية لإدارة العيادات بكل هدوء واحترافية</h2>
        <p>
          واجهة عمل سريرية بسيطة وسريعة، تجمع بين سهولة الاستخدام وأعلى معايير الأمان والخصوصية للسجلات الطبية.
        </p>

        <div className="hero-features-list">
          <div className="hero-feature-item">
            <div className="feature-check-icon">
              <Check size={14} />
            </div>
            <span>عزل وتشفير تام للسجلات والملفات الصحية</span>
          </div>

          <div className="hero-feature-item">
            <div className="feature-check-icon">
              <Check size={14} />
            </div>
            <span>إدارة المواعيد والكشوفات بدقة وسلاسة</span>
          </div>

          <div className="hero-feature-item">
            <div className="feature-check-icon">
              <Check size={14} />
            </div>
            <span>فواتير إلكترونية ومتابعة فورية للحسابات</span>
          </div>
        </div>
      </div>

      {/* Minimal Footer Note */}
      <div className="hero-footer-trust">
        <Shield size={14} />
        <span>بيانات مشفرة ومتوافقة مع المعايير السريرية</span>
      </div>
    </div>
  );
}
