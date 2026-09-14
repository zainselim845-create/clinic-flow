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
    name: 'الأبيض والأسود الأساسي',
    englishName: 'Architectural Monochrome',
    hex: '#09090B',
    lightHex: '#09090B',
    darkHex: '#FFFFFF',
    isDefault: true,
    category: 'الأساس المعماري المعتمد للمنظومة',
    badgeText: 'الأساسي الفاخر (Default Noir)',
    specialty: 'كافة التخصصات الطبية والمراكز الاستشارية',
    description: 'الهوية الأساسية الفاخرة لـ ClinicFlow — تباين عالٍ وأناقة معمارية مطلقة باللونين الأبيض والأسود النقي (Linear & Apple Aesthetic).'
  },
  {
    id: 'royal-blue',
    name: 'أزرق سريري ملكي',
    englishName: 'Royal Medical Blue',
    hex: '#007AFF',
    category: 'الاستشارات والجراحة',
    badgeText: 'Royal Blue',
    specialty: 'الجراحة العامة، العيون، والمراكز التخصصية',
    description: 'لون نظام آبل السريري المعتمد، يمنح شعوراً بالثقة التامة والمصداقية الطبية الرفيعة.'
  },
  {
    id: 'clinical-emerald',
    name: 'زمردي طبي هادئ',
    englishName: 'Clinical Emerald',
    hex: '#10B981',
    category: 'طب الأسنان والمراكز الصحية',
    badgeText: 'Health Emerald',
    specialty: 'طب وجراحة الفم والأسنان، الطب الوقائي',
    description: 'رمز الصحة والتعافي والحيوية، الخيار الأول لعيادات ومراكز طب الأسنان المتطورة.'
  },
  {
    id: 'electric-indigo',
    name: 'نيلي رقمي معاصر',
    englishName: 'Electric Indigo',
    hex: '#6366F1',
    category: 'العيادات الذكية والتقنية',
    badgeText: 'Digital Indigo',
    specialty: 'الأشعة التخصصية، عيادات الذكاء الاصطناعي',
    description: 'طابع مستقبلي متطور يعكس أعلى درجات الدقة والتحول الرقمي في الرعاية الصحية.'
  },
  {
    id: 'warm-amber',
    name: 'عنبر دافئ واستشاري',
    englishName: 'Warm Amber',
    hex: '#F59E0B',
    category: 'طب الأطفال والعلاج الطبيعي',
    badgeText: 'Warm Amber',
    specialty: 'طب الأطفال، العلاج الطبيعي، التأهيل الحركي',
    description: 'لون دافئ ومطمئن يبعث على الراحة والألفة لدى المرضى والأطفال وأسرهم.'
  },
  {
    id: 'crimson-rose',
    name: 'ياقوتي عنابي ملكي',
    englishName: 'Crimson Rose',
    hex: '#E11D48',
    category: 'الجلدية والتجميل والليزر',
    badgeText: 'Aesthetic Rose',
    specialty: 'الجلدية، التجميل غير الجراحي، مراكز الليزر',
    description: 'أناقة ناعمة وراقية تناسب مراكز التجميل والجلدية والعناية الفائقة بأعلى مقاييس الفخامة.'
  },
  {
    id: 'ocean-cyan',
    name: 'فيروزي بحري متجدد',
    englishName: 'Ocean Cyan',
    hex: '#06B6D4',
    category: 'الصحة النفسية والباطنة',
    badgeText: 'Ocean Cyan',
    specialty: 'الطب النفسي، الباطنة العامة، التغذية العلاجية',
    description: 'انتعاش وهدوء نفسي عميق يعزز صفاء الذهن والاسترخاء خلال الجلسات العلاجية.'
  },
  {
    id: 'regal-violet',
    name: 'بنفسجي ملكي نخبوي',
    englishName: 'Regal Violet',
    hex: '#8B5CF6',
    category: 'المجمعات الطبية الكبرى',
    badgeText: 'Regal Violet',
    specialty: 'المستشفيات الخاصة، المجمعات الطبية متعددة التخصصات',
    description: 'طابع نخبوي رفيع للمجمعات الطبية الكبرى التي تنشد التميز والفرادة البصرية.'
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
    <div className="clinic-palette-picker space-y-6" dir="rtl">
      
      {/* 1. Header Banner & Architecture Statement */}
      <div className="p-5 rounded-[18px] bg-white dark:bg-[#18181B] border border-black/[0.08] dark:border-white/[0.1] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-[42px] h-[42px] rounded-[12px] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 shadow-sm">
              <Palette size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-[17px] font-bold text-black dark:text-white leading-tight">
                  هوية العيادة وبالتة الألوان المعتمدة (Clinic Brand & Palette)
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/[0.06] dark:bg-white/[0.1] text-black dark:text-white">
                  الأساس: أبيض وأسود مع التخصيص
                </span>
              </div>
              <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA] mt-1 leading-relaxed">
                الأساس المعماري لـ ClinicFlow مبني بنقاء مطلق على <strong className="text-black dark:text-white">الأبيض والأسود</strong>. 
                أمامك أدناه بالتة ألوان سريرية مختارة بعناية لتخصيص هوية عيادتك، مع بقاء الأساس أبيض وأسود.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetToMonochrome}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold bg-black/[0.05] dark:bg-white/[0.08] text-black dark:text-white hover:bg-black/[0.1] dark:hover:bg-white/[0.15] transition-all shrink-0 cursor-pointer"
            title="الرجوع إلى النمط الأساسي المعتمد باللونين الأبيض والأسود"
          >
            <RotateCcw size={14} />
            <span>استعادة الأساسي (أبيض وأسود)</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-[12px] bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[13px] font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={16} />
            <span>تم تفعيل وحفظ هوية العيادة بنجاح! كافة الأزرار والعناصر تعكس اللون المختار فورياً.</span>
          </div>
        )}
      </div>

      {/* 2. Featured Monochrome Core Card */}
      <div 
        onClick={() => handleSelect(CURATED_CLINIC_PALETTES[0])}
        className={`
          p-4 sm:p-5 rounded-[16px] cursor-pointer transition-all duration-200 border-2
          ${activePalette.id === 'monochrome'
            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
            : 'bg-white dark:bg-[#18181B] text-black dark:text-white border-black/[0.08] dark:border-white/[0.1] hover:border-black/30 dark:hover:border-white/30'
          }
        `}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Visual Swatch disc for Monochrome */}
            <div className="relative w-[36px] h-[36px] rounded-full overflow-hidden border-2 border-current flex shadow-inner shrink-0">
              <div className="w-1/2 h-full bg-white" />
              <div className="w-1/2 h-full bg-black" />
              {activePalette.id === 'monochrome' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 dark:bg-white/20">
                  <Check size={16} strokeWidth={3} className="text-white dark:text-black" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold leading-tight">
                  النمط المعماري الأساسي: الأبيض والأسود النقي (Default Noir)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activePalette.id === 'monochrome' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>
                  الأساس المعتمد
                </span>
              </div>
              <p className={`text-[12px] mt-0.5 leading-snug ${activePalette.id === 'monochrome' ? 'text-white/80 dark:text-black/80' : 'text-[#71717A] dark:text-[#A1A1AA]'}`}>
                {CURATED_CLINIC_PALETTES[0].description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {activePalette.id === 'monochrome' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-white text-black dark:bg-black dark:text-white shadow-sm">
                <Check size={14} strokeWidth={2.5} />
                <span>مفعّل حالياً</span>
              </span>
            ) : (
              <span className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                انقر للتفعيل
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. The Curated Palette Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[13px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider">
            بلتة ألوان العيادات المختارة بعناية (7 ألوان سريرية تخصصية)
          </span>
          <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
            اختر لوناً لتمييز هوية وأزرار عيادتك
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CURATED_CLINIC_PALETTES.filter(p => !p.isDefault).map((palette) => {
            const isSelected = activePalette.id === palette.id;

            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => handleSelect(palette)}
                className={`
                  text-right p-4 rounded-[16px] transition-all duration-200 cursor-pointer relative flex flex-col justify-between
                  ${isSelected
                    ? 'bg-white dark:bg-[#1C1C1E] border-2 shadow-md'
                    : 'bg-white dark:bg-[#18181B] border border-black/[0.08] dark:border-white/[0.1] hover:border-black/30 dark:hover:border-white/30'
                  }
                `}
                style={{
                  borderColor: isSelected ? palette.hex : undefined
                }}
              >
                {/* Header: Color Swatch + Check */}
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{ backgroundColor: palette.hex }}
                      className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white shadow-sm shrink-0"
                    >
                      {isSelected && <Check size={16} strokeWidth={3} />}
                    </div>
                    <div>
                      <h5 className="text-[14px] font-bold text-black dark:text-white leading-tight">
                        {palette.name}
                      </h5>
                      <span className="text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
                        {palette.hex}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span 
                      style={{ backgroundColor: `${palette.hex}20`, color: palette.hex }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    >
                      نشط
                    </span>
                  )}
                </div>

                {/* Subtitle & Specialty Recommendation */}
                <div className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] space-y-1">
                  <p className="font-medium text-black/80 dark:text-white/80">
                    {palette.specialty}
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#71717A] dark:text-[#A1A1AA] line-clamp-2">
                    {palette.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Live Interactive UI Simulation Box */}
      <div className="p-5 rounded-[18px] bg-[#F4F4F5] dark:bg-[#121214] border border-black/[0.06] dark:border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-bold text-black dark:text-white">
            <Eye size={16} className="text-[#71717A]" />
            <span>معاينة حية فورية لعناصر العيادة باللون المختار ({activePalette.name}):</span>
          </div>
          <span className="text-[12px] text-[#71717A]">
            الخلفية والأسطح تبقى بأناقة الأبيض والأسود
          </span>
        </div>

        <div className="p-4 rounded-[14px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-wrap items-center justify-between gap-4">
          
          {/* Clinic Brand Badge */}
          <div className="flex items-center gap-3">
            <div 
              style={{
                backgroundColor: activePalette.id === 'monochrome' ? '#09090B' : `${activePalette.hex}20`,
                color: activePalette.id === 'monochrome' ? '#FFFFFF' : activePalette.hex
              }}
              className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center font-bold shadow-sm"
            >
              <Stethoscope size={20} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-black dark:text-white">
                {tenant?.name || 'عيادة كلينيك فلو النموذجية'}
              </p>
              <p className="text-[12px] text-[#71717A]">
                {activePalette.specialty}
              </p>
            </div>
          </div>

          {/* Action Buttons with active primary color */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              style={{
                backgroundColor: activePalette.id === 'monochrome' ? '#09090B' : activePalette.hex,
                color: '#FFFFFF'
              }}
              className="px-4 py-2 rounded-full text-[13px] font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              زر الإجراء الرئيسي (حفظ كشف)
            </button>

            <button
              type="button"
              style={{
                backgroundColor: activePalette.id === 'monochrome' ? 'rgba(0,0,0,0.06)' : `${activePalette.hex}18`,
                color: activePalette.id === 'monochrome' ? '#09090B' : activePalette.hex
              }}
              className="px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer"
            >
              زر ثانوي مظلل
            </button>

            <span 
              style={{
                borderColor: activePalette.id === 'monochrome' ? '#09090B' : activePalette.hex,
                color: activePalette.id === 'monochrome' ? '#09090B' : activePalette.hex
              }}
              className="px-3 py-1 rounded-full text-[11px] font-bold border"
            >
              مؤشر الموعد القادم
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
