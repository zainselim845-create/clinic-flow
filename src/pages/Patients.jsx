import React, { useMemo, useState, useDeferredValue, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useTenant } from '@/context/TenantContext';
import PatientRecallModal from '@/components/PatientRecallModal';
import PatientDossierDrawer from '@/pages/dashboard/PatientDossierDrawer';
import ExcelPatientImportModal from '@/components/ExcelPatientImportModal';
import FeatureErrorBoundary from '@/components/FeatureErrorBoundary';
import { patientIndex } from '@/features/platform/services/indexedSearchService';
import * as patientsService from '@/features/patients/services/patientsService';
import { syncOutbox } from '@/lib/syncOutbox';
import useDebounce from '@/hooks/useDebounce';
import {
  PatientsHeader,
  PatientsFiltersBar,
  PatientsGrid,
  PatientFormModal
} from '@/components/patients';
import './Patients.css';

const Patients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch, refreshClinicData } = useApp();
  const { tenant } = useTenant();
  const { patients = [], appointments = [], useSupabase } = state;
  const currentClinicId = tenant?.id || state.clinicInfo?.id;
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const dueRecallsCount = useMemo(() => {
    return (state?.recalls || []).filter(r => {
      if (!r) return false;
      const rClinicId = r.clinicId || r.clinic_id;
      if (rClinicId && currentClinicId && rClinicId !== currentClinicId) return false;
      return r.dueDate <= todayStr && r.status !== 'completed';
    }).length;
  }, [state?.recalls, currentClinicId, todayStr]);

  // Filter patients by clinic (Strict Tenant Isolation)
  const clinicPatients = useMemo(() => {
    if (!currentClinicId) return [];
    return patients.filter(p => {
      if (!p || (!p.name && !p.phone)) return false;
      const pClinicId = p.clinicId || p.clinic_id;
      return pClinicId === currentClinicId;
    });
  }, [patients, currentClinicId]);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 200);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 18;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync index with patients pool scoped to clinic
  useEffect(() => {
    patientIndex.buildIndex(clinicPatients, currentClinicId);
  }, [clinicPatients, currentClinicId]);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'ذكر',
    phone: '',
    governorate: '',
    bloodType: '',
    diagnosis: '',
    medicalAlerts: '',
    notes: ''
  });

  const handleOpenNewPatient = () => {
    setSelectedPatient(null);
    setFormData({
      name: '',
      age: '',
      gender: 'ذكر',
      phone: '',
      governorate: '',
      bloodType: '',
      diagnosis: '',
      medicalAlerts: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Handle action=new from external navigation (e.g. from Appointments modal)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      handleOpenNewPatient();
    }
  }, [location.search]);

  // High-performance search for 100k+ records using deferred non-blocking query
  const searchResult = useMemo(() => {
    return patientIndex.search(deferredQuery, currentPage, PAGE_SIZE, clinicPatients, currentClinicId);
  }, [clinicPatients, currentClinicId, deferredQuery, currentPage, PAGE_SIZE]);

  const paginatedPatients = searchResult.items;
  const totalPatientsCount = searchResult.total;
  const totalPages = searchResult.totalPages;

  const handleOpenDetail = (patient) => {
    setSelectedPatient(patient);
    setIsDetailModalOpen(true);
  };

  const handleEditPatient = (patient, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedPatient(patient);
    setFormData({
      name: patient.name || '',
      age: patient.age || '',
      gender: patient.gender || 'ذكر',
      phone: patient.phone || '',
      governorate: patient.governorate || '',
      bloodType: patient.bloodType || '',
      diagnosis: patient.diagnosis || '',
      medicalAlerts: patient.medicalAlerts || '',
      notes: patient.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPatient) {
      const updatedPayload = { 
        ...formData, 
        id: selectedPatient.id,
        clinicId: selectedPatient.clinicId || currentClinicId,
        clinic_id: selectedPatient.clinic_id || currentClinicId
      };
      if (useSupabase) {
        try {
          const res = await patientsService.updatePatient(selectedPatient.id, updatedPayload, currentClinicId);
          if (res?.error) {
            console.warn('[Patients] Remote update failed, queueing to outbox:', res.error);
            syncOutbox.enqueue({
              entityType: 'patient',
              action: 'update',
              payload: updatedPayload,
              clinicId: currentClinicId
            });
          }
        } catch (err) {
          console.warn('[Patients] Remote update error, queueing to outbox:', err);
          syncOutbox.enqueue({
            entityType: 'patient',
            action: 'update',
            payload: updatedPayload,
            clinicId: currentClinicId
          });
        }
      }
      dispatch({ 
        type: 'UPDATE_PATIENT', 
        payload: updatedPayload 
      });
      showToast('تم تعديل بيانات المريض بنجاح', 'success');
    } else {
      const cleanPhone = (formData.phone || '').trim().replace(/\D/g, '');
      if (cleanPhone) {
        const duplicate = clinicPatients.find(p => (p.phone || '').trim().replace(/\D/g, '') === cleanPhone);
        if (duplicate) {
          showToast(`تنبيه: يوجد مريض مسجل مسبقاً بنفس رقم الهاتف (${duplicate.name})`, 'warning');
        }
      }

      const newPatient = {
        id: Date.now().toString(),
        clinicId: currentClinicId,
        clinic_id: currentClinicId,
        ...formData,
        visitsCount: 0,
        lastVisit: null
      };
      if (useSupabase) {
        try {
          const res = await patientsService.addPatient(newPatient);
          if (res?.data?.id) {
            newPatient.id = res.data.id;
          } else if (res?.error) {
            console.warn('[Patients] Remote table sync unavailable, saving locally and queuing to outbox:', res.error.message);
            syncOutbox.enqueue({
              entityType: 'patient',
              action: 'create',
              payload: newPatient,
              clinicId: currentClinicId
            });
          }
        } catch (err) {
          console.warn('[Patients] Remote sync error, saving locally and queuing to outbox:', err);
          syncOutbox.enqueue({
            entityType: 'patient',
            action: 'create',
            payload: newPatient,
            clinicId: currentClinicId
          });
        }
      }
      dispatch({ type: 'ADD_PATIENT', payload: newPatient });
      showToast('تم إضافة المريض الجديد بنجاح', 'success');
    }
    
    setIsModalOpen(false);
    setSelectedPatient(null);
    setFormData({ name: '', age: '', gender: 'ذكر', phone: '', governorate: '', bloodType: '', diagnosis: '', medicalAlerts: '', notes: '' });
  };

  const getPatientAppointments = (patientId) => {
    return appointments.filter(a => a.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Safe tenant-isolated CSV export (exports clinicPatients only)
  const handleExportCSV = () => {
    if (!clinicPatients || clinicPatients.length === 0) {
      showToast('لا توجد بيانات مرضى للتصدير', 'info');
      return;
    }

    const headers = ['الاسم', 'المحافظة', 'العمر', 'الجنس', 'الهاتف', 'فصيلة الدم', 'التشخيص', 'عدد الزيارات', 'آخر زيارة', 'ملاحظات'];
    const rows = clinicPatients.map(p => [
      p.name || '',
      p.governorate || '',
      p.age || '',
      p.gender || '',
      p.phone || '',
      p.bloodType || '',
      p.diagnosis || '',
      p.visitsCount || 0,
      p.lastVisit || '',
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clinicflow_patients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير ملف المرضى (CSV) بنجاح', 'success');
  };

  const handleImportPatients = async (newPatientsList) => {
    if (!newPatientsList || newPatientsList.length === 0) return;

    if (useSupabase) {
      try {
        await patientsService.addPatientsBulk(newPatientsList);
      } catch (err) {
        console.error('Failed to import patients to Supabase:', err);
      }
    }

    dispatch({ type: 'ADD_PATIENTS_BULK', payload: newPatientsList });
    showToast(`تم استيراد ${newPatientsList.length} مريض بنجاح إلى قاعدة بيانات العيادة.`, 'success');
  };

  return (
    <div className="patients-page">
      {toastMessage && (
        <div className={`patients-toast-banner ${toastMessage.type}`} style={{
          background: toastMessage.type === 'warning' ? '#fef3c7' : toastMessage.type === 'success' ? '#dcfce7' : '#e0f2fe',
          border: `1px solid ${toastMessage.type === 'warning' ? '#fcd34d' : toastMessage.type === 'success' ? '#86efac' : '#7dd3fc'}`,
          color: toastMessage.type === 'warning' ? '#92400e' : toastMessage.type === 'success' ? '#166534' : '#0369a1',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <FeatureErrorBoundary featureName="Patients Header">
        <PatientsHeader
          onOpenImport={() => setIsImportModalOpen(true)}
          onExportCSV={handleExportCSV}
          onOpenNewPatient={handleOpenNewPatient}
          onOpenRecalls={() => setIsRecallModalOpen(true)}
          dueRecallsCount={dueRecallsCount}
        />
      </FeatureErrorBoundary>

      {/* Filters Bar */}
      <FeatureErrorBoundary featureName="Patients Filters Bar">
        <PatientsFiltersBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </FeatureErrorBoundary>

      {/* Patients Grid / List */}
      <FeatureErrorBoundary featureName="Patients Data Grid">
        <PatientsGrid
          viewMode={viewMode}
          paginatedPatients={paginatedPatients}
          searchQuery={searchQuery}
          totalPatientsCount={totalPatientsCount}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          setSearchQuery={setSearchQuery}
          handleOpenDetail={handleOpenDetail}
          handleEditPatient={handleEditPatient}
          onOpenNewPatient={handleOpenNewPatient}
          isLoading={state.isLoading}
          loadError={state.loadError}
          onRetryFetch={refreshClinicData}
        />
      </FeatureErrorBoundary>

      {/* Add / Edit Patient Modal */}
      <FeatureErrorBoundary featureName="Patient Form Modal">
        <PatientFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedPatient={selectedPatient}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
        />
      </FeatureErrorBoundary>

      {/* Patient Clinical Dossier (Clinical Notes, Treatment Plans) */}
      {isDetailModalOpen && selectedPatient && (
        <FeatureErrorBoundary featureName="Patient Dossier Drawer">
          <PatientDossierDrawer
            patient={selectedPatient}
            patientAppointments={getPatientAppointments(selectedPatient.id)}
            onClose={() => setIsDetailModalOpen(false)}
            onEdit={handleEditPatient}
            onOpenRecall={(p) => {
              setSelectedPatient(p);
              setIsDetailModalOpen(false);
              setIsRecallModalOpen(true);
            }}
          />
        </FeatureErrorBoundary>
      )}

      {/* Patient Recall Modal */}
      <FeatureErrorBoundary featureName="Patient Recall Modal">
        <PatientRecallModal
          isOpen={isRecallModalOpen}
          onClose={() => setIsRecallModalOpen(false)}
          initialPatient={selectedPatient}
          onScheduleAppointment={(recall) => {
            setIsRecallModalOpen(false);
            navigate(`/appointments?action=new&patientId=${encodeURIComponent(recall.patientId)}&date=${encodeURIComponent(recall.dueDate || todayStr)}&type=${encodeURIComponent(recall.reason)}&recallId=${encodeURIComponent(recall.id)}`);
          }}
        />
      </FeatureErrorBoundary>

      {/* Excel Patient Import Modal */}
      <FeatureErrorBoundary featureName="Excel Patient Import Modal">
        <ExcelPatientImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingPatients={clinicPatients}
          clinicId={currentClinicId}
          onImportComplete={handleImportPatients}
        />
      </FeatureErrorBoundary>
    </div>
  );
};

export default Patients;
