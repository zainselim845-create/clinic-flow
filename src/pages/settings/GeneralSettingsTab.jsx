import React, { useState } from 'react';
import { 
  Building2, Save, CheckCircle2, Phone, Mail, Clock, KeyRound, 
  CalendarDays, ArrowLeft, Plus, Trash2, Stethoscope
} from 'lucide-react';

import { defaultServices } from '../../data/demoData';
import { CLINIC_SPECIALTIES } from '../../data/specialtiesData';

export default function GeneralSettingsTab({
  clinicForm,
  setClinicForm,
  handleSaveClinic,
  clinicSaveSuccess,
  onNavigateToSchedule
}) {
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [specialtyNotice, setSpecialtyNotice] = useState('');
  const [serviceError, setServiceError] = useState('');

  const handleSelectSpecialty = (specId) => {
    const spec = CLINIC_SPECIALTIES.find(s => s.id === specId);
    if (!spec) return;
    setClinicForm(prev => ({
      ...prev,
      specialty: spec.name,
      category: spec.category,
      services: spec.defaultServices || prev.services,
      visitTypes: spec.defaultVisitTypes || prev.visitTypes
    }));
    setSpecialtyNotice(`تم تفعيل تخصص (${spec.name}) وتحميل الخدمات والعيادات النموذجية تلقائياً!`);
    setTimeout(() => setSpecialtyNotice(''), 5000);
  };


  const services = clinicForm.services || defaultServices;


  const handleAddService = (e) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServicePrice.trim()) return;

    const cleanNum = newServicePrice.replace(/\D/g, '');
    const formattedPrice = cleanNum ? `${cleanNum} ج.م` : newServicePrice;

    const newService = {
      id: 'srv-' + Date.now(),
      name: newServiceName.trim(),
      price: formattedPrice,
      duration: Number(newServiceDuration) || 30,
      description: newServiceDesc.trim() || 'خدمة طبية تخصصية'
    };

    setClinicForm({
      ...clinicForm,
      services: [...services, newService]
    });

    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDuration('30');
    setNewServiceDesc('');
    setIsAddingService(false);
  };

  const handleDeleteService = (id) => {
    if (services.length <= 1) {
      setServiceError('يجب الإبقاء على خدمة طبية واحدة على الأقل في دليل العيادة.');
      setTimeout(() => setServiceError(''), 4000);
      return;
    }
    setServiceError('');
    setClinicForm({
      ...clinicForm,
      services: services.filter(s => s.id !== id)
    });
  };

  return (
    <form onSubmit={handleSaveClinic} className="settings-section">
      <div className="section-header">
        <div>
          <h3>هوية وملف العيادة والتسعير</h3>
          <p>البيانات الأساسية التي تظهر للمرضى في صفحة الحجز، والأسعار، وترويسة التقارير</p>
        </div>
        <button type="submit" className="btn btn-primary btn-save">
          <Save size={18} />
          <span>حفظ التعديلات</span>
        </button>
      </div>

      {clinicSaveSuccess && (
        <div className="settings-alert success">
          <CheckCircle2 size={18} />
          <span>تم حفظ وتحديث بيانات العيادة بنجاح!</span>
        </div>
      )}

      {/* Quick link banner to Schedule & Calendar builder */}
      {onNavigateToSchedule && (
        <div className="schedule-shortcut-banner" onClick={onNavigateToSchedule}>
          <div className="shortcut-info">
            <CalendarDays size={22} className="text-primary" />
            <div>
              <strong>ضبط جدول العمل وساعات الكشف والتقويم التفاعلي:</strong>
              <p>يمكنك تفعيل/تعطيل أيام الأسبوع، وقفل الإجازات والمواعيد بالساعة تفاعلياً من تبويب منشئ الجدول.</p>
            </div>
          </div>
          <button type="button" className="btn-shortcut-action">
            <span>فتح التقويم والجدول</span>
            <ArrowLeft size={16} />
          </button>
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label>اسم العيادة الرسمي</label>
          <div className="input-with-icon">
            <Building2 size={18} />
            <input 
              type="text" 
              value={clinicForm.name || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
              placeholder="مثال: عيادة د. أحمد الشريف" 
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label>اسم الطبيب المسؤول</label>
          <input 
            type="text" 
            value={clinicForm.doctorName || ''} 
            onChange={(e) => setClinicForm({ ...clinicForm, doctorName: e.target.value })}
            placeholder="مثال: د. أحمد الشريف" 
            required 
          />
        </div>

        <div className="form-group full-width specialty-picker-card">
          <div className="specialty-picker-header">
            <div>
              <label>التخصص الطبي السريري للعيادة *</label>
              <p className="field-hint">اختر تخصص عيادتك لضبط الملفات الطبية، والخدمات، والكشوفات النموذجية تلقائياً</p>
            </div>
            {specialtyNotice && (
              <span className="specialty-notice-badge">
                <CheckCircle2 size={15} />
                <span>{specialtyNotice}</span>
              </span>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="specialty-filter-tabs">
            <button
              type="button"
              className={`specialty-filter-btn ${activeCategoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('all')}
            >
              جميع التخصصات ({CLINIC_SPECIALTIES.length})
            </button>
            <button
              type="button"
              className={`specialty-filter-btn ${activeCategoryFilter === 'dental' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('dental')}
            >
              🦷 طب وجراحة الأسنان ({CLINIC_SPECIALTIES.filter(s => s.category === 'dental').length})
            </button>
            <button
              type="button"
              className={`specialty-filter-btn ${activeCategoryFilter === 'medical' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('medical')}
            >
              🩺 الطب البشري والتخصصات ({CLINIC_SPECIALTIES.filter(s => s.category === 'medical').length})
            </button>
          </div>

          {/* Interactive Specialty Cards Grid */}
          <div className="specialty-cards-grid">
            {CLINIC_SPECIALTIES
              .filter(s => activeCategoryFilter === 'all' || s.category === activeCategoryFilter)
              .map(spec => {
                const isSelected = clinicForm.specialty === spec.name;
                const emoji = spec.category === 'dental' 
                  ? (spec.id === 'orthodontics' ? '📐' : spec.id === 'implantology' ? '🔩' : spec.id === 'endodontics' ? '🔬' : spec.id === 'prosthodontics' ? '✨' : spec.id === 'pedodontics' ? '👶' : '🦷')
                  : (spec.id === 'dermatology' ? '🌸' : spec.id === 'pediatrics' ? '👶' : spec.id === 'orthopedics' ? '🦴' : spec.id === 'ophthalmology' ? '👁️' : spec.id === 'obstetrics_gynecology' ? '🤰' : '🩺');

                return (
                  <div
                    key={spec.id}
                    className={`specialty-card-item ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectSpecialty(spec.id)}
                  >
                    <div className="specialty-card-header">
                      <span className="specialty-card-icon">{emoji}</span>
                      <span className="specialty-card-badge">{spec.badge || (spec.category === 'dental' ? 'أسنان' : 'طبي')}</span>
                    </div>
                    <h4 className="specialty-card-title">{spec.name}</h4>
                    <p className="specialty-card-desc">{spec.description}</p>
                    {isSelected && (
                      <div className="specialty-active-check">
                        <CheckCircle2 size={14} />
                        <span>التخصص النشط المعتمد</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="custom-specialty-input-group">
            <label className="sub-field-label">المسمى واللقب الأكاديمي والمهني للطبيب (كما يظهر في ترويسة الروشتات وبوابة الحجز):</label>
            <input 
              type="text" 
              value={clinicForm.specialty || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, specialty: e.target.value })}
              placeholder="مثال: استشاري طب وجراحة الفم والأسنان وتجميل الابتسامة" 
              required
            />
          </div>
        </div>



        <div className="form-group">
          <label>رقم هاتف العيادة (للتواصل)</label>
          <div className="input-with-icon">
            <Phone size={18} />
            <input 
              type="tel" 
              value={clinicForm.phone || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
              placeholder="01006285031" 
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>عنوان العيادة بالتفصيل</label>
          <input 
            type="text" 
            value={clinicForm.address || ''} 
            onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
            placeholder="مثال: مصر الجديدة — شارع الأهرام، برج الأطباء، الدور الرابع" 
          />
        </div>

        <div className="form-group">
          <label>رسوم الكشف الافتراضي (ج.م)</label>
          <input 
            type="text" 
            value={clinicForm.regularFee || ''} 
            onChange={(e) => setClinicForm({ ...clinicForm, regularFee: e.target.value })}
            placeholder="300 ج.م" 
          />
        </div>

        <div className="form-group">
          <label>رسوم الاستشارة / المتابعة (ج.م)</label>
          <input 
            type="text" 
            value={clinicForm.consultationFee || ''} 
            onChange={(e) => setClinicForm({ ...clinicForm, consultationFee: e.target.value })}
            placeholder="150 ج.م" 
          />
        </div>

        <div className="form-group full-width">
          <label>مواعيد وأيام العمل المعلنة للمرضى (نص توضيحي)</label>
          <div className="input-with-icon">
            <Clock size={18} />
            <input 
              type="text" 
              value={clinicForm.workingHours || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, workingHours: e.target.value })}
              placeholder="السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً" 
            />
          </div>
        </div>
      </div>

      {/* 2. Medical Services & Pricing Catalog (مستلهم من أنظمة العيادات الكبرى DentaLore) */}
      <div className="services-catalog-section" style={{ marginTop: '2rem' }}>
        <div className="section-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>
              دليل باقات وخدمات العيادة والأسعار المخصصة (Services Catalog):
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              حدد الخدمات المتاحة للمرضى (كشف، فحص سونار، استشارة، جلسات...) بأسعارها ومددها ليختار المريض منها أثناء الحجز.
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setIsAddingService(!isAddingService)}
          >
            <Plus size={16} />
            <span>{isAddingService ? 'إغلاق' : 'إضافة خدمة جديدة'}</span>
          </button>
        </div>

        {/* Add Service Form */}
        {isAddingService && (
          <div className="add-service-card" style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <h5 style={{ margin: '0 0 0.75rem 0', fontWeight: 700 }}>بيانات الخدمة الطبية الجديدة:</h5>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label>اسم الخدمة</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: فحص سونار بطن وحوض"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>سعر الخدمة (ج.م)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: 400 ج.م"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>المدة التقديرية (بالدقائق)</label>
                <select 
                  className="input-field"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(e.target.value)}
                >
                  <option value={15}>15 دقيقة</option>
                  <option value={20}>20 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={45}>45 دقيقة</option>
                  <option value={60}>60 دقيقة</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>وصف توضيحي للخدمة للمريض</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="وصف مختصر لما تشمله هذه الخدمة الطبية..."
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddService}>
                <CheckCircle2 size={16} />
                <span>إضافة الخدمة للدليل</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddingService(false)}>
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Service Error Notice */}
        {serviceError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <span>⚠️ {serviceError}</span>
          </div>
        )}

        {/* Services List Table */}
        <div className="services-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
          <table className="settings-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', textAlign: 'right' }}>
                <th style={{ padding: '0.75rem 1rem' }}>اسم الخدمة الطبية</th>
                <th style={{ padding: '0.75rem 1rem' }}>السعر</th>
                <th style={{ padding: '0.75rem 1rem' }}>المدة</th>
                <th style={{ padding: '0.75rem 1rem' }}>الوصف</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    <Stethoscope size={15} style={{ verticalAlign: 'middle', marginLeft: '0.4rem', color: 'var(--primary)' }} />
                    <span>{s.name}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#059669', fontWeight: 700 }}>{s.price}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.duration} دقيقة</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{s.description}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteService(s.id)}
                      className="btn-action-icon text-danger"
                      title="حذف الخدمة"
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-divider full-width" style={{ marginTop: '2rem' }}>
        <h4>بيانات تسجيل دخول الطبيب (المدير الطبي)</h4>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>البريد الإلكتروني للطبيب</label>
          <div className="input-with-icon">
            <Mail size={18} />
            <input 
              type="email" 
              value={clinicForm.doctorEmail || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, doctorEmail: e.target.value })}
              placeholder="doctor@clinicflow.com" 
            />
          </div>
        </div>

        <div className="form-group">
          <label>كلمة المرور الخاصة بالطبيب</label>
          <div className="input-with-icon">
            <KeyRound size={18} />
            <input 
              type="text" 
              value={clinicForm.doctorPassword || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, doctorPassword: e.target.value })}
              placeholder="admin" 
            />
          </div>
        </div>
      </div>
    </form>
  );
}
