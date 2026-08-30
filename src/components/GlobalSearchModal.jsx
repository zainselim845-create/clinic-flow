import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Search, User, Calendar, Clock, ArrowLeft, X, 
  Smartphone, Users, Plus, ShieldCheck, CheckCircle2, AlertCircle
} from 'lucide-react';
import './GlobalSearchModal.css';

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { state } = useApp();
  const { patients = [], appointments = [], staffMembers = [] } = state;

  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();

  // Search Results
  const matchingPatients = cleanQuery
    ? patients.filter(p => 
        (p.name && p.name.toLowerCase().includes(cleanQuery)) ||
        (p.phone && p.phone.includes(cleanQuery)) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(cleanQuery))
      ).slice(0, 5)
    : [];

  const matchingAppointments = cleanQuery
    ? appointments.filter(a => 
        (a.patientName && a.patientName.toLowerCase().includes(cleanQuery)) ||
        (a.patientPhone && a.patientPhone.includes(cleanQuery)) ||
        (a.date && a.date.includes(cleanQuery)) ||
        (a.time && a.time.includes(cleanQuery))
      ).slice(0, 5)
    : [];

  const matchingStaff = cleanQuery
    ? staffMembers.filter(s => 
        (s.name && s.name.toLowerCase().includes(cleanQuery)) ||
        (s.role && s.role.toLowerCase().includes(cleanQuery)) ||
        (s.phone && s.phone.includes(cleanQuery))
      ).slice(0, 3)
    : [];

  // Quick Action Shortcuts
  const quickActions = [
    { title: 'حجز موعد جديد في العيادة', icon: Plus, path: '/appointments', category: 'إجراءات سريعة' },
    { title: 'إدارة وتعديل إجازات الطبيب', icon: Calendar, path: '/appointments', category: 'إجراءات سريعة' },
    { title: 'إدارة فريق العمل والسكرتارية', icon: Users, path: '/settings', category: 'الإعدادات' },
    { title: 'إعدادات بوابة الرسائل SMS', icon: Smartphone, path: '/settings', category: 'الإعدادات' },
    { title: 'صفحة الحجز الإلكتروني العامة', icon: CheckCircle2, path: '/booking', category: 'بوابات المرضى' },
    { title: 'بوابة المريض لإدارة المواعيد', icon: ArrowLeft, path: '/manage-booking', category: 'بوابات المرضى' },
  ];

  const matchingActions = cleanQuery
    ? quickActions.filter(a => a.title.toLowerCase().includes(cleanQuery))
    : quickActions;

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  const hasAnyResults = matchingPatients.length > 0 || matchingAppointments.length > 0 || matchingStaff.length > 0 || (cleanQuery && matchingActions.length > 0);

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-modal glass-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Search Input Bar */}
        <div className="search-input-header">
          <Search size={20} className="search-modal-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="ابحث عن مريض، موعد، سكرتير، أو إجراء سريع... (اكتب اسم أو رقم هاتف)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="clear-search-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
          <span className="esc-badge">ESC</span>
        </div>

        {/* Results Container */}
        <div className="search-modal-results">
          
          {/* 1. Patients Results */}
          {matchingPatients.length > 0 && (
            <div className="results-group">
              <div className="group-title">
                <User size={14} />
                <span>المرضى ({matchingPatients.length})</span>
              </div>
              {matchingPatients.map(p => (
                <div 
                  key={p.id} 
                  className="result-item"
                  onClick={() => handleSelect(`/patients`)}
                >
                  <div className="result-avatar">{p.name ? p.name[0] : 'م'}</div>
                  <div className="result-main">
                    <strong className="result-title">{p.name}</strong>
                    <span className="result-sub"> {p.phone || 'بدون هاتف'} • {p.gender || 'ذكر'} ({p.age || '30'} سنة)</span>
                  </div>
                  {p.diagnosis && <span className="result-badge">{p.diagnosis}</span>}
                </div>
              ))}
            </div>
          )}

          {/* 2. Appointments Results */}
          {matchingAppointments.length > 0 && (
            <div className="results-group">
              <div className="group-title">
                <Calendar size={14} />
                <span>المواعيد ({matchingAppointments.length})</span>
              </div>
              {matchingAppointments.map(a => (
                <div 
                  key={a.id} 
                  className="result-item"
                  onClick={() => handleSelect(`/appointments`)}
                >
                  <div className="result-icon-box appointment">
                    <Clock size={16} />
                  </div>
                  <div className="result-main">
                    <strong className="result-title">{a.patientName}</strong>
                    <span className="result-sub"> {a.date} الساعة {a.time} • {a.type || 'كشف عادي'}</span>
                  </div>
                  <span className={`result-status-pill ${a.status}`}>
                    {a.status === 'completed' ? 'تم الكشف' : a.status === 'in_progress' ? 'في الكشف' : a.status === 'waiting' ? 'في الانتظار' : a.status === 'cancelled' ? 'ملغي' : 'قادم'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 3. Staff Results */}
          {matchingStaff.length > 0 && (
            <div className="results-group">
              <div className="group-title">
                <ShieldCheck size={14} />
                <span>فريق العمل والسكرتارية ({matchingStaff.length})</span>
              </div>
              {matchingStaff.map(s => (
                <div 
                  key={s.id} 
                  className="result-item"
                  onClick={() => handleSelect(`/settings`)}
                >
                  <div className="result-icon-box staff">
                    <Users size={16} />
                  </div>
                  <div className="result-main">
                    <strong className="result-title">{s.name}</strong>
                    <span className="result-sub">{s.role} • {s.shift}</span>
                  </div>
                  <span className={`result-status-pill ${s.status}`}>
                    {s.status === 'active' ? 'نشط' : 'معطل'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 4. Quick Actions / Navigation */}
          {matchingActions.length > 0 && (
            <div className="results-group">
              <div className="group-title">
                <span> الإجراءات والتنقل السريع</span>
              </div>
              {matchingActions.map((action, idx) => {
                const IconComponent = action.icon;
                return (
                  <div 
                    key={idx} 
                    className="result-item action"
                    onClick={() => handleSelect(action.path)}
                  >
                    <div className="result-icon-box action">
                      <IconComponent size={16} />
                    </div>
                    <div className="result-main">
                      <strong className="result-title">{action.title}</strong>
                      <span className="result-sub">{action.category}</span>
                    </div>
                    <ArrowLeft size={14} className="result-arrow" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty Search State */}
          {cleanQuery && !hasAnyResults && (
            <div className="search-empty-state">
              <AlertCircle size={32} className="text-secondary" />
              <p>لم نجد أي نتائج مطابقة لـ "{query}"</p>
              <span>جرب البحث باسم المريض، رقم الهاتف، أو اسم السكرتير</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="search-modal-footer">
          <span> استخدم الأسهم للتنقل و <strong>Enter</strong> للاختيار</span>
          <span>ClinicFlow Global Search</span>
        </div>

      </div>
    </div>
  );
};

export default GlobalSearchModal;
