import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { CLINIC_SPECIALTIES } from '../data/specialtiesData';
import { SYSTEM_PERMISSIONS } from '../utils/permissions';
import { isUsernameAvailable } from '../services/authService';
import { 
  Building2, 
  User, 
  UserCheck, 
  ShieldCheck, 
  Sparkles, 
  Palette, 
  Users, 
  Phone,
  MapPin, 
  Stethoscope, 
  ArrowRight, 
  ArrowLeft, 
  HeartPulse, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Check,
  Briefcase
} from 'lucide-react';
import './Onboarding.css';

const COLOR_PALETTES = [
  {
    id: 'monochrome',
    name: 'الأبيض والأسود المعماري النقي',
    tag: 'الأساس المعماري الافتراضي لكافة التخصصات',
    primary: '#09090B',
    accent: '#18181B'
  },
  {
    id: 'royal_blue',
    name: 'الأزرق السريري الملكي',
    tag: 'للجراحة العامة والاستشارات التخصصية',
    primary: '#007AFF',
    accent: '#3B82F6'
  },
  {
    id: 'clinical_emerald',
    name: 'الزمردي الصحي والتعافي الحيوي',
    tag: 'لطب الأسنان والمراكز التخصصية',
    primary: '#10B981',
    accent: '#059669'
  }
];

const TEAM_SIZES = [
  {
    id: 'solo',
    title: 'عيادة فردية (طبيب بمفرده)',
    countBadge: '1',
    description: 'أنا أدير كافة تفاصيل العيادة والمواعيد والملفات بنفسي'
  },
  {
    id: 'small',
    title: 'فريق صغير (طبيب واستقبال)',
    countBadge: '2 - 3',
    description: 'طبيب مع موظف استقبال وسكرتارية لإدارة الحجوزات والمرضى'
  },
  {
    id: 'medium',
    title: 'فريق متوسط (طاقم متكامل)',
    countBadge: '4 - 6',
    description: 'أطباء شركاء وموظفي استقبال وتمريض ومحاسب مالي'
  },
  {
    id: 'large',
    title: 'مركز طبي متكامل أو مجمع',
    countBadge: '7+',
    description: 'مجمع عيادات أو مركز متعدد التخصصات والورديات'
  }
];

const ROLES_INFO = [
  {
    id: 'receptionist',
    title: 'الاستقبال والسكرتارية',
    defaultPerms: ['appointments', 'patients', 'sms'],
    desc: 'تسجيل المرضى، تنظيم وحجز المواعيد، الفواتير، وإرسال تنبيهات SMS'
  },
  {
    id: 'associate_doctor',
    title: 'طبيب ممارس / مساعد',
    defaultPerms: ['appointments', 'patients', 'sms'],
    desc: 'الكشف السريري، فحص الأسنان والتقارير، الروشتات والتاريخ المرضي'
  },
  {
    id: 'accountant',
    title: 'المحاسب المالي',
    defaultPerms: ['invoices'],
    desc: 'إصدار الفواتير وسندات القبض، متابعة الخزينة وتقارير الإيرادات'
  },
  {
    id: 'assistant',
    title: 'التمريض والمساعد السريري',
    defaultPerms: ['appointments', 'patients', 'inventory'],
    desc: 'استقبال المريض بالعيادة، إدارة المخزون ومتابعة أوامر المعامل'
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, completeOnboarding, signOut } = useAuth();
  const { tenant } = useTenant();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: Doctor Profile & Custom Username
  const [doctorName, setDoctorName] = useState(() => {
    if (user?.name) {
      return user.name.startsWith('د.') ? user.name : `د. ${user.name}`;
    }
    return 'د. ';
  });

  const [username, setUsername] = useState(() => {
    if (user?.username) return user.username;
    if (user?.email) {
      const prefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
      return `dr-${prefix}`;
    }
    return 'dr-clinic';
  });

  const [phone, setPhone] = useState(user?.phone || '');
  const [jobTitle, setJobTitle] = useState('استشاري ورئيس القسم');

  // Step 2: Clinic & Specialty
  const [clinicName, setClinicName] = useState(() => {
    if (tenant?.name && tenant.name !== 'العيادة التخصصية') return tenant.name;
    const docClean = (user?.name || '').replace(/^د.?s*/, '').trim();
    return docClean ? `عيادة د. ${docClean}` : 'عيادة النخبة التخصصية';
  });

  const [specialtyCategory, setSpecialtyCategory] = useState('all');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('general_dentistry');
  const [city, setCity] = useState('القاهرة - مصر الجديدة');
  const [address, setAddress] = useState('شارع الميرغني، مبنى العيادات التخصصية');

  // Step 3: Brand Colors
  const [selectedPaletteId, setSelectedPaletteId] = useState('monochrome');
  const [primaryColor, setPrimaryColor] = useState('#09090B');
  const [accentColor, setAccentColor] = useState('#18181B');

  // Step 4: Team Size & Staff Roles
  const [teamSize, setTeamSize] = useState('small');
  const [enableInitialStaff, setEnableInitialStaff] = useState(true);
  const [initialStaffName, setInitialStaffName] = useState('سارة محمود');
  const [initialStaffPhone, setInitialStaffPhone] = useState('01098765432');
  const [initialStaffPassword, setInitialStaffPassword] = useState('1234');
  const [initialStaffRole, setInitialStaffRole] = useState('receptionist');
  const [initialStaffPerms, setInitialStaffPerms] = useState(['appointments', 'patients', 'sms']);

  // Real-time Username Uniqueness & Availability Check
  const usernameAvailability = useMemo(() => {
    return isUsernameAvailable(username, user?.id);
  }, [username, user?.id]);

  // Auto-fill defaults if user object updates
  useEffect(() => {
    if (user?.name && (!doctorName || doctorName === 'د. ')) {
      setDoctorName(user.name.startsWith('د.') ? user.name : `د. ${user.name}`);
    }
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user]);

  // If user already finished onboarding previously, redirect to dashboard
  useEffect(() => {
    if (user && !user.needsOnboarding && !completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, completed, navigate]);

  // Handle Palette selection
  const handleSelectPalette = (palette) => {
    setSelectedPaletteId(palette.id);
    setPrimaryColor(palette.primary);
    setAccentColor(palette.accent);
  };

  // Filtered Specialties
  const filteredSpecialties = useMemo(() => {
    if (specialtyCategory === 'all') return CLINIC_SPECIALTIES;
    return CLINIC_SPECIALTIES.filter(s => s.category === specialtyCategory);
  }, [specialtyCategory]);

  const selectedSpecialtyObj = useMemo(() => {
    return CLINIC_SPECIALTIES.find(s => s.id === selectedSpecialtyId) || CLINIC_SPECIALTIES[0];
  }, [selectedSpecialtyId]);

  // Clean custom username formatting
  const handleUsernameChange = (e) => {
    const raw = e.target.value;
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(cleaned);
  };

  // Toggle staff permission
  const handleTogglePermission = (permId) => {
    if (initialStaffPerms.includes(permId)) {
      setInitialStaffPerms(initialStaffPerms.filter(p => p !== permId));
    } else {
      setInitialStaffPerms([...initialStaffPerms, permId]);
    }
  };

  // Step Validation & Navigation
  const validateCurrentStep = () => {
    setErrorMessage('');
    if (step === 1) {
      if (!doctorName || doctorName.trim().length < 3) {
        setErrorMessage('يرجى كتابة اسم الطبيب كاملاً (3 أحرف على الأقل).');
        return false;
      }
      if (!username || username.trim().length < 3) {
        setErrorMessage('يرجى اختيار اسم مستخدم صحيح مكوّن من 3 أحرف بالإنجليزية على الأقل.');
        return false;
      }
      if (!usernameAvailability.available) {
        setErrorMessage(usernameAvailability.reason || 'اسم المستخدم هذا محجوز مسبقاً، يرجى تغييره واختيار اسم متاح لعيادتك.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!clinicName || clinicName.trim().length < 3) {
        setErrorMessage('يرجى إدخال اسم العيادة بشكل صحيح.');
        return false;
      }
      if (!selectedSpecialtyId) {
        setErrorMessage('يرجى اختيار التخصص الطبي للعيادة.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!primaryColor || !accentColor) {
        setErrorMessage('يرجى اختيار درجات الألوان الأساسية.');
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (enableInitialStaff) {
        if (!initialStaffName.trim()) {
          setErrorMessage('يرجى إدخال اسم الموظف الأول أو إلغاء تفعيل إضافة الموظف.');
          return false;
        }
        if (!initialStaffPhone.trim() || initialStaffPhone.replace(/\D/g, '').length < 6) {
          setErrorMessage('يرجى إدخال رقم هاتف صحيح للموظف ليتمكن من تسجيل الدخول به.');
          return false;
        }
        const cleanDocPhone = (phone || '').replace(/\D/g, '');
        const cleanStaffPhone = initialStaffPhone.trim().replace(/\D/g, '');
        if (cleanDocPhone && cleanStaffPhone && cleanDocPhone === cleanStaffPhone) {
          setErrorMessage('لا يمكن استخدام نفس رقم هاتف الطبيب لحساب الموظف. يرجى إدخال رقم هاتف مستقل للموظف.');
          return false;
        }
        if (!initialStaffPassword.trim() || initialStaffPassword.trim().length < 4) {
          setErrorMessage('يرجى تحديد كلمة مرور لحساب الموظف (4 أحرف أو أرقام على الأقل).');
          return false;
        }
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setStep(prev => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        doctorName: doctorName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        clinicName: clinicName.trim(),
        specialty: selectedSpecialtyObj?.name || 'طب وجراحة الفم والأسنان العام',
        address: `${city} - ${address}`,
        primaryColor,
        accentColor,
        teamSize,
        initialStaff: enableInitialStaff ? {
          name: initialStaffName.trim(),
          phone: initialStaffPhone.trim(),
          password: initialStaffPassword.trim(),
          role: initialStaffRole,
          permissions: initialStaffPerms,
          shift: 'صباحي ومسائي'
        } : null
      };

      const result = await completeOnboarding(payload);
      if (result.error) throw result.error;

      setCompleted(true);
    } catch (err) {
      console.error('Failed to complete clinic onboarding:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة ثانية.');
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="onboarding-page-container">
      {/* 1. Navbar */}
      <header className="onboarding-navbar">
        <div className="onboarding-brand">
          <div className="onboarding-brand-logo">
            <HeartPulse size={24} />
          </div>
          <div className="onboarding-brand-name">
            Clinic<span>Flow</span>
          </div>
        </div>

        <div className="onboarding-nav-user">
          <div className="onboarding-user-badge">
            <User size={14} />
            <span>مسجل كـ: <strong>{user?.name || user?.email || 'طبيب العيادة'}</strong></span>
          </div>
          <button 
            type="button" 
            onClick={() => signOut()} 
            className="btn-signout-subtle"
            title="تسجيل الخروج أو تبديل الحساب"
          >
            <LogOut size={14} />
            <span>تبديل الحساب</span>
          </button>
        </div>
      </header>

      {/* 2. Main Container */}
      <main className="onboarding-main">
        {completed ? (
          /* Success Screen */
          <div className="wizard-card onboarding-success-card">
            <div className="celebration-badge-icon">
              <Check size={44} strokeWidth={3} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                مبروك يا دكتور! تم تجهيز نظام عيادتك بالكامل 🚀
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
                تم إنشاء وتخصيص بيئة العمل الخاصة بك بنجاح، وربط خدمات التخصص الطبي وتجهيز حسابات الطاقم والهوية البصرية.
              </p>
            </div>

            <div className="success-summary-box">
              <div className="summary-row">
                <span>اسم العيادة:</span>
                <strong>{clinicName}</strong>
              </div>
              <div className="summary-row">
                <span>الطبيب المسؤول:</span>
                <strong>{doctorName}</strong>
              </div>
              <div className="summary-row">
                <span>اسم المستخدم / الرابط:</span>
                <strong style={{ direction: 'ltr' }}>@{username}</strong>
              </div>
              <div className="summary-row">
                <span>التخصص الطبي:</span>
                <strong>{selectedSpecialtyObj?.name}</strong>
              </div>
              <div className="summary-row">
                <span>حجم فريق العمل:</span>
                <strong>{TEAM_SIZES.find(t => t.id === teamSize)?.title}</strong>
              </div>
              {enableInitialStaff && (
                <div className="summary-row" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                  <span>حساب الموظف الأول:</span>
                  <strong>{initialStaffName} ({initialStaffPhone})</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                type="button" 
                onClick={handleGoToDashboard} 
                className="btn-wizard-next"
                style={{ fontSize: '1.05rem', padding: '1rem 2.5rem' }}
              >
                <span>الدخول إلى لوحة تحكم العيادة فوراً</span>
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stepper Progress */}
            <div className="onboarding-stepper">
              <div className="stepper-progress-track">
                <div 
                  className="stepper-progress-fill" 
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>

              <div className="stepper-steps-row">
                <div className={`stepper-step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                  <div className="stepper-circle">
                    {step > 1 ? <Check size={16} strokeWidth={3} /> : '1'}
                  </div>
                  <div className="stepper-labels">
                    <span className="stepper-num">الخطوة 1</span>
                    <span className="stepper-title">الطبيب واسم المستخدم</span>
                  </div>
                </div>

                <div className={`stepper-step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                  <div className="stepper-circle">
                    {step > 2 ? <Check size={16} strokeWidth={3} /> : '2'}
                  </div>
                  <div className="stepper-labels">
                    <span className="stepper-num">الخطوة 2</span>
                    <span className="stepper-title">العيادة والتخصص</span>
                  </div>
                </div>

                <div className={`stepper-step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                  <div className="stepper-circle">
                    {step > 3 ? <Check size={16} strokeWidth={3} /> : '3'}
                  </div>
                  <div className="stepper-labels">
                    <span className="stepper-num">الخطوة 3</span>
                    <span className="stepper-title">الهوية والألوان</span>
                  </div>
                </div>

                <div className={`stepper-step-item ${step === 4 ? 'active' : ''}`}>
                  <div className="stepper-circle">
                    4
                  </div>
                  <div className="stepper-labels">
                    <span className="stepper-num">الخطوة 4</span>
                    <span className="stepper-title">فريق العمل والصلاحيات</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wizard Body Card */}
            <div className="wizard-card">
              {errorMessage && (
                <div style={{
                  padding: '0.85rem 1.25rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  color: '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: DOCTOR & USERNAME */}
              {step === 1 && (
                <div className="wizard-step-content">
                  <div className="wizard-header">
                    <h2>
                      <UserCheck size={28} color="var(--primary)" />
                      <span>بيانات الطبيب واسم المستخدم المخصص</span>
                    </h2>
                    <p>
                      أهلاً بك! خصص اسم ملفك الطبي واسم المستخدم الفريد (@handle) الذي ستستخدمه لتسجيل الدخول ورابط عيادتك.
                    </p>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        <span>اسم الطبيب / اللقب المهني *</span>
                      </label>
                      <div className="form-input-wrapper">
                        <User className="input-prefix-icon" size={18} />
                        <input
                          type="text"
                          className="form-input has-prefix"
                          value={doctorName}
                          onChange={(e) => setDoctorName(e.target.value)}
                          placeholder="مثال: د. أحمد مصطفى"
                          required
                        />
                      </div>
                      <span className="input-hint">الاسم الذي سيظهر لمرضاك على الروشتات وإيصالات الحجز.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span>اسم المستخدم المخصص (@username) *</span>
                        {usernameAvailability.available ? (
                          <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Check size={14} /> متاح للاستخدام
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertCircle size={14} /> محجوز مسبقاً
                          </span>
                        )}
                      </label>
                      <div className="form-input-wrapper">
                        <span style={{ position: 'absolute', right: '1rem', fontWeight: 800, color: usernameAvailability.available ? 'var(--primary)' : '#EF4444' }}>@</span>
                        <input
                          type="text"
                          className="form-input has-prefix"
                          value={username}
                          onChange={handleUsernameChange}
                          placeholder="dr-name-clinic"
                          style={{ 
                            direction: 'ltr', 
                            textAlign: 'left', 
                            paddingLeft: '1rem', 
                            paddingRight: '2.5rem',
                            borderColor: !usernameAvailability.available ? '#EF4444' : undefined
                          }}
                          required
                        />
                      </div>

                      {/* Live Username Availability / Taken Warning */}
                      {!usernameAvailability.available ? (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem 1rem',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '10px',
                          fontSize: '0.85rem',
                          color: '#DC2626',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                            <AlertCircle size={16} />
                            <span>{usernameAvailability.reason}</span>
                          </div>
                          {usernameAvailability.suggestions && usernameAvailability.suggestions.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>اقتراحات بديلة متاحة:</span>
                              {usernameAvailability.suggestions.map((sug) => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => setUsername(sug)}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    direction: 'ltr'
                                  }}
                                >
                                  @{sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="username-preview-box">
                          <span className="username-status">
                            <Check size={14} /> متاح ومناسب لعيادتك
                          </span>
                          <span className="username-url">clinicflow.com/c/{username || 'username'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        <span>رقم هاتف الطبيب / واتساب العيادة *</span>
                      </label>
                      <div className="form-input-wrapper">
                        <Phone className="input-prefix-icon" size={18} />
                        <input
                          type="tel"
                          className="form-input has-prefix"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01012345678"
                          style={{ direction: 'ltr', textAlign: 'left' }}
                        />
                      </div>
                      <span className="input-hint">لتلقي إشعارات الحجوزات الطارئة ورسائل المتابعة.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span>الدرجة العلمية / التوصيف السريري</span>
                      </label>
                      <div className="form-input-wrapper">
                        <Briefcase className="input-prefix-icon" size={18} />
                        <input
                          type="text"
                          className="form-input has-prefix"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="استشاري ورئيس القسم"
                        />
                      </div>
                      <span className="input-hint">مثال: استشاري جراحة، أخصائي أول، ماجستير طب وجراحة الفم.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CLINIC & SPECIALTY */}
              {step === 2 && (
                <div className="wizard-step-content">
                  <div className="wizard-header">
                    <h2>
                      <Building2 size={28} color="var(--primary)" />
                      <span>بيانات العيادة ونوع التخصص الطبي</span>
                    </h2>
                    <p>
                      اختر تخصص عيادتك ليقوم النظام تلقائياً بتجهيز قائمة الخدمات، فترات الكشف، وأنواع الزيارات وأسعارها بالجنيه المصري.
                    </p>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">
                      <span>اسم العيادة أو المركز الطبي *</span>
                    </label>
                    <div className="form-input-wrapper">
                      <Building2 className="input-prefix-icon" size={18} />
                      <input
                        type="text"
                        className="form-input has-prefix"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="مثال: عيادة النخبة التخصصية"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>نوع التخصص الطبي للعيادة *</span>
                    </label>

                    {/* Filter Tabs */}
                    <div className="specialty-filter-tabs">
                      <button
                        type="button"
                        className={`filter-pill-btn ${specialtyCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setSpecialtyCategory('all')}
                      >
                        جميع التخصصات (12)
                      </button>
                      <button
                        type="button"
                        className={`filter-pill-btn ${specialtyCategory === 'dental' ? 'active' : ''}`}
                        onClick={() => setSpecialtyCategory('dental')}
                      >
                        طب وجراحة الأسنان (6 تخصصات)
                      </button>
                      <button
                        type="button"
                        className={`filter-pill-btn ${specialtyCategory === 'medical' ? 'active' : ''}`}
                        onClick={() => setSpecialtyCategory('medical')}
                      >
                        تخصصات طبية وجراحية (6 تخصصات)
                      </button>
                    </div>

                    {/* Specialties Cards Grid */}
                    <div className="specialties-grid">
                      {filteredSpecialties.map((spec) => {
                        const isSelected = selectedSpecialtyId === spec.id;
                        return (
                          <div
                            key={spec.id}
                            className={`specialty-card-select ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedSpecialtyId(spec.id)}
                          >
                            <div className="specialty-card-top">
                              <div className="specialty-icon-box">
                                <Stethoscope size={18} />
                              </div>
                              <span className="specialty-badge-pill">{spec.badge || 'تخصصي'}</span>
                            </div>
                            <div className="specialty-card-name">{spec.name}</div>
                            <div className="specialty-card-desc">{spec.description}</div>
                            <div className="specialty-meta-tag">
                              <Sparkles size={14} />
                              <span>{spec.defaultServices?.length || 5} خدمات طبية مُجهزة تلقائياً</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        <span>المحافظة / المدينة</span>
                      </label>
                      <div className="form-input-wrapper">
                        <MapPin className="input-prefix-icon" size={18} />
                        <input
                          type="text"
                          className="form-input has-prefix"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="القاهرة - مصر الجديدة"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span>العنوان التفصيلي</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="شارع الميرغني، مبنى العيادات التخصصية"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: BRANDING & COLORS */}
              {step === 3 && (
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
                    {COLOR_PALETTES.map((pal) => {
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
                          ✓ تأكيد فوري عبر SMS وواتساب
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: TEAM SIZE & STAFF ROLES */}
              {step === 4 && (
                <div className="wizard-step-content">
                  <div className="wizard-header">
                    <h2>
                      <Users size={28} color="var(--primary)" />
                      <span>حجم فريق العمل وصلاحيات الطاقم</span>
                    </h2>
                    <p>
                      حدد عدد أفراد فريق العمل في العيادة، ويمكنك إنشاء أول حساب لموظف الاستقبال أو المساعد فوراً وتحديد صلاحياته بدقة.
                    </p>
                  </div>

                  {/* Team Size Grid */}
                  <div className="team-sizes-grid">
                    {TEAM_SIZES.map((t) => {
                      const isSelected = teamSize === t.id;
                      return (
                        <div
                          key={t.id}
                          className={`team-size-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setTeamSize(t.id)}
                        >
                          <span className="team-size-badge">{t.countBadge}</span>
                          <div className="team-size-title">{t.title}</div>
                          <div className="team-size-desc">{t.description}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Roles & Permissions Guide */}
                  <div className="roles-guide-container">
                    <div className="roles-guide-header">
                      <ShieldCheck size={18} color="var(--primary)" />
                      <span>دليل أدوار وصلاحيات الطاقم في ClinicFlow:</span>
                    </div>

                    <div className="roles-guide-grid">
                      {ROLES_INFO.map((r) => (
                        <div key={r.id} className="role-mini-card">
                          <div className="role-mini-name">{r.title}</div>
                          <div className="role-mini-desc">{r.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Initial Staff Member Creation Box */}
                  <div className="initial-staff-box">
                    <div 
                      className="initial-staff-toggle-row" 
                      onClick={() => setEnableInitialStaff(!enableInitialStaff)}
                    >
                      <div className="initial-staff-toggle-info">
                        <h4>إنشاء حساب للموظف الأول الآن (استقبال / سكرتارية)</h4>
                        <p>تفعيل هذا الخيار ينشئ حساباً جاهزاً لموظفك الأول برقم الهاتف للدخول فوراً.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableInitialStaff}
                        onChange={(e) => setEnableInitialStaff(e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {enableInitialStaff && (
                      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-label"><span>اسم الموظف *</span></label>
                            <input
                              type="text"
                              className="form-input"
                              value={initialStaffName}
                              onChange={(e) => setInitialStaffName(e.target.value)}
                              placeholder="مثال: سارة محمود"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label"><span>رقم هاتف الموظف (لتسجيل الدخول) *</span></label>
                            <input
                              type="tel"
                              className="form-input"
                              value={initialStaffPhone}
                              onChange={(e) => setInitialStaffPhone(e.target.value)}
                              placeholder="01098765432"
                              style={{ direction: 'ltr', textAlign: 'left' }}
                            />
                          </div>
                        </div>

                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-label"><span>الدور الوظيفي</span></label>
                            <select
                              className="form-input"
                              value={initialStaffRole}
                              onChange={(e) => setInitialStaffRole(e.target.value)}
                            >
                              <option value="receptionist">استقبال وسكرتارية أولى</option>
                              <option value="associate_doctor">طبيب ممارس / مساعد</option>
                              <option value="accountant">محاسب مالي للعيادة</option>
                              <option value="assistant">مساعد سريري وتمريض</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label"><span>كلمة المرور الافتراضية *</span></label>
                            <input
                              type="text"
                              className="form-input"
                              value={initialStaffPassword}
                              onChange={(e) => setInitialStaffPassword(e.target.value)}
                              placeholder="1234"
                            />
                          </div>
                        </div>

                        {/* Granular Permissions Checkboxes */}
                        <div style={{ marginTop: '1rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                            الصلاحيات الممنوحة لهذا الحساب:
                          </span>
                          <div className="permissions-checkboxes-grid">
                            {SYSTEM_PERMISSIONS.map((perm) => {
                              const isChecked = initialStaffPerms.includes(perm.id);
                              return (
                                <label 
                                  key={perm.id} 
                                  className={`perm-checkbox-item ${isChecked ? 'checked' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.id)}
                                  />
                                  <div>
                                    <div className="perm-label-title">{perm.name}</div>
                                    <div className="perm-label-desc">{perm.description}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* In-app management callout */}
                  <div className="inapp-staff-callout">
                    <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>إدارة الموظفين من داخل النظام:</strong> يمكنك في أي وقت بعد الدخول إضافة المزيد من الموظفين، تعديل بياناتهم وتغيير صلاحياتهم وتعيين الورديات من داخل لوحة التحكم عبر شاشة: <strong>الإعدادات ⚙️ ➔ إدارة فريق العمل والموظفين</strong>.
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Footer Controls */}
              <footer className="wizard-footer">
                <button
                  type="button"
                  className="btn-wizard-prev"
                  onClick={handlePrevStep}
                  disabled={step === 1 || submitting}
                >
                  <ArrowRight size={16} />
                  <span>السابق</span>
                </button>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {step < 4 ? (
                    <button
                      type="button"
                      className="btn-wizard-next"
                      onClick={handleNextStep}
                    >
                      <span>التالي ومتابعة الإعداد</span>
                      <ArrowLeft size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-wizard-next"
                      onClick={handleFinalSubmit}
                      disabled={submitting}
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                    >
                      <span>{submitting ? 'جاري تهيئة عيادتك...' : 'إتمام الإعداد وبدء استخدام العيادة 🚀'}</span>
                      <Sparkles size={16} />
                    </button>
                  )}
                </div>
              </footer>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
