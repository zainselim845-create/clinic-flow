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
    category: 'الطب الكلاسيكي والعمليات الجراحية',
    badgeText: 'Royal Medical',
    specialty: 'الجراحة العامة، الاستشارات التخصصية، العيون، والمستشفيات الخاصة',
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
    category: 'طب الأسنان، الجلدية، والتأهيل الصحي',
    badgeText: 'Health Emerald',
    specialty: 'طب وجراحة الأسنان، الجلدية والتجميل، العلاج الطبيعي والتغذية',
    description: 'رمز التعافي والراحة النفسية والحيوية، الخيار المفضل لعيادات ومراكز طب الأسنان والطب الوقائي والتجميلي.'
  }
];

export function applyPaletteToDom(hexColor) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isMonochrome = !hexColor || hexColor === '#000000' || hexColor === '#09090B' || hexColor === 'monochrome' || hexColor === '#18181B';

  if (isMonochrome) {
    root.style.removeProperty('--clinic-primary');
    root.style.removeProperty('--clinic-primary-hover');
    root.style.removeProperty('--clinic-primary-light');
    root.style.removeProperty('--clinic-primary-glow');
    root.style.removeProperty('--clinic-gradient-primary');
    root.style.removeProperty('--clinic-on-primary');
  } else {
    root.style.setProperty('--clinic-primary', hexColor);
    root.style.setProperty('--clinic-primary-hover', hexColor);
    root.style.setProperty('--clinic-primary-light', `${hexColor}18`);
    root.style.setProperty('--clinic-primary-glow', `${hexColor}33`);
    root.style.setProperty('--clinic-gradient-primary', `linear-gradient(135deg, ${hexColor} 0%, ${hexColor}E6 100%)`);
    root.style.setProperty('--clinic-on-primary', '#FFFFFF');
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
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #09090B)' }}>
            اللون والسمة السريرية
          </h4>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary, #71717A)' }}>
            الأساس المعماري يظل أبيض وأسود، مع تخصيص لون الإشارات والأزرار النشطة.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saveSuccess && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
              <CheckCircle2 size={13} />
              تم تطبيق اللون
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
              <span>استعادة الأساسي</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Curated Segmented Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        {CURATED_CLINIC_PALETTES.map((palette) => {
          const isSelected = activePalette.id === palette.id;
          const isMonochrome = palette.id === 'monochrome';

          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => handleSelect(palette)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: isSelected ? (isMonochrome ? '2px solid #09090B' : `2px solid ${palette.hex}`) : '1px solid #E4E4E7',
                backgroundColor: isSelected ? (isMonochrome ? '#09090B' : '#FFFFFF') : '#FAFAFA',
                color: isSelected && isMonochrome ? '#FFFFFF' : '#09090B',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {/* Color Swatch Disc */}
              <div style={{ flexShrink: 0 }}>
                {isMonochrome ? (
                  <div 
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      border: '1.5px solid currentColor',
                      overflow: 'hidden',
                      display: 'flex'
                    }}
                  >
                    <div style={{ width: '50%', height: '100%', backgroundColor: '#FFFFFF' }} />
                    <div style={{ width: '50%', height: '100%', backgroundColor: '#09090B' }} />
                  </div>
                ) : (
                  <div 
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: palette.hex,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.12)'
                    }}
                  />
                )}
              </div>

              {/* Title & Short Subtitle */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected && isMonochrome ? '#FFFFFF' : '#09090B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {palette.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: isSelected && isMonochrome ? 'rgba(255,255,255,0.7)' : '#71717A', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {palette.specialty.split('،')[0]}
                </div>
              </div>

              {/* Selection Checkmark */}
              {isSelected && (
                <div style={{ flexShrink: 0 }}>
                  <Check size={16} strokeWidth={3} color={isMonochrome ? '#FFFFFF' : palette.hex} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
