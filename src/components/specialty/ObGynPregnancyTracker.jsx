import React, { useState, useMemo } from 'react';
import { 
  Calendar, Activity, Heart, Scale, Plus, Trash2, 
  CheckCircle2, AlertCircle, Clock, ShieldAlert
} from 'lucide-react';
import { 
  calculateGestationalAge, 
  calculateHadlockEfw,
  getPatientSpecialtyData,
  savePatientSpecialtyData
} from '../../services/specialtyClinicalService';
import './ObGynPregnancyTracker.css';

/**
 * ObGynPregnancyTracker
 * Comprehensive Obstetric & Gynecological pregnancy calculator and fetal biometry tracker.
 * Implements Naegele's rule for gestational age and Hadlock's formula for estimated fetal weight (EFW).
 */
export default function ObGynPregnancyTracker({ 
  patientId, 
  clinicId, 
  patientName = 'المريضة' 
}) {
  const initialData = useMemo(() => {
    return getPatientSpecialtyData(patientId, clinicId, 'obgyn') || {
      lmp: '2025-10-15',
      cyclesDays: 28,
      biometry: {
        bpd: 58, // mm
        hc: 215, // mm
        ac: 198, // mm
        fl: 42   // mm
      },
      visits: [
        { id: 'ob-1', date: '2025-12-01', ga: '7w 0d', bp: '115/75', weight: 64, sfh: 8, fhr: 145, notes: 'كيس حمل داخل الرحم مع نبض جنيني سليم' },
        { id: 'ob-2', date: '2026-01-15', ga: '13w 2d', bp: '118/78', weight: 65.5, sfh: 13, fhr: 152, notes: 'قياس NT طبيعي 1.2 مم' },
        { id: 'ob-3', date: '2026-03-05', ga: '20w 3d', bp: '120/80', weight: 67.8, sfh: 20, fhr: 148, notes: 'سونار تفصيلي للأجنة (Anomaly Scan) سليم تماماً' }
      ]
    };
  }, [patientId, clinicId]);

  const [lmp, setLmp] = useState(initialData.lmp || '');
  const [biometry, setBiometry] = useState(initialData.biometry || { bpd: '', hc: '', ac: '', fl: '' });
  const [visits, setVisits] = useState(initialData.visits || []);
  const [isAddingVisit, setIsAddingVisit] = useState(false);

  const [newVisit, setNewVisit] = useState({
    date: new Date().toISOString().split('T')[0],
    bp: '120/80',
    weight: '',
    sfh: '',
    fhr: '145',
    notes: ''
  });

  // Calculate Gestational Age and EDD
  const gaCalculation = useMemo(() => {
    return calculateGestationalAge(lmp);
  }, [lmp]);

  // Calculate Hadlock Estimated Fetal Weight (EFW)
  const efwCalculation = useMemo(() => {
    return calculateHadlockEfw(biometry.bpd, biometry.hc, biometry.ac, biometry.fl);
  }, [biometry]);

  const handleSave = (updatedLmp, updatedBio, updatedVisits) => {
    setLmp(updatedLmp);
    setBiometry(updatedBio);
    setVisits(updatedVisits);
    savePatientSpecialtyData(patientId, clinicId, 'obgyn', {
      lmp: updatedLmp,
      biometry: updatedBio,
      visits: updatedVisits
    });
  };

  const handleBiometryChange = (field, value) => {
    const updatedBio = { ...biometry, [field]: value };
    setBiometry(updatedBio);
    savePatientSpecialtyData(patientId, clinicId, 'obgyn', {
      lmp,
      biometry: updatedBio,
      visits
    });
  };

  const handleAddVisit = (e) => {
    e.preventDefault();
    const currentGaStr = `${gaCalculation.weeks}w ${gaCalculation.days}d`;
    const visitObj = {
      id: `ob-${Date.now()}`,
      date: newVisit.date,
      ga: currentGaStr,
      bp: newVisit.bp,
      weight: Number(newVisit.weight) || 0,
      sfh: Number(newVisit.sfh) || 0,
      fhr: Number(newVisit.fhr) || 0,
      notes: newVisit.notes
    };

    const updated = [visitObj, ...visits];
    handleSave(lmp, biometry, updated);
    setIsAddingVisit(false);
    setNewVisit({
      date: new Date().toISOString().split('T')[0],
      bp: '120/80',
      weight: '',
      sfh: '',
      fhr: '145',
      notes: ''
    });
  };

  const handleDeleteVisit = (id) => {
    const updated = visits.filter(v => v.id !== id);
    handleSave(lmp, biometry, updated);
  };

  return (
    <div className="obgyn-container" dir="rtl">
      {/* Header */}
      <div className="obgyn-header-card">
        <div className="obgyn-title-group">
          <div className="obgyn-icon-badge">
            <Heart size={22} />
          </div>
          <div>
            <h3>حاسبة الحمل وتتبع الأجنة (OB/GYN Pregnancy Tracker)</h3>
            <p>حساب موعد الولادة (قاعدة نيجل)، عمر الحمل، القياسات الحيوية للجنين (معادلة Hadlock)</p>
          </div>
        </div>

        <div className="lmp-input-group">
          <label>تاريخ أول يوم لآخر دورة شهرية (LMP):</label>
          <input 
            type="date" 
            value={lmp} 
            onChange={e => handleSave(e.target.value, biometry, visits)}
            className="lmp-date-input"
          />
        </div>
      </div>

      {/* KPI Cards: Pregnancy Metrics */}
      <div className="obgyn-kpi-grid">
        <div className="obgyn-kpi-card">
          <span className="kpi-label">عمر الحمل الحالي</span>
          <div className="kpi-value">
            {gaCalculation.weeks} <span className="unit">أسبوع</span> + {gaCalculation.days} <span className="unit">يوم</span>
          </div>
          <span className="kpi-subtext">{gaCalculation.trimesterText}</span>
        </div>

        <div className="obgyn-kpi-card">
          <span className="kpi-label">تاريخ الولادة المتوقع (EDD)</span>
          <div className="kpi-value edd-value">{gaCalculation.edd || '—'}</div>
          <span className="kpi-subtext">حسب قاعدة نيجل (Naegele's Rule)</span>
        </div>

        <div className="obgyn-kpi-card">
          <span className="kpi-label">الأيام المتبقية على موعد الولادة</span>
          <div className="kpi-value">{gaCalculation.daysRemaining} <span className="unit">يوم</span></div>
          <span className="kpi-subtext">اكتمال {Math.round((gaCalculation.totalDays / 280) * 100)}٪ من فترة الحمل</span>
        </div>

        <div className="obgyn-kpi-card">
          <span className="kpi-label">وزن الجنين المقدر (Hadlock EFW)</span>
          <div className="kpi-value">
            {efwCalculation.grams > 0 ? `${efwCalculation.grams} جم` : '—'}
          </div>
          <span className="kpi-subtext">
            {efwCalculation.kg > 0 ? `(${efwCalculation.kg} كجم)` : 'سجل قياسات السونار أدناه'}
          </span>
        </div>
      </div>

      {/* 40-Week Timeline Progress */}
      <div className="obgyn-timeline-card">
        <div className="timeline-header">
          <h4>مخطط أسابيع الحمل والثلث الجاري (Week 1 to 40)</h4>
          <span className="trimester-badge">{gaCalculation.trimesterText}</span>
        </div>

        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${Math.min(100, Math.max(0, (gaCalculation.totalDays / 280) * 100))}%` }}
          />
        </div>

        <div className="milestones-row">
          <div className={`milestone-item ${gaCalculation.weeks >= 12 ? 'passed' : ''}`}>
            <span className="milestone-dot" />
            <span className="milestone-week">الأسبوع 12</span>
            <span className="milestone-title">فحص شفافية الرقبة (NT)</span>
          </div>
          <div className={`milestone-item ${gaCalculation.weeks >= 20 ? 'passed' : ''}`}>
            <span className="milestone-dot" />
            <span className="milestone-week">الأسبوع 20</span>
            <span className="milestone-title">سونار التشوهات (Anomaly Scan)</span>
          </div>
          <div className={`milestone-item ${gaCalculation.weeks >= 26 ? 'passed' : ''}`}>
            <span className="milestone-dot" />
            <span className="milestone-week">الأسبوع 26</span>
            <span className="milestone-title">فحص سكر الحمل (OGTT)</span>
          </div>
          <div className={`milestone-item ${gaCalculation.weeks >= 36 ? 'passed' : ''}`}>
            <span className="milestone-dot" />
            <span className="milestone-week">الأسبوع 36</span>
            <span className="milestone-title">جاهزية الولادة ومسحة GBS</span>
          </div>
          <div className={`milestone-item ${gaCalculation.weeks >= 40 ? 'passed' : ''}`}>
            <span className="milestone-dot" />
            <span className="milestone-week">الأسبوع 40</span>
            <span className="milestone-title">اكتمال موعد الولادة (EDD)</span>
          </div>
        </div>
      </div>

      {/* Dual Section: Hadlock Biometry & Antenatal Visits */}
      <div className="obgyn-dual-grid">
        {/* Fetal Biometry (Hadlock Formula) */}
        <div className="obgyn-subcard">
          <div className="subcard-header">
            <h4>القياسات الحيوية للجنين (Hadlock Fetal Biometry)</h4>
            <span className="formula-tag">Hadlock 4-Parameter</span>
          </div>

          <p className="subcard-desc">
            أدخل قياسات السونار التوليدي بالمليمتر لحساب الوزن التقديري للجنين تلقائياً:
          </p>

          <div className="biometry-inputs-grid">
            <div className="bio-input-group">
              <label>قطر بين الجدارين (BPD)</label>
              <div className="bio-input-wrap">
                <input 
                  type="number" 
                  step="0.1" 
                  value={biometry.bpd} 
                  onChange={e => handleBiometryChange('bpd', e.target.value)}
                  placeholder="58"
                />
                <span>مم</span>
              </div>
            </div>

            <div className="bio-input-group">
              <label>محيط الرأس (HC)</label>
              <div className="bio-input-wrap">
                <input 
                  type="number" 
                  step="0.1" 
                  value={biometry.hc} 
                  onChange={e => handleBiometryChange('hc', e.target.value)}
                  placeholder="215"
                />
                <span>مم</span>
              </div>
            </div>

            <div className="bio-input-group">
              <label>محيط البطن (AC)</label>
              <div className="bio-input-wrap">
                <input 
                  type="number" 
                  step="0.1" 
                  value={biometry.ac} 
                  onChange={e => handleBiometryChange('ac', e.target.value)}
                  placeholder="198"
                />
                <span>مم</span>
              </div>
            </div>

            <div className="bio-input-group">
              <label>طول عظم الفخذ (FL)</label>
              <div className="bio-input-wrap">
                <input 
                  type="number" 
                  step="0.1" 
                  value={biometry.fl} 
                  onChange={e => handleBiometryChange('fl', e.target.value)}
                  placeholder="42"
                />
                <span>مم</span>
              </div>
            </div>
          </div>

          <div className="efw-result-box">
            <div className="efw-title">الوزن التقديري للجنين (Estimated Fetal Weight):</div>
            <div className="efw-val">
              {efwCalculation.grams > 0 ? (
                <>
                  <strong>{efwCalculation.grams}</strong> جرام
                  <span className="efw-kg">({efwCalculation.kg} كجم)</span>
                </>
              ) : (
                <span className="placeholder-text">الرجاء إدخال قياسات السونار</span>
              )}
            </div>
          </div>
        </div>

        {/* Antenatal Visit Log */}
        <div className="obgyn-subcard">
          <div className="subcard-header">
            <h4>سجل زيارات وفحوصات متابعة الحمل ({visits.length})</h4>
            <button 
              type="button" 
              onClick={() => setIsAddingVisit(true)} 
              className="btn-add-ob-visit"
            >
              <Plus size={14} />
              <span>تسجيل زيارة جديدة</span>
            </button>
          </div>

          {visits.length === 0 ? (
            <div className="empty-state-box">
              <p>لم يتم تسجيل زيارات متابعة حمل سابقة.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="clinical-data-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>عمر الحمل</th>
                    <th>ضغط الدم</th>
                    <th>الوزن</th>
                    <th>نبض الجنين</th>
                    <th>ملاحظات</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map(v => (
                    <tr key={v.id}>
                      <td>{v.date}</td>
                      <td><strong>{v.ga}</strong></td>
                      <td>{v.bp}</td>
                      <td>{v.weight ? `${v.weight} كجم` : '--'}</td>
                      <td>{v.fhr ? `${v.fhr} bpm` : '--'}</td>
                      <td>{v.notes || '—'}</td>
                      <td>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteVisit(v.id)}
                          className="btn-delete-row"
                          title="حذف الزيارة"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Visit Modal */}
      {isAddingVisit && (
        <div className="obgyn-modal-overlay">
          <div className="obgyn-modal-card">
            <div className="obgyn-modal-header">
              <h4>تسجيل زيارة فحص حمل سريرية</h4>
              <button type="button" onClick={() => setIsAddingVisit(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleAddVisit} className="obgyn-modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>تاريخ الزيارة *</label>
                  <input 
                    type="date" 
                    value={newVisit.date} 
                    onChange={e => setNewVisit({ ...newVisit, date: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>ضغط الدم (BP) *</label>
                  <input 
                    type="text" 
                    placeholder="120/80" 
                    value={newVisit.bp} 
                    onChange={e => setNewVisit({ ...newVisit, bp: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>وزن الأم (كجم)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="65.0" 
                    value={newVisit.weight} 
                    onChange={e => setNewVisit({ ...newVisit, weight: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>ارتفاع قاع الرحم (SFH سم)</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    placeholder="20" 
                    value={newVisit.sfh} 
                    onChange={e => setNewVisit({ ...newVisit, sfh: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>نبض الجنين (FHR bpm)</label>
                  <input 
                    type="number" 
                    placeholder="145" 
                    value={newVisit.fhr} 
                    onChange={e => setNewVisit({ ...newVisit, fhr: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ملاحظات الطبيب وتوصيات السونار والتحاليل</label>
                <input 
                  type="text" 
                  placeholder="حركة الجنين، فحص البول، مكملات الحديد والكالسيوم..." 
                  value={newVisit.notes} 
                  onChange={e => setNewVisit({ ...newVisit, notes: e.target.value })} 
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-save-visit">حفظ الزيارة في ملف الحمل</button>
                <button type="button" onClick={() => setIsAddingVisit(false)} className="btn-cancel">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
