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
            className="saas-branding-modal-card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '20px',
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              zIndex: 1056
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

                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: '0.75rem' 
                  }}
                >
                  {CURATED_CLINIC_PALETTES.map((palette) => {
                    const isSelected = selectedPaletteId === palette.id;
                    const isMonochrome = palette.id === 'monochrome';

                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => setSelectedPaletteId(palette.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '0.85rem',
                          borderRadius: '12px',
                          border: isSelected ? (isMonochrome ? '2px solid #09090B' : `2px solid ${palette.hex}`) : '1.5px solid #E4E4E7',
                          backgroundColor: isSelected ? (isMonochrome ? '#09090B' : '#FFFFFF') : '#FAFAFA',
                          color: isSelected && isMonochrome ? '#FFFFFF' : '#09090B',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                          cursor: 'pointer',
                          textAlign: 'right',
                          minHeight: '115px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                          {isMonochrome ? (
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid currentColor', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: '50%', height: '100%', backgroundColor: '#FFFFFF' }} />
                              <div style={{ width: '50%', height: '100%', backgroundColor: '#09090B' }} />
                            </div>
                          ) : (
                            <div 
                              style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: palette.hex, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                            />
                          )}

                          {isSelected && (
                            <Check size={16} strokeWidth={3} color={isMonochrome ? '#FFFFFF' : '#10B981'} />
                          )}
                        </div>

                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, lineHeight: 1.3, color: isSelected && isMonochrome ? '#FFFFFF' : '#09090B' }}>
                            {palette.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', marginTop: '0.25rem', color: isSelected && isMonochrome ? 'rgba(255,255,255,0.75)' : '#71717A', lineHeight: 1.35 }}>
                            {palette.specialty}
                          </div>
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

                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #E4E4E7',
                    backgroundColor: '#FAFAFA'
                  }}
                >
                  {/* Logo Preview Disc */}
                  <div 
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '14px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E4E4E7',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="شعار العيادة" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#A1A1AA' }}>
                        <ImageIcon size={22} style={{ margin: '0 auto 2px' }} />
                        <span style={{ fontSize: '9px', display: 'block' }}>بدون شعار</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFile(e.target.files[0]);
                        }
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: '#09090B',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Upload size={14} />
                        <span>رفع صورة الشعار</span>
                      </button>
                      <span style={{ fontSize: '0.72rem', color: '#71717A' }}>
                        PNG, SVG, JPG حتى 5MB
                      </span>
                    </div>

                    {/* Or URL input */}
                    <div style={{ marginTop: '2px' }}>
                      <input
                        type="text"
                        placeholder="أو الصق رابط صورة الشعار مباشرة (URL)..."
                        value={logoUrl.startsWith('data:') ? '(ملف صورة مرفوع)' : logoUrl}
                        onChange={(e) => {
                          if (!e.target.value.startsWith('(')) {
                            setLogoUrl(e.target.value);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.76rem',
                          borderRadius: '8px',
                          border: '1px solid #E4E4E7',
                          backgroundColor: '#FFFFFF',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Monograms for Quick Setup */}
                <div style={{ paddingTop: '0.35rem' }}>
                  <span style={{ fontSize: '0.74rem', color: '#71717A', display: 'block', marginBottom: '0.4rem' }}>
                    أيقونات طبية مقترحة سريعة في حال عدم توفر ملف الشعار لدى الطبيب:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
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
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E4E4E7',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            color: '#3F3F46',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Icon size={13} />
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 3: LIVE PREVIEW ACCROSS SURFACES */}
              <div 
                style={{
                  padding: '0.85rem',
                  borderRadius: '12px',
                  backgroundColor: '#F4F4F5',
                  border: '1px solid #E4E4E7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 700, color: '#3F3F46' }}>
                  <span>معاينة فورية لكيفية ظهور العيادة للمرضى والأطباء:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#71717A' }}>Live Simulation</span>
                </div>

                <div 
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div 
                      style={{
                        backgroundColor: activePalette.id === 'monochrome' ? '#09090B' : `${activePalette.hex}20`,
                        color: activePalette.id === 'monochrome' ? '#FFFFFF' : activePalette.hex,
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        fontWeight: 700
                      }}
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="شعار" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Stethoscope size={18} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090B' }}>
                        {clinic.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#71717A' }}>
                        {clinic.doctorName} • {activePalette.name}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      backgroundColor: activePalette.id === 'monochrome' ? '#09090B' : activePalette.hex,
                      color: '#FFFFFF',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: 'none',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    حجز موعد الآن
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.85rem', borderTop: '1px solid #E4E4E7' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#71717A',
                    backgroundColor: 'transparent',
                    border: '1px solid #E4E4E7',
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: '#09090B',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    opacity: isSaving ? 0.6 : 1
                  }}
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
