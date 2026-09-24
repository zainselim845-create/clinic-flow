import React from 'react';
import { Check } from 'lucide-react';

export default function OnboardingStepper({ step }) {
  return (
    <div className="onboarding-stepper">
      <div className="stepper-progress-track">
        <div 
          className="stepper-progress-fill" 
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <div className="stepper-steps-row">
        <div className={`stepper-step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="stepper-circle">
            {step > 1 ? <Check size={16} strokeWidth={3} /> : '1'}
          </div>
          <div className="stepper-labels">
            <span className="stepper-num">الخطوة 1</span>
            <span className="stepper-title">الطبيب واسم المستخدم</span>
          </div>
        </div>

        <div className={`stepper-step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="stepper-circle">
            {step > 2 ? <Check size={16} strokeWidth={3} /> : '2'}
          </div>
          <div className="stepper-labels">
            <span className="stepper-num">الخطوة 2</span>
            <span className="stepper-title">العيادة والتخصص</span>
          </div>
        </div>

        <div className={`stepper-step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
          <div className="stepper-circle">
            {step > 3 ? <Check size={16} strokeWidth={3} /> : '3'}
          </div>
          <div className="stepper-labels">
            <span className="stepper-num">الخطوة 3</span>
            <span className="stepper-title">الهوية والألوان</span>
          </div>
        </div>

        <div className={`stepper-step-item ${step === 4 ? 'active' : ''}`}>
          <div className="stepper-circle">
            4
          </div>
          <div className="stepper-labels">
            <span className="stepper-num">الخطوة 4</span>
            <span className="stepper-title">فريق العمل والصلاحيات</span>
          </div>
        </div>
      </div>
    </div>
  );
}
