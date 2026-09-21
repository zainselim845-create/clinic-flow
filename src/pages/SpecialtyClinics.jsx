import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, Baby, Eye, Heart, Scan, User, Search, 
  ArrowRight, ShieldCheck, Sparkles, FileText, ChevronDown
} from 'lucide-react';
import SpecialtyClinicalHub from '../components/specialty/SpecialtyClinicalHub';
import './SpecialtyClinics.css';

export default function SpecialtyClinics() {
  const { state } = useApp();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const patientParam = searchParams.get('patientId');

  const clinicSpecialty = tenant?.specialty || state.clinicInfo?.specialty || '';
  const clinicId = tenant?.id || state.clinicInfo?.id || 'default-clinic';
  const doctorName = user?.name || tenant?.doctorName || state.clinicInfo?.doctorName || 'طبيب العيادة';

  const patientsList = useMemo(() => {
    return state.patients || [];
  }, [state.patients]);

  // Selected patient state
  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    if (patientParam) return patientParam;
    if (patientsList.length > 0) return patientsList[0].id;
    return 'demo-patient-001';
  });

  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // Sync if patientParam changes
  useEffect(() => {
    if (patientParam && patientParam !== selectedPatientId) {
      setSelectedPatientId(patientParam);
    }
  }, [patientParam]);

  // Find active patient object
  const selectedPatient = useMemo(() => {
    const found = patientsList.find(p => String(p.id) === String(selectedPatientId));
    if (found) return found;

    // Fallback patient for clinical demonstration if database is empty
    return {
      id: selectedPatientId || 'demo-patient-001',
      name: 'مريض الفحص السريري',
      age: 28,
      gender: 'أنثى',
      phone: '01000000000',
      fileNumber: 'CF-2026-01'
    };
  }, [patientsList, selectedPatientId]);

  // Filtered patients for dropdown search
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patientsList.slice(0, 8);
    return patientsList.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.fileNumber && String(p.fileNumber).includes(q))
    ).slice(0, 10);
  }, [patientsList, patientSearch]);

  const handleSelectPatient = (patient) => {
    setSelectedPatientId(patient.id);
    setIsPatientDropdownOpen(false);
    setPatientSearch('');
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('patientId', patient.id);
      return next;
    });
  };

  const initialTab = ['pediatrics', 'ophthalmology', 'obgyn'].includes(tabParam) ? tabParam : undefined;
  const autoOpenDicom = tabParam === 'dicom';

  return (
    <div className="specialty-clinics-page" dir="rtl">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="specialty-header-bar">
        <div className="specialty-title-group">
          <div className="specialty-icon-badge">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="specialty-main-title">المخططات التخصصية وعارض الأشعة السريرية</h1>
            <p className="specialty-subtitle">
              أدوات الفحص السريري المتقدمة: نمو الأطفال (WHO)، انكسار النظر وفحص قاع العين، حاسبة الحمل وتتبع الأجنة، وعارض أشعة DICOM
            </p>
          </div>
        </div>

        {/* Patient Selection Bar */}
        <div className="patient-selector-wrapper">
          <div className="patient-selector-label">المريض المحدد للفحص:</div>
          <div className="patient-dropdown-container">
            <button
              type="button"
              onClick={() => setIsPatientDropdownOpen(prev => !prev)}
              className="patient-select-trigger"
              aria-expanded={isPatientDropdownOpen}
            >
              <User size={16} className="patient-icon" />
              <div className="patient-info-summary">
                <span className="patient-name">{selectedPatient.name}</span>
                <span className="patient-meta">
                  {selectedPatient.age ? `${selectedPatient.age} سنة` : ''} {selectedPatient.gender ? `• ${selectedPatient.gender}` : ''}
                </span>
              </div>
              <ChevronDown size={14} className={`dropdown-chevron ${isPatientDropdownOpen ? 'open' : ''}`} />
            </button>

            {isPatientDropdownOpen && (
              <div className="patient-dropdown-menu">
                <div className="patient-search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="بحث بالاسم أو رقم الهاتف..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="patient-options-list">
                  {filteredPatients.length === 0 ? (
                    <div className="no-patients-hint">
                      {patientsList.length === 0 ? 'لا يوجد مرضى مسجلين حتى الآن' : 'لا توجد نتائج مطابقة'}
                    </div>
                  ) : (
                    filteredPatients.map(patient => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => handleSelectPatient(patient)}
                        className={`patient-option-item ${patient.id === selectedPatient.id ? 'selected' : ''}`}
                      >
                        <span className="option-name">{patient.name}</span>
                        <span className="option-meta">
                          {patient.phone ? patient.phone : ''} {patient.age ? `• ${patient.age} سنة` : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Specialty Container Hosting the Clinical Hub */}
      <div className="specialty-main-container">
        <SpecialtyClinicalHub
          patientId={selectedPatient.id}
          clinicId={clinicId}
          patientName={selectedPatient.name}
          patientAge={Number(selectedPatient.age) || 25}
          clinicSpecialty={clinicSpecialty}
          doctorName={doctorName}
          initialTab={initialTab}
          autoOpenDicom={autoOpenDicom}
        />
      </div>
    </div>
  );
}
