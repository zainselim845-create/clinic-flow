import React, { useState, useEffect } from 'react';
import { 
  DEFAULT_DENTAL_VISIT_TYPES, addVisitType, updateVisitType, deleteVisitType 
} from '../../services/visitTypesService';
import { 
  Stethoscope, Plus, Trash2, Edit2, CheckCircle2, Clock, 
  DollarSign, Globe, Check, X 
} from 'lucide-react';
import './VisitTypesTab.css';

const normalizeTypes = (list) => {
  if (!list || list.length === 0) return DEFAULT_DENTAL_VISIT_TYPES;
  return list.map(vt => ({
    id: vt.id || 'vt_' + Math.random().toString(36).substring(2, 9),
    nameAr: vt.nameAr || vt.name || 'زيارة طبية',
    nameEn: vt.nameEn || '',
    durationMin: Number(vt.durationMin || vt.duration || 30),
    standardFee: Number(vt.standardFee !== undefined ? vt.standardFee : (vt.price ? parseInt(vt.price.toString().replace(/\D/g, '')) || 300 : 300)),
    colorCode: vt.colorCode || '#0D9488',
    isOnline: vt.isOnline !== undefined ? vt.isOnline : true,
    isDefault: Boolean(vt.isDefault)
  }));
};

const VisitTypesTab = ({ visitTypes = DEFAULT_DENTAL_VISIT_TYPES, onUpdateVisitTypes }) => {
  const [typesList, setTypesList] = useState(() => normalizeTypes(visitTypes));
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState(null);

  useEffect(() => {
    setTypesList(normalizeTypes(visitTypes));
  }, [visitTypes]);


  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    durationMin: 30,
    standardFee: 300,
    colorCode: '#0D9488',
    isOnline: true,
    isDefault: false
  });

  const handleOpenAdd = () => {
    setEditingType(null);
    setFormData({
      nameAr: '',
      nameEn: '',
      durationMin: 30,
      standardFee: 300,
      colorCode: '#0D9488',
      isOnline: true,
      isDefault: false
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (vt) => {
    setEditingType(vt);
    setFormData({
      nameAr: vt.nameAr,
      nameEn: vt.nameEn || '',
      durationMin: vt.durationMin || 30,
      standardFee: vt.standardFee || 0,
      colorCode: vt.colorCode || '#0D9488',
      isOnline: vt.isOnline !== undefined ? vt.isOnline : true,
      isDefault: Boolean(vt.isDefault)
    });
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nameAr) return;

    if (editingType) {
      const updated = { ...editingType, ...formData };
      await updateVisitType(editingType.id, updated);
      const newList = typesList.map(t => t.id === editingType.id ? updated : t);
      setTypesList(newList);
      if (onUpdateVisitTypes) onUpdateVisitTypes(newList);
    } else {
      const newType = {
        id: 'vt_' + Date.now(),
        ...formData
      };
      await addVisitType(newType);
      const newList = [...typesList, newType];
      setTypesList(newList);
      if (onUpdateVisitTypes) onUpdateVisitTypes(newList);
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف نوع الزيارة هذا؟')) return;
    await deleteVisitType(id);
    const newList = typesList.filter(t => t.id !== id);
    setTypesList(newList);
    if (onUpdateVisitTypes) onUpdateVisitTypes(newList);
  };

  return (
    <div className="visit-types-tab">
      
      <div className="tab-header-flex">
        <div>
          <h4>أنواع الزيارات والخدمات السريرية (Visit Types)</h4>
          <p>إدارة أنواع الكشوفات والإجراءات وأسعارها والمدة المحجوزة لكل منها على التقويم (مطابق لـ Nebras TypesGrid)</p>
        </div>
        <button onClick={handleOpenAdd} className="btn-add-type">
          <Plus size={16} />
          <span>إضافة نوع زيارة جديد</span>
        </button>
      </div>

      <div className="types-cards-grid">
        {typesList.map(vt => (
          <div key={vt.id} className="visit-type-card">
            <div className="type-card-top" style={{ borderTop: `4px solid ${vt.colorCode || '#0D9488'}` }}>
              <div className="type-title-group">
                <span className="type-color-bullet" style={{ backgroundColor: vt.colorCode || '#0D9488' }}></span>
                <div>
                  <h5>{vt.nameAr}</h5>
                  {vt.nameEn && <span className="type-subtitle-en">{vt.nameEn}</span>}
                </div>
              </div>

              <div className="type-card-actions">
                <button onClick={() => handleOpenEdit(vt)} className="btn-type-action edit" title="تعديل">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(vt.id)} className="btn-type-action delete" title="حذف">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="type-meta-details">
              <div className="type-meta-item">
                <Clock size={14} className="text-muted" />
                <span>المدة: <strong>{vt.durationMin} دقيقة</strong></span>
              </div>
              <div className="type-meta-item">
                <DollarSign size={14} className="text-muted" />
                <span>الرسوم: <strong className="text-fee">{vt.standardFee} ج.م</strong></span>
              </div>
            </div>

            <div className="type-badges-row">
              {vt.isOnline ? (
                <span className="type-badge online"><Globe size={12} /> متاح للحجز أونلاين</span>
              ) : (
                <span className="type-badge offline">داخل العيادة فقط</span>
              )}
              {vt.isDefault && (
                <span className="type-badge default"><Check size={12} /> افتراضي</span>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="types-modal-overlay">
          <div className="types-modal-box">
            
            <div className="types-modal-header">
              <h5>{editingType ? 'تعديل نوع الزيارة' : 'إضافة نوع زيارة جديد'}</h5>
              <button onClick={() => setShowAddModal(false)} className="btn-modal-x">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="types-modal-body">
              
              <div className="form-row-2">
                <div className="field-box">
                  <label>الاسم بالعربية *</label>
                  <input
                    type="text"
                    required
                    value={formData.nameAr}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameAr: e.target.value }))}
                    placeholder="مثال: حشو تجميلي كومبوزيت"
                  />
                </div>
                <div className="field-box">
                  <label>الاسم بالإنجليزية</label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                    placeholder="Composite Filling"
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="field-box">
                  <label>المدة (بالدقائق) *</label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    step="5"
                    required
                    value={formData.durationMin}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMin: Number(e.target.value) }))}
                  />
                </div>
                <div className="field-box">
                  <label>الرسوم التقديرية (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={formData.standardFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, standardFee: Number(e.target.value) }))}
                  />
                </div>
                <div className="field-box">
                  <label>لون التقويم</label>
                  <input
                    type="color"
                    className="color-picker-input"
                    value={formData.colorCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="checkboxes-row">
                <label className="type-checkbox-lbl">
                  <input
                    type="checkbox"
                    checked={formData.isOnline}
                    onChange={(e) => setFormData(prev => ({ ...prev, isOnline: e.target.checked }))}
                  />
                  <span>إظهار في بوابة الحجز الإلكتروني للمرضى</span>
                </label>
                <label className="type-checkbox-lbl">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  />
                  <span>تعيين كخيار افتراضي أولي</span>
                </label>
              </div>

              <div className="types-modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-cancel">
                  إلغاء
                </button>
                <button type="submit" className="btn-save">
                  <CheckCircle2 size={16} />
                  <span>حفظ التعديلات</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default VisitTypesTab;
