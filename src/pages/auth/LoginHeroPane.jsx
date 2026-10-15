import React from 'react';
import { 
  Stethoscope, Check, ShieldCheck, Star, 
  Sparkles, Activity, Users, Award 
} from 'lucide-react';

/**
 * LoginHeroPane - Left Column: Medical SaaS Brand Hero, Social Proof & Value Proposition
 */
export default function LoginHeroPane() {
  return (
    <div className="login-hero-pane">
      {/* Background ambient lighting */}
      <div className="hero-ambient-glow top" />
      <div className="hero-ambient-glow bottom" />

      {/* Top Brand Block */}
      <div className="hero-brand-top">
        <div className="brand-logo-badge">
          <Stethoscope size={26} className="brand-logo-icon" />
          <span className="brand-pulse-dot" />
        </div>
        <div className="brand-titles">
          <div className="brand-name-row">
            <span className="brand-name">Clinic<span>Flow</span></span>
            <span className="brand-pill-badge">Medical Cloud</span>
          </div>
          <span className="brand-tagline">المنظومة السحابية لإدارة العيادات والمراكز الطبية</span>
        </div>
      </div>

      {/* Headline & Value Proposition */}
      <div className="hero-headline-block">
        <div className="hero-eyebrow">
          <Sparkles size={14} className="text-emerald" />
          <span>الجيل الجديد من الرعاية الصحية الرقمية</span>
        </div>
        <h2>إدارة عيادتك بكل احترافية، تنظيم، وأمان بيانات فائق الدقة</h2>
        <p>
          بيئة عمل سريرية وإدارية ذكية تمنحك التحكم الكامل في المواعيد، ملفات المرضى، الفواتير، والتقارير الطبية دون تعقيد أو هدر للوقت.
        </p>
      </div>

      {/* Key Feature Highlights */}
      <div className="hero-features-list">
        <div className="hero-feature-item">
          <div className="feature-check-icon">
            <Check size={14} strokeWidth={3} />
          </div>
          <div className="feature-text">
            <strong>عزل وأمان تام للسجلات الطبية</strong>
            <span>تشفير سريري قياسي مع حماية خصوصية المرضى والملفات الصحية.</span>
          </div>
        </div>

        <div className="hero-feature-item">
          <div className="feature-check-icon">
            <Check size={14} strokeWidth={3} />
          </div>
          <div className="feature-text">
            <strong>تنظيم المواعيد وتقليل وقت الانتظار</strong>
            <span>جدولة فورية وحجز إلكتروني مع تنبيهات واتساب ورسائل نصية.</span>
          </div>
        </div>

        <div className="hero-feature-item">
          <div className="feature-check-icon">
            <Check size={14} strokeWidth={3} />
          </div>
          <div className="feature-text">
            <strong>فواتير إلكترونية ومتابعة الخزينة والمخزون</strong>
            <span>إصدار سندات قبض وتقارير دخل دورية متوافقة محاسبياً بضغطة زر.</span>
          </div>
        </div>
      </div>

      {/* Floating Doctor Testimonial Card */}
      <div className="hero-testimonial-card glass-panel">
        <div className="testimonial-header">
          <div className="testimonial-stars">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} className="star-filled" fill="#F59E0B" color="#F59E0B" />
            ))}
            <span className="rating-score">5.0</span>
          </div>
          <span className="verified-badge">
            <Award size={12} />
            طبيب معتمد
          </span>
        </div>
        <p className="testimonial-quote">
          "منظومة ClinicFlow وفّرت علينا أكثر من ساعتين يومياً في تنظيم كشوفات العيادة وملفات المرضى.. نقلة نوعية في كفاءة العمل."
        </p>
        <div className="testimonial-author">
          <div className="author-avatar">د.م</div>
          <div className="author-details">
            <span className="author-name">د. محمد الباز</span>
            <span className="author-role">استشاري جراحة وتجميل الأسنان • القاهرة</span>
          </div>
        </div>
      </div>

      {/* Bottom Live Metrics & Trust Bar */}
      <div className="hero-footer-bar">
        <div className="hero-metric-pill">
          <Users size={13} className="text-emerald" />
          <span>١,٢٤٠+ عيادة</span>
        </div>
        <div className="hero-metric-pill">
          <Activity size={13} className="text-emerald" />
          <span>٩٩.٩٪ جاهزية</span>
        </div>
        <div className="hero-metric-pill">
          <ShieldCheck size={13} className="text-emerald" />
          <span>سحابة موثقة</span>
        </div>
      </div>
    </div>
  );
}
