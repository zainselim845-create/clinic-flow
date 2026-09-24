import React from 'react';
import { Building2, Stethoscope, Sparkles, MapPin } from 'lucide-react';

export default function OnboardingStepClinic({
  clinicName,
  setClinicName,
  specialtyCategory,
  setSpecialtyCategory,
  filteredSpecialties,
  selectedSpecialtyId,
  setSelectedSpecialtyId,
  city,
  setCity,
  address,
  setAddress
}) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>
          <Building2 size={28} color="var(--primary)" />
          <span>بيانات العيادة ونوع التخصص الطبي</span>
        </h2>
        <p>
          اختر تخصص عيادتك ليقوم النظام تلقائياً بتجهيز قائمة الخدمات، فترات الكشف، وأنواع الزيارات وأسعارها بالجنيه المصري.
        </p>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label className="form-label">
          <span>اسم العيادة أو المركز الطبي *</span>
        </label>
        <div className="form-input-wrapper">
          <Building2 className="input-prefix-icon" size={18} />
          <input
            type="text"
            className="form-input has-prefix"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder="مثال: عيادة النخبة التخصصية"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          <span>نوع التخصص الطبي للعيادة *</span>
        </label>

        {/* Filter Tabs */}
        <div className="specialty-filter-tabs">
          <button
            type="button"
            className={`filter-pill-btn ${specialtyCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSpecialtyCategory('all')}
          >
            جميع التخصصات (12)
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${specialtyCategory === 'dental' ? 'active' : ''}`}
            onClick={() => setSpecialtyCategory('dental')}
          >
            طب وجراحة الأسنان (6 تخصصات)
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${specialtyCategory === 'medical' ? 'active' : ''}`}
            onClick={() => setSpecialtyCategory('medical')}
          >
            تخصصات طبية وجراحية (6 تخصصات)
          </button>
        </div>

        {/* Specialties Cards Grid */}
        <div className="specialties-grid">
          {filteredSpecialties.map((spec) => {
            const isSelected = selectedSpecialtyId === spec.id;
            return (
              <div
                key={spec.id}
                className={`specialty-card-select ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedSpecialtyId(spec.id)}
              >
                <div className="specialty-card-top">
                  <div className="specialty-icon-box">
                    <Stethoscope size={18} />
                  </div>
                  <span className="specialty-badge-pill">{spec.badge || 'تخصصي'}</span>
                </div>
                <div className="specialty-card-name">{spec.name}</div>
                <div className="specialty-card-desc">{spec.description}</div>
                <div className="specialty-meta-tag">
                  <Sparkles size={14} />
                  <span>{spec.defaultServices?.length || 5} خدمات طبية مُجهزة تلقائياً</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">
            <span>المحافظة / المدينة</span>
          </label>
          <div className="form-input-wrapper">
            <MapPin className="input-prefix-icon" size={18} />
            <input
              type="text"
              className="form-input has-prefix"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="القاهرة - مصر الجديدة"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>العنوان التفصيلي</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="شارع الميرغني، مبنى العيادات التخصصية"
          />
        </div>
      </div>
    </div>
  );
}
