import React from 'react';
import { Palette } from 'lucide-react';

export const COLOR_PALETTES = [
  {
    id: 'monochrome',
    name: 'الأبيض والأسود المعماري النقي',
    tag: 'الأساس المعماري الافتراضي لكافة التخصصات',
    primary: '#09090B',
    accent: '#18181B'
  },
  {
    id: 'royal-blue',
    name: 'الأزرق السريري الملكي',
    tag: 'للجراحة العامة والاستشارات وأمراض القلب',
    primary: '#007AFF',
    accent: '#0A84FF'
  },
  {
    id: 'clinical-emerald',
    name: 'الزمردي الصحي والتعافي الحيوي',
    tag: 'لطب الأسنان والطب الوقائي والحيوي',
    primary: '#10B981',
    accent: '#34D399'
  },
  {
    id: 'precision-teal',
    name: 'الفيروزي الجراحي والتقنيات الدقيقة',
    tag: 'للعيون، المسالك، المناظير ومراكز الأشعة',
    primary: '#0D9488',
    accent: '#2DD4BF'
  },
  {
    id: 'rose-radiance',
    name: 'الوردي التجميلي والنضارة الراقية',
    tag: 'للجلدية والليزر والعناية بالبشرة والتجميل',
    primary: '#E11D48',
    accent: '#FB7185'
  },
  {
    id: 'deep-amethyst',
    name: 'البنفسجي العصبي والاتزان النفسي',
    tag: 'للمخ والأعصاب والطب النفسي والاسترخاء',
    primary: '#7C3AED',
    accent: '#A78BFA'
  },
  {
    id: 'amber-vitality',
    name: 'العنبر الحركي والعظام والتأهيل',
    tag: 'للعظام، العلاج الطبيعي، وإصابات الملاعب',
    primary: '#D97706',
    accent: '#FBBF24'
  },
  {
    id: 'warm-coral',
    name: 'المرجاني الدافئ ورعاية الأطفال',
    tag: 'لطب الأطفال وحديثي الولادة ورعاية الأمومة',
    primary: '#EA580C',
    accent: '#FB923C'
  },
  {
    id: 'slate-indigo',
    name: 'النيلي الأكاديمي والجينات والأبحاث',
    tag: 'لمراكز الأورام، الجينات، والتحاليل المتقدمة',
    primary: '#4F46E5',
    accent: '#818CF8'
  },
  {
    id: 'obsidian-gold',
    name: 'الذهبي الفاخر والاستشارات العليا VIP',
    tag: 'للعيادات والمجمعات الطبية الفاخرة VIP',
    primary: '#B45309',
    accent: '#F59E0B'
  }
];

export default function OnboardingStepBranding({
  palettes = COLOR_PALETTES,
  selectedPaletteId,
  handleSelectPalette,
  primaryColor,
  setPrimaryColor,
  accentColor,
  setAccentColor,
  setSelectedPaletteId,
  clinicName,
  doctorName,
  selectedSpecialtyObj,
  address
}) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>
          <Palette size={28} color="var(--primary)" />
          <span>الهوية البصرية وألوان نظام العيادة</span>
        </h2>
        <p>
          اختر لوحة الألوان التي تعكس شخصية عيادتك، وشاهد فوراً كيف ستظهر واجهة الحجز الإلكتروني وبطاقات النظام لمرضاك.
        </p>
      </div>

      {/* Preset Palettes */}
      <div className="palettes-grid">
        {palettes.map((pal) => {
          const isSelected = selectedPaletteId === pal.id;
          return (
            <div
              key={pal.id}
              className={`palette-card-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectPalette(pal)}
            >
              <div className="palette-info">
                <h4>{pal.name}</h4>
                <span>{pal.tag}</span>
              </div>
              <div className="palette-swatches">
                <span className="swatch-circle" style={{ background: pal.primary }} title="اللون الأساسي" />
                <span className="swatch-circle" style={{ background: pal.accent }} title="اللون الثانوي" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Color Pickers */}
      <div className="custom-colors-row">
        <div className="color-picker-item">
          <input
            type="color"
            className="native-color-picker"
            value={primaryColor}
            onChange={(e) => {
              setPrimaryColor(e.target.value);
              setSelectedPaletteId('custom');
            }}
          />
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>اللون الأساسي (Primary)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{primaryColor}</span>
          </div>
        </div>

        <div className="color-picker-item">
          <input
            type="color"
            className="native-color-picker"
            value={accentColor}
            onChange={(e) => {
              setAccentColor(e.target.value);
              setSelectedPaletteId('custom');
            }}
          />
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>اللون الثانوي (Accent)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{accentColor}</span>
          </div>
        </div>
      </div>

      {/* Real-time Dynamic Preview Card */}
      <div className="live-preview-card-wrap">
        <div className="live-preview-bar">
          <span>معاينة حية فورية لصفحة العيادة والحجز</span>
          <span style={{ color: primaryColor, fontWeight: 800 }}>ClinicFlow Live Theme</span>
        </div>

        <div className="live-preview-body">
          <div className="preview-clinic-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{clinicName || 'عيادة النخبة التخصصية'}</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                بإشراف: {doctorName || 'طبيب العيادة'} • {selectedSpecialtyObj?.name}
              </span>
            </div>
            <span className="preview-brand-badge" style={{ background: accentColor }}>
              متاح للحجز اليوم
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {address || 'القاهرة - مصر الجديدة'} • مواعيد العمل: 02:00 م - 10:00 م
          </p>

          <div className="preview-actions-row">
            <button 
              type="button" 
              className="preview-cta-btn" 
              style={{ background: primaryColor }}
            >
              احجز كشف طبي الآن
            </button>
            <span style={{ fontSize: '0.8rem', color: primaryColor, fontWeight: 700 }}>
              تأكيد فوري عبر SMS وواتساب
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
