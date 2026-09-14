import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Palette, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Image as ImageIcon, 
  Check, 
  ShieldCheck, 
  Stethoscope, 
  Building2,
  FileCheck,
  Sparkles
} from 'lucide-react';
import { Dialog, Portal } from '../../../components/ui';
import { CURATED_CLINIC_PALETTES } from '../../../components/ClinicPalettePicker';
import { MEDICAL_PRESET_LOGOS } from '../../../components/ClinicLogoUploader';

export default function SaasBrandingModal({
  isOpen,
  onClose,
  clinic,
  onSave
}) {
  const fileInputRef = useRef(null);

  const [selectedPaletteId, setSelectedPaletteId] = useState('monochrome');
  const [logoUrl, setLogoUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clinic) {
      const currentPrimary = clinic.branding?.primaryColor || clinic.primaryColor || '#09090B';
      const matched = CURATED_CLINIC_PALETTES.find(
        p => p.hex.toLowerCase() === currentPrimary.toLowerCase() || p.id === clinic.branding?.paletteId
      );
      setSelectedPaletteId(matched ? matched.id : 'monochrome');
      setLogoUrl(clinic.logoUrl || clinic.branding?.logoUrl || '');
      setSaveSuccess(false);
    }
  }, [clinic]);

  if (!clinic) return null;

  const activePalette = CURATED_CLINIC_PALETTES.find(p => p.id === selectedPaletteId) || CURATED_CLINIC_PALETTES[0];

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const chosenColor = activePalette.id === 'monochrome' ? '#09090B' : activePalette.hex;
    const updatedBranding = {
      primaryColor: chosenColor,
      paletteId: activePalette.id,
      logoUrl: logoUrl
    };

    if (onSave) {
      await onSave(clinic.id || clinic.slug, {
        logoUrl: logoUrl,
        branding: {
          ...(clinic.branding || {}),
          ...updatedBranding
        }
      });
    }

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <Dialog.Content 
            className="modal-content"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '20px',
              background: 'var(--bg-primary, #FFFFFF)',
              border: '1px solid var(--border-color, #E4E4E7)',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            dir="rtl"
          >
            <div className="sheet-modal-grabber" style={{ marginBottom: '10px' }} />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
                  <Palette size={20} />
                </div>
                <div>
                  <Dialog.Title asChild>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 m-0">
                      تخصيص الهوية والشعار للعيادة (SaaS Central Control)
                    </h3>
                  </Dialog.Title>
                  <p className="text-xs text-zinc-500 m-0 mt-0.5">
                    العيادة: <strong>{clinic.name}</strong> • المعرف: <code className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{clinic.slug}</code>
                  </p>
                </div>
              </div>

              <Dialog.CloseTrigger asChild>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </Dialog.CloseTrigger>
            </div>

            {saveSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>تم تحديث وحفظ هوية العيادة وشعارها بنجاح وتفعيلها للمستخدمين فوراً!</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              
              {/* SECTION 1: 3-COLOR PALETTE SELECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    1. اختيار باليتة الألوان المعتمدة (3 خيارات أساسية متوازنة)
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    الأساس يظل أبيض وأسود
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CURATED_CLINIC_PALETTES.map((palette) => {
                    const isSelected = selectedPaletteId === palette.id;
                    const isMonochrome = palette.id === 'monochrome';

                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => setSelectedPaletteId(palette.id)}
                        className={`
                          p-3.5 rounded-xl border-2 text-right transition-all cursor-pointer relative flex flex-col justify-between
                          ${isSelected
                            ? (isMonochrome 
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-md' 
                                : 'bg-white dark:bg-zinc-800 border-2 shadow-md')
                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                          }
                        `}
                        style={{
                          borderColor: isSelected && !isMonochrome ? palette.hex : undefined
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          {isMonochrome ? (
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-current flex">
                              <div className="w-1/2 h-full bg-white" />
                              <div className="w-1/2 h-full bg-zinc-900" />
                            </div>
                          ) : (
                            <div 
                              style={{ backgroundColor: palette.hex }}
                              className="w-6 h-6 rounded-full shadow-sm"
                            />
                          )}

                          {isSelected && <Check size={16} strokeWidth={3} className={isSelected && isMonochrome ? 'text-white dark:text-zinc-900' : 'text-emerald-500'} />}
                        </div>

                        <div>
                          <h6 className={`text-[13px] font-bold leading-tight ${isSelected && isMonochrome ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {palette.name}
                          </h6>
                          <p className={`text-[11px] mt-1 line-clamp-2 ${isSelected && isMonochrome ? 'text-zinc-200 dark:text-zinc-600' : 'text-zinc-500'}`}>
                            {palette.specialty}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: CLINIC LOGO UPLOAD & MANAGEMENT */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    2. إدارة ورفع شعار العيادة (Clinic Logo)
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-[11px] text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>حذف الشعار الحالي</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                  {/* Logo Preview Disc */}
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    {logoUrl ? (
                      <img src={logoUrl} alt="شعار العيادة" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-zinc-400">
                        <ImageIcon size={24} className="mx-auto mb-1" />
                        <span className="text-[9px] block">بدون شعار</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFile(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>رفع صورة الشعار</span>
                      </button>
                      <span className="text-[11px] text-zinc-400">
                        PNG, SVG, JPG حتى 5MB
                      </span>
                    </div>

                    {/* Or URL input */}
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="أو الصق رابط صورة الشعار مباشرة (URL)..."
                        value={logoUrl.startsWith('data:') ? '(ملف صورة مرفوع)' : logoUrl}
                        onChange={(e) => {
                          if (!e.target.value.startsWith('(')) {
                            setLogoUrl(e.target.value);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Monograms for Quick Setup */}
                <div className="pt-2">
                  <span className="text-[11px] text-zinc-500 block mb-2">
                    أيقونات طبية مقترحة سريعة في حال عدم توفر ملف الشعار لدى الطبيب:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {MEDICAL_PRESET_LOGOS.map((preset) => {
                      const Icon = preset.icon;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            const svgData = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="48" fill="#09090B"/><text x="50%" y="55%" font-family="sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${preset.name.slice(0, 2)}</text></svg>`;
                            setLogoUrl(`data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Icon size={14} />
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 3: LIVE PREVIEW ACCROSS SURFACES */}
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>معاينة فورية لكيفية ظهور العيادة للمرضى والأطباء:</span>
                  <span className="font-mono text-[10px] text-zinc-400">Live Simulation</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      style={{
                        backgroundColor: activePalette.id === 'monochrome' ? '#09090B' : `${activePalette.hex}20`,
                        color: activePalette.id === 'monochrome' ? '#FFFFFF' : activePalette.hex
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden font-bold"
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="شعار" className="w-full h-full object-contain" />
                      ) : (
                        <Stethoscope size={20} />
                      )}
                    </div>
                    <div>
                      <h6 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 m-0">
                        {clinic.name}
                      </h6>
                      <p className="text-xs text-zinc-500 m-0">
                        {clinic.doctorName} • {activePalette.name}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      backgroundColor: activePalette.id === 'monochrome' ? '#09090B' : activePalette.hex,
                      color: '#FFFFFF'
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                  >
                    حجز موعد الآن
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck size={16} />
                  <span>{isSaving ? 'جاري الحفظ والتعميم...' : 'حفظ وتطبيق هوية العيادة فوراً'}</span>
                </button>
              </div>

            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
