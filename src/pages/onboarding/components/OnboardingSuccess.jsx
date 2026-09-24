import React from 'react';
import { Check, ArrowLeft } from 'lucide-react';

export default function OnboardingSuccess({
  clinicName,
  doctorName,
  username,
  selectedSpecialtyObj,
  teamSizeTitle,
  enableInitialStaff,
  initialStaffName,
  initialStaffPhone,
  handleGoToDashboard
}) {
  return (
    <div className="wizard-card onboarding-success-card">
      <div className="celebration-badge-icon">
        <Check size={44} strokeWidth={3} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          مبروك يا دكتور! تم تجهيز نظام عيادتك بالكامل
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          تم إنشاء وتخصيص بيئة العمل الخاصة بك بنجاح، وربط خدمات التخصص الطبي وتجهيز حسابات الطاقم والهوية البصرية.
        </p>
      </div>

      <div className="success-summary-box">
        <div className="summary-row">
          <span>اسم العيادة:</span>
          <strong>{clinicName}</strong>
        </div>
        <div className="summary-row">
          <span>الطبيب المسؤول:</span>
          <strong>{doctorName}</strong>
        </div>
        <div className="summary-row">
          <span>اسم المستخدم / الرابط:</span>
          <strong style={{ direction: 'ltr' }}>@{username}</strong>
        </div>
        <div className="summary-row">
          <span>التخصص الطبي:</span>
          <strong>{selectedSpecialtyObj?.name}</strong>
        </div>
        <div className="summary-row">
          <span>حجم فريق العمل:</span>
          <strong>{teamSizeTitle}</strong>
        </div>
        {enableInitialStaff && (
          <div className="summary-row" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
            <span>حساب الموظف الأول:</span>
            <strong>{initialStaffName} ({initialStaffPhone})</strong>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button 
          type="button" 
          onClick={handleGoToDashboard} 
          className="btn-wizard-next"
          style={{ fontSize: '1.05rem', padding: '1rem 2.5rem' }}
        >
          <span>الدخول إلى لوحة تحكم العيادة فوراً</span>
          <ArrowLeft size={18} />
        </button>
      </div>
    </div>
  );
}
