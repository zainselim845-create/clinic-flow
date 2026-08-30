import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, Search, LayoutGrid, List, X, Download, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import PatientCard from '../components/PatientCard';
import PrescriptionModal from '../components/PrescriptionModal';
import PatientRecallModal from '../components/PatientRecallModal';
import PatientDossierDrawer from './dashboard/PatientDossierDrawer';
import { patientIndex } from '../services/indexedSearchService';
import * as patientsService from '../services/patientsService';
import './Patients.css';

const Patients = () => {
  const { state, dispatch } = useApp();
  const { patients = [], appointments = [], useSupabase } = state;


  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 18;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'ذكر',
    phone: '',
    bloodType: '',
    diagnosis: '',
    notes: ''
  });

  // High-performance search for 100k+ records
  const searchResult = useMemo(() => {
    return patientIndex.search(searchQuery, currentPage, PAGE_SIZE, patients);
  }, [patients, searchQuery, currentPage, PAGE_SIZE]);

  const paginatedPatients = searchResult.items;
  const totalPatientsCount = searchResult.total;
  const totalPages = searchResult.totalPages;


  const handleOpenDetail = (patient) => {
    setSelectedPatient(patient);
    setIsDetailModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPatient) {
      const updatedPayload = { ...formData, id: selectedPatient.id };
      if (useSupabase) {
        try {
          await patientsService.updatePatient(selectedPatient.id, updatedPayload);
        } catch (err) {
          console.error('Failed to update patient in Supabase:', err);
        }
      }
      dispatch({ 
        type: 'UPDATE_PATIENT', 
        payload: updatedPayload 
      });
      showToast('تم تعديل بيانات المريض بنجاح ', 'success');
    } else {
      const newPatient = {
        id: Date.now().toString(),
        ...formData,
        visitsCount: 0,
        lastVisit: null
      };
      if (useSupabase) {
        try {
          await patientsService.addPatient(newPatient);
        } catch (err) {
          console.error('Failed to add patient to Supabase:', err);
        }
      }
      dispatch({ type: 'ADD_PATIENT', payload: newPatient });
      showToast('تم إضافة المريض الجديد بنجاح ', 'success');
    }
    
    setIsModalOpen(false);
    setSelectedPatient(null);
    setFormData({ name: '', age: '', gender: 'ذكر', phone: '', bloodType: '', diagnosis: '', notes: '' });
  };

  const getPatientAppointments = (patientId) => {
    return appointments.filter(a => a.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const handleExportCSV = () => {
    if (!patients || patients.length === 0) {
      showToast('لا توجد بيانات مرضى للتصدير', 'info');
      return;
    }

    const headers = ['الاسم', 'العمر', 'الجنس', 'الهاتف', 'فصيلة الدم', 'التشخيص', 'عدد الزيارات', 'آخر زيارة', 'ملاحظات'];
    const rows = patients.map(p => [
      p.name || '',
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
    showToast('تم تصدير ملف المرضى (CSV) بنجاح ', 'success');
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

      <div className="page-header">
        <h2>إدارة المرضى</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={handleExportCSV} title="تصدير قائمة المرضى لملف إكسيل">
            <Download size={18} />
            <span>تصدير إكسيل (CSV)</span>
          </button>
          <button className="btn-primary" onClick={() => {
            setSelectedPatient(null);
            setFormData({ name: '', age: '', gender: 'ذكر', phone: '', bloodType: '', diagnosis: '', notes: '' });
            setIsModalOpen(true);
          }}>
            <Plus size={20} />
            إضافة مريض
          </button>
        </div>
      </div>

      <div className="filters-bar glass-card">
        <div className="search-box full-width">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو رقم الهاتف..." 
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      <div className={`patients-${viewMode}`}>
        {paginatedPatients.length > 0 ? (
          paginatedPatients.map(patient => (
            <div key={patient.id} onClick={() => handleOpenDetail(patient)}>
              <PatientCard patient={patient} />
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>لا يوجد مرضى مطابقين للبحث.</p>
          </div>
        )}
      </div>

      {/* High-Volume Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          margin: '2rem 0',
          padding: '0.75rem 1.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          width: 'fit-content',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ChevronRight size={16} />
            <span>السابق</span>
          </button>
          
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            صفحة {currentPage} من {totalPages} ({totalPatientsCount} مريض إجمالي)
          </span>


          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>التالي</span>
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>{selectedPatient ? 'تعديل بيانات المريض' : 'إضافة مريض جديد'}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>الاسم بالكامل</label>
                <input 
                  type="text" 
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>العمر</label>
                  <input 
                    type="number" 
                    className="input-field"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>الجنس</label>
                  <select 
                    className="input-field"
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input 
                    type="tel" 
                    className="input-field"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>فصيلة الدم</label>
                  <select 
                    className="input-field"
                    value={formData.bloodType || ''}
                    onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                  >
                    <option value="">غير معروف</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>التشخيص والشكوى المبدئية</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="مثال: ألم في الأسنان، فحص دوري..."
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label style={{ color: '#DC2626', fontWeight: 800 }}>تنبيهات طبية وحساسيات (Medical Alerts)</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="مثال: حساسية بنسلين، ضغط، سكري، أدوية سيولة..."
                  value={formData.medicalAlerts || ''}
                  onChange={(e) => setFormData({...formData, medicalAlerts: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>ملاحظات إضافية</label>
                <textarea 
                  className="input-field"
                  rows="2"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>


              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn-primary">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Full Clinical Dossier (Dental Chart, Notes, Treatment Plans, Rx) */}
      {isDetailModalOpen && selectedPatient && (
        <PatientDossierDrawer
          patient={selectedPatient}
          patientAppointments={getPatientAppointments(selectedPatient.id)}
          onClose={() => setIsDetailModalOpen(false)}
          onIssuePrescription={() => setIsPrescriptionModalOpen(true)}
        />
      )}


      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        patient={selectedPatient}
      />

      <PatientRecallModal
        isOpen={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        initialPatient={selectedPatient}
      />
    </div>
  );
};

export default Patients;
