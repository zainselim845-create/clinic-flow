import React from 'react';
import { UserCheck, Stethoscope, ShieldCheck, Mail, Phone } from 'lucide-react';

export default function DoctorProfileSection({ clinicForm, setClinicForm }) {
  return (
    <div className="settings-card-block" style={{
      background: 'var(--bg-primary)',
      border: '1.5px solid var(--border-color)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.5rem',
      marginBottom: '1rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: 'var(--clinic-primary, #09090B)',
            color: '#FFF',
            padding: '0.5rem',
            borderRadius: '8px'
          }}>
            <UserCheck size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>الملف المهني والهوية الطبية للطبيب</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>البيانات المعتمدة التي تظهر في التقارير الطبية وتذاكر الحجز</p>
          </div>
        </div>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.78rem',
          background: 'var(--bg-tertiary, #F4F4F5)',
          border: '1px solid var(--border-color, #E4E4E7)',
          color: 'var(--text-primary, #09090B)',
          padding: '0.25rem 0.65rem',
          borderRadius: '6px',
          fontWeight: 700
        }}>
          <ShieldCheck size={13} />
          <span>طبيب معتمد</span>
        </span>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="doctorName">اسم الطبيب المدير المسؤول *</label>
          <div className="input-with-icon">
            <UserCheck size={18} />
            <input 
              id="doctorName"
              name="doctorName"
              type="text" 
              value={clinicForm.doctorName || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, doctorName: e.target.value })}
              placeholder="مثال: د. أحمد الشريف" 
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="doctorTitle">اللقب والمسمى الأكاديمي والاستشاري *</label>
          <div className="input-with-icon">
            <Stethoscope size={18} />
            <input 
              id="doctorTitle"
              name="doctorTitle"
              type="text" 
              value={clinicForm.doctorTitle || clinicForm.specialty || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, doctorTitle: e.target.value })}
              placeholder="مثال: استشاري أول جراحة الفم والأسنان وزراعة وتجميل الأسنان" 
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="syndicateNumber">رقم ترخيص مزاولة المهنة / قيد النقابة</label>
          <div className="input-with-icon">
            <ShieldCheck size={18} />
            <input 
              id="syndicateNumber"
              name="syndicateNumber"
              type="text" 
              value={clinicForm.syndicateNumber || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, syndicateNumber: e.target.value })}
              placeholder="مثال: قيد نقابة: 28419 / القاهرة" 
            />
          </div>
          <small style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>يُطبع رسمياً في ترويسة التقارير والملف السريري</small>
        </div>

        <div className="form-group">
          <label htmlFor="doctorEmail">البريد الإلكتروني المهني للطبيب *</label>
          <div className="input-with-icon">
            <Mail size={18} />
            <input 
              id="doctorEmail"
              name="doctorEmail"
              type="email" 
              dir="ltr"
              value={clinicForm.doctorEmail || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, doctorEmail: e.target.value })}
              placeholder="doctor@clinicflow.com" 
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="doctorDirectPhone">رقم هاتف الطبيب المباشر والواتساب</label>
          <div className="input-with-icon">
            <Phone size={18} />
            <input 
              id="doctorDirectPhone"
              name="doctorDirectPhone"
              type="tel" 
              dir="ltr"
              value={clinicForm.doctorDirectPhone || clinicForm.phone || ''} 
              onChange={(e) => setClinicForm({ ...clinicForm, doctorDirectPhone: e.target.value })}
              placeholder="01006285031" 
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="consultationDuration">مدة الكشف الافتراضية للعيادة</label>
          <select
            id="consultationDuration"
            value={clinicForm.consultationDuration || clinicForm.scheduleConfig?.slotDuration || 30}
            onChange={(e) => {
              const dur = parseInt(e.target.value, 10) || 30;
              setClinicForm(prev => ({
                ...prev,
                consultationDuration: dur,
                scheduleConfig: {
                  ...(prev.scheduleConfig || {}),
                  slotDuration: dur
                }
              }));
            }}
            className="saas-filter-select"
            style={{ height: '42px', width: '100%' }}
          >
            <option value={15}>15 دقيقة (كشف واستشارة سريعة)</option>
            <option value={20}>20 دقيقة (فحص طبي قياسي)</option>
            <option value={30}>30 دقيقة (كشف وفحص سريري مفصل)</option>
            <option value={45}>45 دقيقة (جلسة علاجية مطولة)</option>
            <option value={60}>60 دقيقة (فحص شامل أو إجراء علاجي)</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="doctorBio">نبذة مهنية عن الطبيب والمؤهلات الأكاديمية</label>
          <textarea
            id="doctorBio"
            name="doctorBio"
            rows={2}
            value={clinicForm.doctorBio || ''}
            onChange={(e) => setClinicForm({ ...clinicForm, doctorBio: e.target.value })}
            placeholder="مثال: زميل الكلية الملكية للجراحين، ماجستير جراحة وتجميل الأسنان جامعة القاهرة، خبرة أكثر من 15 عاماً..."
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '0.88rem'
            }}
          />
        </div>
      </div>
    </div>
  );
}
