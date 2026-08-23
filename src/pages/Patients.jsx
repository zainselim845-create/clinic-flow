import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, LayoutGrid, List, X, Trash2, Edit2, Pill } from 'lucide-react';
import PatientCard from '../components/PatientCard';
import PrescriptionModal from '../components/PrescriptionModal';
import './Patients.css';

const Patients = () => {
  const { state, dispatch } = useApp();
  const { patients = [], appointments = [] } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'ذكر',
    phone: '',
    bloodType: '',
    diagnosis: '',
    notes: ''
  });

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone.includes(searchQuery)
  );

  const handleOpenDetail = (patient) => {
    setSelectedPatient(patient);
    setIsDetailModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المريض؟')) {
      dispatch({ type: 'DELETE_PATIENT', payload: id });
      setIsDetailModalOpen(false);
    }
  };

  const handleEdit = (patient) => {
    setFormData(patient);
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedPatient) {
      dispatch({ 
        type: 'UPDATE_PATIENT', 
        payload: { ...formData, id: selectedPatient.id } 
      });
    } else {
      const newPatient = {
        id: Date.now().toString(),
        ...formData,
        visitsCount: 0,
        lastVisit: null
      };
      dispatch({ type: 'ADD_PATIENT', payload: newPatient });
    }
    
    setIsModalOpen(false);
    setSelectedPatient(null);
    setFormData({ name: '', age: '', gender: 'ذكر', phone: '', bloodType: '', diagnosis: '', notes: '' });
  };

  const getPatientAppointments = (patientId) => {
    return appointments.filter(a => a.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="patients-page">
      <div className="page-header">
        <h2>إدارة المرضى</h2>
        <button className="btn-primary" onClick={() => {
          setSelectedPatient(null);
          setFormData({ name: '', age: '', gender: 'ذكر', phone: '', bloodType: '', diagnosis: '', notes: '' });
          setIsModalOpen(true);
        }}>
          <Plus size={20} />
          إضافة مريض
        </button>
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
        {filteredPatients.length > 0 ? (
          filteredPatients.map(patient => (
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
                <label>التشخيص</label>
                <input 
                  type="text" 
                  className="input-field"
                  value={formData.diagnosis || ''}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>ملاحظات</label>
                <textarea 
                  className="input-field"
                  rows="3"
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

      {/* Patient Detail Modal */}
      {isDetailModalOpen && selectedPatient && (
        <div className="modal-overlay">
          <div className="modal-content glass-card detail-modal">
            <div className="modal-header">
              <h3>ملف المريض</h3>
              <div className="header-actions">
                <button 
                  className="icon-btn rx-btn" 
                  onClick={() => setIsPrescriptionOpen(true)} 
                  title="تحرير وطباعة روشتة طبية لهذا المريض"
                  style={{ background: 'rgba(27, 111, 227, 0.1)', color: '#1B6FE3', borderRadius: '6px', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', border: '1px solid rgba(27,111,227,0.2)', fontWeight: 'bold' }}
                >
                  <Pill size={16} />
                  <span>روشتة طبية (Rx)</span>
                </button>
                <button className="icon-btn edit-btn" onClick={() => { setIsDetailModalOpen(false); handleEdit(selectedPatient); }}>
                  <Edit2 size={18} />
                </button>
                <button className="icon-btn delete-btn" onClick={() => handleDelete(selectedPatient.id)}>
                  <Trash2 size={18} />
                </button>
                <button className="close-btn" onClick={() => setIsDetailModalOpen(false)}>
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="patient-detail-info">
              <div className="info-block">
                <h4>{selectedPatient.name}</h4>
                <div className="info-grid">
                  <div className="info-item"><span>العمر:</span> {selectedPatient.age}</div>
                  <div className="info-item"><span>الجنس:</span> {selectedPatient.gender}</div>
                  <div className="info-item"><span>الهاتف:</span> {selectedPatient.phone}</div>
                  <div className="info-item"><span>فصيلة الدم:</span> {selectedPatient.bloodType || 'غير محدد'}</div>
                  <div className="info-item full"><span>التشخيص:</span> {selectedPatient.diagnosis || 'لا يوجد'}</div>
                  <div className="info-item full"><span>ملاحظات:</span> {selectedPatient.notes || 'لا يوجد'}</div>
                </div>
              </div>

              <div className="history-block">
                <h4>سجل الزيارات</h4>
                {getPatientAppointments(selectedPatient.id).length > 0 ? (
                  <ul className="visit-history">
                    {getPatientAppointments(selectedPatient.id).map(appt => (
                      <li key={appt.id}>
                        <div className="visit-date">{appt.date} - {appt.time}</div>
                        <div className="visit-type">{appt.type}</div>
                        <div className="visit-status" data-status={appt.status}>
                          {appt.status === 'completed' ? 'مكتمل' : appt.status === 'upcoming' ? 'قادم' : 'ملغي'}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-history">لا يوجد سجل زيارات.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={isPrescriptionOpen}
        onClose={() => setIsPrescriptionOpen(false)}
        patient={selectedPatient}
      />
    </div>
  );
};

export default Patients;
