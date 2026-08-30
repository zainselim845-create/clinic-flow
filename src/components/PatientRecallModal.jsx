import React, { useState, useMemo } from 'react';
import { 
  X, Plus, BellRing, Calendar, Phone, MessageCircle, 
  CheckCircle2, Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayDateStr } from '../utils/timeSlots';
import { recallPresets } from '../data/demoData';
import './PatientRecallModal.css';


export const PatientRecallModal = ({ isOpen, onClose, initialPatient }) => {
  const { state, dispatch } = useApp();
  const today = getTodayDateStr();

  const patients = state.patients || [];
  const recalls = state.recalls || [];

  const [selectedPatientId, setSelectedPatientId] = useState(initialPatient?.id || (patients[0]?.id || ''));
  const [selectedPresetId, setSelectedPresetId] = useState(recallPresets[0]?.id || '');
  const [customReason, setCustomReason] = useState('');
  const [intervalMonths, setIntervalMonths] = useState(3);
  const [customDueDate, setCustomDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Calculate default due date
  const calculatedDueDate = useMemo(() => {
    if (customDueDate) return customDueDate;
    const d = new Date();
    d.setMonth(d.getMonth() + Number(intervalMonths));
    return d.toISOString().split('T')[0];
  }, [intervalMonths, customDueDate]);

  const targetPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || initialPatient || null;
  }, [patients, selectedPatientId, initialPatient]);

  const filteredRecalls = useMemo(() => {
    return recalls.filter(r => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'due') return r.dueDate <= today && r.status !== 'completed';
      if (filterStatus === 'upcoming') return r.dueDate > today && r.status !== 'completed';
      return r.status === filterStatus;
    });
  }, [recalls, filterStatus, today]);

  const dueCount = useMemo(() => {
    return recalls.filter(r => r.dueDate <= today && r.status !== 'completed').length;
  }, [recalls, today]);

  if (!isOpen) return null;

  const handleAddRecall = (e) => {
    e.preventDefault();
    if (!targetPatient) return;

    const preset = recallPresets.find(p => p.id === selectedPresetId);
    const reasonText = customReason.trim() || preset?.title || 'متابعة دورية وفحص شامل';

    const newRecall = {
      id: 'rec-' + Date.now(),
      patientId: targetPatient.id,
      patientName: targetPatient.name,
      patientPhone: targetPatient.phone,
      reason: reasonText,
      intervalMonths: Number(intervalMonths),
      dueDate: calculatedDueDate,
      status: 'pending', // pending, contacted, scheduled, completed
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      lastContactedAt: null
    };

    dispatch({ type: 'ADD_RECALL', payload: newRecall });
    setCustomReason('');
    setNotes('');
  };

  const handleUpdateStatus = (id, newStatus) => {
    dispatch({
      type: 'UPDATE_RECALL_STATUS',
      payload: { 
        id, 
        status: newStatus,
        lastContactedAt: newStatus === 'contacted' ? new Date().toISOString() : undefined
      }
    });
  };

  const handleDeleteRecall = (id) => {
    if (window.confirm('هل أنت متأكد من إلغاء هذا الاستدعاء؟')) {
      dispatch({ type: 'DELETE_RECALL', payload: id });
    }
  };

  const generateWhatsAppRecallUrl = (recall) => {
    const clinicName = state.clinicInfo?.name || 'عيادة د. أحمد الشريف';
    const doctorPhone = state.clinicInfo?.phone || '01006285031';
    const cleanPhone = (recall.patientPhone || '').replace(/\D/g, '');
    
    const message = `مرحباً أستاذ/ة ${recall.patientName}،\nنود تذكيركم بموعدكم الدوري لمتابعة [${recall.reason}] لدى ${clinicName}.\n\nللحجز وتأكيد الموعد المناسب لكم، يرجى زيارة الرابط:\nhttps://clinic-flow-ten-sigma.vercel.app/booking\n\nأو الاتصال المباشر على:\n${doctorPhone}\n\nنتمنى لكم دوام الصحة والعافية.`;
    
    return `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="recall-modal-overlay">
      <div className="recall-modal-card glass-card">
        
        {/* Header */}
        <div className="modal-header">
          <div className="brand-title">
            <BellRing size={22} className="text-primary" />
            <h3>نظام استدعاء ومتابعة المرضى الدوري (Patient Recall System)</h3>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="recall-stats-strip">
          <div className="rec-stat-pill">
            <span>مستحق المتابعة الآن:</span>
            <strong style={{ color: dueCount > 0 ? '#ef4444' : '#10b981' }}>{dueCount} مريض</strong>
          </div>
          <div className="rec-stat-pill">
            <span>إجمالي خطط الاستدعاء:</span>
            <strong>{recalls.length} استدعاء</strong>
          </div>
        </div>

        <div className="modal-body-scrollable">
          
          {/* Schedule Recall Form */}
          <form onSubmit={handleAddRecall} className="schedule-recall-form">
            <h4 style={{ margin: '0 0 0.75rem 0', fontWeight: 800, fontSize: '0.95rem' }}>
              جدولة استدعاء دوري جديد لمريض:
            </h4>

            <div className="form-grid-3col">
              <div className="form-group">
                <label>اختر المريض *</label>
                <select 
                  className="input-field"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>نوع ونموذج الاستدعاء</label>
                <select 
                  className="input-field"
                  value={selectedPresetId}
                  onChange={(e) => {
                    setSelectedPresetId(e.target.value);
                    const preset = recallPresets.find(p => p.id === e.target.value);
                    if (preset) setIntervalMonths(preset.intervalMonths);
                  }}
                >
                  {recallPresets.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pr.title} ({pr.intervalMonths} أشهر)</option>
                  ))}
                  <option value="custom">سبب مخصص آخر...</option>
                </select>
              </div>

              <div className="form-group">
                <label>الفترة الزمنية (بالأشهر)</label>
                <select 
                  className="input-field"
                  value={intervalMonths}
                  onChange={(e) => {
                    setIntervalMonths(Number(e.target.value));
                    setCustomDueDate('');
                  }}
                >
                  <option value={1}>بعد شهر واحد (1)</option>
                  <option value={2}>بعد شهرين (2)</option>
                  <option value={3}>بعد 3 أشهر (ربع سنوي)</option>
                  <option value={6}>بعد 6 أشهر (نصف سنوي)</option>
                  <option value={12}>بعد سنة (سنوي)</option>
                </select>
              </div>

              <div className="form-group">
                <label>تاريخ الاستحقاق المحسوب</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={calculatedDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full-span-2">
                <label>سبب مخصص أو تعليمات الاستدعاء</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: فحص وظائف كلى وتحليل سكر تراكمي..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-add-rec-action">
                <Plus size={16} />
                <span>حفظ وجدولة الاستدعاء</span>
              </button>
            </div>
          </form>

          {/* Recall List Table */}
          <div className="recalls-list-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>
                قائمة استدعاءات المرضى ({filteredRecalls.length}):
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>تصفية الحالة:</span>
                <select 
                  className="input-field" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">كافة المواعيد</option>
                  <option value="due">مستحق المتابعة الآن</option>
                  <option value="upcoming">قادم لاحقاً</option>
                  <option value="contacted">تم التواصل</option>
                </select>
              </div>
            </div>

            {filteredRecalls.length === 0 ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                لا توجد خطط استدعاء مسجلة تطابق التصفية الحالية.
              </div>
            ) : (
              <div className="recalls-table-wrapper">
                <table className="recalls-data-table">
                  <thead>
                    <tr>
                      <th>اسم المريض</th>
                      <th>رقم الهاتف</th>
                      <th>سبب الاستدعاء</th>
                      <th>تاريخ الاستحقاق</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>تذكير واتساب</th>
                      <th style={{ textAlign: 'center' }}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecalls.map((rec) => {
                      const isOverdue = rec.dueDate <= today && rec.status !== 'completed';
                      return (
                        <tr key={rec.id} className={isOverdue ? 'row-overdue' : ''}>
                          <td style={{ fontWeight: 700 }}>{rec.patientName}</td>
                          <td dir="ltr" style={{ textAlign: 'right' }}>{rec.patientPhone}</td>
                          <td>{rec.reason}</td>
                          <td>
                            <strong style={{ color: isOverdue ? '#ef4444' : 'inherit' }}>
                              {rec.dueDate}
                            </strong>
                            {isOverdue && <span className="due-tag">مستحق الآن</span>}
                          </td>
                          <td>
                            <select 
                              className="status-select-badge"
                              value={rec.status}
                              onChange={(e) => handleUpdateStatus(rec.id, e.target.value)}
                            >
                              <option value="pending">قيد الانتظار</option>
                              <option value="contacted">تم التواصل</option>
                              <option value="scheduled">تم حجز موعد</option>
                              <option value="completed">مكتمل</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <a 
                              href={generateWhatsAppRecallUrl(rec)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-send-whatsapp-recall"
                              onClick={() => handleUpdateStatus(rec.id, 'contacted')}
                              title="إرسال رسالة تذكير مخصصة على واتساب"
                            >
                              <MessageCircle size={15} />
                              <span>واتساب</span>
                            </a>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              className="btn-trash-exp"
                              onClick={() => handleDeleteRecall(rec.id)}
                              title="إلغاء الاستدعاء"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
export default PatientRecallModal;
