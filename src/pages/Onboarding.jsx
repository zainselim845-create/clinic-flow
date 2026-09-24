import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { CLINIC_SPECIALTIES } from '../data/specialtiesData';
import { isUsernameAvailable } from '../services/authService';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import { 
  HeartPulse, 
  User, 
  LogOut, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles 
} from 'lucide-react';
import {
  OnboardingStepper,
  OnboardingStepDoctor,
  OnboardingStepClinic,
  OnboardingStepBranding,
  COLOR_PALETTES,
  OnboardingStepTeam,
  TEAM_SIZES,
  OnboardingSuccess
} from './onboarding/components';
import './Onboarding.css';

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
    const docClean = (user?.name || '').replace(/^د.?\s*/, '').trim();
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
          <FeatureErrorBoundary featureName="Onboarding Success Screen">
            <OnboardingSuccess
              clinicName={clinicName}
              doctorName={doctorName}
              username={username}
              selectedSpecialtyObj={selectedSpecialtyObj}
              teamSizeTitle={TEAM_SIZES.find(t => t.id === teamSize)?.title}
              enableInitialStaff={enableInitialStaff}
              initialStaffName={initialStaffName}
              initialStaffPhone={initialStaffPhone}
              handleGoToDashboard={handleGoToDashboard}
            />
          </FeatureErrorBoundary>
        ) : (
          <>
            {/* Stepper Progress */}
            <FeatureErrorBoundary featureName="Onboarding Stepper">
              <OnboardingStepper step={step} />
            </FeatureErrorBoundary>

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
                <FeatureErrorBoundary featureName="Onboarding Step 1 (Doctor Profile)">
                  <OnboardingStepDoctor
                    doctorName={doctorName}
                    setDoctorName={setDoctorName}
                    username={username}
                    setUsername={setUsername}
                    handleUsernameChange={handleUsernameChange}
                    usernameAvailability={usernameAvailability}
                    phone={phone}
                    setPhone={setPhone}
                    jobTitle={jobTitle}
                    setJobTitle={setJobTitle}
                  />
                </FeatureErrorBoundary>
              )}

              {/* STEP 2: CLINIC & SPECIALTY */}
              {step === 2 && (
                <FeatureErrorBoundary featureName="Onboarding Step 2 (Clinic & Specialty)">
                  <OnboardingStepClinic
                    clinicName={clinicName}
                    setClinicName={setClinicName}
                    specialtyCategory={specialtyCategory}
                    setSpecialtyCategory={setSpecialtyCategory}
                    filteredSpecialties={filteredSpecialties}
                    selectedSpecialtyId={selectedSpecialtyId}
                    setSelectedSpecialtyId={setSelectedSpecialtyId}
                    city={city}
                    setCity={setCity}
                    address={address}
                    setAddress={setAddress}
                  />
                </FeatureErrorBoundary>
              )}

              {/* STEP 3: BRANDING & COLORS */}
              {step === 3 && (
                <FeatureErrorBoundary featureName="Onboarding Step 3 (Branding & Palette)">
                  <OnboardingStepBranding
                    palettes={COLOR_PALETTES}
                    selectedPaletteId={selectedPaletteId}
                    handleSelectPalette={handleSelectPalette}
                    primaryColor={primaryColor}
                    setPrimaryColor={setPrimaryColor}
                    accentColor={accentColor}
                    setAccentColor={setAccentColor}
                    setSelectedPaletteId={setSelectedPaletteId}
                    clinicName={clinicName}
                    doctorName={doctorName}
                    selectedSpecialtyObj={selectedSpecialtyObj}
                    address={address}
                  />
                </FeatureErrorBoundary>
              )}

              {/* STEP 4: TEAM SIZE & STAFF ROLES */}
              {step === 4 && (
                <FeatureErrorBoundary featureName="Onboarding Step 4 (Team & Staff)">
                  <OnboardingStepTeam
                    teamSizes={TEAM_SIZES}
                    teamSize={teamSize}
                    setTeamSize={setTeamSize}
                    enableInitialStaff={enableInitialStaff}
                    setEnableInitialStaff={setEnableInitialStaff}
                    initialStaffName={initialStaffName}
                    setInitialStaffName={setInitialStaffName}
                    initialStaffPhone={initialStaffPhone}
                    setInitialStaffPhone={setInitialStaffPhone}
                    initialStaffRole={initialStaffRole}
                    setInitialStaffRole={setInitialStaffRole}
                    initialStaffPassword={initialStaffPassword}
                    setInitialStaffPassword={setInitialStaffPassword}
                    initialStaffPerms={initialStaffPerms}
                    handleTogglePermission={handleTogglePermission}
                  />
                </FeatureErrorBoundary>
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
                      <span>{submitting ? 'جاري تهيئة عيادتك...' : 'إتمام الإعداد وبدء استخدام العيادة'}</span>
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
