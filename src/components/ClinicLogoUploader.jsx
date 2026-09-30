import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Stethoscope, 
  Sparkles, 
  HeartPulse, 
  ShieldCheck, 
  Smile,
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


/**
 * Optimizes and resizes an uploaded image file before saving to prevent localStorage QuotaExceededError.
 * Raster images (PNG, JPG, WebP) are downscaled to a max dimension of 320px preserving aspect ratio.
 * Vector images (SVG) are preserved in their native format.
 */
function resizeImageToDataUrl(file, maxDimension = 320) {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof Image === 'undefined') {
        // Fallback for SSR/testing environments without Image constructor
        resolve(e.target.result);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        if (typeof document === 'undefined') {
          resolve(e.target.result);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target.result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

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

    resizeImageToDataUrl(file, 320)
      .then(optimizedDataUrl => {
        applyLogo(optimizedDataUrl);
      })
      .catch(err => {
        console.warn('[ClinicLogoUploader] Image processing note:', err);
        setUploadError('حدث خطأ أثناء معالجة ملف الصورة');
      });
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
    <div 
      className="clinic-logo-uploader" 
      dir="rtl"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        backgroundColor: isDragging ? 'var(--bg-tertiary, #F4F4F5)' : 'var(--bg-primary, #FFFFFF)',
        border: isDragging ? '1.5px dashed var(--primary, #09090B)' : '1px solid var(--border-color, #E4E4E7)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        transition: 'background-color 0.2s, border-color 0.2s'
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #09090B)' }}>
            شعار العيادة
          </h4>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary, #71717A)' }}>
            يظهر تلقائياً في ترويسة الروشتات المطبوعة، شريط التنقل العلوي، وبوابة حجز المرضى.
          </p>
        </div>

        {saveSuccess && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
            <CheckCircle2 size={13} />
            تم حفظ الشعار
          </span>
        )}
      </div>

      {uploadError && (
        <div style={{ marginBottom: '0.85rem', padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', color: '#DC2626', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertCircle size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Sleek Row: Logo Preview + Actions + Presets */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', paddingTop: '0.25rem' }}>
        
        {/* Left Side: Thumbnail + Upload buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Logo Thumbnail */}
          <div 
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#FAFAFA',
              border: '1.5px solid #E4E4E7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              padding: '4px'
            }}
          >
            {logoPreview ? (
              <img 
                src={logoPreview} 
                alt="شعار العيادة" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Stethoscope size={22} color="#A1A1AA" />
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.42rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Upload size={13} />
                <span>{logoPreview ? 'تغيير الشعار' : 'رفع شعار'}</span>
              </button>

              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.42rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#DC2626',
                    backgroundColor: 'transparent',
                    border: '1px solid #FCA5A5',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Trash2 size={13} />
                  <span>إزالة</span>
                </button>
              )}
            </div>

            <span style={{ fontSize: '0.72rem', color: '#71717A' }}>
              PNG, JPG, SVG حتى 5MB
            </span>
          </div>
        </div>

        {/* Right Side: Quick Medical Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.74rem', color: '#71717A', whiteSpace: 'nowrap' }}>
            أو رمز سريع:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                  title={preset.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#3F3F46',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#09090B';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#E4E4E7';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
