import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Palette, 
  ShieldCheck, 
  Eye, 
  RotateCcw,
  Stethoscope,
  Calendar,
  UserCheck
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export const CURATED_CLINIC_PALETTES = [
  {
    id: 'monochrome',
    name: 'الأبيض والأسود المعماري النقي',
    englishName: 'Architectural Monochrome Noir',
    hex: '#09090B',
    lightHex: '#09090B',
    darkHex: '#FFFFFF',
    isDefault: true,
    group: 'vip',
    category: 'الأساس المعماري الفاخر للمنظومة',
    badgeText: 'الأساسي النخبوي (Default Noir)',
    specialty: 'كافة التخصصات، المراكز الاستشارية، وعشاق الهدوء المعماري النقي',
    description: 'الهوية الأساسية الفاخرة لـ ClinicFlow — تباين عالٍ وأناقة معمارية مطلقة باللونين الأبيض والأسود النقي (Minimalist Monochrome).'
  },
  {
    id: 'royal-blue',
    name: 'الأزرق السريري الملكي',
    englishName: 'Royal Medical Blue',
    hex: '#007AFF',
    lightHex: '#007AFF',
    darkHex: '#0A84FF',
    isDefault: false,
    group: 'surgery',
    category: 'الطب الباطني والعمليات الجراحية',
    badgeText: 'Royal Medical',
    specialty: 'الجراحة العامة، أمراض القلب، الباطنة، والاستشارات التخصصية',
    description: 'لون طبي استشاري عريق، يمنح أعلى درجات المصداقية والوقار والثقة الطبية المتبادلة بين المريض والطبيب.'
  },
  {
    id: 'clinical-emerald',
    name: 'الزمردي الصحي والتعافي الحيوي',
    englishName: 'Clinical Emerald & Wellness',
    hex: '#10B981',
    lightHex: '#10B981',
    darkHex: '#34D399',
    isDefault: false,
    group: 'dental',
    category: 'طب الأسنان، الطب الوقائي، والتعافي',
    badgeText: 'Health Emerald',
    specialty: 'طب وجراحة الأسنان، الطب الوقائي، التغذية السريرية، والتعافي الطبيعي',
    description: 'رمز التعافي والراحة النفسية والحيوية، الخيار المفضل لعيادات ومراكز طب الأسنان والطب الوقائي والحيوي.'
  },
  {
    id: 'precision-teal',
    name: 'الفيروزي الجراحي والتقنيات الدقيقة',
    englishName: 'Precision Surgical Teal',
    hex: '#0D9488',
    lightHex: '#0D9488',
    darkHex: '#2DD4BF',
    isDefault: false,
    group: 'surgery',
    category: 'العيون، المسالك، والمناظير الدقيقة',
    badgeText: 'Precision Teal',
    specialty: 'طب وجراحة العيون، جراحة المسالك البولية، المناظير، ومراكز الأشعة والتحاليل',
    description: 'يعكس الدقة الجراحية المتقدمة والنقاء البصري والتكنولوجيا الطبية الحديثة.'
  },
  {
    id: 'rose-radiance',
    name: 'الوردي التجميلي والنضارة الراقية',
    englishName: 'Rose Radiance & Aesthetics',
    hex: '#E11D48',
    lightHex: '#E11D48',
    darkHex: '#FB7185',
    isDefault: false,
    group: 'aesthetics',
    category: 'الجلدية، الليزر، والطب التجميلي',
    badgeText: 'Rose Aesthetics',
    specialty: 'الجلدية والتجميل، الليزر، العناية بالبشرة، وجراحة التجميل والنساء والتوليد',
    description: 'هوية راقية مفعمة بالأناقة والنضارة والجمال والاهتمام بأدق تفاصيل المظهر السريري والتجميلي.'
  },
  {
    id: 'deep-amethyst',
    name: 'البنفسجي العصبي والاتزان النفسي',
    englishName: 'Deep Amethyst & Neurology',
    hex: '#7C3AED',
    lightHex: '#7C3AED',
    darkHex: '#A78BFA',
    isDefault: false,
    group: 'neuro',
    category: 'المخ والأعصاب، والطب النفسي',
    badgeText: 'Mind & Neuro',
    specialty: 'المخ والأعصاب، الطب النفسي، علاج الإدمان، والتأهيل المعرفي والذهني',
    description: 'يعبر عن العمق المعرفي والسكينة النفسية والاتزان العصبي والاسترخاء التأملي للمرضى.'
  },
  {
    id: 'amber-vitality',
    name: 'العنبر الحركي والعظام والتأهيل',
    englishName: 'Amber Vitality & Orthopedics',
    hex: '#D97706',
    lightHex: '#D97706',
    darkHex: '#FBBF24',
    isDefault: false,
    group: 'ortho',
    category: 'العظام، العلاج الطبيعي، والطب الرياضي',
    badgeText: 'Motion Vitality',
    specialty: 'جراحة العظام والكسور، العلاج الطبيعي، التأهيل الحركي، وإصابات الملاعب',
    description: 'يرمز للطاقة والحركة والحيوية البدنية والتغلب على الألم والعودة للنشاط الكامل.'
  },
  {
    id: 'warm-coral',
    name: 'المرجاني الدافئ ورعاية الأطفال',
    englishName: 'Warm Coral & Pediatrics',
    hex: '#EA580C',
    lightHex: '#EA580C',
    darkHex: '#FB923C',
    isDefault: false,
    group: 'pediatric',
    category: 'طب الأطفال، حديثي الولادة، والأمومة',
    badgeText: 'Care Pediatrics',
    specialty: 'طب الأطفال، حديثي الولادة، التطعيمات، وصحة الأسرة ورعاية الأمومة',
    description: 'يمنح شعوراً بالدفء الإنساني والألفة والاطمئنان للأمهات والأطفال الصغار داخل العيادة.'
  },
  {
    id: 'slate-indigo',
    name: 'النيلي الأكاديمي والجينات والأبحاث',
    englishName: 'Slate Indigo & Genomics',
    hex: '#4F46E5',
    lightHex: '#4F46E5',
    darkHex: '#818CF8',
    isDefault: false,
    group: 'academic',
    category: 'الأورام، الجينات، والمختبرات المتقدمة',
    badgeText: 'Academic Genomics',
    specialty: 'مراكز الأورام، أبحاث الجينات، التحاليل الطبية الدقيقة، والمجمعات الأكاديمية',
    description: 'يعكس الرصانة الأكاديمية والأبحاث العلمية المتقدمة والتشخيص المخبري الدقيق.'
  },
  {
    id: 'obsidian-gold',
    name: 'الذهبي الفاخر والاستشارات العليا VIP',
    englishName: 'Obsidian Luxury Gold & VIP',
    hex: '#B45309',
    lightHex: '#B45309',
    darkHex: '#F59E0B',
    isDefault: false,
    group: 'vip',
    category: 'المراكز الطبية الفاخرة وعيادات كبار الشخصيات',
    badgeText: 'Luxury VIP Gold',
    specialty: 'العيادات الخاصة VIP، الاستشارات الطبية العليا، والمجمعات الطبية الفاخرة',
    description: 'طابع ملكي متميز يعكس الفخامة الطبية الحصرية وأرقى مستويات الضيافة السريرية.'
  }
];

export const PALETTE_CATEGORIES = [
  { id: 'all', label: 'جميع الهويات (10)' },
  { id: 'vip', label: 'الأساس وVIP' },
  { id: 'surgery', label: 'جراحة واستشارات' },
  { id: 'dental', label: 'أسنان وتأهيل' },
  { id: 'aesthetics', label: 'تجميل وليزر' },
  { id: 'neuro', label: 'أعصاب ونفسي' },
  { id: 'ortho', label: 'عظام وحركة' },
  { id: 'pediatric', label: 'أطفال وأمومة' },
  { id: 'academic', label: 'أبحاث وجينات' }
];

export function applyPaletteToDom(hexColor) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isMonochrome = !hexColor || hexColor === '#000000' || hexColor === '#09090B' || hexColor === 'monochrome' || hexColor === '#18181B';

  if (isMonochrome) {
    root.style.setProperty('--clinic-primary', '#09090B');
    root.style.setProperty('--clinic-primary-hover', '#27272A');
    root.style.setProperty('--clinic-primary-light', '#F4F4F5');
    root.style.setProperty('--clinic-primary-glow', 'rgba(9, 9, 11, 0.08)');
    root.style.setProperty('--clinic-gradient-primary', '#09090B');
    root.style.setProperty('--clinic-on-primary', '#FFFFFF');
    root.style.setProperty('--primary', '#09090B');
    root.style.setProperty('--primary-hover', '#27272A');
    root.style.setProperty('--primary-light', '#F4F4F5');
    root.style.setProperty('--primary-glow', 'rgba(9, 9, 11, 0.08)');
    root.style.setProperty('--md-sys-color-primary', '#09090B');
    root.style.setProperty('--md-sys-color-on-primary', '#FFFFFF');
  } else {
    root.style.setProperty('--clinic-primary', hexColor);
    root.style.setProperty('--clinic-primary-hover', hexColor);
    root.style.setProperty('--clinic-primary-light', `${hexColor}18`);
    root.style.setProperty('--clinic-primary-glow', `${hexColor}33`);
    root.style.setProperty('--clinic-gradient-primary', `linear-gradient(135deg, ${hexColor} 0%, ${hexColor}E6 100%)`);
    root.style.setProperty('--clinic-on-primary', '#FFFFFF');
    root.style.setProperty('--primary', hexColor);
    root.style.setProperty('--primary-hover', hexColor);
    root.style.setProperty('--primary-light', `${hexColor}18`);
    root.style.setProperty('--primary-glow', `${hexColor}33`);
    root.style.setProperty('--md-sys-color-primary', hexColor);
    root.style.setProperty('--md-sys-color-on-primary', '#FFFFFF');
  }
}

export default function ClinicPalettePicker({ 
  value, 
  onChange,
  onSaveDirectly = true 
}) {
  const { tenant, updateTenantInfo } = useTenant();

  // Active color initialization
  const initialColor = value || tenant?.branding?.primaryColor || 'monochrome';
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (value) {
      setSelectedColor(value);
    } else if (tenant?.branding?.primaryColor) {
      setSelectedColor(tenant.branding.primaryColor);
    }
  }, [value, tenant?.branding?.primaryColor]);

  const activePalette = useMemo(() => {
    const match = CURATED_CLINIC_PALETTES.find(
      p => p.id === selectedColor || p.hex.toLowerCase() === selectedColor.toLowerCase()
    );
    return match || CURATED_CLINIC_PALETTES[0]; // fallback to Monochrome
  }, [selectedColor]);

  const filteredPalettes = useMemo(() => {
    if (selectedCategory === 'all') return CURATED_CLINIC_PALETTES;
    return CURATED_CLINIC_PALETTES.filter(p => p.group === selectedCategory);
  }, [selectedCategory]);

  const handleSelect = (palette) => {
    const newColor = palette.id === 'monochrome' ? '#09090B' : palette.hex;
    setSelectedColor(newColor);
    
    // Immediate Live DOM preview
    applyPaletteToDom(newColor);

    if (onChange) {
      onChange(newColor, palette);
    }

    if (onSaveDirectly && updateTenantInfo) {
      updateTenantInfo({
        branding: {
          ...(tenant?.branding || {}),
          primaryColor: newColor,
          paletteId: palette.id
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2800);
    }
  };

  const handleResetToMonochrome = () => {
    handleSelect(CURATED_CLINIC_PALETTES[0]);
  };

  return (
    <div 
      className="clinic-palette-picker" 
      dir="rtl"
      style={{
        backgroundColor: 'var(--bg-primary, #FFFFFF)',
        border: '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #09090B)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={18} />
            <span>الهوية اللونية والسمات السريرية (10 ثيمات متخصصة)</span>
          </h4>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary, #71717A)' }}>
            اختر الثيم الذي يناسب تخصص وهوية عيادتك. الأساس المعماري يظل أبيض وأسود نقي، مع إبراز لون الهوية في الإشارات والأزرار النشطة.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saveSuccess && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
              <CheckCircle2 size={13} />
              تم تطبيق الهوية
            </span>
          )}

          {activePalette.id !== 'monochrome' && (
            <button
              type="button"
              onClick={handleResetToMonochrome}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#71717A',
                backgroundColor: 'transparent',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '0.25rem 0.6rem',
                cursor: 'pointer'
              }}
              title="الرجوع للأبيض والأسود النقي"
            >
              <RotateCcw size={12} />
              <span>استعادة الأساسي (Noir)</span>
            </button>
          )}
        </div>
      </div>

      {/* Specialty Category Filter Tabs */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.4rem', 
          overflowX: 'auto', 
          paddingBottom: '0.65rem', 
          marginBottom: '0.85rem',
          scrollbarWidth: 'none'
        }}
      >
        {PALETTE_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                backgroundColor: isActive ? 'var(--clinic-primary, #09090B)' : '#F4F4F5',
                color: isActive ? '#FFFFFF' : '#71717A',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 10 Curated Identity Cards Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))', 
          gap: '0.75rem' 
        }}
      >
        {filteredPalettes.map((palette) => {
          const isSelected = activePalette.id === palette.id;
          const isMonochrome = palette.id === 'monochrome';

          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => handleSelect(palette)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.65rem',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: isSelected ? (isMonochrome ? '2px solid #09090B' : `2px solid ${palette.hex}`) : '1px solid #E4E4E7',
                backgroundColor: isSelected ? (isMonochrome ? '#09090B' : '#FFFFFF') : '#FAFAFA',
                color: isSelected && isMonochrome ? '#FFFFFF' : '#09090B',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? (isMonochrome ? '0 4px 12px rgba(0,0,0,0.1)' : `0 4px 12px ${palette.hex}25`) : 'none',
                minHeight: '120px'
              }}
            >
              {/* Card Top: Swatch + Badge + Check */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Color Swatch Disc */}
                  {isMonochrome ? (
                    <div 
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '1.5px solid currentColor',
                        overflow: 'hidden',
                        display: 'flex',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ width: '50%', height: '100%', backgroundColor: '#FFFFFF' }} />
                      <div style={{ width: '50%', height: '100%', backgroundColor: '#09090B' }} />
                    </div>
                  ) : (
                    <div 
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: palette.hex,
                        boxShadow: `0 2px 5px ${palette.hex}40`,
                        flexShrink: 0
                      }}
                    />
                  )}

                  <span 
                    style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 700, 
                      padding: '0.15rem 0.45rem', 
                      borderRadius: '4px',
                      backgroundColor: isSelected && isMonochrome ? 'rgba(255,255,255,0.15)' : `${palette.hex}14`,
                      color: isSelected && isMonochrome ? '#FFFFFF' : palette.hex
                    }}
                  >
                    {palette.badgeText}
                  </span>
                </div>

                {/* Selection Checkmark */}
                {isSelected ? (
                  <div style={{ flexShrink: 0 }}>
                    <Check size={16} strokeWidth={3} color={isMonochrome ? '#FFFFFF' : palette.hex} />
                  </div>
                ) : (
                  <div style={{ width: '16px' }} />
                )}
              </div>

              {/* Title & Identity Specialty */}
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: isSelected && isMonochrome ? '#FFFFFF' : '#09090B', lineHeight: 1.3 }}>
                  {palette.name}
                </div>
                <div style={{ fontSize: '0.69rem', color: isSelected && isMonochrome ? 'rgba(255,255,255,0.7)' : '#71717A', marginTop: '3px', lineHeight: 1.35 }}>
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
