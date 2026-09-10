import React from 'react';
import { Stethoscope } from 'lucide-react';

export default function BookingHeader({ clinic, onNavigate }) {
  return (
    <header className="nebras-top-bar">
      <div className="nebras-brand">
        <Stethoscope size={24} className="brand-logo-icon" />
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <span className="brand-title" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clinic?.name}
          </span>
          {clinic?.doctorName && (
            <span className="brand-subtitle" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clinic.doctorName} — {clinic.specialty}
            </span>
          )}
        </div>
      </div>
      <div className="nebras-bar-links">
        <button onClick={() => onNavigate('/manage-booking')} className="nebras-nav-btn">
          <span>تعديل موعد سابق</span>
        </button>
        <button onClick={() => onNavigate('/login')} className="nebras-nav-btn outline">
          <span>بوابة العيادة</span>
        </button>
      </div>
    </header>
  );
}
