import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Layers, 
  CheckCircle2, 
  Palette, 
  ShieldCheck, 
  RotateCcw,
  SlidersHorizontal,
  Eye,
  Crosshair
} from 'lucide-react';
import { useTenant, applyTenantBranding } from '../context/TenantContext';

export const PALETTE_CATEGORIES = [
  'الأساس المعماري الفاخر',
  'الطب الباطني والعمليات الجراحية',
  'طب الأسنان والتأهيل الطبيعي',
  'العيون والمناظير والتقنيات الدقيقة',
  'الجلدية والتجميل والليزر',
  'المخ والأعصاب والطب النفسي',
  'طب الأطفال وصحة الأسرة',
  'جراحة العظام والمفاصل والعلاج الطبيعي',
  'الأورام والتحاليل المتقدمة',
  'العيادات الخاصة وكبار الشخصيات'
];

export const CURATED_CLINIC_PALETTES = [
  {
    id: 'monochrome',
    name: 'الأسود والزمردي النخبوي',
    englishName: 'Obsidian Noir & Emerald',
    primary: '#09090B',
    hex: '#09090B',
    accent: '#10B981',
    surface: '#FFFFFF',
    isDefault: true,
    group: 'الأساس النخبوي',
    category: 'الأساس المعماري الفاخر',
    badgeText: 'Obsidian Luxury',
    specialty: 'كافة التخصصات والمراكز الاستشارية',
    description: 'الأساس النخبوي الأكثر فخامة ورصانة — لون أساسي أسود أوبسيديان مع لمسات زمردية راقية.'
  },
  {
    id: 'royal-blue',
    name: 'الأزرق الملكي والسماوي الاستشاري',
    englishName: 'Royal Medical Blue & Sky',
    primary: '#1E3A8A',
    hex: '#1E3A8A',
    accent: '#0284C7',
    surface: '#FFFFFF',
    group: 'الطب الباطني والجراحة',
    category: 'الطب الباطني والعمليات الجراحية',
    badgeText: 'Royal Medical',
    specialty: 'الجراحة العامة، أمراض القلب، والباطنة',
    description: 'وقار طبي عريق مع أزرق ملكي داكن ولمسات سماوية مريحة للمريض.'
  },
  {
    id: 'clinical-emerald',
    name: 'الزمردي الحيوي والفيروزي الصحي',
    englishName: 'Emerald Health & Vitality',
    primary: '#064E3B',
    hex: '#064E3B',
    accent: '#10B981',
    surface: '#FFFFFF',
    group: 'طب الأسنان والتأهيل',
    category: 'طب الأسنان والتأهيل الطبيعي',
    badgeText: 'Health Emerald',
    specialty: 'طب وجراحة الأسنان، الطب الوقائي، والتغذية',
    description: 'رمز التعافي والراحة النفسية والحيوية لمراكز طب الأسنان والتعافي السريري.'
  },
  {
    id: 'precision-teal',
    name: 'التيلي السريري والنقاء التقني',
    englishName: 'Clinical Teal & Precision',
    primary: '#0F766E',
    hex: '#0F766E',
    accent: '#14B8A6',
    surface: '#FFFFFF',
    group: 'العيون والتقنيات الدقيقة',
    category: 'العيون والمناظير والتقنيات الدقيقة',
    badgeText: 'Precision Teal',
    specialty: 'طب وجراحة العيون، المسالك، والمناظير',
    description: 'يعكس الدقة الجراحية المتقدمة والنقاء البصري والتكنولوجيا الطبية الحديثة.'
  },
  {
    id: 'rose-radiance',
    name: 'الوردي الإشعاعي والجمال السريري',
    englishName: 'Rose Radiance & Aesthetics',
    primary: '#881337',
    hex: '#881337',
    accent: '#F43F5E',
    surface: '#FFFFFF',
    group: 'الجلدية والتجميل',
    category: 'الجلدية والتجميل والليزر',
    badgeText: 'Rose Radiance',
    specialty: 'الجلدية والتجميل، الليزر، والعناية بالبشرة',
    description: 'هوية مفعمة بالأناقة والنضارة المتميزة لمراكز التجميل وجراحة الجلد.'
  },
  {
    id: 'deep-amethyst',
    name: 'الأرجواني الهادئ والاتزان المعرفي',
    englishName: 'Deep Amethyst & Harmony',
    primary: '#581C87',
    hex: '#581C87',
    accent: '#A855F7',
    surface: '#FFFFFF',
    group: 'المخ والأعصاب والطب النفسي',
    category: 'المخ والأعصاب والطب النفسي',
    badgeText: 'Mind Harmony',
    specialty: 'المخ والأعصاب، الطب النفسي، والتأهيل الذهني',
    description: 'يعبر عن العمق المعرفي والسكينة النفسية والاتزان العصبي والاسترخاء.'
  },
  {
    id: 'amber-vitality',
    name: 'العنبري الحيوي والدفء العلاجي',
    englishName: 'Amber Vitality & Care',
    primary: '#78350F',
    hex: '#78350F',
    accent: '#F59E0B',
    surface: '#FFFFFF',
    group: 'طب الأطفال والأسرة',
    category: 'طب الأطفال وصحة الأسرة',
    badgeText: 'Amber Vitality',
    specialty: 'طب الأطفال، طب الأسرة، والطب العام',
    description: 'طاقة إيجابية ودفء عائلي يبعث الطمأنينة في نفوس الأطفال وذويهم.'
  },
  {
    id: 'warm-coral',
    name: 'المرجاني الدافئ والعظام الحركية',
    englishName: 'Warm Coral & Ortho',
    primary: '#9A3412',
    hex: '#9A3412',
    accent: '#FB923C',
    surface: '#FFFFFF',
    group: 'العظام والمفاصل',
    category: 'جراحة العظام والمفاصل والعلاج الطبيعي',
    badgeText: 'Warm Coral',
    specialty: 'جراحة العظام، الطب الرياضي، والعمود الفقري',
    description: 'يعبر عن الحيوية الحركية وقوة البناء العضلي وتجدد النشاط البدني.'
  },
  {
    id: 'slate-indigo',
    name: 'النيلي الأكاديمي والتحاليل الدقيقة',
    englishName: 'Slate Indigo & Lab',
    primary: '#312E81',
    hex: '#312E81',
    accent: '#6366F1',
    surface: '#FFFFFF',
    group: 'الأورام والمختبرات',
    category: 'الأورام والتحاليل المتقدمة',
    badgeText: 'Academic Lab',
    specialty: 'مراكز الأورام، المختبرات، والمجمعات الطبية التخصصية',
    description: 'يعكس الرصانة الأكاديمية والأبحاث العلمية المتقدمة والتشخيص الدقيق.'
  },
  {
    id: 'obsidian-gold',
    name: 'الأوبسيديان والذهبي الملكي VIP',
    englishName: 'Obsidian Gold & VIP',
    primary: '#18181B',
    hex: '#18181B',
    accent: '#D97706',
    surface: '#FFFFFF',
    group: 'العيادات الخاصة وكبار الشخصيات',
    category: 'العيادات الخاصة وكبار الشخصيات',
    badgeText: 'Luxury VIP',
    specialty: 'العيادات الخاصة VIP والمجمعات الطبية الفاخرة',
    description: 'طابع نخبوي استثنائي يعكس الفخامة الطبية الحصرية وأرقى مستويات الضيافة.'
  }
];

export function applyPaletteToDom(primaryColor, accentColor) {
  applyTenantBranding({
    primaryColor,
    accentColor: accentColor || '#10B981'
  });
}

export default function ClinicPalettePicker({ 
  value, 
  onChange,
  onSaveDirectly = true 
}) {
  const { tenant, updateTenantInfo } = useTenant();

  const currentPrimary = value || tenant?.branding?.primaryColor || '#09090B';
  const currentAccent = tenant?.branding?.accentColor || '#10B981';

  const [primaryColor, setPrimaryColor] = useState(currentPrimary);
  const [accentColor, setAccentColor] = useState(currentAccent);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (value) {
      setPrimaryColor(value);
    } else if (tenant?.branding?.primaryColor) {
      setPrimaryColor(tenant.branding.primaryColor);
    }
    if (tenant?.branding?.accentColor) {
      setAccentColor(tenant.branding.accentColor);
    }
  }, [value, tenant?.branding?.primaryColor, tenant?.branding?.accentColor]);

  const activePalette = useMemo(() => {
    return CURATED_CLINIC_PALETTES.find(
      p => p.primary.toLowerCase() === primaryColor.toLowerCase() && p.accent.toLowerCase() === accentColor.toLowerCase()
    ) || null;
  }, [primaryColor, accentColor]);

  const handleApplyPalette = (newPrimary, newAccent, paletteId = null) => {
    setPrimaryColor(newPrimary);
    setAccentColor(newAccent);

    // Immediate live preview across DOM
    applyTenantBranding({
      primaryColor: newPrimary,
      accentColor: newAccent
    });

    if (onChange) {
      onChange(newPrimary, { primary: newPrimary, accent: newAccent, id: paletteId });
    }

    if (onSaveDirectly && updateTenantInfo) {
      updateTenantInfo({
        branding: {
          ...(tenant?.branding || {}),
          primaryColor: newPrimary,
          accentColor: newAccent,
          paletteId: paletteId || 'custom'
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2800);
    }
  };

  return (
    <div 
      className="clinic-palette-picker" 
      dir="rtl"
      style={{
        backgroundColor: 'var(--bg-primary, #FFFFFF)',
        border: '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #09090B)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={19} />
            <span>نظام الألوان ثلاثي الدرجات (3-Degree Brand Palette)</span>
          </h4>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #71717A)' }}>
            تخصيص كامل لحرية الطبيب: الدرجة الأولى (الأساسي)، الدرجة الثانية (التمييز والتفاعل)، والدرجة الثالثة (الأسطح والخلفيات).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saveSuccess && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
              <CheckCircle2 size={14} />
              تم حفظ وتطبيق الهوية
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsCustomMode(!isCustomMode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: isCustomMode ? '#FFFFFF' : 'var(--text-primary)',
              backgroundColor: isCustomMode ? '#09090B' : 'var(--bg-secondary, #F4F4F5)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.4rem 0.75rem',
              cursor: 'pointer'
            }}
          >
            <SlidersHorizontal size={13} />
            <span>{isCustomMode ? 'إغلاق المحرر الحر' : 'تخصيص يدوي حر'}</span>
          </button>
        </div>
      </div>

      {/* Live 3-Degree Interactive Preview Card */}
      <div style={{
        background: 'var(--clinic-surface, #FFFFFF)',
        border: '1px solid var(--clinic-border-subtle, #E4E4E7)',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {/* Degree 1 Indicator */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: primaryColor, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.1)' }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>أساسي</span>
            </div>
            {/* Degree 2 Indicator */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: accentColor, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.1)' }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>تمييز</span>
            </div>
            {/* Degree 3 Indicator */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #CBD5E1' }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>السطح</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activePalette ? activePalette.name : 'هوية مخصصة بحرية الطبيب'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              الدرجة 1: <code>{primaryColor}</code> • الدرجة 2: <code>{accentColor}</code> • الدرجة 3: أسطح متناسقة
            </div>
          </div>
        </div>

        {/* Live UI Components Showcase */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            style={{
              background: primaryColor,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 0.95rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'default'
            }}
          >
            زر رئيسي
          </button>
          <span style={{
            background: `${accentColor}18`,
            color: accentColor,
            border: `1px solid ${accentColor}40`,
            borderRadius: '999px',
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            شارة تمييز
          </span>
        </div>
      </div>

      {/* Custom Color Pickers (When in Custom Mode) */}
      {isCustomMode && (
        <div style={{
          background: 'var(--bg-secondary, #FAFAFA)',
          border: '1px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              الدرجة 1: اللون الأساسي (Primary Hue)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handleApplyPalette(e.target.value, accentColor, 'custom')}
                style={{ width: '40px', height: '36px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => handleApplyPalette(e.target.value, accentColor, 'custom')}
                placeholder="#09090B"
                style={{ flex: 1, padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', fontFamily: 'monospace' }}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              الدرجة 2: لون التمييز والتفاعل (Accent Tone)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleApplyPalette(primaryColor, e.target.value, 'custom')}
                style={{ width: '40px', height: '36px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => handleApplyPalette(primaryColor, e.target.value, 'custom')}
                placeholder="#10B981"
                style={{ flex: 1, padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', fontFamily: 'monospace' }}
                dir="ltr"
              />
            </div>
          </div>
        </div>
      )}

      {/* 8 Curated 3-Degree Palettes Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '0.75rem' 
        }}
      >
        {CURATED_CLINIC_PALETTES.map((palette) => {
          const isSelected = activePalette?.id === palette.id;

          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => handleApplyPalette(palette.primary, palette.accent, palette.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.95rem 1.1rem',
                borderRadius: '12px',
                border: isSelected ? `2px solid ${palette.primary}` : '1px solid var(--border-color, #E4E4E7)',
                backgroundColor: isSelected ? 'var(--bg-secondary, #F4F4F5)' : 'var(--surface, #FFFFFF)',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? `0 4px 12px ${palette.primary}20` : 'none',
                minHeight: '130px'
              }}
            >
              {/* Card Top: Swatches + Badge + Check */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {/* Primary & Accent Swatches */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: palette.primary,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        zIndex: 2
                      }}
                    />
                    <div 
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: palette.accent,
                        marginLeft: '-6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        zIndex: 1
                      }}
                    />
                  </div>

                  <span 
                    style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      padding: '0.15rem 0.5rem', 
                      borderRadius: '4px',
                      backgroundColor: `${palette.accent}18`,
                      color: palette.primary === '#09090B' ? '#09090B' : palette.primary
                    }}
                  >
                    {palette.badgeText}
                  </span>
                </div>

                {isSelected && (
                  <Check size={16} strokeWidth={3} color={palette.primary} />
                )}
              </div>

              {/* Title & Specialty */}
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {palette.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.35 }}>
                  {palette.specialty}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
