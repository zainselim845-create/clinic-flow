import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import { 
  Search, User, Calendar, Clock, ArrowLeft, X, 
  Smartphone, Users, CheckCircle2, AlertCircle, ShieldCheck,
  Receipt, Package, Layers, Bot, SunMoon, UserPlus, CalendarPlus, CreditCard,
  Baby, Eye, Heart, Scan
} from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Portal } from '@ark-ui/react/portal';

import './GlobalSearchModal.css';

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { state, toggleTheme } = useApp();
  const { tenant } = useTenant();
  const currentClinicId = tenant?.id || state.clinicInfo?.id;
  const { patients = [], appointments = [], staffMembers = [] } = state;

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const cleanQuery = query.trim().toLowerCase();

  // 1. Matching Patients (scoped to current clinic)
  const matchingPatients = useMemo(() => {
    if (!cleanQuery) return [];
    return patients.filter(p => 
      (!currentClinicId || !p.clinicId || p.clinicId === currentClinicId) &&
      ((p.name && p.name.toLowerCase().includes(cleanQuery)) ||
      (p.phone && p.phone.includes(cleanQuery)) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(cleanQuery)))
    ).slice(0, 5);
  }, [patients, cleanQuery, currentClinicId]);

  // 2. Matching Appointments (scoped to current clinic)
  const matchingAppointments = useMemo(() => {
    if (!cleanQuery) return [];
    return appointments.filter(a => 
      (!currentClinicId || !a.clinicId || a.clinicId === currentClinicId) &&
      ((a.patientName && a.patientName.toLowerCase().includes(cleanQuery)) ||
      (a.patientPhone && a.patientPhone.includes(cleanQuery)) ||
      (a.date && a.date.includes(cleanQuery)) ||
      (a.time && a.time.includes(cleanQuery)))
    ).slice(0, 5);
  }, [appointments, cleanQuery, currentClinicId]);

  // 3. Matching Staff (scoped to current clinic)
  const matchingStaff = useMemo(() => {
    if (!cleanQuery) return [];
    return staffMembers.filter(s => 
      (!currentClinicId || !s.clinicId || s.clinicId === currentClinicId) &&
      ((s.name && s.name.toLowerCase().includes(cleanQuery)) ||
      (s.role && s.role.toLowerCase().includes(cleanQuery)) ||
      (s.phone && s.phone.includes(cleanQuery)))
    ).slice(0, 3);
  }, [staffMembers, cleanQuery, currentClinicId]);

  // 4. Quick Action Shortcuts (Linear / Raycast style command actions)
  const quickActions = useMemo(() => [
    { id: 'act-pediatrics', title: 'جداول ومنحنيات نمو الأطفال (WHO Growth Standards)', icon: Baby, path: '/patients?tab=specialty&module=pediatrics', category: 'المخططات التخصصية' },
    { id: 'act-ophthalmology', title: 'انكسار النظر ووصفة النظارة الطبية (Ophthalmology)', icon: Eye, path: '/patients?tab=specialty&module=ophthalmology', category: 'المخططات التخصصية' },
    { id: 'act-obgyn', title: 'حاسبة الحمل وتتبع الأجنة (OB/GYN Hadlock)', icon: Heart, path: '/patients?tab=specialty&module=obgyn', category: 'المخططات التخصصية' },
    { id: 'act-dicom', title: 'عارض الأشعة الطبية (DICOM Viewer)', icon: Scan, path: '/patients?tab=specialty&module=dicom', category: 'المخططات التخصصية' },
    { id: 'act-new-patient', title: 'إضافة مريض جديد', icon: UserPlus, path: '/patients?action=new', category: 'إجراءات سريعة' },
    { id: 'act-new-appt', title: 'حجز موعد كشف جديد', icon: CalendarPlus, path: '/appointments?action=new', category: 'إجراءات سريعة' },
    { id: 'act-new-inv', title: 'إصدار فاتورة جديدة', icon: Receipt, path: '/invoices?action=new', category: 'إجراءات سريعة' },
    { id: 'act-new-inv-item', title: 'إضافة صنف جديد للمخزون', icon: Package, path: '/inventory?action=new', category: 'إجراءات سريعة' },
    { id: 'act-new-lab', title: 'إصدار طلب معمل وتركيبات', icon: Layers, path: '/labs?action=new', category: 'إجراءات سريعة' },
    { id: 'act-doctor-ai', title: 'المساعد السريري الذكي (Doctor AI)', icon: Bot, path: '/doctor-agent', category: 'الذكاء الاصطناعي' },
    { id: 'act-vacations', title: 'إدارة وتعديل إجازات الطبيب', icon: Calendar, path: '/appointments', category: 'المواعيد' },
    { id: 'act-staff', title: 'إدارة فريق العمل والسكرتارية', icon: Users, path: '/settings?tab=staff', category: 'الإعدادات' },
    { id: 'act-sms', title: 'إعدادات بوابة الرسائل SMS', icon: Smartphone, path: '/settings?tab=sms', category: 'الإعدادات' },
    { id: 'act-sub', title: 'خطة واشتراك العيادة والاستهلاك', icon: CreditCard, path: '/settings?tab=subscription', category: 'الإعدادات' },
    { id: 'act-theme', title: 'تبديل المظهر (داكن / فاتح)', icon: SunMoon, actionFn: toggleTheme, category: 'النظام' },
    { id: 'act-booking', title: 'صفحة الحجز الإلكتروني العامة', icon: CheckCircle2, path: '/booking', category: 'بوابات المرضى' },
    { id: 'act-manage', title: 'بوابة المريض لإدارة المواعيد', icon: ArrowLeft, path: '/manage-booking', category: 'بوابات المرضى' },
  ], [toggleTheme]);

  const matchingActions = useMemo(() => {
    return cleanQuery
      ? quickActions.filter(a => a.title.toLowerCase().includes(cleanQuery) || a.category.toLowerCase().includes(cleanQuery))
      : quickActions;
  }, [cleanQuery, quickActions]);

  const handleSelect = useCallback((path) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  // Build flattened selectable items list for keyboard navigation
  const flatItems = useMemo(() => {
    const list = [];
    matchingPatients.forEach(p => {
      list.push({
        id: `patient-${p.id}`,
        type: 'patient',
        onSelect: () => handleSelect('/patients')
      });
    });
    matchingAppointments.forEach(a => {
      list.push({
        id: `appointment-${a.id}`,
        type: 'appointment',
        onSelect: () => handleSelect('/appointments')
      });
    });
    matchingStaff.forEach(s => {
      list.push({
        id: `staff-${s.id}`,
        type: 'staff',
        onSelect: () => handleSelect('/settings?tab=staff')
      });
    });
    matchingActions.forEach((action) => {
      list.push({
        id: `action-${action.id}`,
        type: 'action',
        onSelect: () => {
          if (action.actionFn) {
            action.actionFn();
            onClose();
          } else {
            handleSelect(action.path);
          }
        }
      });
    });
    return list;
  }, [matchingPatients, matchingAppointments, matchingStaff, matchingActions, handleSelect, onClose]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen) return;
    const activeEl = resultsContainerRef.current?.querySelector('.result-item.is-selected');
    if (activeEl && activeEl.scrollIntoView) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, isOpen]);

  // Keyboard navigation listener (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        return;
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
        return;
      }

      if (!isOpen || flatItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % flatItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatItems[selectedIndex];
        if (selected && selected.onSelect) {
          selected.onSelect();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, flatItems, selectedIndex]);

  if (!isOpen) return null;

  const hasAnyResults = flatItems.length > 0;
  let globalItemIndex = 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open && onClose) onClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="global-search-overlay" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <Dialog.Content className="global-search-modal glass-card">
            <Dialog.Title className="sr-only">البحث الشامل في النظام</Dialog.Title>
            <Dialog.Description className="sr-only">ابحث عن المرضى والمواعيد والموظفين والإجراءات السريعة</Dialog.Description>
            
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
                aria-label="البحث الشامل في العيادة عن المرضى والمواعيد والموظفين"
              />
              {query && (
                <button 
                  type="button" 
                  className="clear-search-btn" 
                  onClick={() => setQuery('')}
                  aria-label="مسح نص البحث"
                >
                  <X size={16} />
                </button>
              )}
              <span className="esc-badge" aria-hidden="true">ESC</span>
            </div>

            {/* Results Container */}
            <div 
              ref={resultsContainerRef}
              className="search-modal-results" 
              role="region" 
              aria-label="نتائج البحث"
            >
              
              {/* 1. Patients Results */}
              {matchingPatients.length > 0 && (
                <div className="results-group" role="group" aria-label="نتائج المرضى">
                  <div className="group-title">
                    <User size={14} />
                    <span>المرضى ({matchingPatients.length})</span>
                  </div>
                  {matchingPatients.map(p => {
                    const currentIndex = globalItemIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    return (
                      <div 
                        key={p.id} 
                        className={`result-item ${isSelected ? 'is-selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        onClick={() => handleSelect('/patients')}
                        aria-label={`المريض ${p.name}`}
                      >
                        <div className="result-avatar">{p.name ? p.name[0] : 'م'}</div>
                        <div className="result-main">
                          <strong className="result-title">{p.name}</strong>
                          <span className="result-sub">{p.phone || 'بدون هاتف'} • {p.gender || 'ذكر'} ({p.age || '30'} سنة)</span>
                        </div>
                        {p.diagnosis && <span className="result-badge">{p.diagnosis}</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Appointments Results */}
              {matchingAppointments.length > 0 && (
                <div className="results-group" role="group" aria-label="نتائج المواعيد">
                  <div className="group-title">
                    <Calendar size={14} />
                    <span>المواعيد ({matchingAppointments.length})</span>
                  </div>
                  {matchingAppointments.map(a => {
                    const currentIndex = globalItemIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    return (
                      <div 
                        key={a.id} 
                        className={`result-item ${isSelected ? 'is-selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        onClick={() => handleSelect('/appointments')}
                        aria-label={`موعد المريض ${a.patientName} يوم ${a.date} الساعة ${a.time}`}
                      >
                        <div className="result-icon-box appointment">
                          <Clock size={16} />
                        </div>
                        <div className="result-main">
                          <strong className="result-title">{a.patientName}</strong>
                          <span className="result-sub">{a.date} الساعة {a.time} • {a.type || 'كشف عيادة'}</span>
                        </div>
                        <span className={`result-status-pill ${a.status}`}>
                          {a.status === 'completed' ? 'تم الكشف' : a.status === 'in_progress' ? 'في الكشف' : a.status === 'waiting' ? 'في الانتظار' : a.status === 'cancelled' ? 'ملغي' : 'قادم'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. Staff Results */}
              {matchingStaff.length > 0 && (
                <div className="results-group" role="group" aria-label="نتائج فريق العمل">
                  <div className="group-title">
                    <ShieldCheck size={14} />
                    <span>فريق العمل والسكرتارية ({matchingStaff.length})</span>
                  </div>
                  {matchingStaff.map(s => {
                    const currentIndex = globalItemIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    return (
                      <div 
                        key={s.id} 
                        className={`result-item ${isSelected ? 'is-selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        onClick={() => handleSelect('/settings?tab=staff')}
                        aria-label={`الموظف ${s.name} - ${s.role}`}
                      >
                        <div className="result-icon-box staff">
                          <Users size={16} />
                        </div>
                        <div className="result-main">
                          <strong className="result-title">{s.name}</strong>
                          <span className="result-sub">{s.role} • {s.shift || 'دوام العيادة'}</span>
                        </div>
                        <span className={`result-status-pill ${s.status}`}>
                          {s.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. Quick Actions / Navigation */}
              {matchingActions.length > 0 && (
                <div className="results-group" role="group" aria-label="الإجراءات السريعة">
                  <div className="group-title">
                    <span>الإجراءات والتنقل السريع</span>
                  </div>
                  {matchingActions.map((action) => {
                    const currentIndex = globalItemIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    const IconComponent = action.icon;
                    return (
                      <div 
                        key={action.id} 
                        className={`result-item action ${isSelected ? 'is-selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        onClick={() => {
                          if (action.actionFn) {
                            action.actionFn();
                            onClose();
                          } else {
                            handleSelect(action.path);
                          }
                        }}
                        aria-label={action.title}
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
              <span>استخدم الأسهم <strong>↑ ↓</strong> للتنقل و <strong>Enter</strong> للاختيار</span>
              <span>ClinicFlow Command Palette</span>
            </div>

          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default GlobalSearchModal;
