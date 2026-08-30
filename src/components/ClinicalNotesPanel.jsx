import React, { useState } from 'react';
import { addClinicalNote, deleteClinicalNote } from '../services/clinicalNotesService';
import { Plus, Trash2, FileText, CheckCircle2, User, Clock } from 'lucide-react';

import './ClinicalNotesPanel.css';

const ClinicalNotesPanel = ({ patientId, doctorName = 'د. أحمد الشريف', notes = [], onNotesUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [nextVisitPlan, setNextVisitPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!chiefComplaint && !treatmentNotes) return;

    setIsSubmitting(true);
    const newNote = {
      id: Date.now().toString(),
      patientId,
      doctorName,
      chiefComplaint,
      diagnosis,
      treatmentNotes,
      nextVisitPlan,
      createdAt: new Date().toISOString()
    };

    try {
      await addClinicalNote(newNote);
      if (onNotesUpdate) {
        onNotesUpdate([newNote, ...notes]);
      }
      setChiefComplaint('');
      setDiagnosis('');
      setTreatmentNotes('');
      setNextVisitPlan('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Error saving clinical note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteClinicalNote(id);
      if (onNotesUpdate) {
        onNotesUpdate(notes.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  return (
    <div className="clinical-notes-panel">
      
      <div className="panel-header-row">
        <div>
          <h4>سجل الملاحظات السريرية والتشخيص (Clinical Notes)</h4>
          <p>سجل الفحص السريري، الشكوى الرئيسية، وخطة العلاج المنفذة في كل زيارة</p>
        </div>

        <button 
          type="button" 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-add-note"
        >
          <Plus size={16} />
          <span>{showAddForm ? 'إغلاق النموذج' : 'إضافة ملاحظة فحص جديدة'}</span>
        </button>
      </div>

      {/* New Note Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="new-note-form">
          <div className="form-fields-grid">
            
            <div className="form-group">
              <label>الشكوى الرئيسية (Chief Complaint) *</label>
              <textarea
                rows="2"
                className="panel-textarea"
                placeholder="مثال: ألم حاد في الضرس العلوي الأيمن عند شرب السوائل الباردة..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>التشخيص السريري (Clinical Diagnosis)</label>
              <textarea
                rows="2"
                className="panel-textarea"
                placeholder="مثال: التهاب عصب حاد في الضرس #16 مع تسوس عميق..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>الإجراء الطبي والعلاج المنفذ (Treatment Rendered)</label>
              <textarea
                rows="2"
                className="panel-textarea"
                placeholder="مثال: تم إزالة التسوس بالكامل، فتح حجرة العصب واستئصال اللب..."
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>خطة وتوصيات الزيارة القادمة (Next Visit Plan)</label>
              <textarea
                rows="2"
                className="panel-textarea"
                placeholder="مثال: حشو القنوات الدائم ووضع حشو زجاجي مؤقت للتاج..."
                value={nextVisitPlan}
                onChange={(e) => setNextVisitPlan(e.target.value)}
              />
            </div>

          </div>

          <div className="form-submit-row">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-save-note"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ الملاحظة في السجل'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Notes Chronological Timeline */}
      <div className="notes-timeline">
        {notes.length === 0 ? (
          <div className="empty-notes-hint">
            <FileText size={32} className="text-muted" />
            <p>لا توجد ملاحظات سريرية مسجلة بعد لهذا المريض. اضغط "إضافة ملاحظة" لتدوين نتائج الفحص.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="note-card-item">
              <div className="note-card-header">
                <div className="note-header-meta">
                  <User size={15} className="text-primary" />
                  <strong>{note.doctorName || doctorName}</strong>
                  <span className="note-date">
                    <Clock size={13} />
                    {new Date(note.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'full' })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="btn-del-note"
                  title="حذف الملاحظة"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="note-card-content">
                {note.chiefComplaint && (
                  <div className="content-row">
                    <span className="row-lbl">الشكوى:</span>
                    <p className="row-txt">{note.chiefComplaint}</p>
                  </div>
                )}
                {note.diagnosis && (
                  <div className="content-row">
                    <span className="row-lbl">التشخيص:</span>
                    <p className="row-txt text-highlight">{note.diagnosis}</p>
                  </div>
                )}
                {note.treatmentNotes && (
                  <div className="content-row">
                    <span className="row-lbl">العلاج المنفذ:</span>
                    <p className="row-txt">{note.treatmentNotes}</p>
                  </div>
                )}
                {note.nextVisitPlan && (
                  <div className="content-row plan-row">
                    <span className="row-lbl">الزيارة القادمة:</span>
                    <p className="row-txt">{note.nextVisitPlan}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default ClinicalNotesPanel;
