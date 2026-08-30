import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { validateEgyptianPhone, cleanEgyptianPhone } from '../../utils/phoneValidation';

import { getTodayDateStr } from '../../utils/timeSlots';

export default function WalkInRegistrationModal({
  isOpen,
  onClose,
  onSubmit
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('كشف عادي');
  const [isEmergency, setIsEmergency] = useState(false);
  const [notes, setNotes] = useState('');
  const [phoneError, setPhoneError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (phone && !validateEgyptianPhone(phone)) {
      setPhoneError('يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)');
      return;
    }

    const cleanedPhone = cleanEgyptianPhone(phone) || '01000000000';
    onSubmit({
      name: name.trim(),
      phone: cleanedPhone,
      type: isEmergency ? 'طوارئ' : type,
      isEmergency,
      notes: notes.trim(),
      date: getTodayDateStr()
    });

    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content walk-in-modal">
        <div className="modal-header">
          <div className="title-row">
            <UserPlus className="text-primary" size={20} />
            <h3>تسجيل حضور مريض مباشر (Walk-in)</h3>
          </div>
          <button type="button" onClick={onClose} className="btn-close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>اسم المريض بالكامل</label>
            <input
              type="text"
              required
              placeholder="مثال: يوسف محمود حسن"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>رقم هاتف المريض</label>
            <input
              type="tel"
              required
              placeholder="01012345678"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError('');
              }}
            />
            {phoneError && <span className="input-error-msg">{phoneError}</span>}
          </div>

          <div className="form-group">
            <label>نوع الكشف</label>
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={isEmergency}>
              <option value="كشف عادي">كشف عادي (300 ج.م)</option>
              <option value="استشارة">استشارة ومتابعة (150 ج.م)</option>
              <option value="طوارئ">حالة طارئة ومستعجلة (400 ج.م)</option>
            </select>
          </div>

          <div className="emergency-checkbox-card">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
              />
              <div>
                <strong> حالة طارئة ومستعجلة (Emergency Priority)</strong>
                <p>سيتم رفع المريض لأعلى قائمة الانتظار فوراً ليدخل للكشف أولاً</p>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label>ملاحظات الاستقبال (اختياري)</label>
            <textarea
              rows={2}
              placeholder="مثال: حرارة مرتفعة، مغص كلوي، مريض محول..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary">
              تسجيل وإضافة لصالة الانتظار
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
