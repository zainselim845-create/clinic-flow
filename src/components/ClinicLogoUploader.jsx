import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Image as ImageIcon, 
  Stethoscope, 
  Sparkles, 
  HeartPulse, 
  ShieldCheck, 
  Smile,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export const MEDICAL_PRESET_LOGOS = [
  { id: 'stethoscope', name: 'سماعة سريرية', icon: Stethoscope, label: 'طب عام واستشارات' },
  { id: 'dental', name: 'أسنان وابتسامة', icon: Smile, label: 'طب وجراحة الفم والأسنان' },
  { id: 'cardio', name: 'قلب ونبض', icon: HeartPulse, label: 'باطنة وقلب وأوعية' },
  { id: 'derma', name: 'تجميل وليزر', icon: Sparkles, label: 'جلدية وعناية فائقة' },
  { id: 'shield', name: 'درع واعتماد', icon: ShieldCheck, label: 'مجمعات ومراكز معتمدة' }
];

export default function ClinicLogoUploader({
  value,
  onChange,
  onSaveDirectly = true
}) {
  const { tenant, updateTenantInfo } = useTenant();
  const fileInputRef = useRef(null);

  const currentLogo = value || tenant?.logoUrl || tenant?.branding?.logoUrl || '';
  const [logoPreview, setLogoPreview] = useState(currentLogo);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with prop changes
  React.useEffect(() => {
    if (value !== undefined) {
      setLogoPreview(value || '');
    } else if (tenant?.logoUrl || tenant?.branding?.logoUrl) {
      setLogoPreview(tenant.logoUrl || tenant.branding?.logoUrl || '');
    }
  }, [value, tenant?.logoUrl, tenant?.branding?.logoUrl]);

  const handleFile = (file) => {
    setUploadError('');
    if (!file) return;

    // Check file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('يرجى رفع ملف صورة صحيح بصيغة (PNG, JPG, SVG, WebP)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً، الحد الأقصى المسموح به هو 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      applyLogo(dataUrl);
    };
    reader.onerror = () => {
      setUploadError('حدث خطأ أثناء قراءة ملف الصورة');
    };
    reader.readAsDataURL(file);
  };

  const applyLogo = (newLogoUrl) => {
    setLogoPreview(newLogoUrl);
    if (onChange) {
      onChange(newLogoUrl);
    }
    if (onSaveDirectly && updateTenantInfo) {
      updateTenantInfo({
        logoUrl: newLogoUrl,
        branding: {
          ...(tenant?.branding || {}),
          logoUrl: newLogoUrl
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleRemoveLogo = () => {
    applyLogo('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="clinic-logo-uploader space-y-5" dir="rtl">
      {/* Header Banner */}
      <div className="p-5 rounded-[18px] bg-white dark:bg-[#18181B] border border-black/[0.08] dark:border-white/[0.1] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-[42px] h-[42px] rounded-[12px] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 shadow-sm">
              <ImageIcon size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-[17px] font-bold text-black dark:text-white leading-tight">
                  شعار العيادة والهوية الرسمية (Clinic Official Logo)
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/[0.06] dark:bg-white/[0.1] text-black dark:text-white">
                  يظهر في الروشتات، البوابة، والقائمة
                </span>
              </div>
              <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA] mt-1 leading-relaxed">
                ارفع الشعار الرسمي المعتمد لعيادتك ليتم تضمينه تلقائياً في ترويسة الروشتات الطبية المطبوعة، فواتير العلاج، وبوابة الحجز الإلكتروني للمرضى.
              </p>
            </div>
          </div>

          {logoPreview && (
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all shrink-0 cursor-pointer"
              title="إزالة الشعار والرجوع للأيقونة الافتراضية"
            >
              <Trash2 size={14} />
              <span>إزالة الشعار</span>
            </button>
          )}
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-[12px] bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[13px] font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={16} />
            <span>تم حفظ وتحديث شعار العيادة بنجاح! يظهر الآن عبر كافة واجهات المنظمة والمستندات.</span>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Main Upload Zone & Live Preview Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left/Main: Drag & Drop Dropzone */}
        <div className="md:col-span-7">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              p-6 rounded-[18px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px]
              ${isDragging
                ? 'border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.06] scale-[0.99]'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-black/50 dark:hover:border-white/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-700 dark:text-zinc-200 mb-3">
              <Upload size={24} />
            </div>

            <h5 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              اسحب وأفلت ملف الشعار هنا، أو انقر للاختيار
            </h5>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 max-w-sm mb-3">
              صيغ الصور المدعومة: PNG, JPG, SVG, WebP حتى حجم أقصى 5 ميجابايت. يُفضل استخدام خلفية شفافة.
            </p>

            <button
              type="button"
              className="px-4 py-2 rounded-full text-[12px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow hover:opacity-90 transition-opacity"
            >
              اختيار ملف من الجهاز
            </button>
          </div>
        </div>

        {/* Right: Live Current Logo & Surrounding Preview */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-[18px] bg-white dark:bg-[#18181B] border border-black/[0.08] dark:border-white/[0.1] shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400 block mb-3">
                معاينة الشعار المعتمد الحالي:
              </span>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-[16px] border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-2 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="شعار العيادة" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <Stethoscope size={30} />
                      <span className="text-[9px] font-bold mt-1">بدون شعار</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <h5 className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100">
                    {tenant?.name || 'عيادة تخصصية'}
                  </h5>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                    {tenant?.doctorName || 'طبيب العيادة'}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {logoPreview ? 'شعار مخصص نشط' : 'الأيقونة الطبية الافتراضية'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prescriptions preview mock badge */}
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <FileCheck size={14} className="text-emerald-500" />
                <span>جاهز للطباعة على الروشتات</span>
              </span>
              <span className="font-mono">ClinicFlow Brand Engine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Medical Monograms (If Doctor Doesn't Have a Logo Yet) */}
      <div className="p-4 rounded-[16px] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
            أو اختر أيقونة طبية احترافية سريعة كبديل مؤقت للشعار:
          </span>
          <span className="text-[11px] text-zinc-400">
            5 أيقونات تخصصية جاهزة
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {MEDICAL_PRESET_LOGOS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const svgData = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="48" fill="#09090B"/><text x="50%" y="55%" font-family="sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${preset.name.slice(0, 2)}</text></svg>`;
                  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`;
                  applyLogo(dataUrl);
                }}
                className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                  <Icon size={18} />
                </div>
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                  {preset.name}
                </span>
                <span className="text-[9px] text-zinc-400 truncate max-w-full">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
